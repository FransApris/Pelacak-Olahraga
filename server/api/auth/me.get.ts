import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Token missing' })
    }
    const jwtSecret = process.env.JWT_SECRET || 'rahasia_super_aman_123'
    
    let decoded: any
    try {
      decoded = jwt.verify(token, jwtSecret)
    } catch (err) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        role: true
      }
    })

    if (!user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    return {
      success: true,
      user
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
