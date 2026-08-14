<script setup lang="ts">
import { useAuth } from '../composables/useAuth'
const auth = useAuth()
</script>

<template>
  <nav v-if="auth.isAuthenticated.value" class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#1c1c1e] border-t border-gray-800 z-50">
    <div class="flex justify-around items-center h-16">
      
      <!-- Menu: Umpan -->
      <NuxtLink to="/" class="flex flex-col items-center justify-center w-full h-full group" active-class="text-strava-orange">
        <svg class="w-6 h-6 mb-1 text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        <span class="text-[10px] font-bold text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors">Umpan</span>
      </NuxtLink>

      <!-- Menu: Spesifikasi / List -->
      <NuxtLink to="/record" class="flex flex-col items-center justify-center w-full h-full group" active-class="text-strava-orange">
        <svg class="w-6 h-6 mb-1 text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        <span class="text-[10px] font-bold text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors">Rekam</span>
      </NuxtLink>

      <!-- Menu: Peringkat -->
      <NuxtLink to="/leaderboard" class="flex flex-col items-center justify-center w-full h-full group" active-class="text-strava-orange">
        <svg class="w-6 h-6 mb-1 text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
        <span class="text-[10px] font-bold text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors">Peringkat</span>
      </NuxtLink>

      <!-- Menu: Tantangan -->
      <NuxtLink to="/challenges" class="flex flex-col items-center justify-center w-full h-full group" active-class="text-strava-orange">
        <svg class="w-6 h-6 mb-1 text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span class="text-[10px] font-bold text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors">Tantangan</span>
      </NuxtLink>

      <!-- Menu: Profil -->
      <NuxtLink :to="`/profile/${auth.user.value?.id}`" class="flex flex-col items-center justify-center w-full h-full group" active-class="text-strava-orange">
        <svg class="w-6 h-6 mb-1 text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        <span class="text-[10px] font-bold text-gray-500 group-[.text-strava-orange]:text-strava-orange transition-colors">Profil</span>
      </NuxtLink>

    </div>
  </nav>
</template>
