import jwt from 'jsonwebtoken';
import { redis } from '../lib/redis.js';

const FRONTEND_URL = process.env.FRONTEND_URL;

// ─── GET /redirect/event/:eventId ─────────────────────────────────────────────
export async function redirectEvent(req, res) {
  const { eventId } = req.params;
  const loginUrl = `${FRONTEND_URL}/login?next=/event/${eventId}/register`;
  const registerUrl = `${FRONTEND_URL}/event/${eventId}/register`;

  try {
    // Read token from cookie or Authorization header
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

    if (!token) return res.redirect(302, loginUrl);

    // Verify JWT
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.redirect(302, loginUrl);
    }

    // Check session exists in Redis
    const sessionKey = `session:${payload.userId}`;
    const exists = await redis.exists(sessionKey);
    if (!exists) return res.redirect(302, loginUrl);

    // Valid — redirect to register page
    return res.redirect(302, registerUrl);
  } catch {
    return res.redirect(302, loginUrl);
  }
}
