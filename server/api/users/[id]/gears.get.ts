// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
    }

    const gears = await prisma.gear.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return {
      success: true,
      data: gears
    }
  } catch (error: any) {
    console.error('Error fetching gears:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
