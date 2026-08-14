import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const activityId = getRouterParam(event, 'id')
    if (!activityId) {
      throw createError({ statusCode: 400, statusMessage: 'Activity ID is required' })
    }

    const user = event.context.user
    if (!user || !user.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    if (!body || !body.content || body.content.trim() === '') {
      throw createError({ statusCode: 400, statusMessage: 'Comment content cannot be empty' })
    }

    // Buat komentar baru
    const comment = await prisma.comment.create({
      data: {
        activityId,
        userId: user.userId,
        content: body.content.trim()
      }
    })

    return {
      success: true,
      comment
    }

  } catch (error: any) {
    console.error('Comment API Error:', error)
    if (error.statusCode) throw error
    
    if (error.code === 'P2003') {
      throw createError({ statusCode: 404, statusMessage: 'Activity not found' })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while processing comment'
    })
  }
})
