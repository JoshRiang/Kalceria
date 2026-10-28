import prisma from '../lib/prisma.js';



export async function createComment(req, res, next) {
  try {
    const { content, category, type, identity } = req.body || {};
    const cleanContent = typeof content === 'string' ? content.trim() : '';
    const cleanCategory = typeof category === 'string' ? category.trim() : 'Other';
    if (cleanContent.length < 5 || cleanContent.length > 2000) {
      return res.status(400).json({ error: 'Comment must be between 5 and 2000 characters.' });
    }
    if (!['ADVICE', 'IDEA'].includes(type) || cleanCategory.length > 60) {
      return res.status(400).json({ error: 'Please provide a valid comment category and type.' });
    }
    if (identity !== undefined && !['Anonymous', 'Guest', 'User'].includes(identity)) {
      return res.status(400).json({ error: 'Please provide a valid identity.' });
    }

    const userId = req.user ? req.user.userId : null;
    if (identity === 'User' && !userId) {
      return res.status(401).json({ error: 'Sign in to post with your account name.' });
    }
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } })
      : null;
    const finalUsername = identity === 'Anonymous'
      ? 'Anonymous'
      : identity === 'User'
        ? (user?.nickname || user?.name || 'User')
        : 'Guest';

    const comment = await prisma.comment.create({
      data: {
        content: cleanContent,
        category: cleanCategory || 'Other',
        type,
        username: finalUsername,
        userId: userId,
      },
    });

    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error('[CreateComment Error]', err);
    next(err);
  }
}
