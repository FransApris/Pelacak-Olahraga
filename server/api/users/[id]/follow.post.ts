// @ts-nocheck
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    const followingId = getRouterParam(event, 'id')
    if (!followingId) {
      throw createError({ statusCode: 400, statusMessage: 'User ID to follow is required' })
    }

    const user = event.context.user
    if (!user || !user.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const followerId = user.userId

    if (followerId === followingId) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot follow yourself' })
    }

    // Cek apakah sudah follow
    // @ts-ignore: Prisma client hasn't been regenerated in this session
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (existingFollow) {
      // Jika sudah follow, maka UNFOLLOW
      // @ts-ignore
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      })
      return { success: true, isFollowing: false, message: 'Unfollowed successfully' }
    } else {
      // Jika belum, maka FOLLOW
      // @ts-ignore
      await prisma.follows.create({
        data: {
          followerId,
          followingId
        }
      })
      return { success: true, isFollowing: true, message: 'Followed successfully' }
    }

  } catch (error: any) {
    console.error('Follow API Error:', error)
    if (error.statusCode) throw error
    
    if (error.code === 'P2003') {
      throw createError({ statusCode: 404, statusMessage: 'Target user not found' })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while toggling follow'
    })
  }
})
