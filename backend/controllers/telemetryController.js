import { PrismaClient } from '@prisma/client';
import { redis } from '../lib/redis.js';
import { maskLocationToDistrict } from '../utils/privacyMask.js';

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
      return res.status(400).json({ error: 'Valid lat and lng are required.' });
    }

    const key = `telemetry:${userId}`;
    const record = JSON.stringify({ lat, lng, ts: Date.now() });

    await redis.lpush(key, record);
    await redis.ltrim(key, 0, 4);

    res.json({ message: 'Telemetry saved.' });
  } catch (err) {
    next(err);
  }
}

export async function getMapUsers(req, res, next) {
  try {
    const members = await redis.zrange('active_users', 0, -1);
    if (!members.length) return res.json({ users: [] });

    const now = new Date();
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

    const visibleUsers = [];

    for (const user of users) {
      const liveRaw = await redis.get(`live:user:${user.id}`);
      if (!liveRaw) continue;

      const live = JSON.parse(liveRaw);
      if (live.isStale) continue;

      const broadcast = user.broadcast && user.broadcast.expiresAt > now ? user.broadcast : null;
      const approx = approximateCoordinate(live.lat, live.lng);

      visibleUsers.push({
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        profilePicture: user.profilePicture,
        socialPlatform: user.socialPlatform,
        socialLink: user.socialLink,
        district: live.district || maskLocationToDistrict(live.lat, live.lng),
        lat: approx.lat,
        lng: approx.lng,
        broadcast,
      });
    }

    res.json({ users: visibleUsers });
  } catch (err) {
    next(err);
  }
}
