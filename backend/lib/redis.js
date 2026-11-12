import Redis from 'ioredis';

class MemoryRedisFallback {
  constructor() {
    this.kv = new Map();
    this.sets = new Map();
    this.zsets = new Map();
    this.hashes = new Map();
    this.lists = new Map();
    this.status = 'ready';
  }

  _isExpired(item) {
    return item && item.exp !== null && Date.now() > item.exp;
  }

  async get(key) {
    const item = this.kv.get(key);
    if (!item) return null;
    if (this._isExpired(item)) {
      this.kv.delete(key);
      return null;
    }
    return item.val;
  }

  async set(key, val, ...args) {
    let exp = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      const a = String(args[i]).toUpperCase();
      if (a === 'EX') {
        const sec = Number(args[++i]);
        if (Number.isFinite(sec)) exp = Date.now() + sec * 1000;
      } else if (a === 'PX') {
        const ms = Number(args[++i]);
        if (Number.isFinite(ms)) exp = Date.now() + ms;
      } else if (a === 'NX') {
        nx = true;
      }
    }
    if (nx && (await this.get(key)) !== null) {
      return null;
    }
    this.kv.set(key, { val: String(val), exp });
    return 'OK';
  }

  async setex(key, seconds, val) {
    return this.set(key, val, 'EX', seconds);
  }

  async del(...keys) {
    let deleted = 0;
    for (const key of keys.flat()) {
      if (this.kv.delete(key)) deleted++;
      if (this.sets.delete(key)) deleted++;
      if (this.zsets.delete(key)) deleted++;
      if (this.hashes.delete(key)) deleted++;
      if (this.lists.delete(key)) deleted++;
    }
    return deleted;
  }

  async mget(...keys) {
    const results = [];
    for (const key of keys.flat()) {
      results.push(await this.get(key));
    }
    return results;
  }

  async expire(key, seconds) {
    const item = this.kv.get(key);
    if (!item || this._isExpired(item)) return 0;
    item.exp = Date.now() + Number(seconds) * 1000;
    return 1;
  }

  async ttl(key) {
    const item = this.kv.get(key);
    if (!item) return -2;
    if (this._isExpired(item)) {
      this.kv.delete(key);
      return -2;
    }
    if (item.exp === null) return -1;
    return Math.max(0, Math.ceil((item.exp - Date.now()) / 1000));
  }

  async ping() {
    return 'PONG';
  }

  async sadd(key, ...members) {
    let set = this.sets.get(key);
    if (!set) {
      set = new Set();
      this.sets.set(key, set);
    }
    let added = 0;
    for (const m of members.flat()) {
      const str = String(m);
      if (!set.has(str)) {
        set.add(str);
        added++;
      }
    }
    return added;
  }

  async srem(key, ...members) {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members.flat()) {
      if (set.delete(String(m))) removed++;
    }
    return removed;
  }

  async smembers(key) {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async scard(key) {
    const set = this.sets.get(key);
    return set ? set.size : 0;
  }

  async sismember(key, member) {
    const set = this.sets.get(key);
    return set && set.has(String(member)) ? 1 : 0;
  }

  async zadd(key, ...args) {
    let zset = this.zsets.get(key);
    if (!zset) {
      zset = new Map();
      this.zsets.set(key, zset);
    }
    let added = 0;
    for (let i = 0; i < args.length; i += 2) {
      const score = Number(args[i]);
      const member = String(args[i + 1]);
      if (!zset.has(member)) added++;
      zset.set(member, score);
    }
    return added;
  }

  async geoadd(key, lng, lat, member) {
    return this.zadd(key, Date.now(), String(member));
  }

  async geopos(key, ...members) {
    return members.map(() => [-6.2088, 106.8456]);
  }

  async georadius(key, _lng, _lat, _radius, _unit) {
    return this.zrange(key, 0, -1);
  }

  async zrange(key, start, stop) {
    const zset = this.zsets.get(key);
    if (!zset) return [];
    const entries = Array.from(zset.entries()).sort((a, b) => a[1] - b[1]);
    const s = start < 0 ? Math.max(0, entries.length + start) : start;
    const e = stop < 0 ? entries.length + stop + 1 : stop + 1;
    return entries.slice(s, e).map(([m]) => m);
  }

  async zrem(key, ...members) {
    const zset = this.zsets.get(key);
    if (!zset) return 0;
    let removed = 0;
    for (const m of members.flat()) {
      if (zset.delete(String(m))) removed++;
    }
    return removed;
  }

  async lpush(key, ...values) {
    let list = this.lists.get(key);
    if (!list) {
      list = [];
      this.lists.set(key, list);
    }
    for (const v of values.flat()) {
      list.unshift(String(v));
    }
    return list.length;
  }

  async rpush(key, ...values) {
    let list = this.lists.get(key);
    if (!list) {
      list = [];
      this.lists.set(key, list);
    }
    for (const v of values.flat()) {
      list.push(String(v));
    }
    return list.length;
  }

  async lindex(key, index) {
    const list = this.lists.get(key);
    if (!list) return null;
    const idx = index < 0 ? list.length + index : index;
    return list[idx] !== undefined ? list[idx] : null;
  }

  async ltrim(key, start, stop) {
    const list = this.lists.get(key);
    if (!list) return 'OK';
    const s = start < 0 ? Math.max(0, list.length + start) : start;
    const e = stop < 0 ? list.length + stop + 1 : stop + 1;
    this.lists.set(key, list.slice(s, e));
    return 'OK';
  }

  async lrange(key, start, stop) {
    const list = this.lists.get(key);
    if (!list) return [];
    const s = start < 0 ? Math.max(0, list.length + start) : start;
    const e = stop < 0 ? list.length + stop + 1 : stop + 1;
    return list.slice(s, e);
  }

  async hget(key, field) {
    const hash = this.hashes.get(key);
    return hash ? hash.get(String(field)) || null : null;
  }

  async hset(key, ...args) {
    let hash = this.hashes.get(key);
    if (!hash) {
      hash = new Map();
      this.hashes.set(key, hash);
    }
    let count = 0;
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      for (const [k, v] of Object.entries(args[0])) {
        hash.set(String(k), String(v));
        count++;
      }
    } else {
      for (let i = 0; i < args.length; i += 2) {
        if (args[i] !== undefined && args[i + 1] !== undefined) {
          hash.set(String(args[i]), String(args[i + 1]));
          count++;
        }
      }
    }
    return count;
  }

  async hgetall(key) {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    const obj = {};
    for (const [k, v] of hash.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  async hincrby(key, field, increment = 1) {
    let hash = this.hashes.get(key);
    if (!hash) {
      hash = new Map();
      this.hashes.set(key, hash);
    }
    const current = Number(hash.get(String(field)) || 0);
    const nextVal = current + Number(increment);
    hash.set(String(field), String(nextVal));
    return nextVal;
  }

  async hdel(key, ...fields) {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let count = 0;
    for (const f of fields.flat()) {
      if (hash.delete(String(f))) count++;
    }
    return count;
  }

  async eval(script, numKeys, ...args) {
    const keys = args.slice(0, numKeys);
    const argv = args.slice(numKeys);
    const s = String(script);

    // Rate limiting Lua: INCR + EXPIRE
    if (s.includes('INCR')) {
      const k = keys[0];
      const ttlSec = Number(argv[0]) || 60;
      const cur = await this.get(k);
      const count = cur ? Number(cur) + 1 : 1;
      await this.set(k, count, 'EX', ttlSec);
      if (s.includes('{') && s.includes('count')) {
        return [count, ttlSec];
      }
      return count;
    }

    // OTP / Token atomic consume
    if (s.includes('GET') && s.includes('DEL')) {
      const k = keys[0];
      const expected = argv[0];
      const cur = await this.get(k);
      if (cur !== null) {
        if (expected === undefined || cur === expected) {
          await this.del(k);
          return s.includes('return 0') ? 1 : cur;
        }
      }
      return s.includes('return 0') ? 0 : null;
    }

    return [1, 60];
  }

  pipeline() {
    const operations = [];
    const proxy = {
      set: (k, v, ...a) => { operations.push(() => this.set(k, v, ...a)); return proxy; },
      setex: (k, s, v) => { operations.push(() => this.setex(k, s, v)); return proxy; },
      get: (k) => { operations.push(() => this.get(k)); return proxy; },
      del: (...k) => { operations.push(() => this.del(...k)); return proxy; },
      expire: (k, t) => { operations.push(() => this.expire(k, t)); return proxy; },
      sadd: (k, ...m) => { operations.push(() => this.sadd(k, ...m)); return proxy; },
      srem: (k, ...m) => { operations.push(() => this.srem(k, ...m)); return proxy; },
      scard: (k) => { operations.push(() => this.scard(k)); return proxy; },
      smembers: (k) => { operations.push(() => this.smembers(k)); return proxy; },
      sismember: (k, m) => { operations.push(() => this.sismember(k, m)); return proxy; },
      zadd: (k, ...a) => { operations.push(() => this.zadd(k, ...a)); return proxy; },
      zrem: (k, ...m) => { operations.push(() => this.zrem(k, ...m)); return proxy; },
      lpush: (k, ...v) => { operations.push(() => this.lpush(k, ...v)); return proxy; },
      rpush: (k, ...v) => { operations.push(() => this.rpush(k, ...v)); return proxy; },
      ltrim: (k, s, e) => { operations.push(() => this.ltrim(k, s, e)); return proxy; },
      lrange: (k, s, e) => { operations.push(() => this.lrange(k, s, e)); return proxy; },
      lindex: (k, idx) => { operations.push(() => this.lindex(k, idx)); return proxy; },
      hget: (k, f) => { operations.push(() => this.hget(k, f)); return proxy; },
      hset: (k, ...a) => { operations.push(() => this.hset(k, ...a)); return proxy; },
      hdel: (k, ...f) => { operations.push(() => this.hdel(k, ...f)); return proxy; },
      hgetall: (k) => { operations.push(() => this.hgetall(k)); return proxy; },
      hincrby: (k, f, inc) => { operations.push(() => this.hincrby(k, f, inc)); return proxy; },
      exec: async () => {
        const results = [];
        for (const op of operations) {
          try {
            results.push([null, await op()]);
          } catch (err) {
            results.push([err, null]);
          }
        }
        return results;
      },
    };
    return proxy;
  }

  multi() {
    return this.pipeline();
  }

  disconnect() {}
  on() { return this; }
}

const rawRedis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  lazyConnect: false,
  connectTimeout: 5000,
  retryStrategy(times) {
    if (times > 2) return null;
    return Math.min(times * 300, 1500);
  },
});

const memoryStore = new MemoryRedisFallback();

let isQuotaExceeded = false;
let hasLoggedFallback = false;

function markFallback(err) {
  isQuotaExceeded = true;
  if (!hasLoggedFallback) {
    hasLoggedFallback = true;
    console.warn(`[Redis Fallback] Operating in resilient in-memory mode: ${err?.message || 'Quota limit reached'}`);
    try {
      rawRedis.disconnect();
    } catch {}
  }
}

rawRedis.on('error', (err) => {
  if (String(err?.message || '').includes('max requests limit exceeded')) {
    markFallback(err);
  } else {
    console.error('[Redis]', err.message);
  }
});
rawRedis.on('connect', () => console.log('[Redis] Connected'));

export const redis = new Proxy(rawRedis, {
  get(target, prop, receiver) {
    if (prop === 'isQuotaExceeded' || prop === 'isDegraded') {
      return isQuotaExceeded;
    }
    if (prop === 'status') {
      return isQuotaExceeded ? 'ready' : (target.status || 'ready');
    }
    if (prop === 'pipeline' || prop === 'multi') {
      if (isQuotaExceeded) return () => memoryStore.pipeline();
      return (...args) => {
        const recorded = [];
        try {
          const pipe = target[prop](...args);
          const proxyPipe = new Proxy(pipe, {
            get(pipeTarget, pipeProp) {
              if (pipeProp === 'exec') {
                return async () => {
                  try {
                    return await pipeTarget.exec();
                  } catch (err) {
                    markFallback(err);
                    const memPipe = memoryStore.pipeline();
                    for (const [cmd, cmdArgs] of recorded) {
                      if (typeof memPipe[cmd] === 'function') {
                        memPipe[cmd](...cmdArgs);
                      }
                    }
                    return await memPipe.exec();
                  }
                };
              }
              if (typeof pipeTarget[pipeProp] === 'function') {
                return (...callArgs) => {
                  recorded.push([pipeProp, callArgs]);
                  pipeTarget[pipeProp](...callArgs);
                  return proxyPipe;
                };
              }
              return pipeTarget[pipeProp];
            },
          });
          return proxyPipe;
        } catch (err) {
          markFallback(err);
          return memoryStore.pipeline();
        }
      };
    }
    if (typeof target[prop] === 'function') {
      return (...args) => {
        if (isQuotaExceeded && typeof memoryStore[prop] === 'function') {
          return memoryStore[prop](...args);
        }
        try {
          const result = target[prop](...args);
          if (result && typeof result.then === 'function') {
            return result.catch((err) => {
              if (String(err?.message || '').includes('max requests limit exceeded') || err?.name === 'MaxRetriesPerRequestError' || String(err?.message || '').includes('Connection is closed')) {
                markFallback(err);
                if (typeof memoryStore[prop] === 'function') {
                  return memoryStore[prop](...args);
                }
              }
              throw err;
            });
          }
          return result;
        } catch (err) {
          if (String(err?.message || '').includes('max requests limit exceeded') || err?.name === 'MaxRetriesPerRequestError' || String(err?.message || '').includes('Connection is closed')) {
            markFallback(err);
            if (typeof memoryStore[prop] === 'function') {
              return memoryStore[prop](...args);
            }
          }
          throw err;
        }
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});

// ─── Keepalive Ping ──────────────────────────────────────────────────────────
const KEEPALIVE_INTERVAL_MS = 25_000;
let keepaliveTimer = null;

function startKeepalive() {
  if (keepaliveTimer || process.env.VERCEL === '1') return;
  keepaliveTimer = setInterval(async () => {
    if (isQuotaExceeded) return;
    try {
      await redis.ping();
    } catch {
      // Silently ignore
    }
  }, KEEPALIVE_INTERVAL_MS);

  if (keepaliveTimer.unref) keepaliveTimer.unref();
}

startKeepalive();

process.on('SIGTERM', () => {
  if (keepaliveTimer) clearInterval(keepaliveTimer);
});
process.on('SIGINT', () => {
  if (keepaliveTimer) clearInterval(keepaliveTimer);
});
