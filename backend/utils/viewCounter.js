import { redis } from '../lib/redis.js';

/**
 * Increment view counter for a media clip or broadcast.
 * Handles both legacy Redis SETs (converts cardinality to integer) and integer counters.
 * Views continue to increment on repeated views as requested.
 */
export async function incrementViewCounter(key, ttlSeconds = 7 * 24 * 60 * 60) {
  if (!key) return 0;
  try {
    const type = typeof redis.type === 'function' ? await redis.type(key) : 'none';
    if (type === 'set') {
      const initialCount = typeof redis.scard === 'function' ? (await redis.scard(key)) || 0 : 0;
      await redis.del(key);
      if (initialCount > 0) {
        await redis.set(key, String(initialCount));
      }
    }
    const newCount = typeof redis.incr === 'function' ? await redis.incr(key) : 1;
    if (typeof redis.expire === 'function') {
      await redis.expire(key, ttlSeconds);
    }
    return Number(newCount) || 1;
  } catch {
    return 1;
  }
}

/**
 * Read view counter for a media clip or broadcast without incrementing.
 * Handles both legacy Redis SETs (reads scard) and integer counters (reads get).
 */
export async function readViewCounter(key) {
  if (!key) return 0;
  try {
    const type = typeof redis.type === 'function' ? await redis.type(key) : 'none';
    if (type === 'set') {
      const count = typeof redis.scard === 'function' ? await redis.scard(key) : 0;
      return Number(count) || 0;
    }
    const val = await redis.get(key);
    return Number(val) || 0;
  } catch {
    return 0;
  }
}

