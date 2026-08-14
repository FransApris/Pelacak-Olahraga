// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const clubId = getRouterParam(event, 'id')
    if (!clubId) {
      throw createError({ statusCode: 400, statusMessage: 'Club ID is required' })
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePicture: true,
                _count: {
                  select: { activities: true }
                }
              }
            }
          }
        },
        _count: {
          select: { members: true }
        }
      }
    })

    if (!club) {
      throw createError({ statusCode: 404, statusMessage: 'Club not found' })
    }

    // Untuk halaman klub, kita mungkin ingin menampilkan daftar aktivitas member di klub tersebut
    const memberUserIds = club.members.map(m => m.user.id)
    const recentActivities = await prisma.activity.findMany({
      where: {
        userId: { in: memberUserIds }
      },
      orderBy: { startTime: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, name: true, profilePicture: true } },
        _count: { select: { kudos: true, comments: true } },
        kudos: true // Nanti kita bisa filter berdasarkan currentUserId di frontend
      }
    })

    return {
      success: true,
      data: {
        club,
        recentActivities
      }
    }
  } catch (error: any) {
    console.error('Error fetching club details:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
