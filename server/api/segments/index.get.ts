import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { efforts: true }
        }
      }
    })

    return {
      success: true,
      data: segments
    }
  } catch (error) {
    console.error('Error fetching segments:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
