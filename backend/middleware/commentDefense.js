import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

const COOLDOWN_SECONDS = 2 * 60 * 60; // 2 hours = 7,200s
const BURST_MAX = 3;
const BURST_WINDOW = 10; // 10 seconds

// In-memory fallback if Redis is unreachable or during tests
const memStore = new Map();

function getMem(key) {
  const item = memStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memStore.delete(key);
    return null;
  }
  return item.value;
}

function getMemTtl(key) {
  const item = memStore.get(key);
  if (!item) return -1;
  const rem = Math.ceil((item.expiry - Date.now()) / 1000);
  if (rem <= 0) {
    memStore.delete(key);
    return -1;
  }
  return rem;
}

function setMem(key, value, ttlSeconds) {
  memStore.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

async function safeRedisCall(fn, fallbackFn) {
  if (!redis || redis.status !== 'ready') {
    return fallbackFn();
  }
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), 400)
    );
    return await Promise.race([fn(), timeoutPromise]);
  } catch {
    return fallbackFn();
  }
}

export function resolveClientIp(req) {
  const cf = req.headers?.['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  const real = req.headers?.['x-real-ip'];
  if (real) return String(real).trim();
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export function resolveClientFingerprint(req) {
  const ip = resolveClientIp(req);
  const tag = req.headers?.['x-client-fingerprint'] || req.headers?.['x-machine-tag'] || '';
  const ua = req.headers?.['user-agent'] || '';
  const lang = req.headers?.['accept-language'] || '';
  const raw = `${ip}|${tag}|${ua}|${lang}`;
  return {
    ip,
    machineTag: tag ? String(tag).trim() : null,
    fingerprint: crypto.createHash('sha256').update(raw).digest('hex'),
  };
}

export async function checkCommentDefense(req, res, next) {
  const ip = resolveClientIp(req);
  const ua = req.headers?.['user-agent'] || '';

  // 1. Layer 7 / LoIC & Attack Tool Signature Detection
  if (/loic|hoic|slowloris|nikto|sqlmap|masscan|morfeus/i.test(ua)) {
    return res.status(403).json({ error: 'Request rejected by security policy.' });
  }

  // 2. Burst / Flood Protection (LoIC / HTTP Flood mitigation)
  const burstKey = `comment:burst:${ip}`;
  const burstCount = await safeRedisCall(
    async () => {
      const c = await redis.incr(burstKey);
      if (c === 1) await redis.expire(burstKey, BURST_WINDOW);
      return c;
    },
    () => {
      const current = (getMem(burstKey) || 0) + 1;
      setMem(burstKey, current, BURST_WINDOW);
      return current;
    }
  );

  if (burstCount > BURST_MAX) {
    return res.status(429).json({ error: 'High request velocity detected. Please slow down.' });
  }

  // 3. Cooldown Verification (2-hour cooldown)
  const userId = req.user?.userId;

  if (userId) {
    // Authenticated user cooldown check
    const userKey = `comment:cooldown:user:${userId}`;
    const checkResult = await safeRedisCall(
      async () => {
        const ttl = await redis.ttl(userKey);
        return { exists: ttl > 0, ttl };
      },
      () => {
        const memTtl = getMemTtl(userKey);
        return { exists: memTtl > 0, ttl: memTtl };
      }
    );

    if (checkResult.exists) {
      const remainingSec = Math.max(1, checkResult.ttl);
      res.setHeader('Retry-After', String(remainingSec));
      return res.status(429).json({
        error: 'Comment cooldown active. You can only submit one comment every 2 hours.',
        retryAfter: remainingSec,
      });
    }
  } else {
    // Unauthenticated user defense-in-depth: IP, Machine Tag, and Composite Fingerprint
    const { machineTag, fingerprint } = resolveClientFingerprint(req);

    const keysToCheck = [
      `comment:cooldown:ip:${ip}`,
      `comment:cooldown:fp:${fingerprint}`,
    ];
    if (machineTag) {
      keysToCheck.push(`comment:cooldown:tag:${machineTag}`);
    }

    let activeCooldown = false;
    let maxTtl = COOLDOWN_SECONDS;

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
        maxTtl = Math.max(maxTtl, check.ttl);
        break;
      }
    }

    if (activeCooldown) {
      res.setHeader('Retry-After', String(maxTtl));
      return res.status(429).json({
        error: 'Comment cooldown active. You can only submit one comment every 2 hours.',
        retryAfter: maxTtl,
      });
    }
  }

  return next();
}

export async function setCommentCooldown(req, userId) {
  const ip = resolveClientIp(req);
  if (userId) {
    const userKey = `comment:cooldown:user:${userId}`;
    setMem(userKey, '1', COOLDOWN_SECONDS);
    await safeRedisCall(
      () => redis.set(userKey, '1', 'EX', COOLDOWN_SECONDS),
      () => {}
    );
  }

  // Set IP, machine tag, and fingerprint cooldowns
  const { machineTag, fingerprint } = resolveClientFingerprint(req);
  const keys = [
    `comment:cooldown:ip:${ip}`,
    `comment:cooldown:fp:${fingerprint}`,
  ];
  if (machineTag) {
    keys.push(`comment:cooldown:tag:${machineTag}`);
  }

  for (const k of keys) {
    setMem(k, '1', COOLDOWN_SECONDS);
    await safeRedisCall(
      () => redis.set(k, '1', 'EX', COOLDOWN_SECONDS),
      () => {}
    );
  }
}

export function clearCommentCooldownsForTesting() {
  memStore.clear();
}
