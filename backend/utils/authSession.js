import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis.js';

export const AUTH_COOKIE_NAME = 'token';
export const AUTH_TTL_SECONDS = 20 * 60;
const JWT_ISSUER = 'kalceria-api';
const JWT_AUDIENCE = 'kalceria-web';

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

  await redis.set(sessionKey(jti), user.id, 'EX', AUTH_TTL_SECONDS);
  await redis.sadd(userSessionsKey(user.id), jti);
  await redis.expire(userSessionsKey(user.id), AUTH_TTL_SECONDS);

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
    const sessionUserId = await redis.get(sessionKey(payload.jti));
    return sessionUserId === payload.userId ? payload : null;
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
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
    path: '/',
  });
}

export async function revokeAuthSession(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
      ignoreExpiration: true,
    });
    if (!payload.userId || !payload.jti) return;
    await redis.del(sessionKey(payload.jti));
    await redis.srem(userSessionsKey(payload.userId), payload.jti);
  } catch {
    // Invalid or expired cookies are still cleared by the logout route.
  }
}

export async function revokeUserSessions(userId) {
  const key = userSessionsKey(userId);
  const sessionIds = await redis.smembers(key);
  if (sessionIds.length) {
    await redis.del(...sessionIds.map(sessionKey));
  }
  await redis.del(key);
}
