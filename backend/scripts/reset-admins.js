import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'admin@gmail.com';
  const targetPassword = 'otnieljelek';
  
  console.log('[System] Cleaning all existing ADMIN credentials...');
  
  // Demote all existing admins
  const demoted = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { role: 'USER' }
  });
  console.log(`[System] Demoted ${demoted.count} users to ROLE: USER.`);

  console.log(`[System] Setting up Master Admin: ${targetEmail}...`);
  
  const passwordHash = await argon2.hash(targetPassword);
  
  const user = await prisma.user.upsert({
    where: { email: targetEmail },
    update: {
      passwordHash,
      role: 'ADMIN',
      isEmailVerified: true
    },
    create: {
      email: targetEmail,
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

  console.log('[System] Finalizing Postgre & Redis sync...');
  console.log('[System] Done. Master Admin ID:', user.id);
}

main()
  .catch(e => {
    console.error('[Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
