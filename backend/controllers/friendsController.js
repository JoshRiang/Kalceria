import prisma from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import {
  getFriendRelations,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from '../services/friendsStore.js';
import { isUserBlockedCanonical } from '../services/canonicalFallbackStore.js';

function sanitizeId(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 128);
}

async function invalidateSocialCaches() {
  await Promise.allSettled([
    redis.del('cache:all_kalcerians').catch(() => {}),
    redis.del('cache:map_users_enriched').catch(() => {}),
  ]);
}

export async function getFriendsState(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });
    const relations = await getFriendRelations(userId);
    return res.json({ ok: true, ...relations });
  } catch (err) {
    return next(err);
  }
}

export async function createFriendRequest(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeId(req.params?.targetId);
    if (!userId || !targetId || String(userId) === String(targetId)) {
      return res.status(400).json({ error: 'Invalid friend request target.' });
    }

    const targetExists = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, isEmailVerified: true },
    });
    if (!targetExists || !targetExists.isEmailVerified) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const [blockedOut, blockedIn] = await Promise.all([
      isUserBlockedCanonical(userId, targetId),
      isUserBlockedCanonical(targetId, userId),
    ]);
    if (blockedOut || blockedIn) {
      return res.status(403).json({ error: 'Cannot send friend request to a blocked user.' });
    }

    const result = await sendFriendRequest(userId, targetId);
    await invalidateSocialCaches();
    const relations = await getFriendRelations(userId);
    return res.json({ ok: true, ...result, ...relations });
  } catch (err) {
    return next(err);
  }
}

export async function deleteFriendRequest(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid friend request target.' });
    }
    const result = await cancelFriendRequest(userId, targetId);
    await invalidateSocialCaches();
    const relations = await getFriendRelations(userId);
    return res.json({ ok: true, ...result, ...relations });
  } catch (err) {
    return next(err);
  }
}

export async function acceptFriendRequestHandler(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid friend request target.' });
    }
    const result = await acceptFriendRequest(userId, targetId);
    if (!result.ok && result.status === 'expired_or_missing') {
      const relations = await getFriendRelations(userId);
      return res.status(410).json({
        error: 'Friend request has expired or was cancelled.',
        code: 'FRIEND_REQUEST_EXPIRED',
        ...relations,
      });
    }
    await invalidateSocialCaches();
    const relations = await getFriendRelations(userId);
    return res.json({ ok: true, ...result, ...relations });
  } catch (err) {
    return next(err);
  }
}

export async function rejectFriendRequestHandler(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid friend request target.' });
    }
    const result = await rejectFriendRequest(userId, targetId);
    await invalidateSocialCaches();
    const relations = await getFriendRelations(userId);
    return res.json({ ok: true, ...result, ...relations });
  } catch (err) {
    return next(err);
  }
}
