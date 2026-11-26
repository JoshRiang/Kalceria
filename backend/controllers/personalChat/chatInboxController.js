import { redis } from '../../lib/redis.js';
import prisma from '../../lib/prisma.js';
import { getCanonicalInboxSummary, fetchCanonicalUserBlocks } from '../../services/canonicalFallbackStore.js';
import {
  HOT_RING_BUFFER_SIZE,
  COLD_ARCHIVE_MAX_SIZE,
  HOT_TTL_SECONDS,
  COLD_TTL_SECONDS,
  unwrapPipeResult,
  sanitizeTargetId,
  getConversationHash,
  getMetaConversationKey,
  unpackEnvelope,
} from './index.js';

export async function ackPersonalChatRead(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid conversation target.' });
    }

    const upToTs = Number(req.body?.upToTs) || Date.now();
    const messageIds = Array.isArray(req.body?.messageIds)
      ? req.body.messageIds.map(String).filter(Boolean).slice(0, 50)
      : [];

    const convHash = getConversationHash(userId, targetId);
    const metaKey = getMetaConversationKey(convHash);

    const currentReadRaw = await redis.hget(metaKey, `readUpTo:${userId}`).catch(() => null);
    const nextReadTs = Math.max(Number(currentReadRaw || 0), upToTs);

    const pipe = redis.pipeline();
    pipe.hset(metaKey, `readUpTo:${userId}`, String(nextReadTs));
    pipe.expire(metaKey, HOT_TTL_SECONDS);
    pipe.hdel(`chat:unread:${userId}`, String(targetId));
    pipe.set(`chat:inbox_ver:${userId}`, `${Date.now()}_r`, 'EX', HOT_TTL_SECONDS);

    const tasks = [pipe.exec().catch(() => {})];
    if (prisma?.personalChatMessage) {
      tasks.push(
        prisma.personalChatMessage
          .updateMany({
            where: messageIds.length > 0
              ? { convHash, recipientId: String(userId), id: { in: messageIds }, status: { not: 'blocked_drop' } }
              : { convHash, recipientId: String(userId), status: { notIn: ['read', 'blocked_drop'] }, ts: { lte: BigInt(Math.floor(nextReadTs)) } },
            data: { status: 'read' },
          })
          .catch(() => {})
      );
    }

    await Promise.all(tasks);
    res.json({ ok: true, readUpTo: nextReadTs });
  } catch (err) {
    next(err);
  }
}

export async function getPersonalChatInboxSummary(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const redisDegraded = Boolean(redis.isDegraded || redis.isQuotaExceeded);
    const sinceVer = typeof req.query?.sinceVer === 'string' ? req.query.sinceVer.trim() : '';
    const verKey = `chat:inbox_ver:${userId}`;
    const currentVer = redisDegraded ? '0' : (await redis.get(verKey).catch(() => null)) || '0';

    if (!redisDegraded && sinceVer && currentVer !== '0' && sinceVer === currentVer) {
      return res.json({ ok: true, unchanged: true, ver: currentVer });
    }

    const pipe = redis.pipeline();
    pipe.hgetall(`chat:unread:${userId}`);
    pipe.hgetall(`chat:inbox_meta:${userId}`);
    pipe.lrange(`notif:events:${userId}`, 0, 19);
    const pipeRes = await pipe.exec().catch(() => null);

    const rawUnread = unwrapPipeResult(pipeRes?.[0], {}) || {};
    const rawMeta = unwrapPipeResult(pipeRes?.[1], {}) || {};
    const rawEventNotifs = unwrapPipeResult(pipeRes?.[2], []) || [];

    const peers = {};
    for (const [peerId, countStr] of Object.entries(rawUnread)) {
      const unreadCount = Math.max(0, Number(countStr) || 0);
      let metaObj = null;
      if (rawMeta[peerId]) {
        try {
          metaObj = JSON.parse(rawMeta[peerId]);
        } catch {}
      }
      peers[peerId] = {
        unreadCount,
        lastTs: Number(metaObj?.ts || 0),
        lastId: metaObj?.id || null,
        msgType: metaObj?.msgType || 'text',
      };
    }

    const [myBlocked, canonicalBlocks] = await Promise.all([
      redis.smembers(`blocked:${userId}`).catch(() => []),
      fetchCanonicalUserBlocks(userId).catch(() => ({ blockedUsers: [] })),
    ]);
    const blockedSet = new Set([
      ...(Array.isArray(myBlocked) ? myBlocked.map(String) : []),
      ...(canonicalBlocks?.blockedUsers || []),
    ]);

    for (const blockedId of blockedSet) {
      delete peers[blockedId];
    }

    let eventNotifications = (Array.isArray(rawEventNotifs) ? rawEventNotifs : [])
      .map((item) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter((notif) => {
        if (!notif) return false;
        const senderId = notif.user?.id || notif.userId || notif.payload?.userId || notif.senderId;
        if (senderId && blockedSet.has(String(senderId))) return false;
        return true;
      });

    // Always hydrate shared PostgreSQL Canonical Store when Redis is degraded or empty across cold serverless lambdas
    if (redisDegraded || Object.keys(peers).length === 0 || eventNotifications.length === 0) {
      const canonical = await getCanonicalInboxSummary(userId);
      if (redisDegraded) {
        // Canonical Postgres is authoritative when Redis is in per-lambda memory fallback
        for (const k of Object.keys(peers)) delete peers[k];
        for (const [peerId, info] of Object.entries(canonical.peers || {})) {
          if (!blockedSet.has(String(peerId))) {
            peers[peerId] = info;
          }
        }
      } else if (Object.keys(peers).length === 0 && Object.keys(canonical.peers).length > 0) {
        for (const [peerId, info] of Object.entries(canonical.peers)) {
          if (!blockedSet.has(String(peerId))) {
            peers[peerId] = info;
          }
        }
      }
      if ((redisDegraded || eventNotifications.length === 0) && Array.isArray(canonical.rawEventNotifs) && canonical.rawEventNotifs.length > 0) {
        const seenIds = new Set(eventNotifications.map((n) => n?.id).filter(Boolean));
        const canonicalFiltered = canonical.rawEventNotifs.filter((notif) => {
          if (!notif) return false;
          if (notif.id && seenIds.has(notif.id)) return false;
          const senderId = notif.user?.id || notif.userId || notif.payload?.userId || notif.senderId;
          if (senderId && blockedSet.has(String(senderId))) return false;
          return true;
        });
        eventNotifications.push(...canonicalFiltered);
      }
    }

    res.json({
      ok: true,
      unchanged: false,
      ver: currentVer !== '0' ? currentVer : `${Date.now()}_ver`,
      peers,
      eventNotifications,
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePersonalChatMessages(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid conversation target.' });
    }

    const convHash = getConversationHash(userId, targetId);
    const hotKey = `chat:conv:${convHash}`;
    const coldKey = `chat:cold:${convHash}`;
    const metaKey = getMetaConversationKey(convHash);
    const { messageIds, clearAll } = req.body || {};

    if (clearAll) {
      const clearPipe = redis.pipeline();
      clearPipe.del(hotKey);
      clearPipe.del(coldKey);
      clearPipe.hincrby(metaKey, 'deleteRev', 1);
      clearPipe.hset(metaKey, 'emptyConfirmed', '1', 'backfilled', '1', 'lastTs', '0');
      clearPipe.expire(metaKey, HOT_TTL_SECONDS);
      clearPipe.hdel(`chat:unread:${userId}`, String(targetId));
      clearPipe.hdel(`chat:unread:${targetId}`, String(userId));

      await Promise.all([
        clearPipe.exec().catch(() => {}),
        prisma?.personalChatMessage
          ? prisma.personalChatMessage.deleteMany({ where: { convHash } }).catch(() => {})
          : Promise.resolve(),
      ]);
      return res.json({ ok: true, cleared: true });
    }

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      const idSet = new Set(messageIds.map(String));

      for (const [key, maxLen, ttl] of [
        [hotKey, HOT_RING_BUFFER_SIZE, HOT_TTL_SECONDS],
        [coldKey, COLD_ARCHIVE_MAX_SIZE, COLD_TTL_SECONDS],
      ]) {
        const rawList = await redis.lrange(key, 0, maxLen - 1).catch(() => []);
        if (!Array.isArray(rawList) || rawList.length === 0) continue;
        const filtered = rawList.filter((raw) => {
          const env = unpackEnvelope(raw);
          return env && !idSet.has(String(env.id));
        });
        const p = redis.pipeline();
        p.del(key);
        if (filtered.length > 0) {
          p.rpush(key, ...filtered);
          p.expire(key, ttl);
        }
        await p.exec().catch(() => {});
      }

      const metaPipe = redis.pipeline();
      metaPipe.hincrby(metaKey, 'deleteRev', 1);
      metaPipe.hset(metaKey, 'backfilled', '0');
      metaPipe.expire(metaKey, HOT_TTL_SECONDS);

      await Promise.all([
        metaPipe.exec().catch(() => {}),
        prisma?.personalChatMessage
          ? prisma.personalChatMessage
              .deleteMany({
                where: {
                  convHash,
                  id: { in: Array.from(idSet) },
                },
              })
              .catch(() => {})
          : Promise.resolve(),
      ]);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

