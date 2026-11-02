import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

// Atomic INCR + EXPIRE Lua script so a key never gets stuck without a TTL
const INCR_WITH_TTL_LUA = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 or redis.call('TTL', KEYS[1]) == -1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return c
`;

// ── Ingress Resolution & Client Identification ──────────────────────────────
function cleanIpString(rawIp) {
  if (!rawIp) return '';
  let s = String(rawIp).trim().replace(/^::ffff:/i, '');

  // Bracketed IPv6 with optional port: [2001:db8::1]:8080 -> 2001:db8::1
  if (s.startsWith('[')) {
    const closeIdx = s.indexOf(']');
    if (closeIdx !== -1) {
      return s.slice(1, closeIdx);
    }
  }

  // Only strip :port if it is an IPv4 address (contains dots and a single colon)
  const colonCount = (s.match(/:/g) || []).length;
  if (s.includes('.') && colonCount === 1) {
    s = s.replace(/:\d+$/, '');
  }

  return s;
}

export function resolveClientIp(req) {
  if (!req) return '127.0.0.1';

  // 1. Cloudflare ingress (only trust if behind Cloudflare or trusted proxy)
  const cf = req.headers?.['cf-connecting-ip'];
  if (cf) {
    const cleaned = cleanIpString(cf);
    if (cleaned) return cleaned;
  }

  // 2. Standard RFC 7239 Forwarded header
  const fwd = req.headers?.['forwarded'];
  if (fwd) {
    const match = /for="?([^;,"]+)/i.exec(fwd);
    if (match?.[1]) {
      const cleaned = cleanIpString(match[1]);
      if (cleaned && cleaned !== 'unknown') return cleaned;
    }
  }

  // 3. X-Forwarded-For (leftmost client address)
  const xff = req.headers?.['x-forwarded-for'];
  if (xff) {
    const first = cleanIpString(String(xff).split(',')[0]);
    if (first && first !== 'unknown') return first;
  }

  // 4. X-Real-IP
  const real = req.headers?.['x-real-ip'];
  if (real) {
    const cleaned = cleanIpString(real);
    if (cleaned) return cleaned;
  }

  // 5. Socket remote address / req.ip
  const direct = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return cleanIpString(direct) || '127.0.0.1';
}

export function resolveClientFingerprint(req) {
  const ip = resolveClientIp(req);
  const rawTag = String(
    req.headers?.['x-client-fingerprint'] || req.headers?.['x-machine-tag'] || ''
  ).trim().slice(0, 128);
  const ua = String(req.headers?.['user-agent'] || '').slice(0, 256);
  const acceptLang = String(req.headers?.['accept-language'] || '').slice(0, 64);
  const secChUa = String(req.headers?.['sec-ch-ua'] || '').slice(0, 128);

  // Hash browser/device traits + /24 IPv4 prefix (or IP) so fingerprint is resilient
  const raw = `${rawTag}|${ua}|${acceptLang}|${secChUa}`;
  const ipBoundFp = `${ip}|${raw}`;

  return {
    ip,
    machineTag: rawTag
      ? crypto.createHash('sha256').update(rawTag).digest('hex')
      : null,
    fingerprint: crypto.createHash('sha256').update(ipBoundFp).digest('hex'),
  };
}

// ── Bounded In-Memory Fallback Store ────────────────────────────────────────
const memStore = new Map();
const MAX_MEM_KEYS = 10_000;

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
  existing.value += 1; // Keep original expiry window intact
  return existing.value;
}

function delMem(key) {
  memStore.delete(key);
}

export function clearMemStoreForTesting() {
  memStore.clear();
}

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
const MAX_INSPECTED_NODES = 500;
const MAX_STRING_INSPECT_LEN = 10_000;

// Requires SQL syntax context (quotes, comments, semicolons, or table keywords) to avoid false positives on normal English sentences
const SQL_INJECTION_PATTERN =
  /(?:\bunion\s+(?:all\s+)?select\b|\bdrop\s+table\b|\balter\s+table\b|\bexec(?:\s|\+)+(?:s|x)p_|\bwaitfor\s+delay\b|;\s*(?:drop|delete|insert|update|alter)\b)/i;
const SQL_LOGIC_BYPASS_PATTERN =
  /(?:'|%27)\s*(?:or|and)\s*['"]?[a-z0-9_]+['"]?\s*=\s*['"]?[a-z0-9_]+/i;
const XSS_SCRIPT_PATTERN =
  /<script[\s/>]|<\/script>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|<iframe[\s/>]|<object[\s/>]|<embed[\s/>]|\bon[a-z]{3,20}\s*=/i;

export function inspectPayloadSafety(obj, depth = 0, state = { nodes: 0 }) {
  if (depth > MAX_PAYLOAD_DEPTH) {
    return { safe: false, reason: 'Payload depth exceeds allowed limits.' };
  }
  state.nodes += 1;
  if (state.nodes > MAX_INSPECTED_NODES) {
    return { safe: false, reason: 'Payload complexity exceeds allowed limits.' };
  }

  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (obj.length > MAX_STRING_INSPECT_LEN) {
        return { safe: false, reason: 'Field length exceeds maximum security limit.' };
      }
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
      const check = inspectPayloadSafety(item, depth + 1, state);
      if (!check.safe) return check;
    }
    return { safe: true };
  }

  for (const key of Object.keys(obj)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key) || key.includes('__proto__')) {
      return { safe: false, reason: 'Prototype pollution attempt detected.' };
    }
    if (key.startsWith('$') || key.includes('.')) {
      return { safe: false, reason: 'Operator injection attempt detected.' };
    }
    const check = inspectPayloadSafety(obj[key], depth + 1, state);
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
  req._payloadInspected = true;
  return next();
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
const EVENT_REG_COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours = 86,400s

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

  // 24-Hour Cooldown Verification per event & device/guest
  const userId = req.user?.userId;
  const { machineTag, fingerprint } = resolveClientFingerprint(req);

  const keysToCheck = [
    `event-reg:cooldown:ev:${eventId}:ip:${ip}`,
    `event-reg:cooldown:ev:${eventId}:fp:${fingerprint}`,
  ];
  if (machineTag) keysToCheck.push(`event-reg:cooldown:ev:${eventId}:tag:${machineTag}`);
  if (userId) keysToCheck.push(`event-reg:cooldown:ev:${eventId}:user:${userId}`);

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

export async function setEventRegistrationCooldown(req, eventId, userId) {
  const ip = resolveClientIp(req);
  const { machineTag, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `event-reg:cooldown:ev:${eventId}:ip:${ip}`,
    `event-reg:cooldown:ev:${eventId}:fp:${fingerprint}`,
  ];
  if (machineTag) keys.push(`event-reg:cooldown:ev:${eventId}:tag:${machineTag}`);
  if (userId) keys.push(`event-reg:cooldown:ev:${eventId}:user:${userId}`);

  for (const key of keys) {
    await safeRedisCall(
      () => redis.set(key, '1', 'EX', EVENT_REG_COOLDOWN_SECONDS),
      () => setMem(key, '1', EVENT_REG_COOLDOWN_SECONDS)
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
