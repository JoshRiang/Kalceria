import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

const COOLDOWN_SECONDS = 2 * 60 * 60; // 2 hours = 7,200s
const BURST_MAX = 3;
const BURST_WINDOW = 10; // 10 seconds
const MAX_MEM_KEYS = 10_000; // Prevent OOM during Redis outages

// Atomic INCR + EXPIRE Lua script so keys never get stuck without a TTL
const INCR_WITH_TTL_LUA = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 or redis.call('TTL', KEYS[1]) == -1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return c
`;

const memStore = new Map();

function pruneMemStore() {
  if (memStore.size < MAX_MEM_KEYS) return;
  const now = Date.now();
  for (const [k, v] of memStore.entries()) {
    if (now > v.expiry) memStore.delete(k);
  }
  // If still full after pruning expired items, evict oldest insertion
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

export function cleanIpString(rawIp) {
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

  // 1. Cloudflare ingress when proxy header is present
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

  // 5. Express trusted proxy / direct socket remote address
  const direct = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return cleanIpString(direct) || '127.0.0.1';
}

export function resolveClientFingerprint(req) {
  const ip = resolveClientIp(req);
  const rawTag = String(
    req.headers?.['x-client-fingerprint'] || req.headers?.['x-machine-tag'] || ''
  ).trim().slice(0, 128);
  const ua = String(req.headers?.['user-agent'] || '').slice(0, 256);
  const lang = String(req.headers?.['accept-language'] || '').slice(0, 64);

  // Exclude IP from fingerprint so it tracks the browser profile across IP changes
  const fpRaw = `${rawTag}|${ua}|${lang}`;
  return {
    ip,
    machineTag: rawTag || null,
    machineTagHash: rawTag
      ? crypto.createHash('sha256').update(rawTag).digest('hex')
      : null,
    fingerprint: crypto.createHash('sha256').update(fpRaw).digest('hex'),
  };
}

async function getKeyTtl(key) {
  return safeRedisCall(
    async () => {
      const ttl = await redis.ttl(key);
      return { exists: ttl > 0, ttl };
    },
    () => {
      const memTtl = getMemTtl(key);
      return { exists: memTtl > 0, ttl: memTtl };
    }
  );
}

export async function checkCommentDefense(req, res, next) {
  const ip = resolveClientIp(req);
  const ua = req.headers?.['user-agent'] || '';

  // 1. Layer 7 / Attack Tool Signature Detection
  if (/loic|hoic|slowloris|nikto|sqlmap|masscan|morfeus/i.test(ua)) {
    return res.status(403).json({ error: 'Request rejected by security policy.' });
  }

  // 2. Burst / Flood Protection
  const burstKey = `comment:burst:${ip}`;
  const burstCount = await safeRedisCall(
    () => redis.eval(INCR_WITH_TTL_LUA, 1, burstKey, BURST_WINDOW),
    () => incrMem(burstKey, BURST_WINDOW)
  );

  if (burstCount > BURST_MAX) {
    res.setHeader('Retry-After', String(BURST_WINDOW));
    return res.status(429).json({ error: 'High request velocity detected. Please slow down.' });
  }

  // 3. Cooldown Verification (2-hour cooldown)
  const userId = req.user?.userId;
  const { machineTagHash, fingerprint } = resolveClientFingerprint(req);

  const keysToCheck = [
    `comment:cooldown:ip:${ip}`,
    `comment:cooldown:fp:${fingerprint}`,
  ];
  if (machineTagHash) keysToCheck.push(`comment:cooldown:tag:${machineTagHash}`);
  if (userId) keysToCheck.push(`comment:cooldown:user:${userId}`);

  let activeCooldown = false;
  let maxRemainingTtl = 0;

  for (const key of keysToCheck) {
    const check = await getKeyTtl(key);
    if (check.exists) {
      activeCooldown = true;
      maxRemainingTtl = Math.max(maxRemainingTtl, check.ttl);
    }
  }

  if (activeCooldown) {
    const retrySec = Math.max(1, maxRemainingTtl);
    res.setHeader('Retry-After', String(retrySec));
    return res.status(429).json({
      error: 'Comment cooldown active. You can only submit one comment every 2 hours.',
      retryAfter: retrySec,
    });
  }

  return next();
}

export async function setCommentCooldown(req, userId) {
  const { ip, machineTagHash, fingerprint } = resolveClientFingerprint(req);

  const keys = [
    `comment:cooldown:ip:${ip}`,
    `comment:cooldown:fp:${fingerprint}`,
  ];
  if (userId) keys.push(`comment:cooldown:user:${userId}`);
  if (machineTagHash) keys.push(`comment:cooldown:tag:${machineTagHash}`);

  for (const k of keys) {
    // Only write to memStore when Redis fails
    await safeRedisCall(
      () => redis.set(k, '1', 'EX', COOLDOWN_SECONDS),
      () => setMem(k, '1', COOLDOWN_SECONDS)
    );
  }
}

export function clearCommentCooldownsForTesting() {
  memStore.clear();
}
