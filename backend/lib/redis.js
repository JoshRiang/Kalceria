import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('error', (err) => console.error('[Redis]', err));
