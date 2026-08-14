import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
    }

    // 1. Validasi Autentikasi
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
      decoded = jwt.verify(token as string, jwtSecret)
    } catch (err) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
    }

    // 2. Pastikan user hanya mengedit profilnya sendiri
    if (decoded.userId !== id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    // 3. Baca body request
    const body = await readBody(event)
    const { name, bio, profilePicture } = body

    // 4. Update data di database
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        bio,
        profilePicture
      },
      select: {
        id: true,
        name: true,
        bio: true,
        profilePicture: true,
        email: true,
        role: true
      }
    })

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
