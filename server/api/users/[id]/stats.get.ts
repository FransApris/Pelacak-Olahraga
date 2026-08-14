// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
    }

    // Ambil auth user jika ada (untuk isFollowing)
    const currentUser = event.context.user // from JWT middleware if present
    
    // 1. Dapatkan Profil User & Badges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        profilePicture: true,
        createdAt: true,
        badges: {
          select: { badge: true }
        },
        // @ts-ignore: Prisma client hasn't been regenerated in this session
        _count: {
          select: { followers: true, following: true }
        },
        // @ts-ignore
        followers: currentUser?.userId ? {
          where: { followerId: currentUser.userId },
          select: { followerId: true }
        } : false
      }
    })

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    // 2. Agregasi Statistik dari database MySQL via Prisma
    const stats = await prisma.activity.aggregate({
      where: { userId },
      _count: { _all: true },
      _sum: { distanceInMeters: true, durationInSeconds: true },
      _avg: { averagePace: true }
    })

    // 3. Hitung Progres 7 Hari Terakhir
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0) // Mulai dari awal hari 7 hari lalu

    const weeklyActivities = await prisma.activity.findMany({
      where: {
        userId,
        startTime: {
          gte: sevenDaysAgo
        }
      },
      select: {
        startTime: true,
        distanceInMeters: true,
        durationInSeconds: true
      }
    })

    // Siapkan array 7 hari terakhir dengan nilai 0
    const weeklyProgress = []
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      weeklyProgress.push({
        date: dateStr,
        dayName: dayNames[d.getDay()],
        distance: 0,
        duration: 0
      })
    }

    // Isi array dengan data sebenarnya
    weeklyActivities.forEach(act => {
      const dateStr = new Date(act.startTime).toISOString().split('T')[0]
      const dayData = weeklyProgress.find(d => d.date === dateStr)
      if (dayData) {
        dayData.distance += act.distanceInMeters
        dayData.duration += act.durationInSeconds
      }
    })

    // 4. Ambil 10 aktivitas terbaru untuk ditampilkan di linimasa profil
    const recentActivities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, name: true, profilePicture: true } },
        routePoints: { orderBy: { timestamp: 'asc' } },
        kudos: { select: { userId: true } }, // Membawa status kudos untuk UI
        _count: { select: { kudos: true, comments: true } }
      }
    })

    return {
      success: true,
      data: {
        user: {
          ...user,
          // @ts-ignore
          isFollowing: user.followers ? user.followers.length > 0 : false
        },
        stats: {
          totalActivities: stats._count._all,
          totalDistanceInMeters: stats._sum.distanceInMeters || 0,
          totalDurationInSeconds: stats._sum.durationInSeconds || 0,
          averagePace: stats._avg.averagePace || 0,
          weeklyProgress
        },
        recentActivities
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Stats API Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
