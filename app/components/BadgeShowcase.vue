<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  allBadges: {
    type: Array as () => any[],
    default: () => [
      { id: '1', name: 'Lari 10km Pertama', description: 'Menyelesaikan 10km.', iconName: 'badge-10k' },
      { id: '2', name: 'Early Bird', description: 'Lari sebelum jam 6 pagi.', iconName: 'badge-early' }
    ]
  },
  earnedBadgeIds: {
    type: Array as () => string[],
    default: () => [] // Array of badge IDs user has earned
  }
})

// Fungsi helper untuk mengecek apakah badge sudah didapatkan
const hasEarned = (badgeId: string) => {
  return props.earnedBadgeIds.includes(badgeId)
}
</script>

<template>
  <div class="bg-white p-6 rounded-md shadow-sm border border-gray-200 mt-6 max-w-xl mx-auto">
    <h2 class="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
      <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>
      Pencapaian Anda
    </h2>
    <p class="text-sm text-gray-500 mb-6">Selesaikan tantangan untuk mengumpulkan lebih banyak medali.</p>
    
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">
      
      <!-- Card Badge -->
      <div 
        v-for="badge in allBadges" 
        :key="badge.id"
        class="flex flex-col items-center text-center group transition-all duration-300"
      >
        <!-- Icon Container -->
        <div 
          class="relative w-24 h-24 rounded-full flex items-center justify-center mb-3 border-4 transition-all duration-300"
          :class="[
            hasEarned(badge.id) 
              ? 'border-yellow-400 bg-linear-to-br from-yellow-100 to-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' 
              : 'border-gray-200 bg-gray-100 grayscale opacity-40 group-hover:opacity-60'
          ]"
        >
          <!-- Ikon SVG Default (Bisa disesuaikan dengan badge.iconName) -->
          <svg v-if="badge.iconName === 'badge-10k'" class="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          <svg v-else-if="badge.iconName === 'badge-early'" class="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          <svg v-else class="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
          
          <!-- Badge Terkunci (Gembok) -->
          <div v-if="!hasEarned(badge.id)" class="absolute -bottom-2 bg-gray-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>
          </div>
        </div>
        
        <!-- Text details -->
        <h3 class="font-bold text-sm text-gray-900" :class="{ 'text-gray-400': !hasEarned(badge.id) }">
          {{ badge.name }}
        </h3>
        <p class="text-xs text-gray-500 mt-1" :class="{ 'opacity-0 h-0': !hasEarned(badge.id) }">
          {{ badge.description }}
        </p>
      </div>

    </div>
  </div>
</template>
