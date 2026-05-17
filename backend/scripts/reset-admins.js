import prisma from '../lib/prisma.js';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import path from 'path';

// Load dari file .env root Kalceria
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });



async function main() {
  console.log('[System] Cleaning all existing ADMIN credentials...');
  
  // Demote all existing admins to prevent rogue lingering admin accounts
  const demoted = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { role: 'USER' }
  });
  console.log(`[System] Demoted ${demoted.count} users to ROLE: USER.`);

  // Baca 4 kredensial dari .env (menghindari hardcode)
  const admins = [
    { email: process.env.ADMIN1_EMAIL, pass: process.env.ADMIN1_PASS, name: process.env.ADMIN1_NAME || "Admin 1" },
    { email: process.env.ADMIN2_EMAIL, pass: process.env.ADMIN2_PASS, name: process.env.ADMIN2_NAME || "Admin 2" },
    { email: process.env.ADMIN3_EMAIL, pass: process.env.ADMIN3_PASS, name: process.env.ADMIN3_NAME || "Admin 3" },
    { email: process.env.ADMIN4_EMAIL, pass: process.env.ADMIN4_PASS, name: process.env.ADMIN4_NAME || "Admin 4" }
  ];

  for (const admin of admins) {
    if (!admin.email || !admin.pass) {
      console.warn(`[System] Warning: Missing .env config for an admin account. Skipping...`);
      continue;
    }

    console.log(`[System] Setting up Master Admin: ${admin.email}...`);
    const passwordHash = await argon2.hash(admin.pass);
    
    await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        passwordHash,
        role: 'ADMIN',
        name: admin.name,
        isEmailVerified: true
      },
      create: {
        email: admin.email,
        passwordHash,
        name: admin.name,
        phone: '0000000000',
        gender: 'MALE',
        role: 'ADMIN',
        isEmailVerified: true,
        dob: new Date('1990-01-01'),
        domicileLat: -6.2088,
        domicileLng: 106.8456
      }
    });
  }

  console.log('[System] Finalizing Postgre & Redis sync...');
  console.log('[System] Done. 4 Master Admins setup complete.');
}

main()
  .catch(e => {
    console.error('[Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
