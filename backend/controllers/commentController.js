import prisma from '../lib/prisma.js';



export async function createComment(req, res, next) {
  try {
    const { content, category, type, username, identity } = req.body;
    
    // userId is optional if logged in
    const userId = req.user ? req.user.userId : null;

    let finalUsername = username;
    if (identity === 'Anonymous') finalUsername = 'Anonymous';
    if (identity === 'Guest' && !username) finalUsername = 'Guest';

    const comment = await prisma.comment.create({
      data: {
        content,
        category,
        type: type === 'IDEA' ? 'IDEA' : 'ADVICE', 
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
