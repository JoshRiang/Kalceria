import jwt from 'jsonwebtoken';
import { redis } from '../../lib/redis.js';
import prisma from '../../lib/prisma.js';
import {
  CALL_LOCK_TTL_SECONDS,
  CALL_SIGNAL_TTL_SECONDS,
  sanitizeTargetId,
  unwrapPipeResult,
} from './chatConstants.js';
import {
  storeCanonicalCallSignal,
  fetchCanonicalCallSignals,
  clearCanonicalCallSignals,
  acquireCanonicalCallLock,
  releaseCanonicalCallLock,
  getCanonicalCallLock,
  isUserBlockedCanonical,
  fetchCanonicalUserBlocks,
} from '../../services/canonicalFallbackStore.js';

export function generateLiveKitToken({ userId, targetId, username, callId }) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return null;
  }

  const roomName = (typeof callId === 'string' && callId.trim())
    ? callId.trim().slice(0, 64)
    : `call_${[String(userId), String(targetId)].sort().join('_')}`;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    sub: String(userId),
    name: username || String(userId),
    iat: now,
    nbf: now - 5,
    exp: now + 7200,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const token = jwt.sign(payload, apiSecret, { algorithm: 'HS256' });
  return {
    token,
    url: livekitUrl,
    room: roomName,
    identity: String(userId),
  };
}

export async function sendCallSignal(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid call target.' });
    }

    const { callId, callMode, signalType, encryptedPayload, nonce, sig } = req.body || {};
    const validSignalTypes = ['offer', 'answer', 'ice', 'ringing', 'hangup', 'cam_state'];
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

    const checkLockNeeded =
      signalType === 'offer' || signalType === 'ringing' || signalType === 'answer';

    const prePipe = redis.pipeline();
    prePipe.set(nonceKey, '1', 'EX', 120, 'NX');
    prePipe.sismember(`blocked:${targetId}`, userId);
    prePipe.sismember(`blocked:${userId}`, targetId);
    if (checkLockNeeded) {
      prePipe.get(targetLockKey);
    }
    const preRes = await prePipe.exec().catch(() => null);
    const nonceReply = preRes ? unwrapPipeResult(preRes[0], 'OK') : 'OK';
    let isCallerBlockedByTarget = Number(unwrapPipeResult(preRes?.[1], 0)) > 0;
    let isTargetBlockedByCaller = Number(unwrapPipeResult(preRes?.[2], 0)) > 0;
    if (!isCallerBlockedByTarget) {
      isCallerBlockedByTarget = await isUserBlockedCanonical(targetId, userId);
    }
    if (!isTargetBlockedByCaller) {
      isTargetBlockedByCaller = await isUserBlockedCanonical(userId, targetId);
    }
    const existingTargetLock = checkLockNeeded ? unwrapPipeResult(preRes?.[3], null) : null;

    if (nonceReply !== 'OK') {
      return res.status(409).json({ error: 'Duplicate call signal nonce rejected.' });
    }

    if (isTargetBlockedByCaller) {
      return res.status(403).json({ error: 'Cannot call a user you have blocked.' });
    }

    if (isCallerBlockedByTarget) {
      // One-sided silent drop: Caller is blocked by target.
      // Accept call gracefully so caller UI remains on "calling...",
      // but NEVER deliver to target, lock target, or trigger target device.
      return res.json({
        ok: true,
        packet: {
          callId: safeCallId,
          fromUserId: String(userId),
          toUserId: String(targetId),
          callMode: callMode === 'video' ? 'video' : 'voice',
          signalType,
          ts: Date.now(),
          isBlockedDrop: true,
          blockedWhileSent: true,
        },
        isBlockedDrop: true,
      });
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

    let livekit = null;
    if (signalType === 'offer' || signalType === 'answer') {
      livekit = generateLiveKitToken({
        userId,
        targetId,
        username: req.user?.username || req.user?.name,
        callId: safeCallId,
      });
      if (livekit) {
        packet.livekit = livekit;
      }
    }

    const sigPipe = redis.pipeline();

    // Single-Call Concurrency Lock enforcement (prevents call flooding & multiple simultaneous calls)
    if (signalType === 'hangup') {
      sigPipe.del(callerLockKey);
      sigPipe.del(targetLockKey);
      sigPipe.del(signalKey);
      // Push the hangup packet so the peer device immediately receives the hangup signal on its next poll
      sigPipe.lpush(signalKey, JSON.stringify(packet));
      sigPipe.expire(signalKey, 30);
      await Promise.allSettled([
        sigPipe.exec(),
        releaseCanonicalCallLock(userId, targetId),
        storeCanonicalCallSignal(packet),
      ]);
      return res.json({ ok: true, packet });
    }

    if (checkLockNeeded) {
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
      acquireCanonicalCallLock({ userId, targetId, callId: safeCallId, mode: callMode }).catch(() => {});
    }

    sigPipe.lpush(signalKey, JSON.stringify(packet));
    sigPipe.ltrim(signalKey, 0, 49);
    sigPipe.expire(signalKey, CALL_SIGNAL_TTL_SECONDS);
    await Promise.allSettled([
      sigPipe.exec(),
      storeCanonicalCallSignal(packet),
    ]);

    res.json({ ok: true, packet, ...(livekit ? { livekit } : {}) });
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
    const shouldClear = req.query?.clear === 'true';

    const pipe = redis.pipeline();
    pipe.lrange(signalKey, 0, -1);
    pipe.get(targetLockKey);
    if (shouldClear) {
      pipe.del(signalKey);
    }
    const pipeRes = await pipe.exec().catch(() => null);
    const rawSignals = unwrapPipeResult(pipeRes?.[0], []);
    const activeLockRaw = unwrapPipeResult(pipeRes?.[1], null);

    let signals = (Array.isArray(rawSignals) ? rawSignals : [])
      .map((item) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    // Complementary Fallback: If Redis returned empty signals (e.g. across cold serverless instances),
    // fetch unexpired signals from the shared PostgreSQL Canonical Store
    if (signals.length === 0) {
      const canonicalSignals = await fetchCanonicalCallSignals(userId, { clear: shouldClear });
      if (canonicalSignals.length > 0) {
        signals = canonicalSignals;
      }
    }

    const [myBlocked, canonicalBlocks] = await Promise.all([
      redis.smembers(`blocked:${userId}`).catch(() => []),
      fetchCanonicalUserBlocks(userId).catch(() => ({ blockedUsers: [] })),
    ]);
    const blockedSet = new Set([
      ...(Array.isArray(myBlocked) ? myBlocked.map(String) : []),
      ...(canonicalBlocks?.blockedUsers || []),
    ]);
    if (blockedSet.size > 0) {
      signals = signals.filter((s) => !blockedSet.has(String(s.fromUserId)));
    }

    let activeLock = null;
    if (activeLockRaw) {
      try {
        activeLock = JSON.parse(activeLockRaw);
      } catch {}
    } else {
      const canonicalLock = await getCanonicalCallLock(userId);
      if (canonicalLock) {
        activeLock = {
          callId: canonicalLock.callId,
          callerId: canonicalLock.callerId,
          calleeId: canonicalLock.calleeId,
          mode: canonicalLock.mode,
          ts: new Date(canonicalLock.expiresAt).getTime() - CALL_LOCK_TTL_SECONDS * 1000,
        };
      }
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
    await Promise.allSettled([
      redis.del(signalKey),
      clearCanonicalCallSignals(userId),
    ]);
    res.json({ ok: true, cleared: true });
  } catch (err) {
    next(err);
  }
}

export async function getLiveKitCallToken(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid call target.' });
    }

    const callId = req.query?.callId;
    const livekitData = generateLiveKitToken({
      userId,
      targetId,
      username: req.user?.username || req.user?.name,
      callId,
    });

    if (!livekitData) {
      return res.json({
        ok: false,
        livekitEnabled: false,
        message: 'LiveKit credentials not configured on server.',
      });
    }

    res.json({
      ok: true,
      livekitEnabled: true,
      ...livekitData,
    });
  } catch (err) {
    next(err);
  }
}
