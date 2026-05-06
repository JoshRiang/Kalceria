import { redis } from '../lib/redis.js';
import { PrismaClient } from '@prisma/client';
import { maskLocationToDistrict } from '../utils/privacyMask.js';

const prisma = new PrismaClient();

// ─── POST /map/telemetry ──────────────────────────────────────────────────────
export async function saveTelemetry(req, res, next) {
  try {
    const { userId, lat, lng } = req.body;
    const key = `telemetry:${userId}`;
    const record = JSON.stringify({ lat, lng, ts: Date.now() });

    await redis.lpush(key, record);
    await redis.ltrim(key, 0, 4); // Keep last 5 ticks only

    res.json({ message: 'Telemetry saved.' });
  } catch (err) {
    next(err);
  }
}

// ─── GET /map/users ───────────────────────────────────────────────────────────
export async function getMapUsers(req, res, next) {
  try {
    // Get all active user IDs from Redis geo set
    const members = await redis.zrange('active_users', 0, -1);
    if (!members.length) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { in: members },
        allowLiveLocation: true,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        profilePicture: true,
        socialPlatform: true,
        socialLink: true,
        domicileLat: true,
        domicileLng: true,
      },
    });

    // Get precise coords from Redis and mask them
    const enriched = await Promise.all(
      users.map(async (u) => {
        const pos = await redis.geopos('active_users', u.id);
        let district = null;
        if (pos && pos[0]) {
          const [lng, lat] = pos[0];
          district = maskLocationToDistrict(parseFloat(lat), parseFloat(lng));
        }
        const { domicileLat, domicileLng, ...safe } = u;
        return { ...safe, district };
      })
    );

    res.json({ users: enriched });
  } catch (err) {
    next(err);
  }
}
