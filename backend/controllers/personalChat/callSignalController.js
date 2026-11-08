import { redis } from '../../lib/redis.js';
import prisma from '../../lib/prisma.js';
import {
  CALL_LOCK_TTL_SECONDS,
  CALL_SIGNAL_TTL_SECONDS,
  sanitizeTargetId,
  unwrapPipeResult,
} from './chatConstants.js';

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
    if (checkLockNeeded) {
      prePipe.get(targetLockKey);
    }
    const preRes = await prePipe.exec().catch(() => null);
    const nonceReply = preRes ? unwrapPipeResult(preRes[0], 'OK') : 'OK';
    const existingTargetLock = checkLockNeeded ? unwrapPipeResult(preRes?.[1], null) : null;

    if (nonceReply !== 'OK') {
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

    // If callee intentionally set status to Offline (Stealth Mode), naturally do not deliver incoming call offers
    if (signalType === 'offer') {
      const calleeRecord = await prisma.user
        .findUnique({
          where: { id: String(targetId) },
          select: { allowLiveLocation: true },
        })
        .catch(() => null);
      if (calleeRecord && calleeRecord.allowLiveLocation === false) {
        return res.json({ ok: true, packet });
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
      await sigPipe.exec().catch(() => {});
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
