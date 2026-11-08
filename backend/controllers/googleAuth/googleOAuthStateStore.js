export const STATE_TTL_SECONDS = 300; // 5 minutes

// In-memory fallback for states if Redis is unreachable
export const stateMemStore = new Map();
export const MAX_STATE_MEM = 5000;

export function pruneStateMemStore() {
  if (stateMemStore.size < MAX_STATE_MEM) return;
  const now = Date.now();
  for (const [k, v] of stateMemStore.entries()) {
    if (now > v.exp) stateMemStore.delete(k);
  }
  if (stateMemStore.size >= MAX_STATE_MEM) {
    const oldest = stateMemStore.keys().next().value;
    if (oldest !== undefined) stateMemStore.delete(oldest);
  }
}

export async function saveOAuthState(state, statePayload, redisClient) {
  const redisKey = `oauth:google:state:${state}`;
  let stored = false;
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.set(redisKey, JSON.stringify(statePayload), 'EX', STATE_TTL_SECONDS);
      stored = true;
    } catch {}
  }
  if (!stored) {
    pruneStateMemStore();
    stateMemStore.set(state, {
      payload: statePayload,
      exp: Date.now() + STATE_TTL_SECONDS * 1000,
    });
  }
}

export async function consumeOAuthState(state, redisClient) {
  const redisKey = `oauth:google:state:${state}`;
  let stateJson = null;
  if (redisClient && redisClient.status === 'ready') {
    try {
      stateJson = await redisClient.eval(
        "local v = redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]); end; return v;",
        1,
        redisKey
      );
    } catch {}
  }
  if (!stateJson) {
    const mem = stateMemStore.get(state);
    if (mem) {
      stateMemStore.delete(state);
      if (Date.now() <= mem.exp) {
        stateJson = JSON.stringify(mem.payload);
      }
    }
  }
  return stateJson;
}
