import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── GET /media ───────────────────────────────────────────────────────────────
export async function getMedia(req, res, next) {
  try {
    const { filter = 'recent' } = req.query;
    let posts;

    if (filter === 'hot') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      posts = await prisma.mediaPost.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, isArchived: false },
        orderBy: { viewCount: 'desc' },
      });
    } else if (filter === 'treasure') {
      posts = await prisma.mediaPost.findMany({
        where: { isArchived: true },
        orderBy: { createdAt: 'asc' },
      });
    } else {
      // recent (default)
      posts = await prisma.mediaPost.findMany({
        where: { isArchived: false },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

// ─── POST /media (Admin only) ─────────────────────────────────────────────────
export async function createMedia(req, res, next) {
  try {
    const { title, imageUrl, description } = req.body;
    const post = await prisma.mediaPost.create({ data: { title, imageUrl, description } });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}
