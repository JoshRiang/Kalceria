import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';
import prisma from '../lib/prisma.js';
import {
  MAX_CIPHERTEXT_LENGTH,
  HOT_RING_BUFFER_SIZE,
  COLD_ARCHIVE_MAX_SIZE,
  HOT_TTL_SECONDS,
  COLD_TTL_SECONDS,
  NONCE_TTL_SECONDS,
  unwrapPipeResult,
  sanitizeTargetId,
  getConversationHash,
  getMetaConversationKey,
  getChatRtcSignalKey,
  packEnvelope,
  unpackEnvelope,
  sendChatRtcSignal,
  getChatRtcSignals,
  sendCallSignal,
  getCallSignals,
  clearCallSignals,
  getLiveKitCallToken,
  generateLiveKitToken,
} from './personalChat/index.js';

export {
  sendChatRtcSignal,
  getChatRtcSignals,
  sendCallSignal,
  getCallSignals,
  clearCallSignals,
  getLiveKitCallToken,
  generateLiveKitToken,
};

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

    // 1. Single O(1) Redis pipeline: conversation metadata + optional piggybacked P2P WebRTC signals
    const metaPipe = redis.pipeline();
    metaPipe.hgetall(metaKey);
    if (includeRtc) {
      metaPipe.lrange(myRtcKey, 0, -1);
      metaPipe.del(myRtcKey);
    }
    const metaPipeRes = await metaPipe.exec().catch(() => null);
    const meta = unwrapPipeResult(metaPipeRes?.[0], {}) || {};

    let rtcSignals = [];
    if (includeRtc) {
      const rawRtc = unwrapPipeResult(metaPipeRes?.[1], []);
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
      // Atomic O(1) Redis watermark update (eliminates non-atomic DEL+RPUSH race condition!) + Postgres status sync
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

export async function sendPersonalChatMessage(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId || String(userId) === String(targetId)) {
      return res.status(400).json({ error: 'Invalid conversation target.' });
    }

    const body = req.body || {};
    const ciphertext = typeof body.ciphertext === 'string' ? body.ciphertext.trim() : '';
    const iv = typeof body.iv === 'string' ? body.iv.trim() : '';
    const sig = typeof body.sig === 'string' ? body.sig.trim() : '';
    const nonce = typeof body.nonce === 'string' ? body.nonce.trim() : '';
    const alg = body.alg === 'AES-256-GCM' ? 'AES-256-GCM' : 'AES-256-GCM';
    const msgType = ['text', 'media', 'voice', 'video', 'call'].includes(body.msgType) ? body.msgType : 'text';
    const ts = Number(body.ts) || Date.now();

    if (!ciphertext || ciphertext.length > MAX_CIPHERTEXT_LENGTH || !iv || !sig || !nonce) {
      return res.status(400).json({ error: 'Invalid E2EE message envelope.' });
    }

    // Anti-replay timestamp & nonce verification
    if (Math.abs(Date.now() - ts) > 10 * 60 * 1000) {
      return res.status(400).json({ error: 'Stale message timestamp rejected.' });
    }
    if (!/^[a-zA-Z0-9_-]{12,128}$/.test(nonce)) {
      return res.status(400).json({ error: 'Invalid cryptographic nonce.' });
    }

    // Video media duration validation: maximum 60 seconds (1 minute)
    if (body.videoDuration && typeof body.videoDuration === 'number' && body.videoDuration > 60) {
      return res.status(400).json({ error: 'Durasi video melebihi batas 1 menit (maksimal 60 detik).' });
    }

    const nonceKey = `chat:nonce:${nonce}`;
    const convHash = getConversationHash(userId, targetId);
    const hotKey = `chat:conv:${convHash}`;
    const coldKey = `chat:cold:${convHash}`;
    const metaKey = getMetaConversationKey(convHash);

    // 1. Single-RTT Pre-Flight Pipeline: block checks + atomic nonce lock + ring-buffer tail peek + empty flag
    const prePipe = redis.pipeline();
    prePipe.sismember(`blocked:${userId}`, targetId);
    prePipe.sismember(`blocked:${targetId}`, userId);
    prePipe.set(nonceKey, '1', 'EX', NONCE_TTL_SECONDS, 'NX');
    prePipe.lindex(hotKey, HOT_RING_BUFFER_SIZE - 1);
    prePipe.hget(metaKey, 'emptyConfirmed');
    const preResults = await prePipe.exec().catch(() => null);

    const blockedByMe = Number(unwrapPipeResult(preResults?.[0], 0));
    const blockedByTarget = Number(unwrapPipeResult(preResults?.[1], 0));
    const nonceSetReply = preResults ? unwrapPipeResult(preResults[2], 'OK') : 'OK';
    const oldestRaw = unwrapPipeResult(preResults?.[3], null);
    const emptyConfirmed = unwrapPipeResult(preResults?.[4], null);

    if (blockedByMe || blockedByTarget) {
      return res.status(403).json({ error: 'Cannot send message to this user.' });
    }
    if (nonceSetReply !== 'OK') {
      return res.status(409).json({ error: 'Replay detected: duplicate nonce.' });
    }

    // Never persist ephemeral browser RAM blob: URLs
    const safeMediaUrl =
      typeof body.mediaUrl === 'string' && !body.mediaUrl.trim().startsWith('blob:')
        ? body.mediaUrl.trim().slice(0, 2 * 1024 * 1024)
        : null;

    const envelope = {
      id: typeof body.id === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(body.id)
        ? body.id
        : `msg_${crypto.randomBytes(8).toString('hex')}`,
      senderId: String(userId),
      recipientId: String(targetId),
      alg,
      iv: iv.slice(0, 128),
      ciphertext,
      sig: sig.slice(0, 256),
      nonce,
      msgType,
      mediaUrl: safeMediaUrl,
      voiceDuration: typeof body.voiceDuration === 'number' && Number.isFinite(body.voiceDuration) ? Math.min(300, Math.max(1, Math.round(body.voiceDuration))) : null,
      voiceWaveform: Array.isArray(body.voiceWaveform)
        ? body.voiceWaveform.slice(0, 60).map((v) => Math.min(100, Math.max(0, Math.round(Number(v) || 0))))
        : null,
      videoDuration: typeof body.videoDuration === 'number' && Number.isFinite(body.videoDuration) ? Math.min(300, Math.max(1, Math.round(body.videoDuration))) : null,
      isViewOnce: Boolean(body.isViewOnce),
      isOnceOpened: Boolean(body.isOnceOpened),
      callMode: typeof body.callMode === 'string' ? body.callMode : null,
      callDuration: typeof body.callDuration === 'number' && Number.isFinite(body.callDuration) ? body.callDuration : null,
      ts, // Preserve client signed timestamp so E2EE signature verification matches 100%
      status: 'sent', // Always starts as 'sent' until the recipient opens & reads the chat
    };

    const packed = packEnvelope(envelope);
    const writePipe = redis.pipeline();

    // Archive 50th entry into cold overflow tier in the same pipeline (zero extra LINDEX RTT!)
    if (oldestRaw) {
      writePipe.lpush(coldKey, oldestRaw);
      writePipe.ltrim(coldKey, 0, COLD_ARCHIVE_MAX_SIZE - 1);
      writePipe.expire(coldKey, COLD_TTL_SECONDS);
    }

    writePipe.lpush(hotKey, packed);
    writePipe.ltrim(hotKey, 0, HOT_RING_BUFFER_SIZE - 1);
    writePipe.expire(hotKey, HOT_TTL_SECONDS);

    // Update O(1) conversation metadata & O(1) recipient global inbox watermark in the exact same pipeline
    const metaFields = [
      'lastTs',
      String(envelope.ts),
      'lastId',
      envelope.id,
      'lastSender',
      String(userId),
      'emptyConfirmed',
      '0',
    ];
    if (emptyConfirmed === '1' || oldestRaw) {
      metaFields.push('backfilled', '1');
    }
    writePipe.hset(metaKey, ...metaFields);
    writePipe.expire(metaKey, HOT_TTL_SECONDS);

    const inboxVer = `${Date.now()}_${envelope.id.slice(-6)}`;
    writePipe.hincrby(`chat:unread:${targetId}`, String(userId), 1);
    writePipe.expire(`chat:unread:${targetId}`, HOT_TTL_SECONDS);
    writePipe.hset(
      `chat:inbox_meta:${targetId}`,
      String(userId),
      JSON.stringify({ ts: envelope.ts, id: envelope.id, msgType: envelope.msgType })
    );
    writePipe.expire(`chat:inbox_meta:${targetId}`, HOT_TTL_SECONDS);
    writePipe.set(`chat:inbox_ver:${targetId}`, inboxVer, 'EX', HOT_TTL_SECONDS);

    // Fast single-statement INSERT on PostgreSQL (falling back to UPDATE only on rare P2002 retry) concurrently with Redis writePipe
    const dbWritePromise = prisma?.personalChatMessage
      ? prisma.personalChatMessage
          .create({
            data: {
              id: envelope.id,
              convHash,
              senderId: envelope.senderId,
              recipientId: envelope.recipientId,
              packedJson: packed,
              ts: BigInt(Math.floor(envelope.ts)),
              status: envelope.status,
            },
          })
          .catch(async (err) => {
            if (err?.code === 'P2002') {
              return prisma.personalChatMessage
                .update({
                  where: { id: envelope.id },
                  data: {
                    packedJson: packed,
                    status: envelope.status,
                  },
                })
                .catch(() => {});
            }
          })
      : Promise.resolve();

    await Promise.all([writePipe.exec().catch(() => {}), dbWritePromise]);

    res.status(201).json({ ok: true, envelope });
  } catch (err) {
    next(err);
  }
}

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
              ? { convHash, recipientId: String(userId), id: { in: messageIds } }
              : { convHash, recipientId: String(userId), status: { not: 'read' }, ts: { lte: BigInt(Math.floor(nextReadTs)) } },
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

    const sinceVer = typeof req.query?.sinceVer === 'string' ? req.query.sinceVer.trim() : '';
    const verKey = `chat:inbox_ver:${userId}`;
    const currentVer = (await redis.get(verKey).catch(() => null)) || '0';

    if (sinceVer && sinceVer === currentVer) {
      return res.json({ ok: true, unchanged: true, ver: currentVer });
    }

    const pipe = redis.pipeline();
    pipe.hgetall(`chat:unread:${userId}`);
    pipe.hgetall(`chat:inbox_meta:${userId}`);
    const pipeRes = await pipe.exec().catch(() => null);

    const rawUnread = unwrapPipeResult(pipeRes?.[0], {}) || {};
    const rawMeta = unwrapPipeResult(pipeRes?.[1], {}) || {};

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

    res.json({
      ok: true,
      unchanged: false,
      ver: currentVer,
      peers,
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
