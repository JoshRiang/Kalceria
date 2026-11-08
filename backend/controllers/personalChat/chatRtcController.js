import { redis } from '../../lib/redis.js';
import {
  CHAT_RTC_TTL_SECONDS,
  sanitizeTargetId,
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

    const rtcKey = getChatRtcSignalKey(targetId, userId);
    const packet = JSON.stringify({
      fromUserId: String(userId),
      toUserId: String(targetId),
      sessionId: typeof sessionId === 'string' ? sessionId.slice(0, 48) : null,
      signalType,
      payload: rawSignalPayload,
      ts: Date.now(),
    });

    const pipe = redis.pipeline();
    pipe.sismember(`blocked:${userId}`, targetId);
    pipe.sismember(`blocked:${targetId}`, userId);
    const blockRes = await pipe.exec().catch(() => null);
    if (Number(unwrapPipeResult(blockRes?.[0], 0)) || Number(unwrapPipeResult(blockRes?.[1], 0))) {
      return res.status(403).json({ error: 'Blocked user.' });
    }

    const writePipe = redis.pipeline();
    writePipe.lpush(rtcKey, packet);
    writePipe.ltrim(rtcKey, 0, 39);
    writePipe.expire(rtcKey, CHAT_RTC_TTL_SECONDS);
    await writePipe.exec().catch(() => {});

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

    const rtcKey = getChatRtcSignalKey(userId, targetId);
    const pipe = redis.pipeline();
    pipe.lrange(rtcKey, 0, -1);
    pipe.del(rtcKey);
    const pipeRes = await pipe.exec().catch(() => null);
    const rawList = unwrapPipeResult(pipeRes?.[0], []);

    const signals = (Array.isArray(rawList) ? rawList : [])
      .map((item) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();

    res.json({ ok: true, signals });
  } catch (err) {
    next(err);
  }
}
