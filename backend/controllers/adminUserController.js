import prisma from '../lib/prisma.js';
import { revokeUserSessions } from '../utils/authSession.js';
import { createLog } from './auditController.js';

const ADMIN_MUTATION_LOCK = [130019, 1];

async function lockAdminMutations(tx) {
  // $executeRaw: the lock function returns void, which $queryRaw cannot deserialize.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMIN_MUTATION_LOCK[0]}::int, ${ADMIN_MUTATION_LOCK[1]}::int)`;
}



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
    const { passwordHash: _passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) { next(err); }
}

// ─── PATCH /admin/users/:id/role ──────────────────────────────────────────────
export async function setUserRole(req, res, next) {
  try {
    const { role } = req.body; // 'USER' | 'ADMIN'
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Role must be USER or ADMIN.' });
    }
    if (req.params.id === req.user.userId && role !== 'ADMIN') {
      return res.status(400).json({ error: 'You cannot remove your own admin access.' });
    }
    if (req.params.id === req.user.userId && role === 'ADMIN') {
      return res.status(400).json({ error: 'Your account already has admin access.' });
    }
    const result = await prisma.$transaction(async (tx) => {
      await lockAdminMutations(tx);
      const target = await tx.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
      if (!target) return { error: 'NOT_FOUND' };
      if (target.role === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) return { error: 'LAST_ADMIN' };
      }
      const user = await tx.user.update({
        where: { id: req.params.id },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      });
      await createLog(req.user.email, 'USER_ROLE_CHANGED', `User ${user.id} role changed to ${role}.`, tx);
      return { user };
    });
    if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'User not found.' });
    if (result.error === 'LAST_ADMIN') return res.status(400).json({ error: 'The last admin account cannot be demoted.' });
    res.json({ user: result.user });
  } catch (err) { next(err); }
}

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────
export async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }
    const result = await prisma.$transaction(async (tx) => {
      await lockAdminMutations(tx);
      const target = await tx.user.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } });
      if (!target) return { error: 'NOT_FOUND' };
      if (target.role === 'ADMIN') {
        const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) return { error: 'LAST_ADMIN' };
      }
      await revokeUserSessions(req.params.id);
      await tx.user.delete({ where: { id: req.params.id } });
      await createLog(req.user.email, 'USER_DELETED', `User ${req.params.id} deleted.`, tx);
      return { deleted: true };
    });
    if (result.error === 'NOT_FOUND') return res.status(404).json({ error: 'User not found.' });
    if (result.error === 'LAST_ADMIN') return res.status(400).json({ error: 'The last admin account cannot be deleted.' });
    res.json({ message: 'User deleted.' });
  } catch (err) { next(err); }
}
