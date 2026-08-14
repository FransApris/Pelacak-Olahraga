// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user
    if (!user || !user.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { name, description, coverImage } = body

    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Name is required' })
    }

    // Buat klub menggunakan transaksi, dan jadikan pembuatnya sebagai ADMIN
    const club = await prisma.$transaction(async (tx) => {
      const newClub = await tx.club.create({
        data: {
          name,
          description,
          coverImage
        }
      })

      await tx.userClub.create({
        data: {
          userId: user.userId,
          clubId: newClub.id,
          role: 'ADMIN'
        }
      })

      return newClub
    })

    return {
      success: true,
      data: club
    }
  } catch (error: any) {
    console.error('Error creating club:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
