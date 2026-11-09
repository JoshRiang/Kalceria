import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: false, // Connect immediately on startup so it's warm
  connectTimeout: 15000, // Give Upstash 15s to wake up on first connect
  retryStrategy(times) {
    // Exponential backoff: 200ms, 400ms, 800ms... max 5s
    return Math.min(times * 200, 5000);
  },
});

redis.on('error', (err) => console.error('[Redis]', err.message));
redis.on('connect', () => console.log('[Redis] Connected'));

// ─── Keepalive Ping ──────────────────────────────────────────────────────────
// Upstash free-tier Redis sleeps after ~30s of inactivity, causing brutal 
// cold-start delays (5-10s). This heartbeat pings every 25s to keep it awake.
const KEEPALIVE_INTERVAL_MS = 25_000; // 25 seconds

let keepaliveTimer = null;

function startKeepalive() {
  if (keepaliveTimer) return; // Already running
  keepaliveTimer = setInterval(async () => {
    try {
      await redis.ping();
    } catch {
      // Silently ignore — reconnect strategy handles it
    }
  }, KEEPALIVE_INTERVAL_MS);
  
  // Don't let the keepalive timer prevent Node from exiting
  if (keepaliveTimer.unref) keepaliveTimer.unref();
  console.log(`[Redis] Keepalive active (ping every ${KEEPALIVE_INTERVAL_MS / 1000}s)`);
}

// Start keepalive immediately when module loads
startKeepalive();

// Graceful shutdown
process.on('SIGTERM', () => {
  if (keepaliveTimer) clearInterval(keepaliveTimer);
});
process.on('SIGINT', () => {
  if (keepaliveTimer) clearInterval(keepaliveTimer);
});
