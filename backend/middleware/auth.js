import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!token) return res.status(401).json({ error: 'No token provided.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired.' });
  }
}
