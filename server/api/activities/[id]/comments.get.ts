import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const activityId = getRouterParam(event, 'id')
    if (!activityId) {
      throw createError({ statusCode: 400, statusMessage: 'Activity ID is required' })
    }

    // Ambil semua komentar untuk activity tersebut, diurutkan dari terlama ke terbaru
    const comments = await prisma.comment.findMany({
      where: {
        activityId
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true
          }
        }
      }
    })

    return {
      success: true,
      data: comments
    }

  } catch (error: any) {
    console.error('Fetch Comments API Error:', error)
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while fetching comments'
    })
  }
})
