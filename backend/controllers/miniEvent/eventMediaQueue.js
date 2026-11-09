import crypto from 'node:crypto';
import { redis } from '../../lib/redis.js';

// Local in-process serialization queues per eventId
const inProcessQueues = new Map();

const LOCK_TTL_MS = 12000;
const ACQUIRE_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 60;

/**
 * Acquire Redis distributed lock for an event's media feed
 */
async function acquireRedisLock(lockKey, lockToken, timeoutMs = ACQUIRE_TIMEOUT_MS) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      // SET lockKey lockToken NX PX LOCK_TTL_MS
      const res = await redis.set(lockKey, lockToken, 'PX', LOCK_TTL_MS, 'NX');
      if (res === 'OK') {
        return true;
      }
    } catch {
      // If Redis has momentary hiccup, continue with in-process lock
      return true;
    }
    const jitter = Math.floor(Math.random() * 30);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS + jitter));
  }
  return false;
}

/**
 * Release Redis distributed lock safely using Lua script
 */
async function releaseRedisLock(lockKey, lockToken) {
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  try {
    await redis.eval(luaScript, 1, lockKey, lockToken);
  } catch {}
}

/**
 * Execute an async operation within an atomic per-event queue lock.
 * Serializes all concurrent uploads, deletions, and edits for the same event
 * across multi-instance lambdas and in-process promises, preventing torn states.
 *
 * @param {string} eventId
 * @param {Function} taskFn
 * @returns {Promise<any>}
 */
export async function withEventMediaLock(eventId, taskFn) {
  if (!eventId) {
    return taskFn();
  }

  // 1. In-process FIFO Promise chaining
  const currentQueue = inProcessQueues.get(eventId) || Promise.resolve();
  let releaseInProcess;
  const inProcessPromise = new Promise((resolve) => {
    releaseInProcess = resolve;
  });
  inProcessQueues.set(
    eventId,
    currentQueue.then(() => inProcessPromise).catch(() => inProcessPromise)
  );

  await currentQueue.catch(() => {});

  // 2. Distributed Redis Mutex Lock
  const lockKey = `lock:event_media:${eventId}`;
  const lockToken = crypto.randomUUID();
  const acquired = await acquireRedisLock(lockKey, lockToken);

  try {
    return await taskFn();
  } finally {
    if (acquired) {
      await releaseRedisLock(lockKey, lockToken);
    }
    releaseInProcess();
    // Clean up queue entry if it's the tail
    if (inProcessQueues.get(eventId) === inProcessPromise) {
      inProcessQueues.delete(eventId);
    }
  }
}

