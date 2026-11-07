import { redis } from '../lib/redis.js';
import prisma from '../lib/prisma.js';
import { maskLocationToDistrict } from '../utils/privacyMask.js';
import { ensurePersistentUserProfilesBatch } from '../utils/profileDefaults.js';

const DISTRICT_OFFSET = 0.012;

function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function approximateCoordinate(lat, lng) {
  return {
    lat: Math.round(lat / DISTRICT_OFFSET) * DISTRICT_OFFSET,
    lng: Math.round(lng / DISTRICT_OFFSET) * DISTRICT_OFFSET,
  };
}

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

function resolveDeterministicUserCoords(user, rawLat, rawLng, index = 0) {
  let baseLat = Number.isFinite(rawLat) && Math.abs(rawLat) > 0.001
    ? rawLat
    : Number.isFinite(user?.domicileLat) && Math.abs(user.domicileLat) > 0.001
      ? Number(user.domicileLat)
      : -6.2735;
  let baseLng = Number.isFinite(rawLng) && Math.abs(rawLng) > 0.001
    ? rawLng
    : Number.isFinite(user?.domicileLng) && Math.abs(user.domicileLng) > 0.001
      ? Number(user.domicileLng)
      : 106.7150;

  // Apply a small deterministic offset based on user ID hash so users sharing city-center defaults don't stack on top of each other
  const seedStr = String(user?.id || user?.nickname || user?.name || index);
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
  }
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  const radius = 0.0022 + ((Math.abs(hash >> 4) % 5) * 0.0011);
  // If using fallback default/city-level coords, spread slightly so every avatar is distinct and clickable on the map
  const isCityDefault =
    Math.abs(baseLat - -6.2088) < 0.0005 ||
    Math.abs(baseLat - -6.2735) < 0.0005;
  if (isCityDefault) {
    baseLat += Math.sin(angle) * radius;
    baseLng += Math.cos(angle) * radius;
  }
  return {
    lat: Number(baseLat.toFixed(6)),
    lng: Number(baseLng.toFixed(6)),
  };
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

    // Strict Online Rule: Only users actively present in Redis `active_users` with live telemetry AND `allowLiveLocation: true` appear on the map
    if (!activeMembers.length) {
      const emptyResponse = { users: [] };
      await redis.set(globalCacheKey, JSON.stringify(emptyResponse), "EX", 3).catch(() => {});
      return res.json(emptyResponse);
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: activeMembers },
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
          { email: { contains: "laptop_tester" } },
          { name: { in: ["Otniel", "Josh", "Reinathan"] } },
        ],
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        profilePicture: true,
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
    await redis.set(globalCacheKey, JSON.stringify(response), "EX", 5).catch(() => {});

    res.json(response);
  } catch (err) {
    next(err);
  }
}

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
          { email: { contains: "laptop_tester" } },
          { name: { in: ["Otniel", "Josh", "Reinathan"] } },
        ],
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        profilePicture: true,
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
    const rawResult = users.map((u) => {
      // Strictly online ONLY when present in Redis active_users AND allowLiveLocation is enabled
      const isOnline = Boolean(onlineSet.has(u.id) && u.allowLiveLocation);
      const broadcast = u.broadcast && u.broadcast.expiresAt > now ? u.broadcast : null;
      const liveRec = isOnline ? liveMap.get(u.id) : null;
      const coords =
        isOnline && Number.isFinite(liveRec?.lat) && Number.isFinite(liveRec?.lng)
          ? approximateCoordinate(Number(liveRec.lat), Number(liveRec.lng))
          : { lat: null, lng: null };
      return {
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        profilePicture: u.profilePicture,
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
    await redis.set(cacheKey, JSON.stringify(response), "EX", 10);

    res.json(response);
  } catch (err) {
    next(err);
  }
}

function isValidTargetId(targetId, currentUserId) {
  if (!targetId || typeof targetId !== "string") return false;
  if (targetId.length > 128) return false;
  if (currentUserId && targetId === currentUserId) return false;
  return /^[a-zA-Z0-9_@.-]+$/.test(targetId);
}

export async function getBlockedUsers(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.json({ blockedUsers: [] });
    const blocked = await redis.smembers("blocked:" + userId).catch(() => []);
    res.json({ blockedUsers: Array.isArray(blocked) ? blocked : [] });
  } catch (err) {
    next(err);
  }
}

export async function blockUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId, userId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    await redis.sadd("blocked:" + userId, targetId).catch(() => {});
    res.json({ ok: true, blockedUserId: targetId });
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    await redis.srem("blocked:" + userId, targetId).catch(() => {});
    res.json({ ok: true, unblockedUserId: targetId });
  } catch (err) {
    next(err);
  }
}

export async function getFavouriteUsers(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.json({ favouriteUsers: [] });
    const favourites = await redis.smembers("favourites:" + userId).catch(() => []);
    res.json({ favouriteUsers: Array.isArray(favourites) ? favourites : [] });
  } catch (err) {
    next(err);
  }
}

export async function favouriteUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId, userId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    await redis.sadd("favourites:" + userId, targetId).catch(() => {});
    res.json({ ok: true, favouriteUserId: targetId });
  } catch (err) {
    next(err);
  }
}

export async function unfavouriteUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    await redis.srem("favourites:" + userId, targetId).catch(() => {});
    res.json({ ok: true, unfavouritedUserId: targetId });
  } catch (err) {
    next(err);
  }
}

export async function getMutedUsers(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.json({ mutedUsers: [] });
    const muted = await redis.smembers("muted:" + userId).catch(() => []);
    res.json({ mutedUsers: Array.isArray(muted) ? muted : [] });
  } catch (err) {
    next(err);
  }
}

export async function muteUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId, userId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    await redis.sadd("muted:" + userId, targetId).catch(() => {});
    res.json({ ok: true, mutedUserId: targetId });
  } catch (err) {
    next(err);
  }
}

export async function unmuteUser(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { targetId } = req.params;
    if (!isValidTargetId(targetId)) {
      return res.status(400).json({ error: "Invalid target user id." });
    }
    await redis.srem("muted:" + userId, targetId).catch(() => {});
    res.json({ ok: true, unmutedUserId: targetId });
  } catch (err) {
    next(err);
  }
}
