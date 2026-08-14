// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, parseInt(query.page as string) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(query.limit as string) || 20))
    const skip = (page - 1) * limit

    const feedType = query.feedType as string || 'global'
    
    // Auth context (jika ada)
    const currentUser = event.context.user
    let whereClause = {}

    if (feedType === 'following' && currentUser?.userId) {
      // @ts-ignore: Prisma client hasn't been regenerated in this session
      const followingList = await prisma.follows.findMany({
        where: { followerId: currentUser.userId },
        select: { followingId: true }
      })
      const followingIds = followingList.map((f: any) => f.followingId)
      followingIds.push(currentUser.userId) // Termasuk aktivitas diri sendiri

      whereClause = {
        userId: {
          in: followingIds
        }
      }
    }

    // Mengambil aktivitas, meng-include User relasi, dan agregasi hitungan Kudos
    const activities = await prisma.activity.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        startTime: 'desc', // Urutkan dari yang terbaru
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          }
        },
        routePoints: {
          orderBy: { timestamp: 'asc' }
        },
        kudos: {
          select: { userId: true }
        },
        _count: {
          select: {
            kudos: true,
            comments: true,
          }
        }
      }
    })

    // Menghitung total data (opsional, untuk meta pagination)
    const totalActivities = await prisma.activity.count({ where: whereClause })
    const hasNextPage = skip + activities.length < totalActivities

    return {
      success: true,
      data: activities,
      meta: {
        page,
        limit,
        total: totalActivities,
        hasNextPage
      }
    }

  } catch (error: any) {
    console.error('Error in GET /api/feed:', error)

    // Error handling tingkat produksi untuk Prisma/Database
    if (error.code === 'P2024') {
      throw createError({
        statusCode: 503,
        statusMessage: 'Database timeout. Please try again later.'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while fetching feed.'
    })
  }
})
