import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!token) return res.status(401).json({ error: 'No token.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { role: true } });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Admin only.' });
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid.' });
  }
}
