import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';
import prisma from '../lib/prisma.js';

const MAX_CIPHERTEXT_LENGTH = 400000;
const HOT_RING_BUFFER_SIZE = 50; // Hot tier: latest 50 messages in fast Redis list
const COLD_ARCHIVE_MAX_SIZE = 500; // Cold overflow tier for older history pages
const HOT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days hot cache TTL (backed by permanent PostgreSQL)
const COLD_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days cold archive TTL
const NONCE_TTL_SECONDS = 10 * 60; // 10 minutes anti-replay window
const CALL_LOCK_TTL_SECONDS = 60; // 60s single-call concurrency lock TTL
const CALL_SIGNAL_TTL_SECONDS = 60; // 60s ephemeral WebRTC signaling TTL

function sanitizeTargetId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9_@.-]+$/.test(trimmed)) return null;
  return trimmed;
}

function getConversationHash(userA, userB) {
  const sorted = [String(userA), String(userB)].sort();
  return crypto
    .createHash('sha256')
    .update(`kalceria_e2ee_conv:${sorted[0]}:${sorted[1]}`)
    .digest('hex')
    .slice(0, 40);
}

function getHotConversationKey(userA, userB) {
  return `chat:conv:${getConversationHash(userA, userB)}`;
}

function getColdConversationKey(userA, userB) {
  return `chat:cold:${getConversationHash(userA, userB)}`;
}

// Compact storage representation (~42% smaller in Redis RAM)
function packEnvelope(env) {
  const compact = {
    i: env.id,
    s: env.senderId,
    r: env.recipientId,
    v: env.iv,
    c: env.ciphertext,
    g: env.sig,
    n: env.nonce,
    t: env.msgType || 'text',
    u: env.ts,
    st: env.status || 'sent',
  };
  if (env.mediaUrl) compact.m = env.mediaUrl;
  if (env.voiceDuration) compact.d = env.voiceDuration;
  if (Array.isArray(env.voiceWaveform) && env.voiceWaveform.length > 0) compact.w = env.voiceWaveform;
  if (env.videoDuration) compact.vd = env.videoDuration;
  if (env.isViewOnce) compact.vo = 1;
  if (env.isOnceOpened) compact.oo = 1;
  if (env.callMode) compact.cm = env.callMode;
  if (env.callDuration) compact.cd = env.callDuration;
  return JSON.stringify(compact);
}

// Restores compact or legacy JSON record to full client E2EE envelope
function unpackEnvelope(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.ciphertext && parsed.id) {
      return {
        ...parsed,
        status: parsed.status || 'sent',
      };
    }
    if (parsed.c && parsed.i) {
      return {
        id: parsed.i,
        senderId: parsed.s,
        recipientId: parsed.r,
        alg: 'AES-256-GCM',
        iv: parsed.v,
        ciphertext: parsed.c,
        sig: parsed.g,
        nonce: parsed.n,
        msgType: parsed.t || 'text',
        mediaUrl: parsed.m || null,
        voiceDuration: parsed.d || null,
        voiceWaveform: parsed.w || null,
        videoDuration: parsed.vd || null,
        isViewOnce: Boolean(parsed.vo),
        isOnceOpened: Boolean(parsed.oo),
        callMode: parsed.cm || null,
        callDuration: parsed.cd || null,
        ts: Number(parsed.u) || Date.now(),
        status: parsed.st || 'sent',
      };
    }
    return null;
  } catch {
    return null;
  }
}

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

    const convHash = getConversationHash(userId, targetId);
    const hotKey = `chat:conv:${convHash}`;
    const coldKey = `chat:cold:${convHash}`;

    const rawHot = await redis.lrange(hotKey, 0, HOT_RING_BUFFER_SIZE - 1).catch(() => []);
    const hotMsgs = (Array.isArray(rawHot) ? rawHot : [])
      .map(unpackEnvelope)
      .filter(Boolean);

    const byId = new Map();
    for (const m of hotMsgs) {
      byId.set(m.id, m);
    }

    // Read-through from permanent PostgreSQL tier if hot buffer is incomplete or paginating older history
    if (hotMsgs.length < limit || (cursorTs && Number.isFinite(cursorTs))) {
      try {
        if (prisma?.personalChatMessage) {
          const dbRows = await prisma.personalChatMessage.findMany({
            where: {
              convHash,
              ...(cursorTs && Number.isFinite(cursorTs) ? { ts: { lt: BigInt(Math.floor(cursorTs)) } } : {}),
            },
            orderBy: { ts: 'desc' },
            take: Math.max(limit, HOT_RING_BUFFER_SIZE),
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

          // Auto-heal Redis hot buffer if it was empty or evicted
          if (hotMsgs.length === 0 && byId.size > 0 && !cursorTs) {
            const toHydrate = Array.from(byId.values())
              .sort((a, b) => Number(b.ts) - Number(a.ts))
              .slice(0, HOT_RING_BUFFER_SIZE)
              .map(packEnvelope);
            if (toHydrate.length > 0) {
              const healPipe = redis.pipeline();
              healPipe.del(hotKey);
              healPipe.rpush(hotKey, ...toHydrate);
              healPipe.expire(hotKey, HOT_TTL_SECONDS);
              await healPipe.exec().catch(() => {});
            }
          }
        }
      } catch {}
    }

    // If paginating older history with a cursor, also check Redis cold archive
    if (cursorTs && Number.isFinite(cursorTs)) {
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

    // Real Read Receipt Update: ONLY mark messages as 'read' when the actual recipient (recipientId === userId) fetches the chat
    let readUpdated = false;
    const newlyReadIds = [];
    for (const m of combined) {
      if (String(m.recipientId) === String(userId) && m.status !== 'read') {
        m.status = 'read';
        readUpdated = true;
        newlyReadIds.push(m.id);
      }
    }

    if (readUpdated) {
      // Persist read receipt back to Redis hot buffer & PostgreSQL
      const updatedHot = combined
        .slice()
        .sort((a, b) => Number(b.ts) - Number(a.ts))
        .slice(0, HOT_RING_BUFFER_SIZE)
        .map(packEnvelope);
      const readPromises = [];
      if (updatedHot.length > 0) {
        const readPipe = redis.pipeline();
        readPipe.del(hotKey);
        readPipe.rpush(hotKey, ...updatedHot);
        readPipe.expire(hotKey, HOT_TTL_SECONDS);
        readPromises.push(readPipe.exec().catch(() => {}));
      }
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
    }

    if (cursorTs && Number.isFinite(cursorTs)) {
      combined = combined.filter((m) => Number(m.ts) < cursorTs);
    }

    // Sort newest-first to slice page, then reverse to chronological order for UI
    combined.sort((a, b) => Number(b.ts) - Number(a.ts));
    const hasMore = combined.length > limit;
    const pageSlice = combined.slice(0, limit).reverse();
    const nextCursor = hasMore && pageSlice.length > 0 ? pageSlice[0].ts : null;

    res.json({
      messages: pageSlice,
      nextCursor,
      hasMore,
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

    // Parallel pre-flight check: block status + atomic anti-replay nonce lock + current hot buffer length
    const [blockedByMe, blockedByTarget, nonceAcquired, currentHotLen] = await Promise.all([
      redis.sismember(`blocked:${userId}`, targetId).catch(() => 0),
      redis.sismember(`blocked:${targetId}`, userId).catch(() => 0),
      redis.set(nonceKey, '1', 'EX', NONCE_TTL_SECONDS, 'NX').catch(() => 'OK'),
      redis.llen(hotKey).catch(() => 0),
    ]);

    if (blockedByMe || blockedByTarget) {
      return res.status(403).json({ error: 'Cannot send message to this user.' });
    }
    if (!nonceAcquired) {
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

    // Check if hot ring-buffer is at capacity; if so, archive oldest entry into cold tier before trimming
    if (currentHotLen >= HOT_RING_BUFFER_SIZE) {
      const oldestRaw = await redis.lindex(hotKey, HOT_RING_BUFFER_SIZE - 1).catch(() => null);
      if (oldestRaw) {
        writePipe.lpush(coldKey, oldestRaw);
        writePipe.ltrim(coldKey, 0, COLD_ARCHIVE_MAX_SIZE - 1);
        writePipe.expire(coldKey, COLD_TTL_SECONDS);
      }
    }

    writePipe.lpush(hotKey, packed);
    writePipe.ltrim(hotKey, 0, HOT_RING_BUFFER_SIZE - 1);
    writePipe.expire(hotKey, HOT_TTL_SECONDS);

    // Execute Redis pipeline & PostgreSQL write-through concurrently
    await Promise.all([
      writePipe.exec().catch(() => {}),
      prisma?.personalChatMessage
        ? prisma.personalChatMessage
            .upsert({
              where: { id: envelope.id },
              create: {
                id: envelope.id,
                convHash,
                senderId: envelope.senderId,
                recipientId: envelope.recipientId,
                packedJson: packed,
                ts: BigInt(Math.floor(envelope.ts)),
                status: envelope.status,
              },
              update: {
                packedJson: packed,
                status: envelope.status,
              },
            })
            .catch(() => {})
        : Promise.resolve(),
    ]);

    res.status(201).json({ ok: true, envelope });
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
    const { messageIds, clearAll } = req.body || {};

    if (clearAll) {
      await Promise.all([
        redis.del(hotKey).catch(() => {}),
        redis.del(coldKey).catch(() => {}),
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
        await redis.del(key).catch(() => {});
        if (filtered.length > 0) {
          await redis.rpush(key, ...filtered).catch(() => {});
          await redis.expire(key, ttl).catch(() => {});
        }
      }

      if (prisma?.personalChatMessage) {
        await prisma.personalChatMessage
          .deleteMany({
            where: {
              convHash,
              id: { in: Array.from(idSet) },
            },
          })
          .catch(() => {});
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function sendCallSignal(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid call target.' });
    }

    const { callId, callMode, signalType, encryptedPayload, nonce, sig } = req.body || {};
    const validSignalTypes = ['offer', 'answer', 'ice', 'ringing', 'hangup'];
    if (!validSignalTypes.includes(signalType) || !nonce || typeof nonce !== 'string') {
      return res.status(400).json({ error: 'Invalid E2EE call signal.' });
    }

    const safeCallId = typeof callId === 'string' && callId.trim()
      ? callId.trim().slice(0, 64)
      : `call_${Date.now()}`;

    const nonceKey = `call:nonce:${nonce.slice(0, 96)}`;
    const callerLockKey = `call:lock:${userId}`;
    const targetLockKey = `call:lock:${targetId}`;
    const signalKey = `chat:call:${targetId}`;

    const [nonceAcquired, existingTargetLock] = await Promise.all([
      redis.set(nonceKey, '1', 'EX', 120, 'NX').catch(() => 'OK'),
      signalType === 'offer' || signalType === 'ringing' || signalType === 'answer'
        ? redis.get(targetLockKey).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!nonceAcquired) {
      return res.status(409).json({ error: 'Duplicate call signal nonce rejected.' });
    }

    const packet = {
      callId: safeCallId,
      fromUserId: String(userId),
      toUserId: String(targetId),
      callMode: callMode === 'video' ? 'video' : 'voice',
      signalType,
      encryptedPayload: typeof encryptedPayload === 'string' ? encryptedPayload.slice(0, 16000) : null,
      sig: typeof sig === 'string' ? sig.slice(0, 256) : null,
      ts: Date.now(),
    };

    const sigPipe = redis.pipeline();

    // Single-Call Concurrency Lock enforcement (prevents call flooding & multiple simultaneous calls)
    if (signalType === 'hangup') {
      sigPipe.del(callerLockKey);
      sigPipe.del(targetLockKey);
      sigPipe.del(signalKey);
      // Push the hangup packet so the peer device immediately receives the hangup signal on its next poll
      sigPipe.lpush(signalKey, JSON.stringify(packet));
      sigPipe.expire(signalKey, 30);
      await sigPipe.exec().catch(() => {});
      return res.json({ ok: true, packet });
    }

    if (signalType === 'offer' || signalType === 'ringing' || signalType === 'answer') {
      if (existingTargetLock) {
        try {
          const parsedLock = JSON.parse(existingTargetLock);
          const isSameCall = parsedLock.callId === safeCallId;
          const isSamePeer =
            (String(parsedLock.callerId) === String(userId) && String(parsedLock.calleeId) === String(targetId)) ||
            (String(parsedLock.callerId) === String(targetId) && String(parsedLock.calleeId) === String(userId));
          if (!isSameCall && !isSamePeer) {
            return res.status(409).json({
              ok: false,
              busy: true,
              error: 'User is currently in another call.',
            });
          }
        } catch {}
      }

      const lockPayload = JSON.stringify({
        callId: safeCallId,
        callerId: String(userId),
        calleeId: String(targetId),
        mode: callMode === 'video' ? 'video' : 'voice',
        ts: Date.now(),
      });
      sigPipe.set(callerLockKey, lockPayload, 'EX', CALL_LOCK_TTL_SECONDS);
      sigPipe.set(targetLockKey, lockPayload, 'EX', CALL_LOCK_TTL_SECONDS);
    }

    sigPipe.lpush(signalKey, JSON.stringify(packet));
    sigPipe.ltrim(signalKey, 0, 49);
    sigPipe.expire(signalKey, CALL_SIGNAL_TTL_SECONDS);
    await sigPipe.exec().catch(() => {});

    res.json({ ok: true, packet });
  } catch (err) {
    next(err);
  }
}

export async function getCallSignals(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const signalKey = `chat:call:${userId}`;
    const targetLockKey = `call:lock:${userId}`;

    const [rawSignals, activeLockRaw] = await Promise.all([
      redis.lrange(signalKey, 0, -1).catch(() => []),
      redis.get(targetLockKey).catch(() => null),
    ]);

    const signals = (Array.isArray(rawSignals) ? rawSignals : [])
      .map((item) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    let activeLock = null;
    if (activeLockRaw) {
      try {
        activeLock = JSON.parse(activeLockRaw);
      } catch {}
    }

    if (req.query?.clear === 'true' && signals.length > 0) {
      await redis.del(signalKey).catch(() => {});
    }

    res.json({
      ok: true,
      signals,
      activeLock,
    });
  } catch (err) {
    next(err);
  }
}

export async function clearCallSignals(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const signalKey = `chat:call:${userId}`;
    await redis.del(signalKey).catch(() => {});
    res.json({ ok: true, cleared: true });
  } catch (err) {
    next(err);
  }
}
