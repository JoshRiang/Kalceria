import crypto from 'node:crypto';
import { AUTH_TTL_SECONDS } from '../utils/authSession.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_NAME = 'csrfToken';

function cookieOptions() {
  return {
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
    path: '/',
  };
}

export function issueCsrfToken(_req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...cookieOptions(),
    httpOnly: false,
    maxAge: AUTH_TTL_SECONDS * 1000,
  });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ csrfToken: token });
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Server-to-server broker webhooks (payment, whatsapp, resend) authenticate via HMAC/tokens, not browser cookies
  const path = req.path || req.originalUrl || '';
  if (path.includes('/webhooks/')) return next();

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    return res.status(403).json({ error: 'Request verification failed.' });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return res.status(403).json({ error: 'Request verification failed.' });
  }

  return next();
}
