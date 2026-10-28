import { getRequestToken, verifyAuthSession } from '../utils/authSession.js';

export async function requireAuth(req, res, next) {
  const token = getRequestToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  const payload = await verifyAuthSession(token);
  if (!payload) return res.status(401).json({ error: 'Session invalid or expired.' });

  req.user = payload;
  return next();
}

export async function optionalAuth(req, res, next) {
  const token = getRequestToken(req);
  if (!token) return next();

  req.user = await verifyAuthSession(token) || undefined;
  return next();
}
