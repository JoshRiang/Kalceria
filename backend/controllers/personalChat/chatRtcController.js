import { redis } from '../../lib/redis.js';
import {
  isUserBlockedCanonical,
  storeCanonicalChatRtcSignal,
  fetchCanonicalChatRtcSignals,
} from '../../services/canonicalFallbackStore.js';
import {
  CHAT_RTC_TTL_SECONDS,
  sanitizeTargetId,
  getConversationHash,
  getChatRtcSignalKey,
  unwrapPipeResult,
} from './chatConstants.js';

export async function sendChatRtcSignal(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId || String(userId) === String(targetId)) {
      return res.status(400).json({ error: 'Invalid chat RTC target.' });
    }

    const { signalType, encryptedPayload, payload, sessionId } = req.body || {};
    const rawSignalPayload = typeof encryptedPayload === 'string' ? encryptedPayload : payload;
    const validTypes = ['rtc-offer', 'rtc-answer', 'rtc-ice', 'rtc-renegotiate'];
    if (!validTypes.includes(signalType) || typeof rawSignalPayload !== 'string' || rawSignalPayload.length > 24000) {
      return res.status(400).json({ error: 'Invalid chat RTC signal.' });
    }

    const convHash = getConversationHash(userId, targetId);
    const rtcKey = getChatRtcSignalKey(targetId, userId);
    const packetObj = {
      fromUserId: String(userId),
      toUserId: String(targetId),
      sessionId: typeof sessionId === 'string' ? sessionId.slice(0, 48) : null,
      signalType,
      payload: rawSignalPayload,
      ts: Date.now(),
    };
    const packet = JSON.stringify(packetObj);

    const pipe = redis.pipeline();
    pipe.sismember(`blocked:${userId}`, targetId);
    pipe.sismember(`blocked:${targetId}`, userId);
    const blockRes = await pipe.exec().catch(() => null);
    let targetBlockedByMe = Number(unwrapPipeResult(blockRes?.[0], 0)) > 0;
    let meBlockedByTarget = Number(unwrapPipeResult(blockRes?.[1], 0)) > 0;
    if (!targetBlockedByMe) {
      targetBlockedByMe = await isUserBlockedCanonical(userId, targetId);
    }
    if (!meBlockedByTarget) {
      meBlockedByTarget = await isUserBlockedCanonical(targetId, userId);
    }

    if (targetBlockedByMe) {
      return res.status(403).json({ error: 'Blocked user.' });
    }

    if (meBlockedByTarget) {
      return res.json({ ok: true, isBlockedDrop: true });
    }

    const writePipe = redis.pipeline();
    writePipe.lpush(rtcKey, packet);
    writePipe.ltrim(rtcKey, 0, 39);
    writePipe.expire(rtcKey, CHAT_RTC_TTL_SECONDS);
    await Promise.allSettled([
      writePipe.exec(),
      storeCanonicalChatRtcSignal(convHash, packetObj),
    ]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getChatRtcSignals(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const targetId = sanitizeTargetId(req.params?.targetId);
    if (!userId || !targetId) {
      return res.status(400).json({ error: 'Invalid chat RTC target.' });
    }

    const isBlocked = (await redis.sismember(`blocked:${userId}`, targetId).catch(() => 0)) > 0 ||
      (await isUserBlockedCanonical(userId, targetId));
    if (isBlocked) {
      return res.json({ ok: true, signals: [] });
    }

    const convHash = getConversationHash(userId, targetId);
    const rtcKey = getChatRtcSignalKey(userId, targetId);
    const redisDegraded = Boolean(redis.isDegraded || redis.isQuotaExceeded);
    const pipe = redis.pipeline();
    pipe.lrange(rtcKey, 0, -1);
    pipe.del(rtcKey);
    const pipeRes = await pipe.exec().catch(() => null);
    const rawList = unwrapPipeResult(pipeRes?.[0], []);

    let signals = (Array.isArray(rawList) ? rawList : [])
      .map((item) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    if (redisDegraded || signals.length === 0) {
      const canonical = await fetchCanonicalChatRtcSignals(userId, targetId, convHash);
      if (canonical.length > 0) {
        const seen = new Set(
          signals.map((s) => `${s.signalType}:${s.ts}:${s.sessionId || ''}:${String(s.payload || '').slice(0, 24)}`)
        );
        for (const c of canonical) {
          const k = `${c.signalType}:${c.ts}:${c.sessionId || ''}:${String(c.payload || '').slice(0, 24)}`;
          if (!seen.has(k)) {
            seen.add(k);
            signals.push(c);
          }
        }
        signals.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
      }
    }

    res.json({ ok: true, signals });
  } catch (err) {
    next(err);
  }
}
