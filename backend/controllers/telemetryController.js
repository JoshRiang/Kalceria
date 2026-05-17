import { redis } from '../lib/redis.js';
import prisma from '../lib/prisma.js';
import { maskLocationToDistrict } from '../utils/privacyMask.js';



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
    const globalCacheKey = 'cache:map_users_enriched';
    const cachedGlobal = await redis.get(globalCacheKey);
    if (cachedGlobal) return res.json(JSON.parse(cachedGlobal));

    // Get all active user IDs from Redis geo set
    const members = await redis.zrange('active_users', 0, -1);
    if (!members.length) return res.json({ users: [] });

    // Batch fetch user profiles
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
      },
    });

    if (!users.length) return res.json({ users: [] });

    // Batch fetch all positions in ONE call
    const userIds = users.map(u => u.id);
    const positions = await redis.geopos('active_users', ...userIds);

    // Map results efficiently
    const enriched = users.map((u, index) => {
      const pos = positions[index];
      let district = null;
      if (pos && pos[0]) {
        const [lng, lat] = pos;
        district = maskLocationToDistrict(parseFloat(lat), parseFloat(lng));
      }
      return { ...u, district };
    });

    const response = { users: enriched };
    
    // Cache for 5 seconds - keeps the map responsive while slashing heavy compute
    await redis.set(globalCacheKey, JSON.stringify(response), 'EX', 5);

    res.json(response);
  } catch (err) {
    next(err);
  }
}
