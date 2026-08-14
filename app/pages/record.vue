<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const auth = useAuth()

// Proteksi di sisi klien
if (!auth.isAuthenticated.value) {
  router.push('/login')
}

// State Pelacakan (Tracking)
const isTracking = ref(false)
const isFinished = ref(false)
const routePoints = ref<Array<{ latitude: number, longitude: number, timestamp: number, elevation?: number }>>([])
const watchId = ref<number | null>(null)
const startTime = ref<number | null>(null)

// State Form
const form = ref({
  title: '',
  type: 'RUN',
  gearId: '',
  photos: [] as string[]
})
const durationSeconds = ref(0)
const distanceMeters = ref(0)
const uploadProgress = ref(false)

const timerInterval = ref<any>(null)

// Utilities
const errorMessage = ref('')
const isLoading = ref(false)
const aiFeedback = ref('')
const isCallingCoach = ref(false)
const isGeneratingTitle = ref(false)
const unlockedBadges = ref<any[]>([])

// Fetch user gears
const { data: gearData } = await useFetch(
  () => auth.user.value ? `/api/users/${auth.user.value.id}/gears` : '', 
  {
    lazy: true,
    headers: { Authorization: auth.token.value ? `Bearer ${auth.token.value}` : '' }
  }
)
const userGears = computed(() => (gearData.value as any)?.data || [])

// Filter gears by activity type
const availableGears = computed(() => {
  return userGears.value.filter((g: any) => {
    if (form.value.type === 'RUN' || form.value.type === 'WALK') return g.type === 'SHOES'
    if (form.value.type === 'RIDE') return g.type === 'BIKE'
    return false
  })
})

// Menghitung Jarak dengan Haversine Formula
const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3 // Radius bumi dalam meter
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toggleTracking = () => {
  if (isTracking.value) {
    // STOP TRACKING
    isTracking.value = false
    isFinished.value = true
    if (watchId.value !== null) {
      navigator.geolocation.clearWatch(watchId.value)
      watchId.value = null
    }
    clearInterval(timerInterval.value)
  } else {
    // START TRACKING
    if (!navigator.geolocation) {
      errorMessage.value = 'Geolokasi tidak didukung oleh browser Anda.'
      return
    }

    errorMessage.value = ''
    routePoints.value = []
    distanceMeters.value = 0
    durationSeconds.value = 0
    isFinished.value = false
    isTracking.value = true
    startTime.value = Date.now()

    timerInterval.value = setInterval(() => {
      durationSeconds.value = Math.floor((Date.now() - startTime.value!) / 1000)
    }, 1000)

    watchId.value = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, altitude } = position.coords
        const newPoint = {
          latitude,
          longitude,
          elevation: altitude || 0,
          timestamp: position.timestamp
        }
        
        if (routePoints.value.length > 0) {
          const lastPoint = routePoints.value[routePoints.value.length - 1]
          if (lastPoint) {
            const dist = getDistanceFromLatLonInMeters(lastPoint.latitude, lastPoint.longitude, latitude, longitude)
            distanceMeters.value += dist
          }
        }
        
        routePoints.value.push(newPoint)
      },
      (err) => {
        errorMessage.value = 'Gagal mengakses GPS: ' + err.message
        toggleTracking()
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
  }
}

onUnmounted(() => {
  if (watchId.value !== null) navigator.geolocation.clearWatch(watchId.value)
  if (timerInterval.value) clearInterval(timerInterval.value)
})

const formatDuration = computed(() => {
  const m = Math.floor(durationSeconds.value / 60)
  const s = durationSeconds.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const formatDistance = computed(() => {
  return (distanceMeters.value / 1000).toFixed(2)
})

const averagePace = computed(() => {
  const km = distanceMeters.value / 1000
  if (km > 0 && durationSeconds.value > 0) {
    const paceSeconds = durationSeconds.value / km
    const m = Math.floor(paceSeconds / 60)
    const s = Math.floor(paceSeconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }
  return '0:00'
})

const generateAITitle = async () => {
  if (!auth.isAuthenticated.value) return
  isGeneratingTitle.value = true
  
  // Hitung Time Of Day
  const hour = new Date().getHours()
  let timeOfDay = 'Pagi'
  if (hour >= 11 && hour < 15) timeOfDay = 'Siang'
  else if (hour >= 15 && hour < 18) timeOfDay = 'Sore'
  else if (hour >= 18) timeOfDay = 'Malam'

  try {
    const response = await $fetch<any>('/api/generate-title', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token.value}`
      },
      body: {
        type: form.value.type,
        distance: distanceMeters.value / 1000,
        duration: durationSeconds.value / 60,
        timeOfDay
      }
    })
    
    if (response.success && response.title) {
      form.value.title = response.title
    }
  } catch (error) {
    console.error('Failed to generate title', error)
  } finally {
    isGeneratingTitle.value = false
  }
}

const handleSubmit = async () => {
  if (!form.value.title) {
    errorMessage.value = 'Judul aktivitas tidak boleh kosong.'
    return
  }

  errorMessage.value = ''
  isLoading.value = true
  aiFeedback.value = ''

  try {
    const saveResponse = await $fetch<any>('/api/activities', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token.value}`
      },
      body: {
        userId: auth.user.value?.id,
        title: form.value.title,
        type: form.value.type,
        distanceInMeters: distanceMeters.value,
        durationInSeconds: durationSeconds.value,
        startTime: startTime.value ? new Date(startTime.value).toISOString() : new Date().toISOString(),
        rawCoordinates: routePoints.value,
        gearId: form.value.gearId || undefined,
        photos: form.value.photos
      }
    })

    isCallingCoach.value = true
    isLoading.value = false 

    try {
      const coachResponse = await $fetch<any>('/api/coach', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token.value}`
        },
        body: {
          type: form.value.type,
          distance: distanceMeters.value / 1000,
          duration: durationSeconds.value / 60,
          average_pace: averagePace.value
        }
      })
      aiFeedback.value = coachResponse.message
      
      if (saveResponse.unlockedBadges && saveResponse.unlockedBadges.length > 0) {
        unlockedBadges.value = saveResponse.unlockedBadges
      }
    } catch (coachErr: any) {
      aiFeedback.value = `Aktivitas tersimpan! (AI Coach error)`
    } finally {
      isCallingCoach.value = false
    }

  } catch (error: any) {
    errorMessage.value = error.data?.statusMessage || 'Gagal menyimpan aktivitas.'
    isLoading.value = false
  }
}

const handlePhotoUpload = async (event: any) => {
  const files = event.target.files
  if (!files || files.length === 0) return

  uploadProgress.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('photo', files[0])

    const res = await $fetch<any>('/api/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token.value}`
      },
      body: formData
    })

    if (res.success && res.url) {
      form.value.photos.push(res.url)
    }
  } catch (error: any) {
    errorMessage.value = 'Gagal mengunggah foto.'
  } finally {
    uploadProgress.value = false
  }
}
</script>

<template>
  <div class="h-screen bg-[#121212] flex flex-col pb-16"> <!-- pb untuk bottom nav -->
    
    <!-- PETA / TRACKING MAP -->
    <div class="relative flex-1 bg-[#1c1c1e]">
      <ClientOnly>
        <ActivityMap :routePoints="routePoints" :interactive="true" />
      </ClientOnly>

      <!-- Overlay Statistik -->
      <div class="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white z-400 grid grid-cols-3 gap-2 text-center shadow-2xl">
        <div>
          <div class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Durasi</div>
          <div class="text-2xl font-black font-mono">{{ formatDuration }}</div>
        </div>
        <div class="border-l border-r border-white/10">
          <div class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Jarak (KM)</div>
          <div class="text-2xl font-black font-mono">{{ formatDistance }}</div>
        </div>
        <div>
          <div class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Pace</div>
          <div class="text-2xl font-black font-mono">{{ averagePace }}</div>
        </div>
      </div>
    </div>

    <!-- KONTROL / FORM -->
    <div class="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-500 shrink-0" :class="isFinished ? 'p-6' : 'p-6 flex justify-center items-center h-32'">
      
      <!-- BUTTON START / STOP -->
      <button v-if="!isFinished && !aiFeedback && !isCallingCoach" @click="toggleTracking" 
              class="w-20 h-20 rounded-full flex items-center justify-center font-black text-white shadow-lg transition-all transform active:scale-95"
              :class="isTracking ? 'bg-red-600 shadow-red-600/50' : 'bg-strava-orange shadow-orange-500/50'">
        {{ isTracking ? 'STOP' : 'START' }}
      </button>

      <!-- ERROR ALERT -->
      <div v-if="errorMessage" class="w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 text-sm font-medium mb-4">
        {{ errorMessage }}
      </div>

      <!-- FORM SUBMIT JIKA FINISH -->
      <form v-if="isFinished && !aiFeedback && !isCallingCoach" @click.stop @submit.prevent="handleSubmit" class="w-full space-y-4">
        <h3 class="text-lg font-black text-gray-900 mb-2">Simpan Aktivitas</h3>
        
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">Judul Aktivitas</label>
            <button type="button" @click="generateAITitle" :disabled="isGeneratingTitle" class="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-linear-to-r from-purple-50 to-fuchsia-50 text-fuchsia-700 rounded-full border border-fuchsia-200 hover:bg-fuchsia-100 transition-colors flex items-center space-x-1 outline-none">
              <svg v-if="isGeneratingTitle" class="animate-spin w-3 h-3 text-fuchsia-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>✨ Auto Judul</span>
            </button>
          </div>
          <input v-model="form.title" type="text" required class="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-900 font-bold placeholder-gray-400 focus:border-strava-orange focus:ring-1 focus:ring-strava-orange transition-all" placeholder="Beri judul latihan Anda..." />
        </div>

        <!-- TIPE OLAHRAGA -->
        <div class="flex space-x-2">
          <label v-for="t in ['RUN', 'RIDE', 'SWIM']" :key="t" class="flex-1 cursor-pointer">
            <input type="radio" v-model="form.type" :value="t" class="peer sr-only" />
            <div class="py-2 bg-gray-50 border border-gray-200 rounded-xl text-center peer-checked:bg-orange-50 peer-checked:border-strava-orange peer-checked:text-strava-orange font-bold text-gray-500 text-sm transition-all">
              {{ t === 'RUN' ? '🏃 Lari' : t === 'RIDE' ? '🚴 Sepeda' : '🏊 Renang' }}
            </div>
          </label>
        </div>

        <!-- UPLOAD FOTO -->
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Foto Aktivitas</label>
          <div class="flex space-x-3 overflow-x-auto pb-2">
            <div v-for="(url, idx) in form.photos" :key="idx" class="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
              <img :src="url" class="w-full h-full object-cover" />
              <button type="button" @click="form.photos.splice(idx, 1)" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
            </div>
            <label class="w-16 h-16 shrink-0 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-strava-orange hover:border-strava-orange transition-colors cursor-pointer" :class="{ 'opacity-50 pointer-events-none': uploadProgress }">
              <span v-if="uploadProgress" class="animate-spin text-xl">↻</span>
              <span v-else class="text-xl">+</span>
              <input type="file" accept="image/*" class="hidden" @change="handlePhotoUpload" />
            </label>
          </div>
        </div>


        <!-- PILIHAN PERALATAN (GEAR) -->
        <div v-if="availableGears.length > 0">
          <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Peralatan (Opsional)</label>
          <select v-model="form.gearId" class="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-gray-900 font-bold focus:border-strava-orange transition-all">
            <option value="">Tidak ada / Abaikan</option>
            <option v-for="gear in availableGears" :key="gear.id" :value="gear.id">
              {{ gear.name }}
            </option>
          </select>
        </div>

        <div class="flex space-x-3 pt-2">
          <button type="button" @click="isFinished = false; distanceMeters=0; durationSeconds=0; routePoints=[]" class="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 rounded-xl">Batal / Ulangi</button>
          <button type="submit" :disabled="isLoading" class="flex-2 py-3 bg-strava-orange text-white font-black text-lg rounded-xl shadow-lg flex justify-center items-center">
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Simpan
          </button>
        </div>
      </form>

      <!-- SUCCESS / AI FEEDBACK -->
      <div v-if="aiFeedback" class="w-full bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-sm text-center">
        <h3 class="font-bold text-blue-950 mb-2">Gemini AI Coach</h3>
        <p class="text-sm text-blue-900 font-medium italic mb-4">"{{ aiFeedback }}"</p>
        <NuxtLink to="/" class="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm inline-block">Lihat di Feed</NuxtLink>
      </div>

      <!-- LOADING COACH -->
      <div v-if="isCallingCoach" class="w-full flex flex-col items-center justify-center p-4">
        <svg class="animate-spin w-8 h-8 text-strava-orange mb-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p class="text-sm text-gray-500 font-medium">Menganalisis performa Anda...</p>
      </div>

    </div>
  </div>

  <!-- MODAL PENCAPAIAN TERBUKA -->
  <transition enter-active-class="transition ease-out duration-500" enter-from-class="opacity-0 scale-90 translate-y-10" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition ease-in duration-300" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-90 translate-y-10">
    <div v-if="unlockedBadges.length > 0" class="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div class="bg-linear-to-b from-yellow-500 to-amber-600 rounded-3xl p-1 shadow-[0_0_50px_rgba(245,158,11,0.5)] max-w-sm w-full">
        <div class="bg-[#1c1c1e] rounded-[22px] p-6 text-center relative overflow-hidden">
          <!-- Dekorasi -->
          <div class="absolute -top-10 -left-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl"></div>
          <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl"></div>
          
          <h2 class="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-yellow-400 to-amber-200 mb-2 uppercase tracking-widest relative z-10">
            Pencapaian Baru!
          </h2>
          <p class="text-sm text-gray-400 font-medium mb-6 relative z-10">Luar biasa! Anda baru saja membuka medali baru.</p>
          
          <div class="space-y-4 mb-8 relative z-10">
            <div v-for="(badge, idx) in unlockedBadges" :key="idx" class="bg-black/40 border border-yellow-500/30 rounded-2xl p-4 flex items-center space-x-4 transform transition-all hover:scale-105">
              <div class="text-4xl filter drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">{{ badge.icon || '🏅' }}</div>
              <div class="text-left flex-1 min-w-0">
                <h3 class="font-bold text-white text-lg truncate">{{ badge.name }}</h3>
                <p class="text-xs text-gray-400 leading-tight">{{ badge.description }}</p>
              </div>
            </div>
          </div>
          
          <div class="relative z-10">
            <button @click="router.push('/profile/' + auth.user.value?.id)" class="w-full py-3.5 bg-linear-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-black rounded-xl shadow-lg transition-colors">
              Lihat di Profil
            </button>
            <button @click="unlockedBadges = []" class="w-full mt-3 py-2 text-gray-500 font-bold text-sm hover:text-white transition-colors">
              Tutup & Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>
