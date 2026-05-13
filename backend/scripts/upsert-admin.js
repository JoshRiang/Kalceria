import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = 'reinathan@gmail.com';
  const password = 'otnieljelek';
  
  console.log(`[Upsert] Creating/Updating admin: ${email}...`);
  
  const passwordHash = await argon2.hash(password);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true
    },
    create: {
      email,
      passwordHash,
      name: 'Master Admin',
      phone: '0000000000',
      gender: 'MALE',
      role: 'ADMIN',
      isEmailVerified: true,
      dob: new Date('1990-01-01'),
      domicileLat: -6.2088,
      domicileLng: 106.8456
    }
  });

  console.log('[Upsert] Done. User ID:', user.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
