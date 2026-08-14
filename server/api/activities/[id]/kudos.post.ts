import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // 1. Ambil ID Aktivitas dari parameter URL ([id])
    const activityId = getRouterParam(event, 'id')
    if (!activityId) {
      throw createError({ statusCode: 400, statusMessage: 'Activity ID is required' })
    }

    // 2. Ambil ID Pengguna dari context (Disediakan oleh middleware JWT auth)
    // Jika tidak ada user di context, berarti request ini lolos middleware tanpa token (Seharusnya tidak mungkin, tapi jaga-jaga)
    const user = event.context.user
    if (!user || !user.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const userId = user.userId

    // 3. Cek apakah kudo sudah pernah diberikan oleh pengguna ini
    const existingKudo = await prisma.kudos.findUnique({
      where: {
        activityId_userId: {
          activityId,
          userId
        }
      }
    })

    // 4. Logika Toggle (Like / Unlike)
    if (existingKudo) {
      // Jika sudah ada, hapus (Unlike)
      await prisma.kudos.delete({
        where: {
          activityId_userId: {
            activityId,
            userId
          }
        }
      })
      
      return { success: true, action: 'unliked' }
    } else {
      // Jika belum ada, buat (Like)
      await prisma.kudos.create({
        data: {
          activityId,
          userId
        }
      })
      
      return { success: true, action: 'liked' }
    }

  } catch (error: any) {
    console.error('Kudos API Error:', error)
    if (error.statusCode) throw error
    
    // Tangani error Foreign Key constraint (misal: ActivityID tidak valid)
    if (error.code === 'P2003') {
      throw createError({ statusCode: 404, statusMessage: 'Activity not found' })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while processing kudo'
    })
  }
})
