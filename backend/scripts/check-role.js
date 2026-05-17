import prisma from '../lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@gmail.com' }});
  console.log('User found:', user?.email, 'Role:', user?.role);
}
main().finally(() => prisma.$disconnect());
