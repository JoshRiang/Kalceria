import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis.js';

export const AUTH_COOKIE_NAME = 'token';
export const AUTH_TTL_SECONDS = 20 * 60;
const JWT_ISSUER = 'kalceria-api';
const JWT_AUDIENCE = 'kalceria-web';

// Bounded O(1) in-process session micro-cache (eliminates redundant Redis RTTs during high-frequency chat/WebRTC bursts while keeping logout revocation 0ms immediate)
const SESSION_MEM_CACHE = new Map();
const SESSION_MEM_TTL_MS = 2500;
const SESSION_MEM_MAX_SIZE = 25000;

function cacheVerifiedJti(jti, userId) {
  if (!jti || !userId) return;
  if (SESSION_MEM_CACHE.size >= SESSION_MEM_MAX_SIZE) {
    const oldestKey = SESSION_MEM_CACHE.keys().next().value;
    if (oldestKey !== undefined) SESSION_MEM_CACHE.delete(oldestKey);
  }
  SESSION_MEM_CACHE.set(jti, { userId, expAt: Date.now() + SESSION_MEM_TTL_MS });
}

function evictUserFromMemCache(userId) {
  if (!userId) return;
  for (const [k, v] of SESSION_MEM_CACHE.entries()) {
    if (v.userId === userId) SESSION_MEM_CACHE.delete(k);
  }
}

function sessionKey(jti) {
  return `auth:session:${jti}`;
}

function userSessionsKey(userId) {
  return `auth:user-sessions:${userId}`;
}

export async function createAuthSession(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
      jwtid: jti,
      expiresIn: AUTH_TTL_SECONDS,
    },
  );

  const pipe = redis.pipeline();
  pipe.set(sessionKey(jti), user.id, 'EX', AUTH_TTL_SECONDS);
  pipe.sadd(userSessionsKey(user.id), jti);
  pipe.expire(userSessionsKey(user.id), AUTH_TTL_SECONDS);
  await pipe.exec();

  cacheVerifiedJti(jti, user.id);

  return token;
}

export async function verifyAuthSession(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });

    if (!payload.userId || !payload.jti) return null;

    const cached = SESSION_MEM_CACHE.get(payload.jti);
    if (cached) {
      if (Date.now() < cached.expAt && cached.userId === payload.userId) {
        return payload;
      }
      SESSION_MEM_CACHE.delete(payload.jti);
    }

    const sessionUserId = await redis.get(sessionKey(payload.jti));
    if (sessionUserId === payload.userId) {
      cacheVerifiedJti(payload.jti, payload.userId);
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export function getRequestToken(req) {
  return req.cookies?.[AUTH_COOKIE_NAME] || null;
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
    maxAge: AUTH_TTL_SECONDS * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  if (typeof res?.clearCookie === 'function') {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
      sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
      path: '/',
    });
  }
}

export async function revokeAuthSession(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
      ignoreExpiration: true,
    });
    if (!payload.userId || !payload.jti) return null;
    SESSION_MEM_CACHE.delete(payload.jti);
    const pipe = redis.pipeline();
    pipe.del(sessionKey(payload.jti));
    pipe.srem(userSessionsKey(payload.userId), payload.jti);
    await pipe.exec();
    return payload.userId;
  } catch {
    // Invalid or expired cookies are still cleared by the logout route.
    return null;
  }
}

export async function revokeUserSessions(userId) {
  evictUserFromMemCache(userId);
  const key = userSessionsKey(userId);
  const sessionIds = await redis.smembers(key);
  if (sessionIds.length) {
    for (const jti of sessionIds) {
      SESSION_MEM_CACHE.delete(jti);
    }
    await redis.del(...sessionIds.map(sessionKey));
  }
  await redis.del(key);
}
