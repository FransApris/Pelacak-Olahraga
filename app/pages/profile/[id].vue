<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const route = useRoute()
const userId = route.params.id as string

// 1. Get Auth
const auth = useAuth()

// 2. Panggil API Aggregator
const { data, pending, error } = await useFetch(`/api/users/${userId}/stats`, {
  headers: {
    Authorization: auth.token.value ? `Bearer ${auth.token.value}` : ''
  }
})
const responseData = computed(() => data.value as any)

// Panggil API Gear
const { data: gearData } = await useFetch(`/api/users/${userId}/gears`, {
  lazy: true,
  headers: {
    Authorization: auth.token.value ? `Bearer ${auth.token.value}` : ''
  }
})
const gears = computed(() => (gearData.value as any)?.data || [])

// Data Profil & Badges
const user = computed(() => responseData.value?.data?.user)
const stats = computed(() => responseData.value?.data?.stats)
const activities = computed(() => responseData.value?.data?.recentActivities || [])

const weeklyProgress = computed(() => stats.value?.weeklyProgress || [])
const maxWeeklyDistance = computed(() => {
  if (weeklyProgress.value.length === 0) return 1
  const max = Math.max(...weeklyProgress.value.map((d: any) => d.distance))
  return max > 0 ? max : 1 // Mencegah pembagian dengan 0
})

// Derivasi daftar badge yang dimiliki
const earnedBadgeIds = computed(() => {
  if (!user.value || !user.value.badges) return []
  return user.value.badges.map((b: any) => b.badge.id)
})

// Fungsi pemformatan untuk Stats Grid
const formatDistance = (meters = 0) => (meters / 1000).toFixed(2)
const formatDuration = (seconds = 0) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
const formatPace = (paceSec = 0) => {
  if (!paceSec) return '0:00'
  const m = Math.floor(paceSec / 60)
  const s = Math.floor(paceSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const isTogglingFollow = ref(false)

const toggleFollow = async () => {
  if (!auth.isAuthenticated.value || !user.value) return
  isTogglingFollow.value = true
  
  try {
    const response = await $fetch<any>(`/api/users/${user.value.id}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token.value}` }
    })
    if (response.success) {
      // Optimistic update
      user.value.isFollowing = response.isFollowing
      if (response.isFollowing) {
        user.value._count.followers++
      } else {
        user.value._count.followers--
      }
    }
  } catch (err) {
    console.error('Failed to toggle follow', err)
  } finally {
    isTogglingFollow.value = false
  }
}

const addGear = async () => {
  const name = window.prompt('Nama Peralatan (misal: Nike Pegasus 39):')
  if (!name) return
  const brand = window.prompt('Merek (opsional):') || ''
  const typeStr = window.prompt('Tipe (1 = Sepatu, 2 = Sepeda):')
  const type = typeStr === '2' ? 'BIKE' : 'SHOES'
  
  try {
    const res = await $fetch<any>(`/api/users/${user.value.id}/gears`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token.value}` },
      body: { name, type, brand }
    })
    if (res.success) {
      // Reload is easiest way to refresh all stats and gears
      window.location.reload()
    }
  } catch (err) {
    alert('Gagal menambah peralatan')
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    
    <!-- SKELETON LOADER (Saat data dimuat) -->
    <div v-if="pending" class="animate-pulse space-y-8">
      <div class="h-32 bg-gray-200 rounded-xl w-full"></div>
      <div class="h-24 bg-gray-200 rounded-xl w-full"></div>
      <div class="h-64 bg-gray-200 rounded-xl w-full"></div>
    </div>
    
    <!-- ERROR STATE -->
    <div v-else-if="error || !responseData?.success" class="text-center text-red-500 py-10 bg-red-50 rounded-xl border border-red-100">
      Terjadi kesalahan saat memuat profil pengguna. Mungkin pengguna ini tidak ada.
    </div>

    <!-- MAIN CONTENT -->
    <div v-else-if="user">
      
      <!-- 1. HEADER PROFIL -->
      <!-- 1. HEADER PROFIL -->
      <div class="flex flex-col items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative text-center">
        <img 
          :src="user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&size=128&background=random`" 
          alt="Avatar"
          class="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-gray-100 mx-auto" 
        />
        
        <h1 class="text-2xl font-extrabold text-gray-900 tracking-tight mt-4">{{ user.name }}</h1>
        
        <!-- Statistik Pengikut -->
        <div class="flex items-center justify-center space-x-4 mt-2">
          <div class="flex items-center space-x-1">
            <span class="font-bold text-gray-900">{{ user._count?.followers || 0 }}</span>
            <span class="text-xs text-gray-500 uppercase tracking-wide">Pengikut</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="font-bold text-gray-900">{{ user._count?.following || 0 }}</span>
            <span class="text-xs text-gray-500 uppercase tracking-wide">Mengikuti</span>
          </div>
        </div>
        
        <p class="text-gray-500 mt-3 text-sm font-medium px-4">{{ user.bio || 'Atlet tangguh yang belum menulis bio.' }}</p>
        
        <div class="mt-3 flex items-center justify-center text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Bergabung sejak {{ new Date(user.createdAt).getFullYear() }}
        </div>

        <!-- Tombol Ikuti / Edit Profil -->
        <div class="w-full mt-6" v-if="auth.isAuthenticated.value">
          <!-- Jika profil orang lain, tampilkan tombol Ikuti -->
          <button 
            v-if="auth.user.value?.id !== user.id"
            @click="toggleFollow" 
            :disabled="isTogglingFollow"
            class="w-full py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center"
            :class="user.isFollowing 
              ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200' 
              : 'bg-strava-orange text-white hover:bg-orange-600 shadow-md'"
          >
            <svg v-if="isTogglingFollow" class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span v-else>{{ user.isFollowing ? 'Mengikuti' : 'Ikuti' }}</span>
          </button>
          
          <!-- Jika profil sendiri, tampilkan tombol Edit Profil -->
          <NuxtLink 
            v-else
            to="/profile/edit"
            class="w-full py-2.5 text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl border border-gray-200 transition-all flex items-center justify-center shadow-sm"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Edit Profil
          </NuxtLink>
        </div>
      </div>

      <!-- 2. GRID STATISTIK AGREGAT -->
      <h2 class="text-lg font-bold text-gray-900 mb-4 px-1">Statistik Sepanjang Masa</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div class="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Aktivitas</div>
          <div class="text-3xl sm:text-4xl font-black text-gray-900">{{ stats?.totalActivities }}</div>
        </div>
        
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div class="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Jarak (km)</div>
          <div class="text-3xl sm:text-4xl font-black text-blue-600">{{ formatDistance(stats?.totalDistanceInMeters) }}</div>
        </div>
        
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div class="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Durasi</div>
          <div class="text-3xl sm:text-4xl font-black text-gray-900">{{ formatDuration(stats?.totalDurationInSeconds) }}</div>
        </div>
        
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div class="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Avg Pace</div>
          <div class="text-3xl sm:text-4xl font-black text-gray-900">{{ formatPace(stats?.averagePace) }}</div>
        </div>

      </div>

      <!-- 2.5 GRAFIK PROGRES 7 HARI -->
      <div v-if="weeklyProgress.length > 0" class="mb-10">
        <h2 class="text-lg font-bold text-gray-900 mb-4 px-1">Progres 7 Hari Terakhir</h2>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div class="flex items-end justify-between h-40 space-x-1 sm:space-x-2">
            <div 
              v-for="(day, idx) in weeklyProgress" 
              :key="idx" 
              class="flex flex-col items-center flex-1 group"
            >
              <!-- Tooltip (muncul saat hover) -->
              <div class="opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded font-bold whitespace-nowrap pointer-events-none absolute -mt-8 z-10 shadow-lg">
                {{ formatDistance(day.distance) }} km
              </div>
              
              <!-- Bar -->
              <div class="w-full max-w-10 bg-gray-50 rounded-t-lg relative overflow-hidden flex items-end h-full">
                <div 
                  class="w-full bg-linear-to-t from-orange-500 to-orange-300 rounded-t-lg transition-all duration-700 ease-out group-hover:from-orange-600 group-hover:to-orange-400"
                  :style="`height: ${(day.distance / maxWeeklyDistance) * 100}%`"
                ></div>
              </div>
              
              <!-- Label Hari -->
              <div class="text-[10px] sm:text-xs text-gray-500 font-bold uppercase mt-3" :class="idx === 6 ? 'text-strava-orange' : ''">
                {{ day.dayName }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. KOMPONEN PENCAPAIAN (GAMIFICATION) -->
      <div v-if="user.badges && user.badges.length > 0">
        <!-- Kita manfaatkan BadgeShowcase buatan kita -->
        <!-- Supaya UI Showcase pas di dalam profil, max-w-xl dihapus via tailwind prop atau wrapper -->
        <div class="mb-10 w-full flex justify-center">
           <BadgeShowcase :earnedBadgeIds="earnedBadgeIds" class="w-full max-w-none! shadow-sm" />
        </div>
      </div>

      <!-- 4. GEAR TRACKER (Peralatan) -->
      <div v-if="gears.length > 0 || auth.user.value?.id === user.id" class="mb-10">
        <div class="flex justify-between items-center mb-4 px-1">
          <h2 class="text-lg font-bold text-gray-900">Peralatan (Gear)</h2>
          <button v-if="auth.user.value?.id === user.id" @click="addGear" class="text-xs font-bold text-strava-orange hover:underline bg-orange-50 px-3 py-1 rounded-full">
            + Tambah
          </button>
        </div>
        
        <div v-if="gears.length === 0" class="bg-white p-6 rounded-2xl shadow-sm border border-dashed border-gray-300 text-center">
          <p class="text-gray-500 text-sm">Belum ada sepatu atau sepeda yang ditambahkan.</p>
        </div>
        
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="gear in gears" :key="gear.id" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:border-gray-200 transition-colors">
            <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0">
              {{ gear.type === 'SHOES' ? '👟' : '🚲' }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-gray-900 truncate text-sm">{{ gear.name }}</h3>
              <p class="text-xs text-gray-500 truncate">{{ gear.brand || 'Tanpa Merek' }}</p>
            </div>
            <div class="text-right shrink-0">
              <div class="font-black text-gray-900">{{ formatDistance(gear.distance) }}</div>
              <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">KM</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. RIWAYAT AKTIVITAS TERBARU -->
      <h2 class="text-lg font-bold text-gray-900 mb-4 px-1">Riwayat Terbaru</h2>
      
      <div v-if="activities.length === 0" class="text-center text-gray-500 py-12 bg-white rounded-2xl border border-dashed border-gray-300">
        <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        <p class="font-medium">Belum ada aktivitas.</p>
        <p class="text-sm">Saatnya mengikat tali sepatu dan mulai berlari!</p>
      </div>
      
      <div v-else class="space-y-6 flex flex-col items-center">
        <!-- Re-use komponen ActivityCard yang elegan -->
        <ActivityCard 
          v-for="activity in activities" 
          :key="activity.id" 
          :activity="activity"
          class="max-w-none! w-full"
        />
      </div>

    </div>
  </div>
</template>
