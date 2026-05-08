import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!token) return res.status(401).json({ error: 'No token.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;

    console.log('[Debug Admin] Token userId:', req.user.userId);

    const user = await prisma.user.findUnique({ 
      where: { id: req.user.userId }, 
      select: { id: true, email: true, role: true } 
    });

    console.log('[Debug Admin] DB User:', user);

    if (!user || user.role !== 'ADMIN') {
      console.log('[Debug Admin] Denied. Role is:', user?.role);
      return res.status(403).json({ error: 'Forbidden. Admin only.' });
    }

    next();
  } catch (err) {
    console.error('[Debug Admin] Error:', err.message);
    res.status(401).json({ error: 'Token invalid.' });
  }
}
