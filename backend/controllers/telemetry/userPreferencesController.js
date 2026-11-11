import { redis } from '../../lib/redis.js';
import { isValidTargetId } from './telemetryUtils.js';

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

