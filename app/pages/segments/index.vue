<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

const auth = useAuth()

const { data: responseData, pending, error, refresh } = await useFetch<any>('/api/segments', {
  lazy: true,
  headers: {
    Authorization: auth.token.value ? `Bearer ${auth.token.value}` : ''
  }
})

const segments = computed(() => responseData.value?.data || [])

const isCreating = ref(false)
const createForm = ref({
  name: '',
  distance: 1000,
  startLat: -6.200000,
  startLng: 106.816666,
  endLat: -6.205000,
  endLng: 106.820000
})

const createSegment = async () => {
  if (!auth.isAuthenticated.value) {
    alert('Silakan login untuk membuat segmen')
    return
  }
  
  if (!createForm.value.name) return
  
  try {
    const res = await $fetch<any>('/api/segments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token.value}` },
      body: createForm.value
    })
    
    if (res.success) {
      alert('Segmen berhasil dibuat!')
      isCreating.value = false
      refresh()
    }
  } catch (err) {
    alert('Gagal membuat segmen')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#121212] pt-6 px-4 pb-24">
    <!-- HEADER -->
    <header class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight">Segmen & KOM</h1>
        <p class="text-sm text-gray-400 mt-1 font-medium">Taklukkan rute tercepat!</p>
      </div>
      <button @click="isCreating = !isCreating" class="bg-strava-orange text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-orange-600 transition-colors">
        {{ isCreating ? 'Batal' : '+ Buat Segmen' }}
      </button>
    </header>

    <!-- CREATE FORM -->
    <div v-if="isCreating" class="bg-[#1c1c1e] p-5 rounded-2xl border border-gray-800 mb-6">
      <h2 class="text-white font-bold mb-4">Buat Segmen Baru</h2>
      <div class="space-y-3">
        <input v-model="createForm.name" type="text" placeholder="Nama Segmen (misal: Tanjakan Sudirman)" class="w-full bg-[#2c2c2e] text-white px-4 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-strava-orange" />
        <div class="grid grid-cols-2 gap-3">
          <input v-model.number="createForm.startLat" type="number" step="0.000001" placeholder="Start Lat" class="w-full bg-[#2c2c2e] text-white px-4 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-strava-orange" />
          <input v-model.number="createForm.startLng" type="number" step="0.000001" placeholder="Start Lng" class="w-full bg-[#2c2c2e] text-white px-4 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-strava-orange" />
          <input v-model.number="createForm.endLat" type="number" step="0.000001" placeholder="End Lat" class="w-full bg-[#2c2c2e] text-white px-4 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-strava-orange" />
          <input v-model.number="createForm.endLng" type="number" step="0.000001" placeholder="End Lng" class="w-full bg-[#2c2c2e] text-white px-4 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-strava-orange" />
        </div>
        <input v-model.number="createForm.distance" type="number" placeholder="Jarak (meter)" class="w-full bg-[#2c2c2e] text-white px-4 py-2 rounded-lg text-sm border border-gray-700 outline-none focus:border-strava-orange" />
        <button @click="createSegment" class="w-full py-2 bg-strava-orange text-white font-bold rounded-lg text-sm">Simpan Segmen</button>
      </div>
    </div>

    <!-- LOADING STATE -->
    <div v-if="pending" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-[#1c1c1e] rounded-2xl h-24 w-full border border-gray-800"></div>
    </div>

    <!-- ERROR STATE -->
    <div v-else-if="error" class="bg-red-900/10 text-red-400 p-6 rounded-2xl border border-red-900/30 text-center">
      <p class="font-bold">Gagal memuat segmen</p>
      <button @click="() => refresh()" class="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white text-xs font-bold">Coba Lagi</button>
    </div>

    <!-- SEGMENTS LIST -->
    <div v-else class="space-y-4">
      <div v-if="segments.length === 0" class="text-center py-10 bg-[#1c1c1e] rounded-2xl border border-gray-800">
        <span class="text-4xl mb-3 block">🏔️</span>
        <p class="text-gray-400 font-medium">Belum ada segmen.</p>
        <p class="text-sm text-gray-500">Jadilah yang pertama membuat rute tantangan!</p>
      </div>

      <NuxtLink v-for="segment in segments" :key="segment.id" :to="`/segments/${segment.id}`" class="bg-[#1c1c1e] rounded-2xl border border-gray-800 p-4 hover:border-gray-600 transition-all flex items-center space-x-4 group">
        <div class="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-xl shrink-0 group-hover:bg-strava-orange transition-colors">
          🏁
        </div>
        
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-bold text-white truncate">{{ segment.name }}</h2>
          <div class="flex items-center space-x-3 mt-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span class="flex items-center text-strava-orange">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              {{ (segment.distance / 1000).toFixed(2) }} KM
            </span>
            <span>{{ segment._count?.efforts || 0 }} Rekor</span>
          </div>
        </div>
        
        <div class="text-gray-500 group-hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
