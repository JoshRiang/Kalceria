import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function main() {
  const email = 'sandinya1sampai8@gmail.com';
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`User with email ${email} not found.`);
      return;
    }
    
    // Check for related records if necessary, but prisma.user.delete should handle it if not required
    const deletedUser = await prisma.user.delete({
      where: { email },
    });
    console.log(`User with email ${email} has been deleted.`);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
