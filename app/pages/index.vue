<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

// Tentukan API base URL
const apiUrl = '/api/feed'

const auth = useAuth()
const feedType = ref('following') // Default to following for a more personal feed
const activeFilter = ref('Semua')

const { data: responseData, pending, error, refresh } = await useFetch<{ data: any[] }>(apiUrl, {
  lazy: true,
  query: { feedType },
  onRequest({ options }) {
    options.mode = 'cors'
    if (auth.token.value) {
      options.headers = new Headers(options.headers || {})
      options.headers.set('Authorization', `Bearer ${auth.token.value}`)
    }
  }
})

// Ekstrak list aktivitas dari response (struktur dari endpoint: { success: true, data: [...] })
const activities = computed(() => {
  const allActivities = responseData.value?.data || []
  if (activeFilter.value === 'Semua') return allActivities
  
  const typeMap: Record<string, string> = {
    'Lari': 'RUN',
    'Sepeda': 'RIDE',
    'Renang': 'SWIM'
  }
  
  return allActivities.filter(a => a.type === typeMap[activeFilter.value])
})

// Fungsi pull-to-refresh / Refresh manual
const isRefreshing = ref(false)
const handleRefresh = async () => {
  isRefreshing.value = true
  await refresh()
  isRefreshing.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] pt-6 px-4 pb-20">
    
    <!-- HEADER -->
    <header class="mb-4">
      <div class="flex justify-between items-center mb-1">
        <h1 class="text-lg font-black text-strava-orange tracking-wider uppercase">Pelacak Olahraga</h1>
        <div class="flex items-center space-x-3">
          <NuxtLink to="/search" class="text-gray-400 hover:text-strava-orange transition-colors" title="Cari Teman">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </NuxtLink>
          <NuxtLink to="/clubs" class="text-xs font-bold text-gray-400 hover:text-strava-orange transition-colors flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Klub
          </NuxtLink>
          <button @click="handleRefresh" class="text-gray-400 hover:text-white" :class="{'animate-spin text-strava-orange': isRefreshing}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>
      <p class="text-xs text-gray-400 font-medium">Umpan Aktivitas Atlet & Komunitas</p>
    </header>

    <!-- FEED TYPE TABS (Global vs Mengikuti) -->
    <div v-if="auth.isAuthenticated.value" class="flex space-x-1 bg-[#1c1c1e] p-1.5 rounded-xl mb-4 border border-gray-800">
      <button 
        @click="feedType = 'following'" 
        class="flex-1 py-2 text-xs font-bold rounded-lg transition-colors tracking-wide"
        :class="feedType === 'following' ? 'bg-[#2a2a2c] text-white shadow border border-gray-700' : 'text-gray-500 hover:text-gray-300'"
      >Mengikuti</button>
      <button 
        @click="feedType = 'global'" 
        class="flex-1 py-2 text-xs font-bold rounded-lg transition-colors tracking-wide"
        :class="feedType === 'global' ? 'bg-[#2a2a2c] text-white shadow border border-gray-700' : 'text-gray-500 hover:text-gray-300'"
      >Global</button>
    </div>

    <!-- FILTER CHIPS -->
    <div class="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide mb-2 -mx-4 px-4">
      <button 
        v-for="f in [
          { id: 'Semua', label: 'Semua', icon: '' },
          { id: 'Lari', label: 'Lari', icon: '🏃' },
          { id: 'Sepeda', label: 'Sepeda', icon: '🚴' },
          { id: 'Renang', label: 'Renang', icon: '🏊' }
        ]" :key="f.id"
        @click="activeFilter = f.id"
        class="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center space-x-1.5 border"
        :class="activeFilter === f.id ? 'bg-strava-orange border-strava-orange text-white' : 'bg-[#2a2a2c] border-gray-700/50 text-gray-300 hover:bg-gray-700'"
      >
        <span v-if="f.icon" class="text-[10px]">{{ f.icon }}</span>
        <span>{{ f.label }}</span>
      </button>
    </div>

    <!-- FEED CONTAINER -->
    <main class="w-full">
      
      <!-- ERROR STATE -->
      <div v-if="error" class="bg-red-900/10 text-red-400 p-6 rounded-2xl border border-red-900/30 flex flex-col items-center justify-center text-center mt-4">
        <svg class="w-10 h-10 mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <p class="font-bold mb-1 text-red-300">Gagal memuat feed</p>
        <p class="text-xs opacity-70 mb-5">Anda harus masuk (login) untuk melihat umpan aktivitas.</p>
        <NuxtLink v-if="!auth.isAuthenticated.value" to="/login" class="px-6 py-2.5 bg-strava-orange text-white rounded-full text-sm font-bold shadow-lg shadow-orange-500/20">Login Sekarang</NuxtLink>
        <button v-else @click="() => refresh()" class="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white text-sm font-bold">Coba Lagi</button>
      </div>

      <!-- LOADING STATE -->
      <template v-else-if="pending && !isRefreshing">
        <ActivityCard v-for="i in 3" :key="`skeleton-${i}`" :loading="true" />
      </template>

      <!-- EMPTY STATE -->
      <div v-else-if="!pending && activities.length === 0" class="text-center py-16 px-4">
        <div class="w-16 h-16 bg-[#1c1c1e] rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-800">
          <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
        </div>
        <h3 class="text-sm font-bold text-gray-300 mb-1">
          {{ feedType === 'following' ? 'Umpan Anda masih kosong' : 'Belum ada aktivitas' }}
        </h3>
        <p class="text-gray-500 text-xs mt-2 max-w-62.5 mx-auto leading-relaxed">
          {{ feedType === 'following' ? 'Mulailah ikuti atlet lain atau jadilah yang pertama membagikan aktivitas!' : 'Jadilah yang pertama merekam olahraga hari ini!' }}
        </p>
        <button v-if="feedType === 'following'" @click="feedType = 'global'" class="mt-4 px-4 py-1.5 text-xs font-bold text-strava-orange border border-strava-orange/30 rounded-full hover:bg-strava-orange/10">
          Jelajahi Global
        </button>
      </div>

      <!-- ACTUAL LIST -->
      <template v-else>
        <ActivityCard 
          v-for="activity in activities" 
          :key="activity.id" 
          :activity="activity" 
        />
        
        <div class="text-center py-6 text-[10px] text-gray-600 font-bold uppercase tracking-widest pb-12">
          Akhir dari Umpan
        </div>
      </template>
      
    </main>

    <!-- FLOATING ACTION BUTTON (REKAM GPS) -->
    <NuxtLink v-if="auth.isAuthenticated.value" to="/record" class="absolute bottom-24 right-4 bg-strava-orange hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-full shadow-[0_8px_30px_rgb(252,76,2,0.3)] flex items-center space-x-2 transition-transform hover:scale-105 z-40 active:scale-95">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      <span class="text-sm tracking-wide">Rekam GPS</span>
    </NuxtLink>

  </div>
</template>
