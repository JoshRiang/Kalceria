import prisma from '../lib/prisma.js';



// ─── GET /media ───────────────────────────────────────────────────────────────
export async function getMedia(req, res, next) {
  try {
    const { filter = 'recent' } = req.query;
    if (!['recent', 'hot', 'treasure'].includes(filter)) {
      return res.status(400).json({ error: 'Unsupported media filter.' });
    }
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
    const { title, imageUrl, description } = req.body || {};
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : null;
    const isRelativeUrl = cleanImageUrl.startsWith('/') && !cleanImageUrl.startsWith('//') && !cleanImageUrl.includes('\\');
    let isHttpsUrl = false;
    try { isHttpsUrl = new URL(cleanImageUrl).protocol === 'https:'; } catch { /* Relative URL or invalid input. */ }

    if (!cleanTitle || cleanTitle.length > 120 || cleanImageUrl.length > 2048 || (!isRelativeUrl && !isHttpsUrl)) {
      return res.status(400).json({ error: 'Provide a title and a valid HTTPS or site-relative image URL.' });
    }
    if (cleanDescription && cleanDescription.length > 2000) {
      return res.status(400).json({ error: 'Description must be 2000 characters or less.' });
    }

    const post = await prisma.mediaPost.create({
      data: { title: cleanTitle, imageUrl: cleanImageUrl, description: cleanDescription },
    });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}
