import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /admin/users ─────────────────────────────────────────────────────────
export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, phone: true,
        gender: true, role: true, isEmailVerified: true,
        createdAt: true, dob: true,
        _count: { select: { bookings: true, eventRegistrations: true, serviceBookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) { next(err); }
}

// ─── GET /admin/users/:id ─────────────────────────────────────────────────────
export async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: { orderBy: { createdAt: 'desc' } },
        eventRegistrations: { include: { event: { select: { title: true } } }, orderBy: { createdAt: 'desc' } },
        serviceBookings: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/users/:id/role ──────────────────────────────────────────────
export async function setUserRole(req, res, next) {
  try {
    const { role } = req.body; // 'USER' | 'ADMIN'
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────
export async function deleteUser(req, res, next) {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
}
