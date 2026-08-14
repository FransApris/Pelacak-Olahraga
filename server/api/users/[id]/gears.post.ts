// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
    }

    const user = event.context.user
    if (!user || user.userId !== userId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    const body = await readBody(event)
    const { name, type, brand } = body

    if (!name || !type) {
      throw createError({ statusCode: 400, statusMessage: 'Name and type are required' })
    }

    if (type !== 'SHOES' && type !== 'BIKE') {
      throw createError({ statusCode: 400, statusMessage: 'Type must be SHOES or BIKE' })
    }

    const gear = await prisma.gear.create({
      data: {
        userId,
        name,
        type,
        brand
      }
    })

    return {
      success: true,
      data: gear
    }
  } catch (error: any) {
    console.error('Error creating gear:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
