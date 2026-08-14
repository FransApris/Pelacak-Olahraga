<script setup lang="ts">
import { useAuth } from './composables/useAuth'

const auth = useAuth()
await useAsyncData('init-auth', async () => {
  await auth.initAuth()
  return true
})
</script>

<template>
  <div class="bg-[#0a0a0a] min-h-screen font-sans text-gray-100 flex justify-center">
    <!-- Kontainer utama berukuran HP max-w-md -->
    <div class="w-full max-w-md bg-[#121212] min-h-screen relative shadow-2xl overflow-x-hidden">
      <NuxtRouteAnnouncer />
      <NuxtPage />
      <BottomNav />
    </div>
  </div>
</template>
