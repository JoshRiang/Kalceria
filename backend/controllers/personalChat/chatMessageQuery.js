import { redis } from '../../lib/redis.js';
import prisma from '../../lib/prisma.js';
import {
  HOT_RING_BUFFER_SIZE,
  COLD_ARCHIVE_MAX_SIZE,
  HOT_TTL_SECONDS,
  unwrapPipeResult,
  sanitizeTargetId,
  getConversationHash,
  getMetaConversationKey,
  getChatRtcSignalKey,
  packEnvelope,
  unpackEnvelope,
} from './index.js';

export async function getPersonalChatMessages(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid conversation target.' });
    }

    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 30;
    const cursorTs = req.query?.cursor ? Number(req.query.cursor) : null;
    const isCursorPagination = Boolean(cursorTs && Number.isFinite(cursorTs));
    const sinceTs = req.query?.sinceTs ? Number(req.query.sinceTs) : 0;
    const sinceReadTs = req.query?.sinceReadTs ? Number(req.query.sinceReadTs) : 0;
    const sinceDelRev = req.query?.sinceDelRev ? Number(req.query.sinceDelRev) : 0;
    const isPeekOnly = String(req.query?.peek || '') === '1';
    const includeRtc = String(req.query?.includeRtc || '') === '1';

    const convHash = getConversationHash(userId, targetId);
    const hotKey = `chat:conv:${convHash}`;
    const coldKey = `chat:cold:${convHash}`;
    const metaKey = getMetaConversationKey(convHash);
    const myRtcKey = getChatRtcSignalKey(userId, targetId);

    // 1. Single O(1) Redis pipeline: conversation metadata + block relationship + optional piggybacked P2P WebRTC signals
    const metaPipe = redis.pipeline();
    metaPipe.hgetall(metaKey);
    metaPipe.sismember(`blocked:${userId}`, targetId);
    if (includeRtc) {
      metaPipe.lrange(myRtcKey, 0, -1);
      metaPipe.del(myRtcKey);
    }
    const metaPipeRes = await metaPipe.exec().catch(() => null);
    const meta = unwrapPipeResult(metaPipeRes?.[0], {}) || {};
    const isTargetBlockedByMe = Number(unwrapPipeResult(metaPipeRes?.[1], 0)) === 1;

    let rtcSignals = [];
    if (includeRtc) {
      const rawRtc = unwrapPipeResult(metaPipeRes?.[2], []);
      rtcSignals = (Array.isArray(rawRtc) ? rawRtc : [])
        .map((item) => {
          try {
            return typeof item === 'string' ? JSON.parse(item) : item;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse();
    }

    const metaLastTs = Number(meta.lastTs || 0);
    const myReadUpTo = Number(meta[`readUpTo:${userId}`] || 0);
    const peerReadUpTo = Number(meta[`readUpTo:${targetId}`] || 0);
    const deleteRev = Number(meta.deleteRev || 0);
    const hasPendingUnreadForMe =
      !isPeekOnly &&
      meta.lastSender === String(targetId) &&
      metaLastTs > myReadUpTo;

    // 2. O(1) Delta Short-Circuit: If client has latest watermark, zero LRANGE & zero DB queries!
    if (
      sinceTs > 0 &&
      !isCursorPagination &&
      (meta.emptyConfirmed === '1' || metaLastTs > 0) &&
      metaLastTs <= sinceTs &&
      peerReadUpTo === sinceReadTs &&
      deleteRev === sinceDelRev &&
      !hasPendingUnreadForMe
    ) {
      return res.json({
        messages: [],
        unchanged: true,
        lastTs: metaLastTs,
        peerReadTs: peerReadUpTo,
        deleteRev,
        rtcSignals,
        nextCursor: null,
        hasMore: false,
        e2ee: true,
      });
    }

    const rawHot = await redis.lrange(hotKey, 0, HOT_RING_BUFFER_SIZE - 1).catch(() => []);
    const hotMsgs = (Array.isArray(rawHot) ? rawHot : [])
      .map(unpackEnvelope)
      .filter(Boolean);

    const byId = new Map();
    for (const m of hotMsgs) {
      byId.set(m.id, m);
    }

    // 3. Smart Read-Through: ONLY hit PostgreSQL on cold miss / eviction, cursor pagination, or one-time backfill
    const isColdOrEvicted = hotMsgs.length === 0 && meta.emptyConfirmed !== '1';
    const needsInitialBackfill =
      hotMsgs.length > 0 &&
      hotMsgs.length < limit &&
      meta.backfilled !== '1' &&
      !sinceTs;

    if (isCursorPagination || isColdOrEvicted || needsInitialBackfill) {
      try {
        if (prisma?.personalChatMessage) {
          const dbRows = await prisma.personalChatMessage.findMany({
            where: {
              convHash,
              ...(isCursorPagination ? { ts: { lt: BigInt(Math.floor(cursorTs)) } } : {}),
            },
            orderBy: { ts: 'desc' },
            take: Math.max(limit + 1, HOT_RING_BUFFER_SIZE),
          });
          for (const row of dbRows) {
            const unpacked = unpackEnvelope(row.packedJson);
            if (!unpacked) continue;
            if (row.status === 'read') unpacked.status = 'read';
            const existing = byId.get(unpacked.id);
            if (!existing) {
              byId.set(unpacked.id, unpacked);
            } else if (unpacked.status === 'read' && existing.status !== 'read') {
              existing.status = 'read';
            }
          }

          if (!isCursorPagination) {
            const healPipe = redis.pipeline();
            if (byId.size === 0) {
              healPipe.hset(metaKey, 'emptyConfirmed', '1', 'backfilled', '1', 'lastTs', '0');
              healPipe.expire(metaKey, HOT_TTL_SECONDS);
            } else {
              const sortedDesc = Array.from(byId.values()).sort((a, b) => Number(b.ts) - Number(a.ts));
              const newestFromDb = sortedDesc[0];
              if (hotMsgs.length === 0 || needsInitialBackfill) {
                const toHydrate = sortedDesc.slice(0, HOT_RING_BUFFER_SIZE).map(packEnvelope);
                if (toHydrate.length > 0) {
                  healPipe.del(hotKey);
                  healPipe.rpush(hotKey, ...toHydrate);
                  healPipe.expire(hotKey, HOT_TTL_SECONDS);
                }
              }
              healPipe.hset(
                metaKey,
                'emptyConfirmed',
                '0',
                'backfilled',
                '1',
                'lastTs',
                String(Math.max(metaLastTs, Number(newestFromDb?.ts || 0))),
                'lastSender',
                String(newestFromDb?.senderId || meta.lastSender || '')
              );
              healPipe.expire(metaKey, HOT_TTL_SECONDS);
            }
            await healPipe.exec().catch(() => {});
          }
        }
      } catch {}
    }

    // If paginating older history with a cursor, also check Redis cold archive
    if (isCursorPagination) {
      const rawCold = await redis.lrange(coldKey, 0, COLD_ARCHIVE_MAX_SIZE - 1).catch(() => []);
      const coldMsgs = (Array.isArray(rawCold) ? rawCold : [])
        .map(unpackEnvelope)
        .filter(Boolean);
      for (const cm of coldMsgs) {
        if (!byId.has(cm.id)) {
          byId.set(cm.id, cm);
        }
      }
    }

    let combined = Array.from(byId.values());

    // Apply monotonic O(1) read watermarks before checking newly-read transitions
    for (const m of combined) {
      if (m.status === 'read') continue;
      const recipientStr = String(m.recipientId);
      const watermark =
        recipientStr === String(userId)
          ? myReadUpTo
          : recipientStr === String(targetId)
          ? peerReadUpTo
          : 0;
      if (watermark > 0 && Number(m.ts) <= watermark) {
        m.status = 'read';
      }
    }

    // Real Read Receipt Update: ONLY mark messages as 'read' when actual recipient fetches chat (not peek)
    let readUpdated = false;
    const newlyReadIds = [];
    let maxNewlyReadTs = myReadUpTo;
    if (!isPeekOnly) {
      for (const m of combined) {
        if (String(m.recipientId) === String(userId) && m.status !== 'read') {
          m.status = 'read';
          readUpdated = true;
          newlyReadIds.push(m.id);
          if (Number(m.ts) > maxNewlyReadTs) {
            maxNewlyReadTs = Number(m.ts);
          }
        }
      }
    }

    if (readUpdated) {
      // Atomic O(1) Redis watermark update + Postgres status sync
      const readPipe = redis.pipeline();
      readPipe.hset(metaKey, `readUpTo:${userId}`, String(maxNewlyReadTs));
      readPipe.expire(metaKey, HOT_TTL_SECONDS);
      readPipe.hdel(`chat:unread:${userId}`, String(targetId));
      readPipe.set(`chat:inbox_ver:${userId}`, `${Date.now()}_r`, 'EX', HOT_TTL_SECONDS);

      const readPromises = [readPipe.exec().catch(() => {})];
      if (prisma?.personalChatMessage && newlyReadIds.length > 0) {
        readPromises.push(
          prisma.personalChatMessage
            .updateMany({
              where: { id: { in: newlyReadIds } },
              data: { status: 'read' },
            })
            .catch(() => {})
        );
      }
      await Promise.all(readPromises);
    } else if (!isPeekOnly && !isCursorPagination && !sinceTs) {
      // Ensure any residual unread badge for this peer is cleared on initial chat open
      redis.hdel(`chat:unread:${userId}`, String(targetId)).catch(() => {});
    }

    if (isCursorPagination) {
      combined = combined.filter((m) => Number(m.ts) < cursorTs);
    }

    if (isTargetBlockedByMe) {
      combined = combined.filter(
        (m) => !(String(m.senderId) === String(targetId) && m.status === 'blocked_drop')
      );
    }

    combined.sort((a, b) => Number(b.ts) - Number(a.ts));
    const newestOverallTs = combined.length > 0 ? Number(combined[0].ts) : metaLastTs;

    // Delta mode: transmit ONLY newly arrived envelopes when deleteRev matches
    if (sinceTs > 0 && !isCursorPagination && deleteRev === sinceDelRev) {
      const deltaSlice = combined
        .filter((m) => Number(m.ts) > sinceTs)
        .reverse();
      return res.json({
        messages: deltaSlice,
        delta: true,
        unchanged: false,
        lastTs: Math.max(metaLastTs, newestOverallTs),
        peerReadTs: peerReadUpTo,
        deleteRev,
        rtcSignals,
        nextCursor: null,
        hasMore: false,
        e2ee: true,
      });
    }

    const hasMore = combined.length > limit;
    const pageSlice = combined.slice(0, limit).reverse();
    const nextCursor = hasMore && pageSlice.length > 0 ? pageSlice[0].ts : null;

    res.json({
      messages: pageSlice,
      nextCursor,
      hasMore,
      lastTs: Math.max(metaLastTs, newestOverallTs),
      peerReadTs: peerReadUpTo,
      deleteRev,
      rtcSignals,
      e2ee: true,
    });
  } catch (err) {
    next(err);
  }
}

