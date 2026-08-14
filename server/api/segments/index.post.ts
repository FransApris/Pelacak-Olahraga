import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { name, startLat, startLng, endLat, endLng, distance } = body

    if (!name || startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined || distance === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    const segment = await prisma.segment.create({
      data: {
        name,
        startLat: parseFloat(startLat),
        startLng: parseFloat(startLng),
        endLat: parseFloat(endLat),
        endLng: parseFloat(endLng),
        distance: parseFloat(distance)
      }
    })

    setResponseStatus(event, 201)
    return {
      success: true,
      data: segment
    }
  } catch (error: any) {
    console.error('Error creating segment:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
