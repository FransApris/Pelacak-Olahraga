<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { PropType } from 'vue'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  routePoints: {
    type: Array as PropType<Array<{ latitude: number, longitude: number }>>,
    default: () => []
  },
  interactive: {
    type: Boolean,
    default: false
  }
})

const mapContainer = ref<HTMLElement | null>(null)
let map: any = null
let L: any = null
let polylineLayer: any = null
let startMarker: any = null
let endMarker: any = null

onMounted(async () => {
  if (!import.meta.client) return
  
  // Import leaflet secara dinamis untuk menghindari SSR error
  L = await import('leaflet')

  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    zoomControl: props.interactive,
    attributionControl: false,
    dragging: props.interactive, 
    touchZoom: props.interactive,
    scrollWheelZoom: props.interactive,
    doubleClickZoom: props.interactive,
    boxZoom: props.interactive
  })

  // Tema gelap CartoDB Dark Matter
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map)

  drawRoute()
})

const drawRoute = () => {
  if (!map || !L) return

  // Bersihkan layer sebelumnya jika ada (untuk re-render)
  if (polylineLayer) map.removeLayer(polylineLayer)
  if (startMarker) map.removeLayer(startMarker)
  if (endMarker) map.removeLayer(endMarker)

  if (props.routePoints.length === 0) {
    // Default view jika tidak ada rute (Tampilkan Jakarta misalnya)
    map.setView([-6.2088, 106.8456], 13)
    return
  }

  const latlngs = props.routePoints.map(p => [p.latitude, p.longitude] as [number, number])
  
  polylineLayer = L.polyline(latlngs, {
    color: '#fc4c02', // Strava orange
    weight: 4,
    opacity: 0.9,
    lineJoin: 'round'
  }).addTo(map)

  // Zoom map agar pas dengan rute
  map.fitBounds(polylineLayer.getBounds(), { padding: [20, 20] })

  // Marker awal (Hijau)
  startMarker = L.circleMarker(latlngs[0], {
    radius: 4,
    color: '#fff',
    weight: 2,
    fillColor: '#10B981',
    fillOpacity: 1
  }).addTo(map)

  // Marker akhir (Merah/Oranye)
  if (latlngs.length > 1) {
    endMarker = L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 4,
      color: '#fff',
      weight: 2,
      fillColor: '#fc4c02',
      fillOpacity: 1
    }).addTo(map)
  }
}

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})

watch(() => props.routePoints, () => {
  drawRoute()
}, { deep: true })
</script>

<template>
  <div ref="mapContainer" class="w-full h-full bg-[#1c1c1e] z-0"></div>
</template>

<style>
/* Leaflet fixes for dark mode */
.leaflet-container {
  background: #1c1c1e !important;
  font-family: inherit;
}
</style>
