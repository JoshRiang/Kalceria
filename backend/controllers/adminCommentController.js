import prisma from '../lib/prisma.js';
import { createLog } from './auditController.js';
import { CANONICAL_USER_SELECT, ensurePersistentUserProfilesBatch } from '../utils/profileDefaults.js';


export async function listComments(req, res, next) {
  try {
    const { search, pinned, type } = req.query;
    
    let where = {};
    
    if (search) {
      where.username = { contains: search, mode: 'insensitive' };
    }

    if (pinned === 'true') {
      where.isPinned = true;
    }

    if (type && type !== 'All') {
      where.type = type.toUpperCase(); // ADVICE or IDEA
    }

    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: CANONICAL_USER_SELECT,
        },
      },
    });

    const usersToEnrich = comments.map((c) => c.user).filter(Boolean);
    if (usersToEnrich.length > 0) {
      const enrichedUsers = await ensurePersistentUserProfilesBatch(usersToEnrich);
      const userMap = new Map(enrichedUsers.map((u) => [String(u.id), u]));
      comments.forEach((c) => {
        if (c.user?.id && userMap.has(String(c.user.id))) {
          c.user = userMap.get(String(c.user.id));
        }
      });
    }

    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

export async function togglePinComment(req, res, next) {
  try {
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const updated = await prisma.comment.update({
      where: { id },
      data: { isPinned: !comment.isPinned }
    });

    res.json({ comment: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id } });
      await createLog(req.user.email, 'COMMENT_DELETED', `Comment ${id} deleted.`, tx);
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
