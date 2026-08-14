<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  coordinates: {
    type: Array as () => { lat: number, lng: number }[],
    default: () => []
  }
})

const mapContainer = ref<HTMLElement | null>(null)
let mapInstance: any = null

onMounted(async () => {
  // Hanya eksekusi di browser (Client-Side)
  // Dynamic import Leaflet agar tidak di-bundle saat proses SSR
  const L = (await import('leaflet')).default

  if (mapContainer.value) {
    // 1. Inisialisasi Kanvas Peta
    mapInstance = L.map(mapContainer.value, {
      zoomControl: false, // Hilangkan zoom control agar terlihat bersih seperti feed card
      dragging: false, // Matikan drag agar layar bisa di-scroll tanpa tersangkut di peta
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false
    })

    // 2. Tambahkan Tile Layer (Tile peta dasar, bisa diganti pakai Mapbox/OSM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance)

    // 3. Menggambar rute polyline jika koordinat ada
    drawRoute(L)
  }
})

const drawRoute = (L: any) => {
  if (!mapInstance || !props.coordinates || props.coordinates.length === 0) return

  // Bersihkan rute lama jika ada re-render
  mapInstance.eachLayer((layer: any) => {
    if (layer instanceof L.Polyline) {
      mapInstance.removeLayer(layer)
    }
  })

  // Format ke tuple Leaflet [lat, lng]
  const latLngs = props.coordinates.map(c => [c.lat, c.lng] as [number, number])

  if (latLngs.length > 0) {
    // Buat polyline oranye terang dengan ketebalan yang pas
    const polyline = L.polyline(latLngs, {
      color: '#fc4c02', // Oranye Strava
      weight: 4,        // Ketebalan garis
      opacity: 0.8,
      lineCap: 'round'
    }).addTo(mapInstance)

    // FitBounds: Auto zoom agar seluruh rute pas di dalam kanvas
    mapInstance.fitBounds(polyline.getBounds(), { padding: [10, 10] })
  }
}

// Opsional: Reactivity jika data route diupdate di-runtime
watch(() => props.coordinates, () => {
  if (typeof window !== 'undefined') {
    import('leaflet').then(L => drawRoute(L.default))
  }
}, { deep: true })
</script>

<template>
  <div ref="mapContainer" class="w-full h-full bg-gray-100 z-0">
    <!-- Peta akan dirender di dalam div ini oleh Leaflet -->
  </div>
</template>

<style scoped>
/* Pastikan Leaflet punya z-index lebih rendah dari header dan komponen interaktif lain di Nuxt */
:deep(.leaflet-container) {
  z-index: 1 !important;
  background-color: #f3f4f6; /* bg-gray-100 */
}
:deep(.leaflet-pane) {
  z-index: 1 !important;
}
</style>
