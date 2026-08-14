import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Rumus Haversine (di-copy untuk utility ini)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const matchSegments = async (userId: string, activityId: string, routePoints: any[]) => {
  if (!routePoints || routePoints.length < 2) return

  try {
    // 1. Ambil semua segmen
    const segments = await prisma.segment.findMany()
    
    // 2. Loop melalui setiap segmen dan periksa apakah aktivitas ini melewatinya
    for (const segment of segments) {
      // Cari titik terdekat dengan start segmen (toleransi 100 meter)
      let startIndex = -1
      for (let i = 0; i < routePoints.length; i++) {
        const p = routePoints[i]
        const dist = getDistance(segment.startLat, segment.startLng, parseFloat(p.latitude), parseFloat(p.longitude))
        if (dist <= 100) {
          startIndex = i
          break
        }
      }

      if (startIndex === -1) continue // Tidak melewati start

      // Cari titik terdekat dengan end segmen (toleransi 100 meter) setelah start
      let endIndex = -1
      for (let i = startIndex + 1; i < routePoints.length; i++) {
        const p = routePoints[i]
        const dist = getDistance(segment.endLat, segment.endLng, parseFloat(p.latitude), parseFloat(p.longitude))
        if (dist <= 100) {
          endIndex = i
          break
        }
      }

      if (endIndex === -1) continue // Tidak melewati end

      // Segmen berhasil dilewati, hitung durasi!
      const startPoint = routePoints[startIndex]
      const endPoint = routePoints[endIndex]
      const durationSeconds = Math.round((new Date(endPoint.timestamp).getTime() - new Date(startPoint.timestamp).getTime()) / 1000)

      if (durationSeconds > 0) {
        // Cek apakah sudah ada effort untuk segmen dan aktivitas ini
        const existingEffort = await prisma.segmentEffort.findFirst({
          where: { segmentId: segment.id, activityId }
        })

        if (!existingEffort) {
          await prisma.segmentEffort.create({
            data: {
              segmentId: segment.id,
              userId,
              activityId,
              duration: durationSeconds
            }
          })
          console.log(`[SEGMENT] User ${userId} completed segment ${segment.name} in ${durationSeconds}s`)
        }
      }
    }
  } catch (error) {
    console.error('[SEGMENT] Failed to match segments:', error)
  }
}
