import { PrismaClient } from '@prisma/client';
import { redis } from '../lib/redis.js';

const prisma = new PrismaClient();

// ─── Update Live Location ─────────────────────────────────────────────────────
export async function updateLiveLocation(req, res, next) {
  try {
    const { userId, latitude, longitude } = req.body;

    await redis.geoadd('active_users', longitude, latitude, userId);
    // Expire user from map after 10 mins of no update
    await redis.expire('active_users', 600);

    res.json({ message: 'Location updated.' });
  } catch (err) {
    next(err);
  }
}

// ─── Get Nearby Users ─────────────────────────────────────────────────────────
export async function getNearbyUsers(req, res, next) {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    // GEORADIUS returns [userId, ...] within radius km
    const nearbyIds = await redis.georadius(
      'active_users',
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(radius),
      'km'
    );

    if (!nearbyIds.length) return res.json({ users: [] });

    // Only return users who opted in
    const users = await prisma.user.findMany({
      where: {
        id: { in: nearbyIds },
        allowLiveLocation: true,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        profilePicture: true,
        socialPlatform: true,
        socialLink: true,
      },
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
}

// ─── Toggle isSentEvent ───────────────────────────────────────────────────────
export async function toggleIsSentEvent(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: { isSentEvent: true },
  });
}
