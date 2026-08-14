<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '../composables/useAuth'

const activeMetric = ref('distance')

const auth = useAuth()

// Panggil API leaderboard, otomatis refetch saat `activeMetric` berubah
const { data: responseData, pending, error, refresh } = await useFetch('/api/leaderboard', {
  query: { metric: activeMetric },
  headers: computed(() => ({
    Authorization: auth.token.value ? `Bearer ${auth.token.value}` : ''
  })),
  watch: [activeMetric],
  lazy: true
})

const leaderboard = computed(() => responseData.value?.data || [])

// Pisahkan 3 teratas untuk podium
const top3 = computed(() => leaderboard.value.slice(0, 3))
const others = computed(() => leaderboard.value.slice(3))

// Format value (Jarak atau Durasi)
const formatValue = (val: number) => {
  if (activeMetric.value === 'distance') {
    return (val / 1000).toFixed(2) + ' km'
  } else {
    const h = Math.floor(val / 3600)
    const m = Math.floor((val % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] pt-6 px-4 pb-24">
    
    <!-- HEADER -->
    <header class="mb-6 text-center">
      <h1 class="text-2xl font-black text-white tracking-tight uppercase flex items-center justify-center space-x-2">
        <span class="text-strava-orange">🏆</span>
        <span>Papan Peringkat</span>
      </h1>
      <p class="text-xs text-gray-400 font-medium mt-1">Siapa yang paling tangguh minggu ini?</p>
    </header>

    <!-- TOGGLE METRIC -->
    <div class="bg-[#1c1c1e] p-1 rounded-xl flex mb-8 border border-gray-800 mx-auto max-w-xs relative z-10 shadow-lg">
      <button 
        @click="activeMetric = 'distance'"
        class="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
        :class="activeMetric === 'distance' ? 'bg-strava-orange text-white shadow-md shadow-orange-500/20' : 'text-gray-400 hover:text-gray-200'"
      >
        Jarak (Jauh)
      </button>
      <button 
        @click="activeMetric = 'duration'"
        class="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
        :class="activeMetric === 'duration' ? 'bg-strava-orange text-white shadow-md shadow-orange-500/20' : 'text-gray-400 hover:text-gray-200'"
      >
        Durasi (Lama)
      </button>
    </div>

    <!-- TAUTAN KE SEGMEN -->
    <div class="mb-8 text-center flex justify-center">
      <NuxtLink to="/segments" class="inline-flex items-center space-x-2 bg-linear-to-r from-gray-800 to-[#1c1c1e] hover:from-gray-700 hover:to-gray-800 text-white px-5 py-2.5 rounded-full text-sm font-bold border border-gray-700 shadow-md transition-all group">
        <span class="text-lg">🏔️</span>
        <span>Jelajahi Segmen & KOM</span>
        <svg class="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </NuxtLink>
    </div>

    <!-- ERROR & PENDING STATE -->
    <div v-if="error" class="text-center p-6 bg-red-900/20 rounded-xl border border-red-900/50">
      <p class="text-red-400 font-bold mb-2">Gagal memuat papan peringkat</p>
      <button @click="() => refresh()" class="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold">Coba Lagi</button>
    </div>

    <div v-else-if="pending" class="flex justify-center py-10">
      <svg class="animate-spin w-10 h-10 text-strava-orange" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    </div>

    <div v-else-if="leaderboard.length === 0" class="text-center py-12 px-4 border border-dashed border-gray-700 rounded-2xl">
      <div class="text-4xl mb-3 opacity-50">🏃</div>
      <p class="text-gray-400 text-sm font-bold">Belum ada aktivitas tercatat.</p>
      <p class="text-gray-500 text-xs mt-1">Jadilah yang pertama untuk memimpin papan peringkat!</p>
    </div>

    <!-- ACTUAL LEADERBOARD -->
    <div v-else class="space-y-8 relative">
      
      <!-- GLOW BACKGROUND BEHIND PODIUM -->
      <div class="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-orange-500/20 blur-3xl rounded-full pointer-events-none"></div>

      <!-- PODIUM TOP 3 -->
      <div class="flex items-end justify-center h-48 space-x-2 sm:space-x-4 mb-4 relative z-10 px-2">
        
        <!-- Peringkat 2 -->
        <div v-if="top3[1]" class="flex flex-col items-center flex-1 pb-4 animate-[slideUp_0.4s_ease-out]">
          <div class="text-xl mb-1 drop-shadow-md">🥈</div>
          <NuxtLink :to="`/profile/${top3[1].userId}`" class="relative group">
            <img :src="top3[1].profilePicture" class="w-14 h-14 rounded-full border-4 border-[#C0C0C0] object-cover shadow-[0_0_15px_rgba(192,192,192,0.3)] bg-gray-800" />
            <div class="absolute -bottom-2 -right-1 w-6 h-6 bg-[#1c1c1e] rounded-full flex items-center justify-center font-black text-xs text-[#C0C0C0] border border-[#C0C0C0]">2</div>
          </NuxtLink>
          <div class="mt-3 text-center">
            <div class="text-xs font-bold text-gray-100 truncate w-20">{{ top3[1].name }}</div>
            <div class="text-[10px] text-strava-orange font-black bg-strava-orange/10 px-2 py-0.5 rounded mt-1 inline-block">{{ formatValue(top3[1].value) }}</div>
          </div>
        </div>

        <!-- Peringkat 1 -->
        <div v-if="top3[0]" class="flex flex-col items-center flex-1 pb-8 z-10 animate-[slideUp_0.5s_ease-out]">
          <div class="text-3xl mb-1 drop-shadow-xl animate-bounce">👑</div>
          <NuxtLink :to="`/profile/${top3[0].userId}`" class="relative group">
            <img :src="top3[0].profilePicture" class="w-20 h-20 rounded-full border-4 border-[#FFD700] object-cover shadow-[0_0_25px_rgba(255,215,0,0.4)] bg-gray-800" />
            <div class="absolute -bottom-2 -right-1 w-7 h-7 bg-[#1c1c1e] rounded-full flex items-center justify-center font-black text-sm text-[#FFD700] border-2 border-[#FFD700]">1</div>
          </NuxtLink>
          <div class="mt-3 text-center">
            <div class="text-sm font-black text-white truncate w-24 drop-shadow-sm">{{ top3[0].name }}</div>
            <div class="text-xs text-strava-orange font-black bg-strava-orange/20 border border-strava-orange/30 px-2.5 py-1 rounded-md mt-1 inline-block shadow-sm">{{ formatValue(top3[0].value) }}</div>
          </div>
        </div>

        <!-- Peringkat 3 -->
        <div v-if="top3[2]" class="flex flex-col items-center flex-1 pb-2 animate-[slideUp_0.6s_ease-out]">
          <div class="text-xl mb-1 drop-shadow-md">🥉</div>
          <NuxtLink :to="`/profile/${top3[2].userId}`" class="relative group">
            <img :src="top3[2].profilePicture" class="w-12 h-12 rounded-full border-4 border-[#CD7F32] object-cover shadow-[0_0_15px_rgba(205,127,50,0.3)] bg-gray-800" />
            <div class="absolute -bottom-2 -right-1 w-5 h-5 bg-[#1c1c1e] rounded-full flex items-center justify-center font-black text-[10px] text-[#CD7F32] border border-[#CD7F32]">3</div>
          </NuxtLink>
          <div class="mt-3 text-center">
            <div class="text-[11px] font-bold text-gray-200 truncate w-20">{{ top3[2].name }}</div>
            <div class="text-[10px] text-strava-orange font-black bg-strava-orange/10 px-2 py-0.5 rounded mt-1 inline-block">{{ formatValue(top3[2].value) }}</div>
          </div>
        </div>
      </div>

      <!-- LIST OTHER RANKS -->
      <div v-if="others.length > 0" class="bg-[#1c1c1e] rounded-2xl border border-gray-800/60 overflow-hidden shadow-lg relative z-10">
        <NuxtLink 
          v-for="(item, index) in others" 
          :key="item.userId"
          :to="`/profile/${item.userId}`"
          class="flex items-center px-4 py-3.5 border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors group"
        >
          <!-- Rank Number -->
          <div class="w-8 text-center text-xs font-bold text-gray-500 group-hover:text-gray-300">
            {{ item.rank }}
          </div>
          
          <!-- Avatar -->
          <img :src="item.profilePicture" class="w-10 h-10 rounded-full bg-gray-800 ml-2 object-cover border border-gray-700" />
          
          <!-- Info -->
          <div class="ml-3 flex-1">
            <div class="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{{ item.name }}</div>
          </div>
          
          <!-- Value -->
          <div class="font-black text-sm text-gray-300 group-hover:text-strava-orange transition-colors">
            {{ formatValue(item.value) }}
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
