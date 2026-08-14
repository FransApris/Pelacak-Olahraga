// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const clubId = getRouterParam(event, 'id')
    if (!clubId) {
      throw createError({ statusCode: 400, statusMessage: 'Club ID is required' })
    }

    const user = event.context.user
    if (!user || !user.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Periksa apakah club ada
    const club = await prisma.club.findUnique({ where: { id: clubId } })
    if (!club) {
      throw createError({ statusCode: 404, statusMessage: 'Club not found' })
    }

    // Toggle Join/Leave
    const existingMembership = await prisma.userClub.findUnique({
      where: {
        userId_clubId: {
          userId: user.userId,
          clubId: clubId
        }
      }
    })

    if (existingMembership) {
      // Leave Club
      await prisma.userClub.delete({
        where: {
          userId_clubId: {
            userId: user.userId,
            clubId: clubId
          }
        }
      })
      return { success: true, message: 'Left club', isMember: false }
    } else {
      // Join Club
      await prisma.userClub.create({
        data: {
          userId: user.userId,
          clubId: clubId,
          role: 'MEMBER'
        }
      })
      return { success: true, message: 'Joined club', isMember: true }
    }
  } catch (error: any) {
    console.error('Error joining/leaving club:', error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
