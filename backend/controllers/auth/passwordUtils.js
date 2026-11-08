import argon2 from 'argon2';
import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const NATURAL_PASS_PREFIXES = [
  'Kalcer', 'Turbo', 'Vortex', 'Nitro', 'Apex', 'Veloz', 'Drift', 'Spark',
  'Horizon', 'Bintaro', 'Targa', 'Carbon', 'Aether', 'Cyber', 'monza', 'Supra',
  'Phantom', 'Zenith', 'Cobalt', 'Vector', 'Chrono', 'Stratos', 'Torque', 'Rev',
];

export const NATURAL_PASS_CORES = [
  'Shift', 'Pulse', 'Drive', 'Forge', 'Surge', 'Blade', 'Storm', 'Track',
  'Boost', 'Crest', 'Glide', 'Prime', 'Spark', 'Nexus', 'gt', 'vspec',
  'Redline', 'Stage', 'Aero', 'Tuner', 'Sprint', 'Racer', 'Matrix', 'Nova',
];

export const NATURAL_PASS_SYMBOLS = ['!', '@', '#', '$', '%', '&', '*', '?', '+', '='];

export function generateNaturalStrongPassword() {
  const rawPrefix = NATURAL_PASS_PREFIXES[crypto.randomInt(0, NATURAL_PASS_PREFIXES.length)];
  const rawCore = NATURAL_PASS_CORES[crypto.randomInt(0, NATURAL_PASS_CORES.length)];
  const prefix = rawPrefix.charAt(0).toUpperCase() + rawPrefix.slice(1).toLowerCase();
  const core = rawCore.charAt(0).toUpperCase() + rawCore.slice(1).toLowerCase();
  const sym1 = NATURAL_PASS_SYMBOLS[crypto.randomInt(0, NATURAL_PASS_SYMBOLS.length)];
  const sym2 = NATURAL_PASS_SYMBOLS[crypto.randomInt(0, NATURAL_PASS_SYMBOLS.length)];
  const digits = String(crypto.randomInt(104, 998));

  const pattern = crypto.randomInt(0, 3);
  let candidate;
  if (pattern === 0) {
    candidate = `${prefix}${core}${sym1}${digits}`;
  } else if (pattern === 1) {
    candidate = `${prefix}${sym1}${core}${digits}${sym2}`;
  } else {
    candidate = `${prefix}${digits}${sym1}${core}`;
  }

  if (!PASSWORD_REGEX.test(candidate)) {
    candidate = `${prefix}${core}#${digits}!`;
  }
  return candidate;
}

export async function isPasswordInHistory(user, candidatePassword) {
  if (!user || typeof candidatePassword !== 'string') return false;

  // 1. Check current password
  if (user.passwordHash) {
    const isCurrent = await argon2.verify(user.passwordHash, candidatePassword).catch(() => false);
    if (isCurrent) return true;
  }

  // 2. Check catalog history of past passwords (up to 5)
  let history = [];
  if (Array.isArray(user.passwordHistory)) {
    history = user.passwordHistory;
  } else if (typeof user.passwordHistory === 'string') {
    try {
      history = JSON.parse(user.passwordHistory);
    } catch {}
  }

  if (Array.isArray(history)) {
    for (const oldHash of history) {
      if (typeof oldHash === 'string' && oldHash.length > 0) {
        const match = await argon2.verify(oldHash, candidatePassword).catch(() => false);
        if (match) return true;
      }
    }
  }
  return false;
}

export function getUpdatedPasswordHistory(user) {
  let history = [];
  if (Array.isArray(user.passwordHistory)) {
    history = [...user.passwordHistory];
  } else if (typeof user.passwordHistory === 'string') {
    try {
      history = JSON.parse(user.passwordHistory);
    } catch {}
  }
  if (!Array.isArray(history)) history = [];

  // Clean, filter, and deduplicate
  history = history.filter((h) => typeof h === 'string' && h.trim().length > 0);

  // Prepend current passwordHash if present and remove duplicate occurrences
  if (user.passwordHash && typeof user.passwordHash === 'string') {
    history = history.filter((h) => h !== user.passwordHash);
    history.unshift(user.passwordHash);
  }

  // Retain strictly the last 5 passwords cycle
  return history.slice(0, 5);
}

export async function recommendStrongPassword(req, res) {
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    const rawToken = typeof req.query?.token === 'string' ? req.query.token.trim() : '';
    const rawEmail = typeof req.query?.email === 'string' ? req.query.email.trim().toLowerCase() : '';

    let user = null;
    if (rawToken && /^[a-f0-9]{64}$/i.test(rawToken)) {
      const tokenEmail = await redis.get(`reset:${rawToken}`).catch(() => null);
      if (tokenEmail) {
        user = await prisma.user.findUnique({
          where: { email: tokenEmail },
          select: { id: true, passwordHash: true, passwordHistory: true },
        }).catch(() => null);
      }
    } else if (rawEmail && rawEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      user = await prisma.user.findUnique({
        where: { email: rawEmail },
        select: { id: true, passwordHash: true, passwordHistory: true },
      }).catch(() => null);
    }

    let password = generateNaturalStrongPassword();
    if (user) {
      for (let i = 0; i < 4; i++) {
        const used = await isPasswordInHistory(user, password);
        if (!used) break;
        password = generateNaturalStrongPassword();
      }
    }

    return res.json({ password });
  } catch {
    return res.json({ password: generateNaturalStrongPassword() });
  }
}

export function csrfCookieOptions() {
  return {
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
    path: '/',
  };
}

export function setCsrfCookie(res, token) {
  res.cookie('csrfToken', token, {
    ...csrfCookieOptions(),
    httpOnly: false,
    maxAge: 20 * 60 * 1000,
  });
}

export function issueLoginCsrfToken(res) {
  const token = crypto.randomBytes(32).toString('hex');
  setCsrfCookie(res, token);
  return token;
}
