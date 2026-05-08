import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log('[Diagnostic] User not found!');
  } else {
    console.log('[Diagnostic] User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isEmailVerified
    });
  }
}

main().finally(() => prisma.$disconnect());
