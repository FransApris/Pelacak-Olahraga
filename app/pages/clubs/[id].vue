<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const route = useRoute()
const clubId = route.params.id as string
const auth = useAuth()

const { data: responseData, pending, error, refresh } = await useFetch<any>(`/api/clubs/${clubId}`, {
  lazy: true
})

const club = computed(() => responseData.value?.data?.club)
const recentActivities = computed(() => responseData.value?.data?.recentActivities || [])

// Cek apakah user saat ini adalah anggota
const isMember = computed(() => {
  if (!auth.isAuthenticated.value || !club.value) return false
  return club.value.members.some((m: any) => m.user.id === auth.user.value?.id)
})

const isTogglingJoin = ref(false)

const toggleJoin = async () => {
  if (!auth.isAuthenticated.value) {
    alert('Silakan login untuk bergabung')
    return
  }
  
  isTogglingJoin.value = true
  try {
    const res = await $fetch<any>(`/api/clubs/${clubId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token.value}` }
    })
    if (res.success) {
      refresh()
    }
  } catch (err) {
    alert('Gagal memproses permintaan')
  } finally {
    isTogglingJoin.value = false
  }
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
    <div v-else-if="error || !club" class="p-6 pt-20 text-center">
      <div class="bg-red-900/10 text-red-400 p-6 rounded-2xl border border-red-900/30">
        Klub tidak ditemukan atau terjadi kesalahan.
      </div>
    </div>
    
    <div v-else>
      <!-- HEADER COVER -->
      <div class="relative h-48 sm:h-64 bg-linear-to-br from-gray-800 to-gray-900 flex items-end justify-center pb-6">
        <img v-if="club.coverImage" :src="club.coverImage" class="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div class="absolute inset-0 bg-linear-to-t from-[#121212] to-transparent"></div>
        
        <div class="relative z-10 text-center px-4">
          <h1 class="text-3xl font-black text-white drop-shadow-md">{{ club.name }}</h1>
          <p class="text-sm text-gray-300 mt-2 max-w-md mx-auto">{{ club.description || 'Komunitas olahraga' }}</p>
          <div class="flex items-center justify-center space-x-2 mt-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
             <svg class="w-4 h-4 text-strava-orange" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
             <span>{{ club._count?.members || 0 }} Anggota</span>
          </div>
        </div>
      </div>
      
      <!-- ACTION BAR -->
      <div class="px-4 -mt-4 relative z-20 flex justify-center">
        <button 
          @click="toggleJoin"
          :disabled="isTogglingJoin"
          class="px-8 py-3 rounded-full font-black text-sm uppercase tracking-wider shadow-lg transition-all min-w-40"
          :class="isMember 
            ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700' 
            : 'bg-strava-orange text-white hover:bg-orange-600'"
        >
          <span v-if="isTogglingJoin">Memproses...</span>
          <span v-else>{{ isMember ? 'Keluar Klub' : 'Gabung Klub' }}</span>
        </button>
      </div>
      
      <div class="max-w-2xl mx-auto mt-8 px-4">
        <!-- MEMBERS TABS (MEMBER LIST) -->
        <h2 class="text-lg font-bold text-white mb-4">Anggota Klub</h2>
        <div class="flex overflow-x-auto space-x-3 pb-4 scrollbar-hide">
          <NuxtLink v-for="member in club.members" :key="member.user.id" :to="`/profile/${member.user.id}`" class="flex flex-col items-center shrink-0 w-16">
            <img :src="member.user.profilePicture || `https://ui-avatars.com/api/?name=${member.user.name}&background=random`" class="w-14 h-14 rounded-full border-2 border-gray-800 object-cover mb-1" />
            <span class="text-[10px] text-gray-400 truncate w-full text-center">{{ member.user.name.split(' ')[0] }}</span>
            <span v-if="member.role === 'ADMIN'" class="text-[8px] bg-strava-orange text-white px-1 rounded-sm mt-0.5">ADMIN</span>
          </NuxtLink>
        </div>
        
        <!-- RECENT ACTIVITIES FEED -->
        <h2 class="text-lg font-bold text-white mt-6 mb-4">Aktivitas Terbaru</h2>
        <div v-if="recentActivities.length === 0" class="text-center py-10 bg-[#1c1c1e] rounded-2xl border border-gray-800">
          <p class="text-gray-400 text-sm">Belum ada aktivitas dari anggota klub ini.</p>
        </div>
        <div v-else class="space-y-4">
          <ActivityCard 
            v-for="activity in recentActivities" 
            :key="activity.id" 
            :activity="activity"
          />
        </div>
      </div>
    </div>
    
  </div>
</template>
