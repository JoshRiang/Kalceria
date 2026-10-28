import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';

const INCREMENT_WITH_TTL = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return { count, redis.call('TTL', KEYS[1]) }
`;

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value || 'unknown').trim().toLowerCase()).digest('hex');
}

export function rateLimit({ name, max, windowSeconds, key = (req) => req.ip || 'unknown' }) {
  return async (req, res, next) => {
    try {
      const identity = await key(req);
      const redisKey = `rate:${name}:${hashKey(identity)}`;
      const [count, ttl] = await redis.eval(INCREMENT_WITH_TTL, 1, redisKey, windowSeconds);

      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, max - count)));

      if (count > max) {
        res.setHeader('Retry-After', String(Math.max(1, ttl)));
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const apiRateLimit = rateLimit({
  name: 'api-ip',
  max: 900,
  windowSeconds: 15 * 60,
});

export const loginIpRateLimit = rateLimit({
  name: 'login-ip',
  max: 30,
  windowSeconds: 15 * 60,
});

export const loginIdentityRateLimit = rateLimit({
  name: 'login-identity',
  max: 10,
  windowSeconds: 15 * 60,
  key: (req) => req.body?.email || req.body?.username || req.ip,
});

export const signupRateLimit = rateLimit({
  name: 'signup-ip',
  max: 10,
  windowSeconds: 60 * 60,
});

export const otpRequestIpRateLimit = rateLimit({
  name: 'otp-request-ip',
  max: 20,
  windowSeconds: 15 * 60,
});

export const otpRequestEmailRateLimit = rateLimit({
  name: 'otp-request-email',
  max: 3,
  windowSeconds: 15 * 60,
  key: (req) => req.body?.email || req.ip,
});

export const otpVerifyRateLimit = rateLimit({
  name: 'otp-verify',
  max: 10,
  windowSeconds: 15 * 60,
  key: (req) => req.body?.email || req.ip,
});

export const passwordResetRateLimit = rateLimit({
  name: 'password-reset-request',
  max: 3,
  windowSeconds: 60 * 60,
  key: (req) => req.body?.email || req.ip,
});

export const passwordResetConfirmRateLimit = rateLimit({
  name: 'password-reset-confirm',
  max: 10,
  windowSeconds: 60 * 60,
});

export const usernameCheckRateLimit = rateLimit({
  name: 'username-check',
  max: 30,
  windowSeconds: 60 * 60,
});

export const commentRateLimit = rateLimit({
  name: 'comment-ip',
  max: 10,
  windowSeconds: 60 * 60,
});

export const jitRateLimit = rateLimit({
  name: 'jit-ip',
  max: 10,
  windowSeconds: 15 * 60,
});

export const bookingRateLimit = rateLimit({
  name: 'booking-user',
  max: 10,
  windowSeconds: 60 * 60,
  key: (req) => req.user?.userId || req.ip,
});

export const miniEventRateLimit = rateLimit({
  name: 'mini-event-user',
  max: 10,
  windowSeconds: 60 * 60,
  key: (req) => req.user?.userId || req.ip,
});
