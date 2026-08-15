import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { name, email, password } = body

    // 1. Validasi Input Dasar
    if (!name || !email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Name, email, and password are required'
      })
    }

    // 2. Cek apakah Email sudah terdaftar
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Email is already registered'
      })
    }

    // 3. Hash Password dengan bcrypt (Salt Rounds = 10)
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // 4. Simpan Pengguna ke Database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      }
    })

    // 5. Generate JWT Token untuk Auto-Login setelah register
    const jwtSecret = process.env.JWT_SECRET || 'rahasia_super_aman_123'
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' } // Berakhir dalam 7 hari
    )

    // Jangan pernah mengembalikan passwordHash ke frontend
    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Register API Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error: ${error.message || error}`
    })
  }
})
