import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';



export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!token) return res.status(401).json({ error: 'No token.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
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
    console.error('[Debug Admin] Error:', err.message);
    res.status(401).json({ error: 'Token invalid.' });
  }
}

export async function requireJIT(req, res, next) {
  try {
    const jitToken = req.headers['x-jit-token'];
    if (!jitToken) return res.status(403).json({ error: 'JIT token required for this action.' });

    const payload = jwt.verify(jitToken, process.env.JWT_SECRET);
    // Pastikan token valid untuk user yang sama dan merupakan token JIT
    if (!payload.isJit || payload.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Invalid JIT token.' });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'JIT token expired. Please verify password again.' });
    }
    return res.status(403).json({ error: 'Invalid JIT token.' });
  }
}
