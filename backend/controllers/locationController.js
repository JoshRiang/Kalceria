import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { maskLocationToDistrict } from '../utils/privacyMask.js';

const LIVE_TTL_SECONDS = 30 * 60;
const UPDATE_COOLDOWN_SECONDS = 30;

function parseCoordinate(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidLatLng(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function publicUser(user, liveRecord) {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    profilePicture: user.profilePicture,
    socialPlatform: user.socialPlatform,
    socialLink: user.socialLink,
    district: liveRecord?.district || 'Area Depok',
    broadcast: user.broadcast || null,
  };
}

export async function updateLiveLocation(req, res, next) {
  try {
    const userId = req.user.userId;
    const lat = parseCoordinate(req.body?.lat);
    const lng = parseCoordinate(req.body?.lng);

    if (lat === null || lng === null || !isValidLatLng(lat, lng)) {
      return res.status(400).json({ error: 'Valid lat and lng are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { allowLiveLocation: true },
    });

    if (!user?.allowLiveLocation) {
      return res.status(403).json({ error: 'Live location is disabled for this account.' });
    }

    const cooldownKey = `live:cooldown:${userId}`;
    const allowed = await redis.set(cooldownKey, '1', 'EX', UPDATE_COOLDOWN_SECONDS, 'NX');
    if (!allowed) {
      return res.status(429).json({ error: 'Please wait before updating location again.' });
    }

    const key = `live:user:${userId}`;
    const currentRaw = await redis.get(key);
    const current = currentRaw ? JSON.parse(currentRaw) : null;
    const pollingCount = current ? current.pollingCount + 1 : 1;
    const hasMoved = !current || current.lat !== lat || current.lng !== lng;
    const district = maskLocationToDistrict(lat, lng);
    const nextRecord = {
      userId,
      lat,
      lng,
      district,
      timestamp: Date.now(),
      pollingCount: pollingCount >= 5 ? 0 : pollingCount,
      isStale: pollingCount >= 5 && !hasMoved,
    };

    await redis.geoadd('active_users', lng, lat, userId);
    await redis.setex(key, LIVE_TTL_SECONDS, JSON.stringify(nextRecord));
    res.json({ message: 'Location updated.' });
  } catch (err) {
    if (req.user?.userId) await redis.del(`live:cooldown:${req.user.userId}`).catch(() => {});
    next(err);
  }
}

export async function setLiveLocationPreference(req, res, next) {
  try {
    const userId = req.user.userId;
    if (typeof req.body?.allowLiveLocation !== 'boolean') {
      return res.status(400).json({ error: 'allowLiveLocation must be a boolean.' });
    }
    const allowLiveLocation = req.body.allowLiveLocation;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { allowLiveLocation },
      select: { id: true, allowLiveLocation: true },
    });

    if (!allowLiveLocation) {
      await redis.zrem('active_users', userId);
      await redis.del(`live:user:${userId}`);
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function getNearbyUsers(req, res, next) {
  try {
    const lat = parseCoordinate(req.query.lat);
    const lng = parseCoordinate(req.query.lng);
    const radius = parseCoordinate(req.query.radius) ?? 5;

    if (lat === null || lng === null || !isValidLatLng(lat, lng) || !Number.isFinite(radius) || radius <= 0 || radius > 100) {
      return res.status(400).json({ error: 'Valid lat and lng are required.' });
    }

    const nearbyIds = await redis.georadius('active_users', lng, lat, radius, 'km');
    if (!nearbyIds.length) return res.json({ users: [] });

    const liveRecords = await redis.mget(...nearbyIds.map((id) => `live:user:${id}`));
    const liveById = new Map();
    nearbyIds.forEach((id, index) => {
      if (liveRecords[index]) liveById.set(id, JSON.parse(liveRecords[index]));
      else redis.zrem('active_users', id).catch(() => {});
    });
    const activeIds = [...liveById.keys()];
    if (!activeIds.length) return res.json({ users: [] });

    const now = new Date();
    const users = await prisma.user.findMany({
      where: {
        id: { in: activeIds },
        allowLiveLocation: true,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        profilePicture: true,
        socialPlatform: true,
        socialLink: true,
        broadcast: { select: { id: true, message: true, expiresAt: true } },
      },
    });

    const enriched = await Promise.all(
      users.map(async (user) => {
        const liveRecord = liveById.get(user.id);
        const broadcast = user.broadcast && user.broadcast.expiresAt > now ? user.broadcast : null;
        return publicUser({ ...user, broadcast }, liveRecord);
      })
    );

    res.json({ users: enriched });
  } catch (err) {
    next(err);
  }
}

export async function toggleIsSentEvent(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: { isSentEvent: true },
  });
}
