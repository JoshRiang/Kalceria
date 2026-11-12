import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';

async function invalidateKalceriansCache() {
  try {
    await redis.del('cache:all_kalcerians', 'cache:map_users:global', 'cache:map_users_enriched');
  } catch {}
}

const BROADCAST_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 120;

function cleanMessage(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function extractBroadcastMediaAndText(rawMessage, rawMediaUrl) {
  let mediaUrl = cleanMessage(rawMediaUrl);
  let text = cleanMessage(rawMessage);
  const match = text.match(/\[MEDIA:([^\]]+)\]/i);
  if (match) {
    if (!mediaUrl) mediaUrl = match[1].trim();
    text = text.replace(/\[MEDIA:[^\]]+\]\s*/gi, '').trim();
  }
  return { mediaUrl: mediaUrl || null, text };
}

function validateBroadcastInput(text, mediaUrl) {
  if (!text && !mediaUrl) return 'Message is required.';
  if (text.length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or less.`;
  }
  return null;
}

export async function getBroadcastViewCount(broadcastId) {
  if (!broadcastId) return 0;
  try {
    const count = await redis.scard(`broadcast:views:${broadcastId}`);
    return Number(count) || 0;
  } catch {
    return 0;
  }
}

export async function formatBroadcastItem(broadcast) {
  if (!broadcast) return null;
  const { mediaUrl, text } = extractBroadcastMediaAndText(broadcast.message);
  const viewCount = await getBroadcastViewCount(broadcast.id);
  return {
    ...broadcast,
    message: text,
    rawMessage: broadcast.message,
    mediaUrl,
    viewCount,
  };
}

export async function getMyBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const broadcast = await prisma.userBroadcast.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    await invalidateKalceriansCache();
    const formatted = broadcast ? await formatBroadcastItem(broadcast) : null;
    res.json({ broadcast: formatted });
  } catch (err) {
    next(err);
  }
}

export async function createBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const rawMessage = cleanMessage(req.body.message);
    const rawMedia = cleanMessage(req.body.mediaUrl);
    const { mediaUrl, text } = extractBroadcastMediaAndText(rawMessage, rawMedia);
    const error = validateBroadcastInput(text, mediaUrl);

    if (error) return res.status(400).json({ error });

    const existing = await prisma.userBroadcast.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Broadcast already exists. Use PUT to update.' });
    }

    await prisma.userBroadcast.deleteMany({
      where: { userId, expiresAt: { lte: new Date() } },
    });

    const expiresAt = new Date(Date.now() + BROADCAST_TTL_MS);
    const fullMessage = mediaUrl ? `[MEDIA:${mediaUrl}] ${text}`.trim() : text;
    const broadcast = await prisma.userBroadcast.create({
      data: { userId, message: fullMessage, expiresAt },
    });

    await invalidateKalceriansCache();
    const formatted = await formatBroadcastItem(broadcast);
    res.status(201).json({ broadcast: formatted });
  } catch (err) {
    next(err);
  }
}

export async function updateBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const rawMessage = cleanMessage(req.body.message);
    const rawMedia = cleanMessage(req.body.mediaUrl);
    const { mediaUrl, text } = extractBroadcastMediaAndText(rawMessage, rawMedia);
    const error = validateBroadcastInput(text, mediaUrl);

    if (error) return res.status(400).json({ error });

    const existing = await prisma.userBroadcast.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'No active broadcast found.' });
    }

    const fullMessage = mediaUrl ? `[MEDIA:${mediaUrl}] ${text}`.trim() : text;
    const broadcast = await prisma.userBroadcast.update({
      where: { userId },
      data: { message: fullMessage },
    });

    await invalidateKalceriansCache();
    const formatted = await formatBroadcastItem(broadcast);
    res.json({ broadcast: formatted });
  } catch (err) {
    next(err);
  }
}

export async function deleteBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const existingBroadcasts = await prisma.userBroadcast.findMany({
      where: { userId },
      select: { id: true },
    });
    for (const b of existingBroadcasts) {
      try {
        await redis.del(`broadcast:views:${b.id}`);
      } catch {}
    }
    await prisma.userBroadcast.deleteMany({ where: { userId } });
    invalidateKalceriansCache().catch(() => {});
    return res.json({ message: 'Broadcast deleted.' });
  } catch (err) {
    next(err);
  }
}

export async function recordBroadcastView(req, res, next) {
  try {
    const broadcastId = req.params?.id;
    if (!broadcastId) {
      return res.status(400).json({ error: 'Broadcast ID required.' });
    }

    const broadcast = await prisma.userBroadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true, userId: true },
    });

    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast not found.' });
    }

    const viewerUserId = req.user?.userId || null;
    const clientIp = req.clientIp || req.ip || 'anonymous';
    const viewerKey = viewerUserId ? `u:${viewerUserId}` : `ip:${clientIp}`;

    const isAuthor = Boolean(viewerUserId && String(broadcast.userId) === String(viewerUserId));
    const k = `broadcast:views:${broadcast.id}`;

    if (!isAuthor && viewerKey) {
      try {
        await redis.sadd(k, viewerKey);
        await redis.expire(k, 7 * 24 * 60 * 60);
      } catch {}
    }

    const viewCount = await getBroadcastViewCount(broadcast.id);
    return res.json({ success: true, viewCount });
  } catch (err) {
    next(err);
  }
}
