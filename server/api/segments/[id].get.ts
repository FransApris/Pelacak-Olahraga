import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Segment ID is required' })
    }

    // 1. Ambil detail segmen
    const segment = await prisma.segment.findUnique({
      where: { id },
      include: {
        _count: {
          select: { efforts: true }
        }
      }
    })

    if (!segment) {
      throw createError({ statusCode: 404, statusMessage: 'Segment not found' })
    }

    // 2. Ambil Leaderboard (Top 10 tercepat / durasi tersingkat)
    const leaderboard = await prisma.segmentEffort.findMany({
      where: { segmentId: id },
      orderBy: { duration: 'asc' }, // Durasi paling kecil = paling cepat
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true
          }
        },
        activity: {
          select: {
            id: true,
            type: true,
            startTime: true
          }
        }
      }
    })

    return {
      success: true,
      data: {
        segment,
        leaderboard
      }
    }
  } catch (error: any) {
    console.error('Error fetching segment details:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
