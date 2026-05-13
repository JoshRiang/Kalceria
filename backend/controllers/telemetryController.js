import { PrismaClient } from "@prisma/client";
import { redis } from "../lib/redis.js";
import { maskLocationToDistrict } from "../utils/privacyMask.js";

const prisma = new PrismaClient();
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

    // Get all active user IDs from Redis geo set
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
        broadcast: {
          select: { id: true, message: true, expiresAt: true },
        },
      },
    });

    if (!users.length) return res.json({ users: [] });

    // Batch fetch all positions in ONE call
    const userIds = users.map((u) => u.id);
    const positions = await redis.geopos("active_users", ...userIds);

    // Map results efficiently
    const now = new Date();
    const enriched = users.map((u, index) => {
      const pos = positions[index];
      let district = null;
      if (pos && pos[0]) {
        const [lng, lat] = pos;
        district = maskLocationToDistrict(parseFloat(lat), parseFloat(lng));
      }
      // broadcast logic: only show if not expired
      const broadcast = u.broadcast && u.broadcast.expiresAt > now ? u.broadcast : null;
      return { ...u, district, broadcast };
    });

    const response = { users: enriched };
    // Cache for 5 seconds - keeps the map responsive while slashing heavy compute
    await redis.set(globalCacheKey, JSON.stringify(response), "EX", 5);

    res.json(response);
  } catch (err) {
    next(err);
  }
}
