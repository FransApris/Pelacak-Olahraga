import { PrismaClient } from '@prisma/client'
import { evaluateBadges } from '../utils/badgeEvaluator'
import { matchSegments } from '../utils/segmentMatcher'

const prisma = new PrismaClient()

// Rumus Haversine
const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      userId, 
      title, 
      type, 
      distanceInMeters, 
      durationInSeconds, 
      startTime, 
      rawCoordinates, // array of { latitude, longitude, elevation, timestamp }
      gearId,
      photos
    } = body

    // Validasi sederhana
    if (!userId || !title || !type || !startTime) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    let anomalyTag: string | null = null

    // ANALISIS ANOMALI GEOSPASIAL
    if (rawCoordinates && Array.isArray(rawCoordinates) && rawCoordinates.length > 1) {
      let maxSpeedKmh = 0
      let totalIdleSeconds = 0

      for (let i = 1; i < rawCoordinates.length; i++) {
        const prev = rawCoordinates[i - 1]
        const curr = rawCoordinates[i]

        const t1 = new Date(prev.timestamp).getTime()
        const t2 = new Date(curr.timestamp).getTime()
        const timeDiffSeconds = (t2 - t1) / 1000

        if (timeDiffSeconds > 0) {
          const dist = getDistanceFromLatLonInMeters(
            parseFloat(prev.latitude), parseFloat(prev.longitude),
            parseFloat(curr.latitude), parseFloat(curr.longitude)
          )
          
          if (dist < 5 && timeDiffSeconds > 300) {
             totalIdleSeconds += timeDiffSeconds
          }

          const speedKmh = (dist / timeDiffSeconds) * 3.6
          if (speedKmh > maxSpeedKmh) {
            maxSpeedKmh = speedKmh
          }
        }
      }

      if (type === 'RUN' && maxSpeedKmh > 30) {
        anomalyTag = '🚨 Terlalu Cepat (Kendaraan?)'
      } else if (type === 'RIDE' && maxSpeedKmh > 90) {
        anomalyTag = '🚨 Kecepatan Tidak Wajar'
      } else if (totalIdleSeconds > 300) {
        anomalyTag = '💤 Terlalu Banyak Istirahat'
      }
    }

    // Menggunakan Prisma Transaction untuk menjamin ACID properties
    const result = await prisma.$transaction(async (tx) => {
      // 1. Simpan aktivitas
      const activity = await tx.activity.create({
        data: {
          userId,
          title,
          type,
          distanceInMeters: distanceInMeters || 0,
          durationInSeconds: durationInSeconds || 0,
          startTime: new Date(startTime),
          anomalyTag,
          gearId: gearId || null,
          photos: photos && Array.isArray(photos) && photos.length > 0 ? JSON.stringify(photos) : null
        }
      })

      // 2. Simpan koordinat menggunakan schema RoutePoint
      if (rawCoordinates && Array.isArray(rawCoordinates) && rawCoordinates.length > 0) {
        const routePointsData = rawCoordinates.map((coord: any) => ({
          activityId: activity.id,
          timestamp: new Date(coord.timestamp || Date.now()),
          latitude: parseFloat(coord.latitude),
          longitude: parseFloat(coord.longitude),
          elevation: coord.elevation ? parseFloat(coord.elevation) : null,
        }))

        // Batch create route points
        await tx.routePoint.createMany({
          data: routePointsData,
        })
      }

      // 3. Tambahkan jarak tempuh ke Peralatan (Gear) jika ada
      if (gearId) {
        await tx.gear.update({
          where: { id: gearId },
          data: {
            distance: {
              increment: distanceInMeters || 0
            }
          }
        })
      }

      return activity
    }, {
      maxWait: 5000, 
      timeout: 10000 
    })

    // Panggil evaluator pencapaian dan tunggu hasilnya untuk merender pop-up
    let unlockedBadges: any[] = []
    try {
      unlockedBadges = await evaluateBadges(userId, result.id) || []
    } catch (err) {
      console.error('[GAMIFICATION] Badge evaluation failed:', err)
    }

    if (rawCoordinates && Array.isArray(rawCoordinates)) {
      matchSegments(userId, result.id, rawCoordinates).catch((err: any) => {
        console.error('[SEGMENT] Background segment matching failed:', err)
      })
    }

    setResponseStatus(event, 201)
    return {
      success: true,
      message: 'Activity saved successfully',
      data: result,
      unlockedBadges
    }

  } catch (error: any) {
    console.error('Error in POST /api/activities:', error)

    // Error handling spesifik tingkat produksi
    if (error.code === 'P2003') { 
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found (Foreign key constraint failed)'
      })
    }
    if (error.code === 'P2024') {
      throw createError({
        statusCode: 503,
        statusMessage: 'Database transaction timed out'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save activity due to internal server error'
    })
  }
})
