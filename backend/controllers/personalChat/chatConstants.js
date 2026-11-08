import crypto from 'node:crypto';

export const MAX_CIPHERTEXT_LENGTH = 400000;
export const HOT_RING_BUFFER_SIZE = 50; // Hot tier: latest 50 messages in fast Redis list
export const COLD_ARCHIVE_MAX_SIZE = 500; // Cold overflow tier for older history pages
export const HOT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days hot cache TTL (backed by permanent PostgreSQL)
export const COLD_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days cold archive TTL
export const NONCE_TTL_SECONDS = 10 * 60; // 10 minutes anti-replay window
export const CALL_LOCK_TTL_SECONDS = 60; // 60s single-call concurrency lock TTL
export const CALL_SIGNAL_TTL_SECONDS = 60; // 60s ephemeral WebRTC signaling TTL
export const CHAT_RTC_TTL_SECONDS = 45; // 45s ephemeral P2P DataChannel signaling TTL

export function unwrapPipeResult(tuple, onErrFallback = null) {
  if (!Array.isArray(tuple) || tuple[0]) return onErrFallback;
  return tuple[1];
}

export function sanitizeTargetId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9_@.-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function getConversationHash(userA, userB) {
  const sorted = [String(userA), String(userB)].sort();
  return crypto
    .createHash('sha256')
    .update(`kalceria_e2ee_conv:${sorted[0]}:${sorted[1]}`)
    .digest('hex')
    .slice(0, 40);
}

export function getHotConversationKey(userA, userB) {
  return `chat:conv:${getConversationHash(userA, userB)}`;
}

export function getColdConversationKey(userA, userB) {
  return `chat:cold:${getConversationHash(userA, userB)}`;
}

export function getMetaConversationKey(convHash) {
  return `chat:meta:${convHash}`;
}

export function getChatRtcSignalKey(recipientId, senderId) {
  return `chat:rtc:${recipientId}:${senderId}`;
}

// Compact storage representation (~42% smaller in Redis RAM)
export function packEnvelope(env) {
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
  if (env.callDuration !== undefined && env.callDuration !== null) compact.cd = Number(env.callDuration) || 0;
  return JSON.stringify(compact);
}

// Restores compact or legacy JSON record to full client E2EE envelope
export function unpackEnvelope(raw) {
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
        callDuration: parsed.cd !== undefined && parsed.cd !== null ? Number(parsed.cd) : null,
        ts: Number(parsed.u) || Date.now(),
        status: parsed.st || 'sent',
      };
    }
    return null;
  } catch {
    return null;
  }
}
