import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, password } = body

    // 1. Validasi Input
    if (!email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email and password are required'
      })
    }

    // 2. Cari pengguna di Database
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Menggunakan pesan samar agar tidak membocorkan email mana yang terdaftar
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
    }

    // 3. Verifikasi Password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
    }

    // 4. Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'rahasia_super_aman_123'
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    )

    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Login API Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message || error}`
    })
  }
})
