import argon2 from 'argon2';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../..');
const envPath = process.env.ADMIN_ENV_FILE
  ? path.resolve(projectRoot, process.env.ADMIN_ENV_FILE)
  : path.join(projectRoot, '.env.pentest.local');
dotenv.config({ path: envPath });

async function main() {
  if (process.env.ALLOW_ADMIN_UPSERT !== 'true') {
    throw new Error('Set ALLOW_ADMIN_UPSERT=true to confirm this admin upsert.');
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Master Admin';
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be configured in the selected environment file.');
  }

  const { default: prisma } = await import('../lib/prisma.js');
  try {
    console.log(`[Upsert] Creating/Updating admin: ${email}...`);

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        name,
        role: 'ADMIN',
        isEmailVerified: true,
      },
      create: {
        email,
        passwordHash,
        name,
        phone: '0000000000',
        gender: 'MALE',
        role: 'ADMIN',
        isEmailVerified: true,
        dob: new Date('1990-01-01'),
        domicileLat: -6.2088,
        domicileLng: 106.8456,
      },
    });

    console.log('[Upsert] Done. User ID:', user.id);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[Upsert] Failed:', error.message);
  process.exitCode = 1;
});
