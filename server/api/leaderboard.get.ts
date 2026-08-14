import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    // Pilihan metric: 'distance' atau 'duration'
    const metric = query.metric === 'duration' ? 'duration' : 'distance'

    // 1. Lakukan Agregasi menggunakan Prisma groupBy
    const aggregatedActivities = await prisma.activity.groupBy({
      by: ['userId'],
      _sum: {
        distanceInMeters: true,
        durationInSeconds: true,
      },
      // Filter hanya user yang memiliki aktivitas yang relevan
      where: {
        ...(metric === 'distance' ? { distanceInMeters: { gt: 0 } } : { durationInSeconds: { gt: 0 } })
      }
    })

    // 2. Ambil detail User untuk ID yang ditemukan
    const userIds = aggregatedActivities.map(a => a.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        profilePicture: true
      }
    })

    // Map untuk mempercepat pencarian user
    const userMap = new Map(users.map(u => [u.id, u]))

    // 3. Gabungkan Data dan Urutkan
    const leaderboard = aggregatedActivities
      .map(item => {
        const user = userMap.get(item.userId)
        return {
          userId: item.userId,
          name: user?.name || 'Unknown Athlete',
          profilePicture: user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=random`,
          totalDistance: item._sum.distanceInMeters || 0,
          totalDuration: item._sum.durationInSeconds || 0,
          value: metric === 'distance' ? (item._sum.distanceInMeters || 0) : (item._sum.durationInSeconds || 0)
        }
      })
      .sort((a, b) => b.value - a.value) // Urutkan descending berdasarkan metrik yang dipilih
      .map((item, index) => ({
        ...item,
        rank: index + 1 // Assign ranking
      }))

    return {
      success: true,
      data: leaderboard
    }

  } catch (error: any) {
    console.error('Leaderboard API Error:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Internal server error while fetching leaderboard.' })
  }
})
