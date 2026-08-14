// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true }
        }
      }
    })

    return {
      success: true,
      data: clubs
    }
  } catch (error: any) {
    console.error('Error fetching clubs:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
