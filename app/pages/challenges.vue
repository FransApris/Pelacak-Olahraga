<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()

// Ambil progress tantangan
const { data, pending, error, refresh } = await useFetch<any>(
  computed(() => `/api/users/${auth.user.value?.id}/challenges-progress`), 
  {
    lazy: true,
    server: false,
    onRequest({ options }) {
      if (auth.token.value) {
        options.headers = new Headers(options.headers || {})
        options.headers.set('Authorization', `Bearer ${auth.token.value}`)
      }
    }
  }
)

const responseData = computed(() => data.value?.data)
const challenges = computed(() => responseData.value?.challenges || [])
const currentMonth = computed(() => responseData.value?.currentMonth || '')

const calculatePercentage = (current: number, target: number) => {
  return Math.min(Math.round((current / target) * 100), 100)
}

const formatDistance = (meters: number) => {
  return (meters / 1000).toFixed(1) + ' km'
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] pt-6 px-4 pb-24">
    <!-- HEADER -->
    <header class="mb-6">
      <h1 class="text-2xl font-black text-white tracking-tight">Tantangan Bulanan</h1>
      <p class="text-sm text-gray-400 mt-1 font-medium">Bulan: <span class="text-strava-orange font-bold">{{ currentMonth || 'Memuat...' }}</span></p>
      <p class="text-xs text-gray-500 mt-2">Selesaikan target di bawah ini untuk mendapatkan lencana emas eksklusif yang akan terpampang di profil Anda selamanya!</p>
    </header>

    <!-- LOADING STATE -->
    <div v-if="pending" class="space-y-4">
      <div v-for="i in 2" :key="i" class="animate-pulse bg-[#1c1c1e] rounded-2xl h-36 w-full border border-gray-800"></div>
    </div>

    <!-- ERROR STATE -->
    <div v-else-if="error" class="bg-red-900/10 text-red-400 p-6 rounded-2xl border border-red-900/30 text-center">
      <p class="font-bold">Gagal memuat tantangan</p>
      <button @click="() => refresh()" class="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white text-xs font-bold">Coba Lagi</button>
    </div>

    <!-- CHALLENGES LIST -->
    <div v-else class="space-y-5">
      
      <div v-for="challenge in challenges" :key="challenge.id" 
           class="relative overflow-hidden rounded-2xl border transition-all duration-300"
           :class="challenge.isCompleted ? 'bg-linear-to-br from-yellow-900/40 to-[#1c1c1e] border-yellow-700/50 shadow-[0_0_15px_rgba(202,138,4,0.15)]' : 'bg-[#1c1c1e] border-gray-800'">
        
        <!-- Badge Sukses -->
        <div v-if="challenge.isCompleted" class="absolute top-0 right-0 bg-yellow-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg shadow-md z-10 flex items-center">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
          Selesai
        </div>

        <div class="p-5">
          <div class="flex items-start space-x-4">
            <div class="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0 shadow-inner"
                 :class="challenge.isCompleted ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-800'">
              {{ challenge.icon.replace('🌟', '') }}
            </div>
            
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-bold truncate" :class="challenge.isCompleted ? 'text-yellow-500' : 'text-white'">{{ challenge.title }}</h2>
              <div class="flex justify-between items-end mt-2 mb-1">
                <span class="text-xl font-black" :class="challenge.isCompleted ? 'text-white' : 'text-gray-300'">
                  {{ formatDistance(challenge.currentMeters) }}
                </span>
                <span class="text-xs font-bold text-gray-500">/ {{ formatDistance(challenge.targetMeters) }}</span>
              </div>
              
              <!-- Progress Bar -->
              <div class="w-full bg-gray-800 rounded-full h-2.5 mb-1 overflow-hidden">
                <div class="h-2.5 rounded-full transition-all duration-1000 ease-out relative"
                     :class="challenge.isCompleted ? 'bg-yellow-500' : 'bg-strava-orange'"
                     :style="{ width: `${calculatePercentage(challenge.currentMeters, challenge.targetMeters)}%` }">
                  <div v-if="challenge.isCompleted" class="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                </div>
              </div>
              
              <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">
                <span>Progres</span>
                <span>{{ calculatePercentage(challenge.currentMeters, challenge.targetMeters) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
