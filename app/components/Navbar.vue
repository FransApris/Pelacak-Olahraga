<script setup lang="ts">
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'

const auth = useAuth()
const router = useRouter()

const handleLogout = () => {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
      
      <!-- LOGO -->
      <NuxtLink to="/" class="flex items-center space-x-2">
        <div class="w-9 h-9 bg-strava-orange rounded-xl flex items-center justify-center shadow-sm">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <span class="text-xl font-black tracking-tight text-gray-900 hidden sm:block">NuxtSports</span>
      </NuxtLink>

      <!-- MENU -->
      <div class="flex items-center space-x-2 sm:space-x-4">
        
        <template v-if="auth.isAuthenticated.value">
          <NuxtLink to="/" class="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-strava-orange transition-colors">
            Feed
          </NuxtLink>
          <NuxtLink to="/leaderboard" class="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-strava-orange transition-colors">
            Peringkat
          </NuxtLink>
          <NuxtLink :to="`/profile/${auth.user.value?.id}`" class="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-strava-orange transition-colors">
            Profil
          </NuxtLink>
          
          <!-- Tombol Tambah Aktivitas -->
          <NuxtLink to="/record" class="ml-1 w-8 h-8 flex items-center justify-center bg-strava-orange hover:bg-orange-600 text-white rounded-full shadow-md transition-transform hover:scale-105" title="Tambah Aktivitas">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          </NuxtLink>
          
          <div class="w-px h-6 bg-gray-200 mx-2 hidden sm:block"></div>
          
          <!-- Tombol Logout -->
          <button @click="handleLogout" class="ml-1 px-4 py-2 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-sm font-bold text-gray-600 border border-gray-200 hover:border-red-200 rounded-full transition-all shadow-sm">
            Keluar
          </button>
        </template>
        
        <template v-else>
          <NuxtLink to="/login" class="px-5 py-2 bg-strava-orange hover:bg-orange-600 text-white text-sm font-bold rounded-full transition-all shadow-md transform hover:-translate-y-0.5">
            Masuk / Daftar
          </NuxtLink>
        </template>

      </div>
    </div>
  </nav>
</template>
