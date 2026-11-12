import { redis } from '../../lib/redis.js';
import prisma from '../../lib/prisma.js';
import { maskLocationToDistrict } from '../../utils/privacyMask.js';
import { ensurePersistentUserProfilesBatch } from '../../utils/profileDefaults.js';
import { getActiveCanonicalPresences } from '../../services/canonicalFallbackStore.js';
import { parseCoordinate, approximateCoordinate } from './telemetryUtils.js';

export async function saveTelemetry(req, res, next) {
  try {
    const userId = req.user.userId;
    const lat = parseCoordinate(req.body?.lat);
    const lng = parseCoordinate(req.body?.lng);

    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Valid lat and lng are required." });
    }

    // Precise coordinates are only retained for users who opted in to live location.
    const consent = await prisma.user.findUnique({
      where: { id: userId },
      select: { allowLiveLocation: true },
    });
    if (!consent?.allowLiveLocation) {
      return res.status(403).json({ error: "Live location is disabled for this account." });
    }

    const key = `telemetry:${userId}`;
    const record = JSON.stringify({ lat, lng, ts: Date.now() });

    await redis.lpush(key, record);
    await redis.ltrim(key, 0, 4);
    await redis.expire(key, 24 * 60 * 60);

    res.json({ message: "Telemetry saved." });
  } catch (err) {
    next(err);
  }
}

export async function getMapUsers(req, res, next) {
  try {
    const globalCacheKey = "cache:map_users_enriched";
    const cachedGlobal = await redis.get(globalCacheKey);
    if (cachedGlobal) return res.json(JSON.parse(cachedGlobal));

    const members = await redis.zrange("active_users", 0, -1).catch(() => []);
    const liveRecords = members.length
      ? await redis.mget(...members.map((id) => `live:user:${id}`)).catch(() => [])
      : [];
    const activeMembers = members.filter((_, index) => Boolean(liveRecords[index]));
    const staleMembers = members.filter((_, index) => !liveRecords[index]);
    if (staleMembers.length) await redis.zrem("active_users", ...staleMembers).catch(() => {});
    const liveMap = new Map();
    members.forEach((id, idx) => {
      if (liveRecords[idx]) {
        try {
          liveMap.set(id, JSON.parse(liveRecords[idx]));
        } catch {}
      }
    });

    let canonicalPresences = await getActiveCanonicalPresences().catch(() => new Map());
    const canonicalActiveIds = canonicalPresences ? Array.from(canonicalPresences.keys()) : [];
    const effectiveActiveSet = new Set([...activeMembers, ...canonicalActiveIds]);
    const effectiveActiveIds = Array.from(effectiveActiveSet);

    // Strict Online Rule: Only users actively present in Redis `active_users` OR unexpired Canonical Store appear on the map
    if (!effectiveActiveIds.length) {
      const emptyResponse = { users: [] };
      await redis.set(globalCacheKey, JSON.stringify(emptyResponse), "EX", 3).catch(() => {});
      return res.json(emptyResponse);
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: effectiveActiveIds },
        allowLiveLocation: true,
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
          { name: { in: ["Otniel", "Josh"] } },
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
    });

    if (!users.length) {
      const emptyResponse = { users: [] };
      await redis.set(globalCacheKey, JSON.stringify(emptyResponse), "EX", 3).catch(() => {});
      return res.json(emptyResponse);
    }

    const userIds = users.map((u) => u.id);
    const positions = userIds.length
      ? await redis.geopos("active_users", ...userIds).catch(() => [])
      : [];

    // Fallback: If any positions are missing, ensure canonical presences are loaded for those users
    if (userIds.length > 0 && (!canonicalPresences || canonicalPresences.size === 0)) {
      canonicalPresences = await getActiveCanonicalPresences(userIds).catch(() => new Map());
    }

    const now = new Date();
    const rawEnriched = [];
    users.forEach((u, index) => {
      const pos = positions?.[index];
      const liveRec = liveMap.get(u.id);
      let rawLat = Number.isFinite(liveRec?.lat) ? Number(liveRec.lat) : null;
      let rawLng = Number.isFinite(liveRec?.lng) ? Number(liveRec.lng) : null;
      if ((rawLat === null || rawLng === null) && pos && pos[0]) {
        rawLng = parseFloat(pos[0]);
        rawLat = parseFloat(pos[1]);
      }
      if ((rawLat === null || rawLng === null) && canonicalPresences?.has(u.id)) {
        const canRec = canonicalPresences.get(u.id);
        rawLat = canRec.lat;
        rawLng = canRec.lng;
      }
      // Never invent mock coordinates if real live coordinates are missing
      if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return;

      const { lat, lng } = approximateCoordinate(rawLat, rawLng);
      const district = maskLocationToDistrict(lat, lng);
      const broadcast = u.broadcast && u.broadcast.expiresAt > now ? u.broadcast : null;
      rawEnriched.push({
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        profilePicture: u.profilePicture,
        coverImage: u.coverImage,
        coverType: u.coverType,
        bio: u.bio,
        allowLiveLocation: true,
        socialPlatform: u.socialPlatform,
        socialLink: u.socialLink,
        createdAt: u.createdAt,
        isOnline: true,
        district,
        lat,
        lng,
        broadcast,
      });
    });

    const enriched = await ensurePersistentUserProfilesBatch(rawEnriched);
    const response = { users: enriched };
    await redis.set(globalCacheKey, JSON.stringify(response), "EX", 2).catch(() => {});

    res.json(response);
  } catch (err) {
    next(err);
  }
}

