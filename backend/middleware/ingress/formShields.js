import { redis } from '../../lib/redis.js';
import {
  resolveClientIp,
  resolveClientFingerprint,
  checkL7Botnet,
} from './clientResolver.js';
import {
  INCR_WITH_TTL_LUA,
  safeRedisCall,
  incrMem,
  setMem,
  delMem,
  getMemTtl,
} from './ingressMemoryStore.js';
import { inspectPayloadSafety } from './payloadInspector.js';

// ── 24-Hour Service Booking Defense & Cooldown (Need Our Help Form) ───────────
export const BOOKING_COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours = 86,400s
export const BOOKING_BURST_MAX = 3;
export const BOOKING_BURST_WINDOW = 30; // 30 seconds

export async function checkServiceBookingDefense(req, res, next) {
  if (checkL7Botnet(req)) {
    return res.status(403).json({ error: 'Request rejected by security policy.' });
  }

  if (!req._payloadInspected && req.body) {
    const payloadCheck = inspectPayloadSafety(req.body);
    if (!payloadCheck.safe) {
      return res.status(400).json({ error: `Malicious payload rejected: ${payloadCheck.reason}` });
    }
  }

  const ip = resolveClientIp(req);

  // Burst Rate Limiting (Atomic Lua in Redis, fixed window in memStore)
  const burstKey = `booking:burst:${ip}`;
  const burstCount = await safeRedisCall(
    () => redis.eval(INCR_WITH_TTL_LUA, 1, burstKey, BOOKING_BURST_WINDOW),
    () => incrMem(burstKey, BOOKING_BURST_WINDOW)
  );

  if (burstCount > BOOKING_BURST_MAX) {
    res.setHeader('Retry-After', String(BOOKING_BURST_WINDOW));
    return res.status(429).json({ error: 'High request velocity detected. Please slow down.' });
  }

  // 24-Hour Cooldown Verification
  const userId = req.user?.userId;
  const { machineTag, fingerprint } = resolveClientFingerprint(req);

  const keysToCheck = [
    `booking:cooldown:ip:${ip}`,
    `booking:cooldown:fp:${fingerprint}`,
  ];
  if (machineTag) keysToCheck.push(`booking:cooldown:tag:${machineTag}`);
  if (userId) keysToCheck.push(`booking:cooldown:user:${userId}`);

  let activeCooldown = false;
  let maxRemainingTtl = 0;

  for (const key of keysToCheck) {
    const check = await safeRedisCall(
      async () => {
        const ttl = await redis.ttl(key);
        return { exists: ttl > 0, ttl };
      },
      () => {
        const memTtl = getMemTtl(key);
        return { exists: memTtl > 0, ttl: memTtl };
      }
    );

    if (check.exists) {
      activeCooldown = true;
      maxRemainingTtl = Math.max(maxRemainingTtl, check.ttl);
    }
  }

  if (activeCooldown) {
    const retrySec = Math.max(1, maxRemainingTtl);
    res.setHeader('Retry-After', String(retrySec));
    return res.status(429).json({
      error: 'Booking cooldown active. Only one service booking is permitted every 24 hours per user/network to ensure fair scheduling.',
      retryAfter: retrySec,
    });
  }

  return next();
}

export async function setServiceBookingCooldown(req, userId) {
  const { ip, machineTag, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `booking:cooldown:ip:${ip}`,
    `booking:cooldown:fp:${fingerprint}`,
  ];
  if (machineTag) keys.push(`booking:cooldown:tag:${machineTag}`);
  if (userId) keys.push(`booking:cooldown:user:${userId}`);

  for (const key of keys) {
    await safeRedisCall(
      () => redis.set(key, '1', 'EX', BOOKING_COOLDOWN_SECONDS),
      () => setMem(key, '1', BOOKING_COOLDOWN_SECONDS)
    );
  }
}

export async function clearServiceBookingCooldown(req, userId) {
  const { ip, machineTag, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `booking:cooldown:ip:${ip}`,
    `booking:cooldown:fp:${fingerprint}`,
  ];
  if (machineTag) keys.push(`booking:cooldown:tag:${machineTag}`);
  if (userId) keys.push(`booking:cooldown:user:${userId}`);

  for (const key of keys) {
    delMem(key);
    await safeRedisCall(
      () => redis.del(key),
      () => {}
    );
  }
}

// ── Generic Ingress Rate Limiter Factory with L7 & Injection Shield ───────────
export function createIngressShield({ name, maxBurst = 5, burstWindow = 30, formName = 'Form' }) {
  return async function ingressShield(req, res, next) {
    if (checkL7Botnet(req)) {
      return res.status(403).json({ error: 'Request rejected by security policy.' });
    }

    if (!req._payloadInspected && req.body) {
      const payloadCheck = inspectPayloadSafety(req.body);
      if (!payloadCheck.safe) {
        return res.status(400).json({ error: `Malicious payload rejected: ${payloadCheck.reason}` });
      }
    }

    const ip = resolveClientIp(req);
    const burstKey = `shield:${name}:burst:${ip}`;

    const burstCount = await safeRedisCall(
      () => redis.eval(INCR_WITH_TTL_LUA, 1, burstKey, burstWindow),
      () => incrMem(burstKey, burstWindow)
    );

    if (burstCount > maxBurst) {
      res.setHeader('Retry-After', String(burstWindow));
      return res.status(429).json({
        error: `High request velocity detected on ${formName}. Please slow down.`,
      });
    }

    return next();
  };
}

// ── Tailored Form Ingress Shields ─────────────────────────────────────────────
export const EVENT_REG_COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours = 86,400s

export async function checkEventRegistrationDefense(req, res, next) {
  if (checkL7Botnet(req)) {
    return res.status(403).json({ error: 'Request rejected by security policy.' });
  }

  if (!req._payloadInspected && req.body) {
    const payloadCheck = inspectPayloadSafety(req.body);
    if (!payloadCheck.safe) {
      return res.status(400).json({ error: `Malicious payload rejected: ${payloadCheck.reason}` });
    }
  }

  const ip = resolveClientIp(req);
  const eventId = req.params?.eventId || req.body?.eventId || 'global';

  // Burst Rate Limiting
  const burstKey = `event-reg:burst:${ip}`;
  const burstCount = await safeRedisCall(
    () => redis.eval(INCR_WITH_TTL_LUA, 1, burstKey, 20),
    () => incrMem(burstKey, 20)
  );

  if (burstCount > 5) {
    res.setHeader('Retry-After', '20');
    return res.status(429).json({ error: 'High request velocity detected on Event Registration. Please slow down.' });
  }

  // Hourly Rate Limiting per IP/Network to prevent Resend Email Token Flooding
  const hourlyKey = `event-reg:hourly:${ip}`;
  const hourlyCount = await safeRedisCall(
    () => redis.eval(INCR_WITH_TTL_LUA, 1, hourlyKey, 3600),
    () => incrMem(hourlyKey, 3600)
  );

  if (hourlyCount > 15) {
    res.setHeader('Retry-After', '3600');
    return res.status(429).json({ error: 'Batas pendaftaran event per jam telah tercapai untuk jaringan ini. Silakan coba lagi nanti.' });
  }

  // 24-Hour Cooldown Verification per event & device/guest/email
  const userId = req.user?.userId;
  const { machineTag, fingerprint } = resolveClientFingerprint(req);
  const rawEmail = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : (typeof req.body?.identifier === 'string' && req.body.identifier.includes('@')
      ? req.body.identifier.trim().toLowerCase()
      : null);

  const keysToCheck = [
    `event-reg:cooldown:ev:${eventId}:ip:${ip}`,
    `event-reg:cooldown:ev:${eventId}:fp:${fingerprint}`,
  ];
  if (machineTag) keysToCheck.push(`event-reg:cooldown:ev:${eventId}:tag:${machineTag}`);
  if (userId) keysToCheck.push(`event-reg:cooldown:ev:${eventId}:user:${userId}`);
  if (rawEmail) keysToCheck.push(`event-reg:cooldown:ev:${eventId}:email:${rawEmail}`);

  let activeCooldown = false;
  let maxRemainingTtl = 0;

  for (const key of keysToCheck) {
    const check = await safeRedisCall(
      async () => {
        const ttl = await redis.ttl(key);
        return { exists: ttl > 0, ttl };
      },
      () => {
        const memTtl = getMemTtl(key);
        return { exists: memTtl > 0, ttl: memTtl };
      }
    );

    if (check.exists) {
      activeCooldown = true;
      maxRemainingTtl = Math.max(maxRemainingTtl, check.ttl);
    }
  }

  if (activeCooldown) {
    const retrySec = Math.max(1, maxRemainingTtl);
    res.setHeader('Retry-After', String(retrySec));
    return res.status(429).json({
      error: 'Registration cooldown active. Only one registration is permitted per device/network to ensure fair scheduling.',
      retryAfter: retrySec,
    });
  }

  return next();
}

export async function setEventRegistrationCooldown(req, eventId, userId, email) {
  const ip = resolveClientIp(req);
  const { machineTag, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `event-reg:cooldown:ev:${eventId}:ip:${ip}`,
    `event-reg:cooldown:ev:${eventId}:fp:${fingerprint}`,
  ];
  if (machineTag) keys.push(`event-reg:cooldown:ev:${eventId}:tag:${machineTag}`);
  if (userId) keys.push(`event-reg:cooldown:ev:${eventId}:user:${userId}`);
  const cleanEmail = typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : null;
  if (cleanEmail) keys.push(`event-reg:cooldown:ev:${eventId}:email:${cleanEmail}`);

  for (const key of keys) {
    await safeRedisCall(
      () => redis.set(key, '1', 'EX', EVENT_REG_COOLDOWN_SECONDS),
      () => setMem(key, '1', EVENT_REG_COOLDOWN_SECONDS)
    );
  }
}

export async function clearEventRegistrationCooldown(req, eventId, userId, email) {
  const ip = resolveClientIp(req);
  const { machineTag, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `event-reg:cooldown:ev:${eventId}:ip:${ip}`,
    `event-reg:cooldown:ev:${eventId}:fp:${fingerprint}`,
  ];
  if (machineTag) keys.push(`event-reg:cooldown:ev:${eventId}:tag:${machineTag}`);
  if (userId) keys.push(`event-reg:cooldown:ev:${eventId}:user:${userId}`);
  const cleanEmail = typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : null;
  if (cleanEmail) keys.push(`event-reg:cooldown:ev:${eventId}:email:${cleanEmail}`);

  for (const key of keys) {
    delMem(key);
    await safeRedisCall(
      () => redis.del(key),
      () => {}
    );
  }
}

export const eventRegistrationDefense = checkEventRegistrationDefense;

export const authLoginDefense = createIngressShield({
  name: 'auth-login',
  maxBurst: 8,
  burstWindow: 30,
  formName: 'Login Form',
});

export const authSignupDefense = createIngressShield({
  name: 'auth-signup',
  maxBurst: 5,
  burstWindow: 60,
  formName: 'Registration Form',
});

export const miniEventDefense = createIngressShield({
  name: 'mini-event',
  maxBurst: 6,
  burstWindow: 30,
  formName: 'Mini Event Form',
});

export const googleAuthDefense = createIngressShield({
  name: 'auth-google',
  maxBurst: 8,
  burstWindow: 30,
  formName: 'Google Sign-In',
});
