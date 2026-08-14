import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fungsi untuk memastikan badge default ada di database (Upsert)
async function ensureBadgesExist() {
  const defaultBadges = [
    { name: 'Lari 10km Pertama', description: 'Berhasil menyelesaikan aktivitas lari dengan jarak 10km atau lebih.', icon: '🏃‍♂️🔥' },
    { name: 'Early Bird', description: 'Memulai aktivitas olahraga sebelum jam 6 pagi.', icon: '🌅' },
    { name: 'Lari 50km Bulan Ini', description: 'Berlari sejauh total 50km dalam satu bulan.', icon: '🌟🏃‍♂️' },
    { name: 'Sepeda 100km Bulan Ini', description: 'Bersepeda sejauh total 100km dalam satu bulan.', icon: '🌟🚴‍♂️' }
  ]

  for (const badge of defaultBadges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge
    })
  }
}

export const evaluateBadges = async (userId: string, activityId: string) => {
  try {
    // Ambil data activity yang baru saja disimpan
    const activity = await prisma.activity.findUnique({
      where: { id: activityId }
    })

    if (!activity) return

    // Pastikan master badges tersedia di tabel Badge
    await ensureBadgesExist()

    const badgesToAward: string[] = []

    // 1. Logika 10km (jika jarak >= 10000 meter dan tipe adalah RUN)
    if (activity.type === 'RUN' && activity.distanceInMeters >= 10000) {
      badgesToAward.push('Lari 10km Pertama')
    }

    // 2. Logika Early Bird (jika startTime sebelum jam 06:00 waktu lokal)
    const startHour = new Date(activity.startTime).getHours()
    if (startHour < 6) {
      badgesToAward.push('Early Bird')
    }

    // 3. Logika Tantangan Bulanan Kumulatif
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const runStats = await prisma.activity.aggregate({
      where: {
        userId: userId,
        type: 'RUN',
        startTime: { gte: startOfMonth }
      },
      _sum: { distanceInMeters: true }
    })
    
    const rideStats = await prisma.activity.aggregate({
      where: {
        userId: userId,
        type: 'RIDE',
        startTime: { gte: startOfMonth }
      },
      _sum: { distanceInMeters: true }
    })

    if ((runStats._sum.distanceInMeters || 0) >= 50000) {
      badgesToAward.push('Lari 50km Bulan Ini')
    }
    if ((rideStats._sum.distanceInMeters || 0) >= 100000) {
      badgesToAward.push('Sepeda 100km Bulan Ini')
    }

    // Berikan badge jika ada
    const newlyAwardedBadges: Array<{ name: string, icon: string | null, description: string }> = []
    
    if (badgesToAward.length > 0) {
      // Ambil badge IDs berdasarkan nama
      const badges = await prisma.badge.findMany({
        where: { name: { in: badgesToAward } }
      })

      for (const badge of badges) {
        try {
          // Cek apakah user sudah punya badge ini
          const existing = await prisma.userBadge.findUnique({
            where: {
              userId_badgeId: {
                userId,
                badgeId: badge.id
              }
            }
          })

          if (!existing) {
            await prisma.userBadge.create({
              data: {
                userId,
                badgeId: badge.id
              }
            })
            newlyAwardedBadges.push({
              name: badge.name,
              icon: badge.iconName,
              description: badge.description
            })
            console.log(`[GAMIFICATION] Awarded badge '${badge.name}' to user ${userId}`)
          }
        } catch (err) {
          // Abaikan jika terjadi race condition create
        }
      }
    }
    
    return newlyAwardedBadges
  } catch (error) {
    console.error('[GAMIFICATION] Error evaluating badges:', error)
    return []
  }
}
