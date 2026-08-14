import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Create dummy users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'agus@example.com' },
      update: {},
      create: {
        email: 'agus@example.com',
        name: 'Agus Sprinter',
        passwordHash,
        profilePicture: 'https://ui-avatars.com/api/?name=Agus+Sprinter&background=0D8ABC&color=fff',
        bio: 'Never stop running.'
      }
    }),
    prisma.user.upsert({
      where: { email: 'budi@example.com' },
      update: {},
      create: {
        email: 'budi@example.com',
        name: 'Budi Santoso',
        passwordHash,
        profilePicture: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=F59E0B&color=fff',
        bio: 'Weekend warrior.'
      }
    }),
    prisma.user.upsert({
      where: { email: 'citra@example.com' },
      update: {},
      create: {
        email: 'citra@example.com',
        name: 'Citra Kirana',
        passwordHash,
        profilePicture: 'https://ui-avatars.com/api/?name=Citra+Kirana&background=10B981&color=fff',
        bio: 'Swimming & running enthusiast.'
      }
    }),
    prisma.user.upsert({
      where: { email: 'deni@example.com' },
      update: {},
      create: {
        email: 'deni@example.com',
        name: 'Deni Setiawan',
        passwordHash,
        profilePicture: 'https://ui-avatars.com/api/?name=Deni+Setiawan&background=8B5CF6&color=fff',
        bio: 'Just doing it for the calories.'
      }
    }),
    prisma.user.upsert({
      where: { email: 'eka@example.com' },
      update: {},
      create: {
        email: 'eka@example.com',
        name: 'Eka Putri',
        passwordHash,
        profilePicture: 'https://ui-avatars.com/api/?name=Eka+Putri&background=EF4444&color=fff',
        bio: 'Marathon training.'
      }
    })
  ]);

  console.log(`Created ${users.length} users.`);

  // Create activities
  const now = new Date();
  const activitiesToCreate = [
    { userId: users[0].id, title: 'Morning Run 10k', type: 'RUN', distanceInMeters: 10500, durationInSeconds: 3200, averagePace: 304, startTime: new Date(now.getTime() - 86400000 * 2) },
    { userId: users[0].id, title: 'Speed Work', type: 'RUN', distanceInMeters: 5000, durationInSeconds: 1200, averagePace: 240, startTime: new Date(now.getTime() - 86400000 * 1) },
    { userId: users[1].id, title: 'Sunday Long Ride', type: 'RIDE', distanceInMeters: 45000, durationInSeconds: 7200, averagePace: 160, startTime: new Date(now.getTime() - 86400000 * 3) },
    { userId: users[2].id, title: 'Easy Jog', type: 'RUN', distanceInMeters: 3000, durationInSeconds: 1100, averagePace: 366, startTime: new Date(now.getTime() - 86400000 * 4) },
    { userId: users[3].id, title: 'Treadmill Sufferfest', type: 'RUN', distanceInMeters: 7000, durationInSeconds: 2100, averagePace: 300, startTime: new Date(now.getTime() - 86400000 * 1) },
    { userId: users[4].id, title: 'Half Marathon Prep', type: 'RUN', distanceInMeters: 18000, durationInSeconds: 5400, averagePace: 300, startTime: new Date(now.getTime() - 86400000 * 5) }
  ];

  for (const act of activitiesToCreate) {
    await prisma.activity.create({
      data: act
    });
  }

  console.log(`Created ${activitiesToCreate.length} activities.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
