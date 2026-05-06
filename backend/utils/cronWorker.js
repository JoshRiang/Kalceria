import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cleanup cron: delete all expired broadcasts.
 * Run this with node-cron or Vercel Cron Jobs (GET /api/cron/cleanup).
 */
export async function cleanupExpiredBroadcasts() {
  const result = await prisma.userBroadcast.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`[Cron] Deleted ${result.count} expired broadcasts.`);
  return result.count;
}
