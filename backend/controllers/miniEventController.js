import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── POST /mini-events ────────────────────────────────────────────────────────
export async function createMiniEvent(req, res, next) {
  try {
    const { title, lat, lng } = req.body;
    const creatorId = req.user.userId;

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // +12 hours

    const event = await prisma.miniEvent.create({
      data: { creatorId, title, lat, lng, expiresAt },
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

// ─── GET /mini-events/active ──────────────────────────────────────────────────
export async function getActiveMiniEvents(req, res, next) {
  try {
    const events = await prisma.miniEvent.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        creator: {
          select: { id: true, name: true, nickname: true, profilePicture: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
}
