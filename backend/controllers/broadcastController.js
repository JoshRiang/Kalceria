import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── POST /broadcast ──────────────────────────────────────────────────────────
export async function createBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    const existing = await prisma.userBroadcast.findUnique({ where: { userId } });
    if (existing) {
      return res.status(409).json({ error: 'Broadcast already exists. Use PUT to update.' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24 hours

    const broadcast = await prisma.userBroadcast.create({
      data: { userId, message, expiresAt },
    });

    res.status(201).json({ broadcast });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /broadcast ───────────────────────────────────────────────────────────
export async function updateBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    // Update message ONLY — do NOT touch expiresAt
    const broadcast = await prisma.userBroadcast.update({
      where: { userId },
      data: { message },
    });

    res.json({ broadcast });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /broadcast ────────────────────────────────────────────────────────
export async function deleteBroadcast(req, res, next) {
  try {
    const userId = req.user.userId;
    await prisma.userBroadcast.delete({ where: { userId } });
    res.json({ message: 'Broadcast deleted.' });
  } catch (err) {
    next(err);
  }
}
