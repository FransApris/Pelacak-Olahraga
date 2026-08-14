<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

const auth = useAuth()

const { data: responseData, pending, error, refresh } = await useFetch<any>('/api/clubs', {
  lazy: true
})

const clubs = computed(() => responseData.value?.data || [])

// Fungsi membuat klub sederhana
const createClub = async () => {
  if (!auth.isAuthenticated.value) {
    alert('Silakan login untuk membuat klub')
    return
  }
  
  const name = window.prompt('Nama Klub:')
  if (!name) return
  const description = window.prompt('Deskripsi Klub (Opsional):') || ''
  
  try {
    const res = await $fetch<any>('/api/clubs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token.value}` },
      body: { name, description }
    })
    
    if (res.success) {
      alert('Klub berhasil dibuat!')
      refresh()
    }
  } catch (err) {
    alert('Gagal membuat klub')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] pt-6 px-4 pb-24">
    <!-- HEADER -->
    <header class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight">Klub</h1>
        <p class="text-sm text-gray-400 mt-1 font-medium">Temukan komunitas Anda</p>
      </div>
      <button @click="createClub" class="bg-strava-orange text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-orange-600 transition-colors">
        + Buat Klub
      </button>
    </header>

    <!-- LOADING STATE -->
    <div v-if="pending" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-[#1c1c1e] rounded-2xl h-24 w-full border border-gray-800"></div>
    </div>

    <!-- ERROR STATE -->
    <div v-else-if="error" class="bg-red-900/10 text-red-400 p-6 rounded-2xl border border-red-900/30 text-center">
      <p class="font-bold">Gagal memuat klub</p>
      <button @click="() => refresh()" class="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white text-xs font-bold">Coba Lagi</button>
    </div>

    <!-- CLUBS LIST -->
    <div v-else class="space-y-4">
      <div v-if="clubs.length === 0" class="text-center py-10 bg-[#1c1c1e] rounded-2xl border border-gray-800">
        <span class="text-4xl mb-3 block">🚴‍♂️</span>
        <p class="text-gray-400 font-medium">Belum ada klub.</p>
        <p class="text-sm text-gray-500">Jadilah yang pertama membuat klub!</p>
      </div>

      <NuxtLink v-for="club in clubs" :key="club.id" :to="`/clubs/${club.id}`" class="bg-[#1c1c1e] rounded-2xl border border-gray-800 p-4 hover:border-gray-600 transition-all flex items-center space-x-4">
        <!-- Logo Klub -->
        <div class="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
          <img v-if="club.coverImage" :src="club.coverImage" class="w-full h-full object-cover" />
          <span v-else>{{ club.name.charAt(0).toUpperCase() }}</span>
        </div>
        
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-bold text-white truncate">{{ club.name }}</h2>
          <p class="text-xs text-gray-400 mt-1 truncate">{{ club.description || 'Klub Olahraga' }}</p>
          <div class="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            {{ club._count?.members || 0 }} Anggota
          </div>
        </div>
        
        <div class="text-gray-500">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
