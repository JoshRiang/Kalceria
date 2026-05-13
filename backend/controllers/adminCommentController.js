import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
          select: { profilePicture: true, nickname: true }
        }
      }
    });

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
    await prisma.comment.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
