import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // Ambil parameter q
    const query = getQuery(event)
    const searchString = query.q as string || ''

    if (searchString.trim().length === 0) {
      return { success: true, data: [] }
    }

    // Ambil user ID dari context auth (bisa jadi undefined jika tidak login)
    const currentUserId = event.context.user?.userId

    const whereClause: any = {
      name: {
        contains: searchString
      }
    }
    
    if (currentUserId) {
      whereClause.id = { not: currentUserId }
    }

    // Cari user menggunakan Prisma
    // batasi hasil 20 pengguna
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        profilePicture: true,
        bio: true,
        _count: {
          select: { followers: true, following: true }
        }
      },
      take: 20
    })

    // Jika user login, kita butuh mengecek siapa saja yang sudah difollow
    let followingIds = new Set<string>()
    if (currentUserId && users.length > 0) {
      const follows = await prisma.follows.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: users.map(u => u.id) }
        }
      })
      followingIds = new Set(follows.map(f => f.followingId))
    }

    // Format response
    const formattedUsers = users.map(u => ({
      ...u,
      isFollowing: followingIds.has(u.id)
    }))

    return {
      success: true,
      data: formattedUsers
    }
  } catch (error: any) {
    console.error('Search API Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Gagal mencari pengguna'
    })
  }
})
