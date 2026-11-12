import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { ensurePersistentUserProfilesBatch } from '../../utils/profileDefaults.js';
import { getActiveCanonicalPresences } from '../../services/canonicalFallbackStore.js';
import { approximateCoordinate } from './telemetryUtils.js';

// all kalcerians (online + offline) for the panel
export async function getAllKalcerians(req, res, next) {
  try {
    const cacheKey = "cache:all_kalcerians";
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    // get online user ids from redis
    const onlineIds = await redis.zrange("active_users", 0, -1);
    const liveRecords = onlineIds.length
      ? await redis.mget(...onlineIds.map((id) => `live:user:${id}`))
      : [];
    const activeIds = onlineIds.filter((_, index) => Boolean(liveRecords[index]));
    const staleIds = onlineIds.filter((_, index) => !liveRecords[index]);
    if (staleIds.length) await redis.zrem("active_users", ...staleIds);
    const onlineSet = new Set(activeIds);
    const liveMap = new Map();
    onlineIds.forEach((id, idx) => {
      if (liveRecords[idx]) {
        try {
          liveMap.set(id, JSON.parse(liveRecords[idx]));
        } catch {}
      }
    });

    // fetch authentic verified public users only — strictly omitting admin credentials and unverified accounts
    const users = await prisma.user.findMany({
      where: {
        isEmailVerified: true,
        role: "USER",
        email: {
          notIn: [
            "admin1@gmail.com",
            "admin2@gmail.com",
            "admin3@gmail.com",
            "admin4@gmail.com",
          ],
          not: {
            contains: "admin",
          },
        },
        NOT: [
          { email: { contains: "tester" } },
          { email: { contains: "dummy" } },
          { email: { contains: "mock" } },
          { name: { contains: "Mobile User" } },
          { name: { contains: "Laptop User" } },
          { name: { in: ["Otniel", "Josh", "Reinathan"] } },
        ],
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        profilePicture: true,
        coverImage: true,
        coverType: true,
        bio: true,
        allowLiveLocation: true,
        socialPlatform: true,
        socialLink: true,
        createdAt: true,
        broadcast: {
          select: { id: true, message: true, expiresAt: true, createdAt: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const canonicalPresences = users.length > 0
      ? await getActiveCanonicalPresences(users.map((u) => u.id)).catch(() => new Map())
      : new Map();

    const rawResult = users.map((u) => {
      // Strictly online ONLY when present in Redis active_users OR unexpired canonical presences AND allowLiveLocation is enabled
      const hasLivePresence = canonicalPresences?.has(u.id);
      const isOnline = Boolean((onlineSet.has(u.id) || hasLivePresence) && u.allowLiveLocation);
      const broadcast = u.broadcast && u.broadcast.expiresAt > now ? u.broadcast : null;
      const liveRec = isOnline ? liveMap.get(u.id) : null;
      let rawLat = Number.isFinite(liveRec?.lat) ? Number(liveRec.lat) : null;
      let rawLng = Number.isFinite(liveRec?.lng) ? Number(liveRec.lng) : null;
      if ((rawLat === null || rawLng === null) && hasLivePresence) {
        const canRec = canonicalPresences.get(u.id);
        rawLat = canRec.lat;
        rawLng = canRec.lng;
      }
      const coords =
        isOnline && Number.isFinite(rawLat) && Number.isFinite(rawLng)
          ? approximateCoordinate(Number(rawLat), Number(rawLng))
          : { lat: null, lng: null };
      return {
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        profilePicture: u.profilePicture,
        coverImage: u.coverImage,
        coverType: u.coverType,
        bio: u.bio,
        socialPlatform: u.socialPlatform,
        socialLink: u.socialLink,
        lat: coords.lat,
        lng: coords.lng,
        createdAt: u.createdAt,
        isOnline,
        broadcast,
      };
    });

    const result = await ensurePersistentUserProfilesBatch(rawResult);
    const response = { kalcerians: result };
    await redis.set(cacheKey, JSON.stringify(response), "EX", 2);

    res.json(response);
  } catch (err) {
    next(err);
  }
}

