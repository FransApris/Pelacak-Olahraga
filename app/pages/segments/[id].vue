<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const segmentId = route.params.id as string
const auth = useAuth()

const { data: responseData, pending, error } = await useFetch<any>(`/api/segments/${segmentId}`, {
  headers: {
    Authorization: auth.token.value ? `Bearer ${auth.token.value}` : ''
  },
  lazy: true
})

const segment = computed(() => responseData.value?.data?.segment)
const leaderboard = computed(() => (responseData.value?.data?.leaderboard || []) as any[])

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] pb-24">
    
    <!-- LOADING -->
    <div v-if="pending" class="p-4 space-y-4 pt-10">
      <div class="h-40 bg-gray-800 rounded-2xl animate-pulse"></div>
      <div class="h-8 bg-gray-800 rounded w-1/2 animate-pulse mt-4"></div>
      <div class="h-64 bg-gray-800 rounded-2xl animate-pulse"></div>
    </div>
    
    <!-- ERROR -->
    <div v-else-if="error || !segment" class="p-6 pt-20 text-center">
      <div class="bg-red-900/10 text-red-400 p-6 rounded-2xl border border-red-900/30">
        Segmen tidak ditemukan atau terjadi kesalahan.
      </div>
      <NuxtLink to="/segments" class="mt-4 inline-block px-4 py-2 bg-gray-800 rounded-full text-white text-xs font-bold hover:bg-gray-700">Kembali</NuxtLink>
    </div>
    
    <div v-else>
      <!-- HEADER MAP -->
      <div class="relative h-48 sm:h-64 bg-[#1c1c1e] flex flex-col justify-end">
        <ClientOnly>
          <!-- Menggambar rute lurus antara titik start dan end sebagai placeholder peta -->
          <ActivityMap :routePoints="[
            { latitude: segment.startLat, longitude: segment.startLng },
            { latitude: segment.endLat, longitude: segment.endLng }
          ]" />
        </ClientOnly>
        <div class="absolute inset-0 bg-linear-to-t from-[#121212] via-[#121212]/50 to-transparent pointer-events-none"></div>
        
        <div class="relative z-10 px-4 pb-4">
          <NuxtLink to="/segments" class="inline-flex items-center text-xs font-bold text-gray-400 hover:text-white mb-2 transition-colors">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            Kembali
          </NuxtLink>
          <h1 class="text-3xl font-black text-white drop-shadow-md tracking-tight">{{ segment.name }}</h1>
          <div class="flex items-center space-x-3 mt-1 text-xs font-bold text-gray-400 uppercase tracking-wider">
             <span class="text-strava-orange">{{ (segment.distance / 1000).toFixed(2) }} KM</span>
             <span class="w-1 h-1 rounded-full bg-gray-600"></span>
             <span>{{ segment._count?.efforts || 0 }} Rekor</span>
          </div>
        </div>
      </div>
      
      <div class="max-w-2xl mx-auto mt-4 px-4">
        <!-- LEADERBOARD (KOM / QOM) -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-black text-white tracking-tight">Papan Peringkat (KOM)</h2>
          <span class="text-xs font-bold bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-sm">Top 10</span>
        </div>
        
        <div class="bg-[#1c1c1e] rounded-2xl border border-gray-800 overflow-hidden">
          <div v-if="leaderboard.length === 0" class="p-8 text-center">
            <p class="text-gray-500 font-medium text-sm">Belum ada rekor untuk segmen ini.</p>
            <p class="text-xs text-gray-600 mt-1">Jadilah yang pertama untuk meraih mahkota KOM!</p>
          </div>
          
          <div v-else class="divide-y divide-gray-800/50">
            <div v-for="(effort, index) in leaderboard" :key="effort.id" 
                 class="flex items-center p-4 hover:bg-gray-800/30 transition-colors"
                 :class="{ 'bg-yellow-900/10': index === 0 }">
              
              <!-- Peringkat -->
              <div class="w-8 shrink-0 text-center">
                <span v-if="index === 0" class="text-xl">👑</span>
                <span v-else class="text-sm font-black" :class="Number(index) < 3 ? 'text-gray-300' : 'text-gray-600'">{{ Number(index) + 1 }}</span>
              </div>
              
              <!-- Profil -->
              <NuxtLink :to="`/profile/${effort.user.id}`" class="flex items-center flex-1 min-w-0 ml-2">
                <img :src="effort.user.profilePicture || `https://ui-avatars.com/api/?name=${effort.user.name}&background=random`" 
                     class="w-10 h-10 rounded-full border-2 border-gray-800 object-cover" 
                     :class="{ 'border-yellow-600': index === 0 }" />
                <div class="ml-3 truncate">
                  <h3 class="text-sm font-bold truncate transition-colors" :class="index === 0 ? 'text-yellow-500' : 'text-white hover:text-strava-orange'">
                    {{ effort.user.name }}
                  </h3>
                  <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    {{ new Date(effort.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                  </p>
                </div>
              </NuxtLink>
              
              <!-- Durasi -->
              <div class="text-right pl-4">
                <div class="text-lg font-black font-mono tracking-tighter" :class="index === 0 ? 'text-yellow-500' : 'text-white'">
                  {{ formatDuration(effort.duration) }}
                </div>
                <div class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  {{ ((segment.distance / 1000) / (effort.duration / 3600)).toFixed(1) }} km/h
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>
