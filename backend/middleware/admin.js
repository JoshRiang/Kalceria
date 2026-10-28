import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { getRequestToken, verifyAuthSession } from '../utils/authSession.js';
import { redis } from '../lib/redis.js';



export async function requireAdmin(req, res, next) {
  try {
    const token = getRequestToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const payload = await verifyAuthSession(token);
    if (!payload) return res.status(401).json({ error: 'Session invalid or expired.' });
    req.user = payload;

    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId }, 
      select: { id: true, email: true, role: true } 
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Admin only.' });
    }

    next();
  } catch (err) {
    next(err);
  }
}

export async function requireJIT(req, res, next) {
  try {
    const jitToken = req.headers['x-jit-token'];
    if (!jitToken) return res.status(403).json({ error: 'JIT token required for this action.' });

    const payload = jwt.verify(jitToken, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: 'kalceria-admin-action',
      issuer: 'kalceria-api',
    });
    // Pastikan token valid untuk user yang sama dan merupakan token JIT
    if (!payload.isJit || payload.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Invalid JIT token.' });
    }

    if (!payload.jti) return res.status(403).json({ error: 'Invalid JIT token.' });
    const consumedUserId = await redis.eval(
      "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
      1,
      `auth:jit:${payload.jti}`,
    );
    if (consumedUserId !== req.user.userId) {
      return res.status(403).json({ error: 'JIT token already used or expired.' });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'JIT token expired. Please verify password again.' });
    }
    return res.status(403).json({ error: 'Invalid JIT token.' });
  }
}
