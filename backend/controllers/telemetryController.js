import { redis } from '../lib/redis.js';
import prisma from '../lib/prisma.js';
import { maskLocationToDistrict } from '../utils/privacyMask.js';

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
    const lat = parseCoordinate(req.body.lat);
    const lng = parseCoordinate(req.body.lng);

    if (lat === null || lng === null) {
      return res.status(400).json({ error: "Valid lat and lng are required." });
    }

    const key = `telemetry:${userId}`;
    const record = JSON.stringify({ lat, lng, ts: Date.now() });

    await redis.lpush(key, record);
    await redis.ltrim(key, 0, 4);

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

    const members = await redis.zrange("active_users", 0, -1);
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
        createdAt: true,
        broadcast: {
          select: { id: true, message: true, expiresAt: true },
        },
      },
    });

    if (!users.length) return res.json({ users: [] });

    const userIds = users.map((u) => u.id);
    const positions = await redis.geopos("active_users", ...userIds);

    const now = new Date();
    const enriched = users.map((u, index) => {
      const pos = positions[index];
      let district = null;
      let lat = null;
      let lng = null;
      if (pos && pos[0]) {
        const rawLng = parseFloat(pos[0]);
        const rawLat = parseFloat(pos[1]);
        district = maskLocationToDistrict(rawLat, rawLng);
        // approximate coords for privacy
        const approx = approximateCoordinate(rawLat, rawLng);
        lat = approx.lat;
        lng = approx.lng;
      }
      const broadcast = u.broadcast && u.broadcast.expiresAt > now ? u.broadcast : null;
      return { ...u, district, lat, lng, broadcast };
    });

    const mockMapUsers = [
      {
        id: "mock_1",
        name: "Ahmad Bintaro",
        nickname: "Ahmad",
        profilePicture: null,
        socialPlatform: "IG",
        socialLink: "ahmadbintaro",
        district: "Bintaro",
        lat: -6.2730,
        lng: 106.7140,
        broadcast: { message: "Riding around Sector 9!", expiresAt: new Date(now.getTime() + 86400000) }
      },
      {
        id: "mock_2",
        name: "Kalcerian Alpha",
        nickname: "Alpha",
        profilePicture: null,
        socialPlatform: "WA",
        socialLink: null,
        district: "Pondok Indah",
        lat: -6.2800,
        lng: 106.7200,
        broadcast: null
      }
    ];

    const response = { users: [...enriched, ...mockMapUsers] };
    await redis.set(globalCacheKey, JSON.stringify(response), "EX", 5);


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
    const onlineSet = new Set(onlineIds);

    // fetch all users — only safe public fields
    const users = await prisma.user.findMany({
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
          select: { id: true, message: true, expiresAt: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const result = users.map((u) => {
      const isOnline = u.allowLiveLocation && onlineSet.has(u.id);
      const broadcast = u.broadcast && u.broadcast.expiresAt > now ? u.broadcast : null;
      return {
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        profilePicture: u.profilePicture,
        isOnline,
        broadcast,
      };
    });

    const mockKalcerians = [
      { id: "mock_1", name: "Ahmad Bintaro", nickname: "Ahmad", profilePicture: null, isOnline: true, broadcast: { message: "Riding around Sector 9!" } },
      { id: "mock_2", name: "Kalcerian Alpha", nickname: "Alpha", profilePicture: null, isOnline: true, broadcast: null },
      { id: "mock_3", name: "Ghost Rider", nickname: "Ghost", profilePicture: null, isOnline: false, broadcast: null }
    ];

    const response = { kalcerians: [...result, ...mockKalcerians] };
    await redis.set(cacheKey, JSON.stringify(response), "EX", 10);

    res.json(response);
  } catch (err) {
    next(err);
  }
}

