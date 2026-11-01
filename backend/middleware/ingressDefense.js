import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

// ── Ingress Resolution & Client Identification ──────────────────────────────
export function resolveClientIp(req) {
  if (!req) return '127.0.0.1';

  // 1. Cloudflare ingress
  const cf = req.headers?.['cf-connecting-ip'];
  if (cf) return String(cf).trim().replace(/^::ffff:/, '');

  // 2. Standard RFC 7239 Forwarded header
  const fwd = req.headers?.['forwarded'];
  if (fwd) {
    const match = /for="?([^;,"]+)/i.exec(fwd);
    if (match && match[1]) {
      return match[1].trim().replace(/^::ffff:/, '').replace(/:\d+$/, '');
    }
  }

  // 3. X-Forwarded-For (leftmost client address, stripping port)
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) {
    const first = String(xff).split(',')[0].trim().replace(/:\d+$/, '');
    if (first && first !== 'unknown') {
      return first.replace(/^::ffff:/, '');
    }
  }

  // 4. X-Real-IP
  const real = req.headers?.['x-real-ip'];
  if (real) return String(real).trim().replace(/:\d+$/, '').replace(/^::ffff:/, '');

  // 5. Socket remote address / req.ip
  const direct = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return String(direct).trim().replace(/^::ffff:/, '');
}

export function resolveClientFingerprint(req) {
  const ip = resolveClientIp(req);
  const tag = req.headers?.['x-client-fingerprint'] || req.headers?.['x-machine-tag'] || '';
  const rawTag = String(tag).trim().slice(0, 128);
  const ua = String(req.headers?.['user-agent'] || '').slice(0, 256);
  const acceptLang = String(req.headers?.['accept-language'] || '').slice(0, 64);
  const secChUa = String(req.headers?.['sec-ch-ua'] || '').slice(0, 128);

  // Exclude IP from fingerprint so it tracks browser profile across dynamic IPs
  const raw = `${rawTag}|${ua}|${acceptLang}|${secChUa}`;
  return {
    ip,
    machineTag: rawTag || null,
    machineTagHash: rawTag
      ? crypto.createHash('sha256').update(rawTag).digest('hex')
      : null,
    fingerprint: crypto.createHash('sha256').update(raw).digest('hex'),
  };
}

// ── In-Memory Fallback Store (Resilience when Redis unavailable) ─────────────
const MAX_MEM_KEYS = 10_000;
const memStore = new Map();

function pruneMemStore() {
  if (memStore.size < MAX_MEM_KEYS) return;
  const now = Date.now();
  for (const [k, v] of memStore.entries()) {
    if (now > v.expiry) memStore.delete(k);
  }
  if (memStore.size >= MAX_MEM_KEYS) {
    const oldestKey = memStore.keys().next().value;
    if (oldestKey !== undefined) memStore.delete(oldestKey);
  }
}

function getMemEntry(key) {
  const item = memStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memStore.delete(key);
    return null;
  }
  return item;
}

function getMem(key) {
  const item = getMemEntry(key);
  return item ? item.value : null;
}

function getMemTtl(key) {
  const item = getMemEntry(key);
  if (!item) return -1;
  return Math.max(1, Math.ceil((item.expiry - Date.now()) / 1000));
}

function setMem(key, value, ttlSeconds) {
  pruneMemStore();
  memStore.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

function incrMem(key, ttlSeconds) {
  const existing = getMemEntry(key);
  if (!existing) {
    setMem(key, 1, ttlSeconds);
    return 1;
  }
  existing.value += 1;
  return existing.value;
}

function delMem(key) {
  memStore.delete(key);
}

export function clearMemStoreForTesting() {
  memStore.clear();
}

const INCR_WITH_TTL_LUA = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 or redis.call('TTL', KEYS[1]) == -1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return c
`;

async function safeRedisCall(fn, fallbackFn) {
  if (!redis || redis.status !== 'ready') {
    return fallbackFn();
  }
  let timer;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Redis timeout')), 400);
    });
    return await Promise.race([fn(), timeoutPromise]);
  } catch {
    return fallbackFn();
  } finally {
    clearTimeout(timer);
  }
}

// ── Deserialization, Prototype Pollution & Injection Inspection ──────────────
const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_PAYLOAD_DEPTH = 8;

const SQL_INJECTION_PATTERN = /\b(union\s+select|insert\s+into|drop\s+table|delete\s+from|alter\s+table|exec(\s|\+)+(s|x)p_)\b/i;
const SQL_LOGIC_BYPASS_PATTERN = /(?:'|\%27)\s*(?:or|and)\s*['"]?1['"]?\s*=\s*['"]?1/i;
const XSS_SCRIPT_PATTERN = /<script[\s>]|javascript:|vbscript:|on(?:load|error|click|mouseover|submit|focus)\s*=|data:text\/html/i;

export function inspectPayloadSafety(obj, depth = 0) {
  if (depth > MAX_PAYLOAD_DEPTH) {
    return { safe: false, reason: 'Payload depth exceeds allowed limits.' };
  }
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (XSS_SCRIPT_PATTERN.test(obj)) {
        return { safe: false, reason: 'Disallowed script injection detected.' };
      }
      if (SQL_INJECTION_PATTERN.test(obj) || SQL_LOGIC_BYPASS_PATTERN.test(obj)) {
        return { safe: false, reason: 'Disallowed SQL injection pattern detected.' };
      }
    }
    return { safe: true };
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const check = inspectPayloadSafety(item, depth + 1);
      if (!check.safe) return check;
    }
    return { safe: true };
  }

  for (const key of Object.keys(obj)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key) || key.includes('__proto__') || key.includes('prototype')) {
      return { safe: false, reason: 'Prototype pollution attempt detected.' };
    }
    // NoSQL Operator injection check ($where, $gt, $ne, etc.)
    if (key.startsWith('$') || key.includes('.')) {
      return { safe: false, reason: 'Operator injection attempt detected.' };
    }
    const val = obj[key];
    const check = inspectPayloadSafety(val, depth + 1);
    if (!check.safe) return check;
  }
  return { safe: true };
}

// ── Global Payload Defense Middleware ─────────────────────────────────────────
export function globalPayloadDefense(req, res, next) {
  if (req.body) {
    const bodyCheck = inspectPayloadSafety(req.body);
    if (!bodyCheck.safe) {
      return res.status(400).json({ error: `Malicious payload rejected: ${bodyCheck.reason}` });
    }
  }
  if (req.query) {
    const queryCheck = inspectPayloadSafety(req.query);
    if (!queryCheck.safe) {
      return res.status(400).json({ error: `Malicious query rejected: ${queryCheck.reason}` });
    }
  }
  if (req.params) {
    const paramsCheck = inspectPayloadSafety(req.params);
    if (!paramsCheck.safe) {
      return res.status(400).json({ error: `Malicious parameter rejected: ${paramsCheck.reason}` });
    }
  }
  next();
}

// ── Layer 7 Botnet & Attack Tool Detection ───────────────────────────────────
export function checkL7Botnet(req) {
  const ua = req.headers?.['user-agent'] || '';
  return /loic|hoic|slowloris|nikto|sqlmap|masscan|morfeus|havij|acunetix|dirbuster|gobuster|wpscan|hydra|zgrab|nmap/i.test(ua);
}

// ── 24-Hour Service Booking Defense & Cooldown (Need Our Help Form) ───────────
const BOOKING_COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours = 86,400s
const BOOKING_BURST_MAX = 3;
const BOOKING_BURST_WINDOW = 30; // 30 seconds

export async function checkServiceBookingDefense(req, res, next) {
  // 1. Layer 7 Botnet / Attack signature check
  if (checkL7Botnet(req)) {
    return res.status(403).json({ error: 'Request rejected by security policy.' });
  }

  // 2. Payload Safety Inspection
  const payloadCheck = inspectPayloadSafety(req.body);
  if (!payloadCheck.safe) {
    return res.status(400).json({ error: `Malicious payload rejected: ${payloadCheck.reason}` });
  }

  const ip = resolveClientIp(req);

  // 3. Burst Rate Limiting (Prevent rapid-fire submissions)
  const burstKey = `booking:burst:${ip}`;
  const burstCount = await safeRedisCall(
    () => redis.eval(INCR_WITH_TTL_LUA, 1, burstKey, BOOKING_BURST_WINDOW),
    () => incrMem(burstKey, BOOKING_BURST_WINDOW)
  );

  if (burstCount > BOOKING_BURST_MAX) {
    res.setHeader('Retry-After', String(BOOKING_BURST_WINDOW));
    return res.status(429).json({ error: 'High request velocity detected. Please slow down.' });
  }

  // 4. 24-Hour Cooldown Verification (Per IP, Composite Fingerprint, Machine Tag, User Account)
  const userId = req.user?.userId;
  const { machineTagHash, fingerprint } = resolveClientFingerprint(req);

  const keysToCheck = [
    `booking:cooldown:ip:${ip}`,
    `booking:cooldown:fp:${fingerprint}`,
  ];
  if (machineTagHash) {
    keysToCheck.push(`booking:cooldown:tag:${machineTagHash}`);
  }
  if (userId) {
    keysToCheck.push(`booking:cooldown:user:${userId}`);
  }

  let activeCooldown = false;
  let remainingTtl = 0;

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
      remainingTtl = Math.max(remainingTtl, check.ttl);
    }
  }

  if (activeCooldown) {
    const retrySec = Math.max(1, remainingTtl);
    res.setHeader('Retry-After', String(retrySec));
    return res.status(429).json({
      error: 'Booking cooldown active. Only one service booking is permitted every 24 hours per user/network to ensure fair scheduling.',
      retryAfter: retrySec,
    });
  }

  return next();
}

export async function setServiceBookingCooldown(req, userId) {
  const ip = resolveClientIp(req);
  const { machineTagHash, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `booking:cooldown:ip:${ip}`,
    `booking:cooldown:fp:${fingerprint}`,
  ];
  if (machineTagHash) keys.push(`booking:cooldown:tag:${machineTagHash}`);
  if (userId) keys.push(`booking:cooldown:user:${userId}`);

  for (const key of keys) {
    await safeRedisCall(
      () => redis.set(key, '1', 'EX', BOOKING_COOLDOWN_SECONDS),
      () => setMem(key, '1', BOOKING_COOLDOWN_SECONDS)
    );
  }
}

export async function clearServiceBookingCooldown(req, userId) {
  const ip = resolveClientIp(req);
  const { machineTagHash, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `booking:cooldown:ip:${ip}`,
    `booking:cooldown:fp:${fingerprint}`,
  ];
  if (machineTagHash) keys.push(`booking:cooldown:tag:${machineTagHash}`);
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

    const payloadCheck = inspectPayloadSafety(req.body);
    if (!payloadCheck.safe) {
      return res.status(400).json({ error: `Malicious payload rejected: ${payloadCheck.reason}` });
    }

    const ip = resolveClientIp(req);
    const burstKey = `shield:${name}:burst:${ip}`;

    const burstCount = await safeRedisCall(
      async () => {
        const c = await redis.incr(burstKey);
        if (c === 1) await redis.expire(burstKey, burstWindow);
        return c;
      },
      () => {
        const current = (getMem(burstKey) || 0) + 1;
        setMem(burstKey, current, burstWindow);
        return current;
      }
    );

    if (burstCount > maxBurst) {
      return res.status(429).json({
        error: `High request velocity detected on ${formName}. Please slow down.`,
      });
    }

    return next();
  };
}

// ── Tailored Form Ingress Shields ─────────────────────────────────────────────
export const eventRegistrationDefense = createIngressShield({
  name: 'event-reg',
  maxBurst: 5,
  burstWindow: 20,
  formName: 'Event Registration Form',
});

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

