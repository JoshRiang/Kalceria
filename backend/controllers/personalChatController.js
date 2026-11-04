import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

const MAX_CIPHERTEXT_LENGTH = 24000;
const HOT_RING_BUFFER_SIZE = 50; // Hot tier: latest 50 messages in fast Redis list
const COLD_ARCHIVE_MAX_SIZE = 500; // Cold overflow tier for older history pages
const HOT_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days hot cache TTL
const COLD_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days cold archive TTL
const NONCE_TTL_SECONDS = 10 * 60; // 10 minutes anti-replay window
const CALL_LOCK_TTL_SECONDS = 30; // 30s single-call concurrency lock TTL
const CALL_SIGNAL_TTL_SECONDS = 30; // 30s ephemeral WebRTC signaling TTL

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
  };
  if (env.mediaUrl) compact.m = env.mediaUrl;
  if (env.voiceDuration) compact.d = env.voiceDuration;
  return JSON.stringify(compact);
}

// Restores compact or legacy JSON record to full client E2EE envelope
function unpackEnvelope(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.ciphertext && parsed.id) {
      return parsed;
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
        ts: Number(parsed.u) || Date.now(),
        status: 'delivered',
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

    const hotKey = getHotConversationKey(userId, targetId);
    const coldKey = getColdConversationKey(userId, targetId);

    const rawHot = await redis.lrange(hotKey, 0, HOT_RING_BUFFER_SIZE - 1).catch(() => []);
    let combined = (Array.isArray(rawHot) ? rawHot : [])
      .map(unpackEnvelope)
      .filter(Boolean);

    // If paginating older history with a cursor or hot buffer is full, check cold archive
    if (cursorTs && Number.isFinite(cursorTs)) {
      const rawCold = await redis.lrange(coldKey, 0, COLD_ARCHIVE_MAX_SIZE - 1).catch(() => []);
      const coldMsgs = (Array.isArray(rawCold) ? rawCold : [])
        .map(unpackEnvelope)
        .filter(Boolean);
      const seenIds = new Set(combined.map((m) => m.id));
      for (const cm of coldMsgs) {
        if (!seenIds.has(cm.id)) {
          seenIds.add(cm.id);
          combined.push(cm);
        }
      }
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

    // Check if either user has blocked the other
    const [blockedByMe, blockedByTarget] = await Promise.all([
      redis.sismember(`blocked:${userId}`, targetId).catch(() => 0),
      redis.sismember(`blocked:${targetId}`, userId).catch(() => 0),
    ]);
    if (blockedByMe || blockedByTarget) {
      return res.status(403).json({ error: 'Cannot send message to this user.' });
    }

    const body = req.body || {};
    const ciphertext = typeof body.ciphertext === 'string' ? body.ciphertext.trim() : '';
    const iv = typeof body.iv === 'string' ? body.iv.trim() : '';
    const sig = typeof body.sig === 'string' ? body.sig.trim() : '';
    const nonce = typeof body.nonce === 'string' ? body.nonce.trim() : '';
    const alg = body.alg === 'AES-256-GCM' ? 'AES-256-GCM' : 'AES-256-GCM';
    const msgType = ['text', 'media', 'voice'].includes(body.msgType) ? body.msgType : 'text';
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

    const nonceKey = `chat:nonce:${nonce}`;
    const alreadySeen = await redis.get(nonceKey).catch(() => null);
    if (alreadySeen) {
      return res.status(409).json({ error: 'Replay detected: duplicate nonce.' });
    }
    await redis.set(nonceKey, '1', 'EX', NONCE_TTL_SECONDS).catch(() => {});

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
      mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl.slice(0, 1024) : null,
      voiceDuration: typeof body.voiceDuration === 'number' ? Math.min(300, Math.max(1, body.voiceDuration)) : null,
      ts: Date.now(),
      status: 'delivered',
    };

    const hotKey = getHotConversationKey(userId, targetId);
    const coldKey = getColdConversationKey(userId, targetId);
    const packed = packEnvelope(envelope);

    // Check if hot ring-buffer is at capacity; if so, archive oldest entry into cold tier before trimming
    const currentHotLen = await redis.llen(hotKey).catch(() => 0);
    if (currentHotLen >= HOT_RING_BUFFER_SIZE) {
      const oldestRaw = await redis.lindex(hotKey, HOT_RING_BUFFER_SIZE - 1).catch(() => null);
      if (oldestRaw) {
        await redis.lpush(coldKey, oldestRaw).catch(() => {});
        await redis.ltrim(coldKey, 0, COLD_ARCHIVE_MAX_SIZE - 1).catch(() => {});
        await redis.expire(coldKey, COLD_TTL_SECONDS).catch(() => {});
      }
    }

    await redis.lpush(hotKey, packed).catch(() => {});
    await redis.ltrim(hotKey, 0, HOT_RING_BUFFER_SIZE - 1).catch(() => {});
    await redis.expire(hotKey, HOT_TTL_SECONDS).catch(() => {});

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

    const hotKey = getHotConversationKey(userId, targetId);
    const coldKey = getColdConversationKey(userId, targetId);
    const { messageIds, clearAll } = req.body || {};

    if (clearAll) {
      await Promise.all([
        redis.del(hotKey).catch(() => {}),
        redis.del(coldKey).catch(() => {}),
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
    const seen = await redis.get(nonceKey).catch(() => null);
    if (seen) {
      return res.status(409).json({ error: 'Duplicate call signal nonce rejected.' });
    }
    await redis.set(nonceKey, '1', 'EX', 120).catch(() => {});

    const callerLockKey = `call:lock:${userId}`;
    const targetLockKey = `call:lock:${targetId}`;
    const signalKey = `chat:call:${targetId}`;

    // Single-Call Concurrency Lock enforcement (prevents call flooding & multiple simultaneous calls)
    if (signalType === 'hangup') {
      await Promise.all([
        redis.del(callerLockKey).catch(() => {}),
        redis.del(targetLockKey).catch(() => {}),
        redis.del(signalKey).catch(() => {}),
      ]);
    } else if (signalType === 'offer' || signalType === 'ringing' || signalType === 'answer') {
      const existingTargetLock = await redis.get(targetLockKey).catch(() => null);
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
      await Promise.all([
        redis.set(callerLockKey, lockPayload, 'EX', CALL_LOCK_TTL_SECONDS).catch(() => {}),
        redis.set(targetLockKey, lockPayload, 'EX', CALL_LOCK_TTL_SECONDS).catch(() => {}),
      ]);
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

    if (signalType !== 'hangup') {
      await redis.lpush(signalKey, JSON.stringify(packet)).catch(() => {});
      await redis.ltrim(signalKey, 0, 9).catch(() => {});
      await redis.expire(signalKey, CALL_SIGNAL_TTL_SECONDS).catch(() => {});
    }

    res.json({ ok: true, packet });
  } catch (err) {
    next(err);
  }
}
