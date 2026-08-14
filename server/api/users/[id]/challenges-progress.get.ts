// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Agregasi Lari Bulan Ini
    const runStats = await prisma.activity.aggregate({
      where: {
        userId,
        type: 'RUN',
        startTime: { gte: startOfMonth }
      },
      _sum: { distanceInMeters: true }
    })
    
    // Agregasi Sepeda Bulan Ini
    const rideStats = await prisma.activity.aggregate({
      where: {
        userId,
        type: 'RIDE',
        startTime: { gte: startOfMonth }
      },
      _sum: { distanceInMeters: true }
    })

    // Periksa lencana yang sudah diperoleh agar UI tahu tantangan selesai
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    })
    const earnedBadgeNames = userBadges.map(ub => ub.badge.name)

    return {
      success: true,
      data: {
        currentMonth: now.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
        challenges: [
          {
            id: 'run-50k',
            title: 'Lari 50km Bulan Ini',
            type: 'RUN',
            icon: '🌟🏃‍♂️',
            targetMeters: 50000,
            currentMeters: runStats._sum.distanceInMeters || 0,
            isCompleted: earnedBadgeNames.includes('Lari 50km Bulan Ini') || (runStats._sum.distanceInMeters || 0) >= 50000
          },
          {
            id: 'ride-100k',
            title: 'Sepeda 100km Bulan Ini',
            type: 'RIDE',
            icon: '🌟🚴‍♂️',
            targetMeters: 100000,
            currentMeters: rideStats._sum.distanceInMeters || 0,
            isCompleted: earnedBadgeNames.includes('Sepeda 100km Bulan Ini') || (rideStats._sum.distanceInMeters || 0) >= 100000
          }
        ]
      }
    }
  } catch (error: any) {
    console.error('Error fetching challenges progress:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
