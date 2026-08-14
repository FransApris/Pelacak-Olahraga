<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  activity: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Authentication untuk mengambil token dan userId saat ini
const auth = useAuth()
const currentUserId = computed(() => auth.user.value?.id)

// State reaktif untuk Optimistic UI (Kudos)
const kudoCount = ref(props.activity._count?.kudos || 0)
const isKudoed = ref(false)

// State untuk Toast Notification (Error Handling)
const toastMessage = ref('')
const showToast = ref(false)

// Inisialisasi awal saat komponen dimuat
onMounted(() => {
  if (props.activity.kudos && currentUserId.value) {
    isKudoed.value = props.activity.kudos.some((k: any) => k.userId === currentUserId.value)
  }
})

// Fungsi memunculkan toast
const displayToast = (msg: string) => {
  toastMessage.value = msg
  showToast.value = true
  setTimeout(() => { showToast.value = false }, 3000)
}

// Optimistic UI Toggle Kudo
const toggleKudo = async () => {
  if (!auth.isAuthenticated.value) {
    displayToast('Silakan login untuk memberikan Kudos!')
    return
  }

  // Simpan state asli untuk jaga-jaga jika request gagal (Revert)
  const previousIsKudoed = isKudoed.value
  const previousCount = kudoCount.value

  // 1. UPDATE SEKETIKA DI LAYAR (Optimistic Update)
  isKudoed.value = !isKudoed.value
  kudoCount.value += isKudoed.value ? 1 : -1

  // 2. KIRIM REQUEST KE SERVER DI LATAR BELAKANG
  try {
    const response = await $fetch(`/api/activities/${props.activity.id}/kudos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.token.value}`
      }
    })
    
    // Server membalas sukses, tidak perlu ubah UI (sudah optimis di awal)
  } catch (error) {
    console.error('Kudo failed:', error)
    // 3. JIKA GAGAL: KEMBALIKAN UI KE STATUS SEMULA (Revert)
    isKudoed.value = previousIsKudoed
    kudoCount.value = previousCount
    
    // Munculkan notifikasi error ke user
    displayToast('Gagal mengirim Kudos. Periksa koneksi Anda.')
  }
}

const showComments = ref(false)
const comments = ref<any[]>([])
const isLoadingComments = ref(false)
const newCommentText = ref('')
const isPostingComment = ref(false)

const toggleComments = async () => {
  showComments.value = !showComments.value
  
  if (showComments.value && comments.value.length === 0) {
    await fetchComments()
  }
}

const fetchComments = async () => {
  if (!auth.isAuthenticated.value) return
  isLoadingComments.value = true
  try {
    const response = await $fetch<any>(`/api/activities/${props.activity.id}/comments`, {
      headers: { Authorization: `Bearer ${auth.token.value}` }
    })
    if (response.success) {
      comments.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch comments', error)
    displayToast('Gagal memuat komentar.')
  } finally {
    isLoadingComments.value = false
  }
}

const postComment = async () => {
  if (!newCommentText.value.trim() || !auth.isAuthenticated.value || isPostingComment.value) return
  
  isPostingComment.value = true
  const text = newCommentText.value.trim()
  newCommentText.value = '' // Reset input cepat (optimistic)

  try {
    const response = await $fetch<any>(`/api/activities/${props.activity.id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token.value}` },
      body: { content: text }
    })
    
    if (response.success) {
      // Tambahkan komentar ke array secara optimis menggunakan data pengguna saat ini
      comments.value.push({
        id: response.comment.id,
        content: text,
        createdAt: new Date().toISOString(),
        user: {
          id: auth.user.value?.id,
          name: auth.user.value?.name,
          profilePicture: auth.user.value?.profilePicture || `https://ui-avatars.com/api/?name=${auth.user.value?.name || 'U'}&background=random`
        }
      })
      // Update count lokal
      if (props.activity._count) {
        props.activity._count.comments = (props.activity._count.comments || 0) + 1
      }
    }
  } catch (error) {
    console.error('Failed to post comment', error)
    displayToast('Gagal mengirim komentar.')
    newCommentText.value = text // kembalikan text jika gagal
  } finally {
    isPostingComment.value = false
  }
}

// Fungsi format waktu (misal: "2 hours ago")
const timeAgo = computed(() => {
  if (!props.activity.startTime) return ''
  const date = new Date(props.activity.startTime)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
})

// Hitung pace (menit per km)
const averagePaceFormatted = computed(() => {
  if (!props.activity.durationInSeconds || !props.activity.distanceInMeters) return '0:00'
  const distanceKm = props.activity.distanceInMeters / 1000
  if (distanceKm === 0) return '0:00'
  
  const paceSeconds = props.activity.durationInSeconds / distanceKm
  const paceMinutes = Math.floor(paceSeconds / 60)
  const paceRemainingSeconds = Math.floor(paceSeconds % 60)
  
  return `${paceMinutes}:${paceRemainingSeconds.toString().padStart(2, '0')} /km`
})

const distanceFormatted = computed(() => {
  if (!props.activity.distanceInMeters) return '0.00 km'
  return (props.activity.distanceInMeters / 1000).toFixed(2) + ' km'
})

const durationFormatted = computed(() => {
  if (!props.activity.durationInSeconds) return '0h 0m'
  const h = Math.floor(props.activity.durationInSeconds / 3600)
  const m = Math.floor((props.activity.durationInSeconds % 3600) / 60)
  
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
})

const parsedPhotos = computed<string[]>(() => {
  if (!props.activity.photos) return []
  try {
    return JSON.parse(props.activity.photos)
  } catch (e) {
    return []
  }
})
</script>

<template>
  <div class="bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-800 mb-5 overflow-hidden w-full relative">
    
    <!-- SKELETON LOADER -->
    <div v-if="loading" class="p-4 animate-pulse">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 bg-gray-800 rounded-full"></div>
        <div class="flex-1">
          <div class="h-3 bg-gray-800 rounded w-1/3 mb-2"></div>
          <div class="h-2 bg-gray-800 rounded w-1/4"></div>
        </div>
      </div>
      <div class="h-4 bg-gray-800 rounded w-2/3 mb-3"></div>
      <div class="w-full h-32 bg-gray-800 rounded-xl mb-4"></div>
      <div class="grid grid-cols-4 gap-2">
        <div class="h-8 bg-gray-800 rounded w-full"></div>
        <div class="h-8 bg-gray-800 rounded w-full"></div>
        <div class="h-8 bg-gray-800 rounded w-full"></div>
        <div class="h-8 bg-gray-800 rounded w-full"></div>
      </div>
    </div>
    
    <!-- ACTUAL CARD -->
    <div v-else>
      <!-- HEADER AVATAR -->
      <div class="p-4 flex items-center space-x-3">
        <!-- Initial Avatar -->
        <div class="w-10 h-10 rounded-full bg-strava-orange/10 flex items-center justify-center border border-strava-orange/20 shrink-0">
          <span class="text-strava-orange font-bold text-lg">{{ (activity.user?.name || 'U').charAt(0).toUpperCase() }}</span>
        </div>
        
        <div class="flex flex-col flex-1">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-gray-100 text-sm">
              {{ activity.user?.name || 'Unknown Athlete' }}
            </span>
            <span class="px-1.5 py-0.5 bg-strava-orange/20 text-strava-orange text-[9px] font-black uppercase rounded">PRO</span>
          </div>
          <span class="text-[11px] text-gray-400 mt-0.5">
            Jakarta, ID &bull; {{ timeAgo }}
          </span>
        </div>
      </div>

      <!-- BODY TITLE & DESC -->
      <div class="px-4 pb-3">
        <div class="flex items-start space-x-2">
          <!-- Icon Tipe -->
          <div class="w-6 h-6 rounded-full bg-strava-orange/20 flex items-center justify-center shrink-0 mt-0.5">
            <span class="text-[12px]">{{ activity.type === 'RUN' ? '🏃' : activity.type === 'RIDE' ? '🚴' : '🏊' }}</span>
          </div>
          <h3 class="font-bold text-base text-gray-100 leading-snug">{{ activity.title }}</h3>
        </div>
        
        <!-- ANOMALY ALERT -->
        <div v-if="activity.anomalyTag" class="mt-2.5 ml-8 inline-flex items-center bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-red-500/20">
          {{ activity.anomalyTag }}
        </div>

        <p class="text-xs text-gray-400 mt-2 leading-relaxed ml-8">
          Cuaca sangat cerah! Latihan endurance persiapan Marathon. Pace stabil di {{ averagePaceFormatted }}
        </p>

        <!-- FOTO AKTIVITAS -->
        <div v-if="parsedPhotos.length > 0" class="mt-3 ml-8 relative group">
          <div class="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-xl border border-gray-800 shadow-sm">
            <div v-for="(photo, idx) in parsedPhotos" :key="idx" class="shrink-0 w-full h-62.5 snap-center relative">
              <img :src="photo" class="w-full h-full object-cover pointer-events-none" />
              <div v-if="parsedPhotos.length > 1" class="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                {{ idx + 1 }}/{{ parsedPhotos.length }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STATS GRID (4 COLS) -->
      <div class="px-4 py-3 mx-4 mb-3 bg-[#242426] rounded-xl grid grid-cols-4 gap-2 text-left">
        <div>
          <div class="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Jarak</div>
          <div class="font-bold text-sm text-gray-100">{{ distanceFormatted }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Pace</div>
          <div class="font-bold text-sm text-gray-100">{{ averagePaceFormatted.replace(' /km', '') }} <span class="text-[9px] font-normal text-gray-500">/km</span></div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Waktu</div>
          <div class="font-bold text-sm text-gray-100">{{ durationFormatted.replace('h', ':').replace('m', '') }}<span v-if="!durationFormatted.includes('h')">:00</span></div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Elevasi</div>
          <div class="font-bold text-sm text-gray-100">48 <span class="text-[9px] font-normal text-gray-500">m</span></div>
        </div>
      </div>

      <!-- ACTUAL MAP AREA -->
      <div class="w-full h-40 relative overflow-hidden mb-2">
        <ClientOnly>
          <ActivityMap :routePoints="activity.routePoints || []" :interactive="false" />
        </ClientOnly>
      </div>

      <!-- FOOTER / ACTIONS -->
      <div class="px-4 py-3 flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 mx-4 mt-2">
        <button 
          @click="toggleKudo"
          class="flex items-center space-x-1.5 transition-colors group"
          :class="isKudoed ? 'text-strava-orange font-bold' : 'hover:text-gray-300'"
        >
          <svg class="w-4 h-4 transition-transform duration-200 group-active:scale-75" :class="isKudoed ? 'fill-strava-orange' : 'fill-transparent stroke-gray-500 group-hover:stroke-gray-300'" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path></svg>
          <span class="mt-0.5">{{ kudoCount }} Kudos</span>
        </button>
        
        <button @click="toggleComments" class="flex items-center space-x-1.5 hover:text-gray-300 transition-colors">
          <svg class="w-4 h-4" :class="showComments ? 'text-strava-orange' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          <span class="font-semibold mt-0.5" :class="showComments ? 'text-strava-orange' : ''">{{ activity._count?.comments || 0 }} Komentar</span>
        </button>
      </div>

      <!-- COMMENTS SECTION -->
      <div v-if="showComments" class="bg-[#242426] border-t border-gray-800/60 p-4">
        
        <!-- Loading Spinner -->
        <div v-if="isLoadingComments" class="flex justify-center py-4">
          <svg class="animate-spin w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>

        <!-- List Komentar -->
        <div v-else class="space-y-4 max-h-60 overflow-y-auto mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div v-if="comments.length === 0" class="text-center text-xs text-gray-500 py-2">
            Belum ada komentar. Jadilah yang pertama!
          </div>
          
          <div v-for="c in comments" :key="c.id" class="flex space-x-2.5 animate-[slideUp_0.2s_ease-out]">
            <NuxtLink :to="`/profile/${c.user.id}`">
              <img :src="c.user.profilePicture" class="w-7 h-7 rounded-full bg-gray-800 object-cover border border-gray-700 mt-0.5 shrink-0" />
            </NuxtLink>
            <div class="flex-1 bg-[#1c1c1e] p-2.5 rounded-2xl rounded-tl-none border border-gray-800">
              <NuxtLink :to="`/profile/${c.user.id}`" class="text-[11px] font-black text-gray-300 hover:text-strava-orange transition-colors">
                {{ c.user.name }}
              </NuxtLink>
              <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ c.content }}</p>
            </div>
          </div>
        </div>

        <!-- Input Komentar -->
        <form v-if="auth.isAuthenticated.value" @submit.prevent="postComment" class="flex items-center space-x-2 mt-2">
          <img :src="auth.user.value?.profilePicture || `https://ui-avatars.com/api/?name=${auth.user.value?.name || 'U'}`" class="w-8 h-8 rounded-full border border-gray-700 object-cover" />
          <input 
            v-model="newCommentText" 
            type="text" 
            placeholder="Tambahkan komentar..." 
            class="flex-1 bg-[#1c1c1e] text-xs text-gray-200 px-4 py-2.5 rounded-full border border-gray-700 focus:border-strava-orange focus:ring-1 focus:ring-strava-orange outline-none transition-all placeholder-gray-500"
            :disabled="isPostingComment"
          />
          <button 
            type="submit" 
            :disabled="!newCommentText.trim() || isPostingComment"
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0"
            :class="newCommentText.trim() ? 'bg-strava-orange text-white hover:bg-orange-600' : 'bg-gray-800 text-gray-600'"
          >
            <svg class="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>
        <div v-else class="text-center text-xs text-gray-500 py-2 border border-gray-800 rounded-lg">
          <NuxtLink to="/login" class="text-strava-orange hover:underline font-bold">Masuk</NuxtLink> untuk berkomentar.
        </div>
      </div>
    </div>

    <!-- TOAST NOTIFICATION (ERROR) -->
    <div 
      v-if="showToast" 
      class="absolute bottom-4 left-4 right-4 bg-red-900/90 text-white px-4 py-2 rounded-lg text-xs z-50 flex items-center space-x-2 border border-red-500/50"
    >
      <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
