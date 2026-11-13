import prisma from '../lib/prisma.js';
import { finalizeExpiredMinigameTargets } from '../controllers/minigame/minigameVoucherService.js';



/**
 * Cleanup cron: delete all expired broadcasts and finalize any expired minigame targets.
 * Run this with node-cron or Vercel Cron Jobs (GET /api/cron/cleanup).
 */
export async function cleanupExpiredBroadcasts() {
  const result = await prisma.userBroadcast.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await finalizeExpiredMinigameTargets().catch((err) => {
    console.warn('[Cron] Minigame finalization warning:', err.message);
  });
  console.log(`[Cron] Deleted ${result.count} expired broadcasts.`);
  return result.count;
}
