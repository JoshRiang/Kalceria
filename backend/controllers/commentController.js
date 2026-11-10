import prisma from '../lib/prisma.js';
import { setCommentCooldown } from '../middleware/commentDefense.js';
import { sanitizeAndNormalizeMediaUrl } from '../utils/urlSecurity.js';
import { CANONICAL_USER_SELECT } from '../utils/profileDefaults.js';

export async function createComment(req, res, next) {
  try {
    const { content, category, type, identity, username, userId: bodyUserId } = req.body || {};
    const cleanContent = typeof content === 'string' ? content.trim() : '';
    const cleanCategory = typeof category === 'string' ? category.trim() : 'Other';

    if (cleanContent.length < 20 || cleanContent.length > 200) {
      return res.status(400).json({ error: 'Comment must be between 20 and 200 characters.' });
    }
    if (!['ADVICE', 'IDEA'].includes(type) || cleanCategory.length > 60) {
      return res.status(400).json({ error: 'Please provide a valid comment category and type.' });
    }
    if (identity !== undefined && !['Anonymous', 'Guest', 'User'].includes(identity)) {
      return res.status(400).json({ error: 'Please provide a valid identity.' });
    }

    const authUserId = req.user ? (req.user.userId || req.user.id) : null;

    // Defense: Identity Verification & Anti-Spoofing
    if (identity === 'User') {
      if (!authUserId) {
        return res.status(401).json({ error: 'Sign in to post with your account name.' });
      }
      if (bodyUserId && String(bodyUserId) !== String(authUserId)) {
        return res.status(403).json({ error: 'Account mismatch: Cannot post on behalf of another user ID.' });
      }
    }

    let dbUser = null;
    if (authUserId) {
      dbUser = await prisma.user.findUnique({
        where: { id: authUserId },
        select: CANONICAL_USER_SELECT,
      });
      if (!dbUser && identity === 'User') {
        return res.status(401).json({ error: 'User session not found.' });
      }
    }

    // Verify claimed username matches authenticated user
    if (identity === 'User' && dbUser && typeof username === 'string' && username.trim().length > 0) {
      const allowedNames = [dbUser.nickname, dbUser.name, dbUser.email, 'user', 'authenticated user']
        .filter(Boolean)
        .map((s) => s.trim().toLowerCase());
      if (!allowedNames.includes(username.trim().toLowerCase())) {
        return res.status(403).json({
          error: 'Account mismatch: Display name does not match your authenticated account.',
        });
      }
    }

    const finalUsername =
      identity === 'Anonymous'
        ? 'Anonymous'
        : identity === 'User'
        ? dbUser?.nickname || dbUser?.name || 'User'
        : 'Guest';

    let cleanMediaUrl = null;
    if (typeof req.body?.mediaUrl === 'string' && req.body.mediaUrl.trim().length > 0) {
      const sanitized = sanitizeAndNormalizeMediaUrl(req.body.mediaUrl);
      if (!sanitized.valid) {
        return res.status(400).json({
          error: sanitized.error || 'URL media tidak valid atau melanggar kebijakan keamanan.',
        });
      }
      cleanMediaUrl = sanitized.normalized;
    }

    const comment = await prisma.comment.create({
      data: {
        content: cleanContent,
        category: cleanCategory || 'Other',
        type,
        username: finalUsername,
        userId: (identity === 'Anonymous' || identity === 'Guest') ? null : authUserId,
        mediaUrl: cleanMediaUrl,
      },
    });

    // Enforce 2-hour cooldown across identity layers
    await setCommentCooldown(req, authUserId);

    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error('[CreateComment Error]', err);
    next(err);
  }
}
