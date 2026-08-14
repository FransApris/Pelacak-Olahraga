<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'

const auth = useAuth()
const searchQuery = ref('')
const users = ref<any[]>([])
const isLoading = ref(false)
const hasSearched = ref(false)
let searchTimeout: any = null

const performSearch = async () => {
  if (!searchQuery.value.trim()) {
    users.value = []
    hasSearched.value = false
    return
  }

  isLoading.value = true
  hasSearched.value = true
  
  try {
    const headers: any = {}
    if (auth.token.value) {
      headers['Authorization'] = `Bearer ${auth.token.value}`
    }

    const response = await $fetch<any>(`/api/users/search`, {
      query: { q: searchQuery.value },
      headers
    })

    if (response.success) {
      users.value = response.data
    }
  } catch (error) {
    console.error('Search failed', error)
  } finally {
    isLoading.value = false
  }
}

// Debounce search
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 500)
})

// Toggle Follow Logic
const togglingId = ref<string | null>(null)
const toggleFollow = async (user: any) => {
  if (!auth.isAuthenticated.value) {
    alert("Silakan login untuk mengikuti pengguna.")
    return
  }
  
  togglingId.value = user.id
  try {
    const response = await $fetch<any>(`/api/users/${user.id}/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token.value}` }
    })
    
    if (response.success) {
      user.isFollowing = response.isFollowing
      if (response.isFollowing) {
        user._count.followers++
      } else {
        user._count.followers--
      }
    }
  } catch (err) {
    console.error('Failed to toggle follow', err)
  } finally {
    togglingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] flex flex-col">
    <!-- HEADER -->
    <header class="bg-[#1c1c1e] pt-6 pb-4 px-4 sticky top-0 z-10 border-b border-gray-800 flex items-center space-x-3">
      <NuxtLink to="/" class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 hover:bg-gray-700 transition-colors text-white">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </NuxtLink>
      <div class="relative flex-1">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Cari teman, pelari, atau pesepeda..." 
          class="w-full bg-[#2a2a2c] text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 focus:border-strava-orange focus:ring-1 focus:ring-strava-orange outline-none transition-all placeholder-gray-500 font-medium"
          autofocus
        />
        <button 
          v-if="searchQuery" 
          @click="searchQuery = ''"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </header>

    <!-- CONTENT -->
    <main class="flex-1 overflow-y-auto px-4 py-6 pb-24">
      
      <!-- INITIAL STATE -->
      <div v-if="!hasSearched" class="text-center py-10">
        <div class="w-16 h-16 bg-[#1c1c1e] rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-800">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        </div>
        <h2 class="text-white font-bold mb-1">Cari Atlet Lain</h2>
        <p class="text-gray-500 text-xs">Temukan teman dan ikuti progres latihan mereka.</p>
      </div>

      <!-- LOADING STATE -->
      <div v-else-if="isLoading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="flex items-center space-x-3 p-3 bg-[#1c1c1e] rounded-2xl border border-gray-800 animate-pulse">
          <div class="w-12 h-12 rounded-full bg-gray-800"></div>
          <div class="flex-1">
            <div class="h-4 bg-gray-800 rounded w-1/3 mb-2"></div>
            <div class="h-3 bg-gray-800 rounded w-1/2"></div>
          </div>
          <div class="w-20 h-8 rounded-full bg-gray-800"></div>
        </div>
      </div>

      <!-- NO RESULTS -->
      <div v-else-if="users.length === 0" class="text-center py-10">
        <p class="text-gray-400 font-medium">Tidak ada pengguna yang cocok dengan "<span class="text-white">{{ searchQuery }}</span>"</p>
      </div>

      <!-- RESULTS LIST -->
      <div v-else class="space-y-3">
        <div 
          v-for="user in users" 
          :key="user.id" 
          class="flex items-center space-x-3 p-3 bg-[#1c1c1e] rounded-2xl border border-gray-800 transition-colors hover:border-gray-700"
        >
          <NuxtLink :to="`/profile/${user.id}`" class="shrink-0">
            <img :src="user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&background=random`" class="w-12 h-12 rounded-full object-cover border-2 border-gray-800" />
          </NuxtLink>
          
          <div class="flex-1 min-w-0">
            <NuxtLink :to="`/profile/${user.id}`" class="block">
              <h3 class="font-bold text-white text-sm truncate">{{ user.name }}</h3>
              <p class="text-[11px] text-gray-500 truncate mt-0.5">{{ user.bio || 'Atlet Tangguh' }}</p>
              <div class="text-[10px] text-gray-400 font-semibold mt-1">
                {{ user._count?.followers || 0 }} Pengikut
              </div>
            </NuxtLink>
          </div>
          
          <button 
            @click="toggleFollow(user)"
            :disabled="togglingId === user.id"
            class="px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 min-w-22.5 text-center"
            :class="user.isFollowing 
              ? 'bg-[#2a2a2c] text-white hover:bg-gray-700 border border-gray-700' 
              : 'bg-white text-gray-900 hover:bg-gray-200'"
          >
            <svg v-if="togglingId === user.id" class="animate-spin h-3.5 w-3.5 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span v-else>{{ user.isFollowing ? 'Mengikuti' : 'Ikuti' }}</span>
          </button>
        </div>
      </div>

    </main>
  </div>
</template>
