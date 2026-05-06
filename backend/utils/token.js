import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis.js';

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_TTL = 1200; // 20 minutes

// ─── Generate Session Token ───────────────────────────────────────────────────
export function generateSessionToken(userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: SESSION_TTL,
  });

  // Save token signature slice to Redis for validation
  const sig = token.split('.')[2];
  redis.set(`session:${userId}`, sig, 'EX', SESSION_TTL);

  return token;
}

// ─── Validate Session Token ───────────────────────────────────────────────────
export async function validateSessionToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const sig = token.split('.')[2];

    const stored = await redis.get(`session:${payload.userId}`);
    if (!stored || stored !== sig) return null;

    return payload;
  } catch {
    return null;
  }
}

/*
  ─── RSA Key Generation Instructions ──────────────────────────────────────────
  Run once locally. Save private key to env — never commit.

  openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
  openssl rsa -pubout -in private.pem -out public.pem

  Then in .env:
  RSA_PRIVATE_KEY="$(cat private.pem | base64)"
  RSA_PUBLIC_KEY="$(cat public.pem | base64)"

  Decode in code:
  Buffer.from(process.env.RSA_PRIVATE_KEY, 'base64').toString('utf8')
  ─────────────────────────────────────────────────────────────────────────────
*/
