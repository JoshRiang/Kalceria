import { redis } from '../../lib/redis.js';

// Atomic INCR + EXPIRE Lua script so a key never gets stuck without a TTL
export const INCR_WITH_TTL_LUA = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 or redis.call('TTL', KEYS[1]) == -1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return c
`;

// ── Bounded In-Memory Fallback Store ────────────────────────────────────────
export const memStore = new Map();
export const MAX_MEM_KEYS = 10_000;

export function pruneMemStore() {
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

export function getMemEntry(key) {
  const item = memStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memStore.delete(key);
    return null;
  }
  return item;
}

export function getMem(key) {
  const item = getMemEntry(key);
  return item ? item.value : null;
}

export function getMemTtl(key) {
  const item = getMemEntry(key);
  if (!item) return -1;
  return Math.max(1, Math.ceil((item.expiry - Date.now()) / 1000));
}

export function setMem(key, value, ttlSeconds) {
  pruneMemStore();
  memStore.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

export function incrMem(key, ttlSeconds) {
  const existing = getMemEntry(key);
  if (!existing) {
    setMem(key, 1, ttlSeconds);
    return 1;
  }
  existing.value += 1; // Keep original expiry window intact
  return existing.value;
}

export function delMem(key) {
  memStore.delete(key);
}

export function clearMemStoreForTesting() {
  memStore.clear();
}

export async function safeRedisCall(fn, fallbackFn) {
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
