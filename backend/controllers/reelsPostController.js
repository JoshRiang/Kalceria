import {
  REELS_MAX_CAPTION_LENGTH,
  REELS_MAX_COMMENT_LENGTH,
  createReelsPost,
  listReelsFeed,
  toggleReelsPostLike,
  listReelsPostComments,
  addReelsPostComment,
  deleteReelsPost,
} from '../services/reelsPostStore.js';

export async function getReelsFeedHandler(req, res, next) {
  try {
    const viewerId = req.user?.userId || req.user?.id;
    const scope = req.query?.scope === 'global' ? 'global' : 'friends';
    const category = String(req.query?.category || 'cafe').toLowerCase();
    const cursor = req.query?.cursor ? String(req.query.cursor) : null;
    const limit = Number(req.query?.limit || 18);

    const data = await listReelsFeed({ viewerId, scope, category, cursor, limit });
    return res.json({ ok: true, ...data });
  } catch (err) {
    return next(err);
  }
}

export async function createReelsPostHandler(req, res, next) {
  try {
    const authorId = req.user?.userId || req.user?.id;
    const {
      eventId,
      category,
      visibility,
      mediaUrl,
      thumbnailUrl,
      mediaType,
      width,
      height,
      durationSec,
      caption,
      location,
      lat,
      lng,
    } = req.body || {};

    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return res.status(400).json({ error: 'Media URL is required.' });
    }
    if (typeof caption === 'string' && caption.trim().length > REELS_MAX_CAPTION_LENGTH) {
      return res.status(400).json({ error: `Caption must be ${REELS_MAX_CAPTION_LENGTH} characters or less.` });
    }

    const created = await createReelsPost({
      authorId,
      eventId,
      category,
      visibility,
      mediaUrl,
      thumbnailUrl,
      mediaType,
      width,
      height,
      durationSec,
      caption,
      location,
      lat,
      lng,
    });
    return res.status(201).json({ ok: true, post: created });
  } catch (err) {
    return next(err);
  }
}

export async function deleteReelsPostHandler(req, res, next) {
  try {
    const actorId = req.user?.userId || req.user?.id;
    const { postId } = req.params;
    const result = await deleteReelsPost(postId, actorId);
    if (result.notFound) return res.status(404).json({ error: 'Post not found.' });
    if (result.forbidden) return res.status(403).json({ error: 'Only the author can delete this post.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function toggleReelsPostLikeHandler(req, res, next) {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { postId } = req.params;
    const result = await toggleReelsPostLike(postId, userId);
    return res.json({ ok: true, ...result });
  } catch (err) {
    return next(err);
  }
}

export async function getReelsPostCommentsHandler(req, res, next) {
  try {
    const { postId } = req.params;
    const comments = await listReelsPostComments(postId);
    return res.json({ ok: true, comments });
  } catch (err) {
    return next(err);
  }
}

export async function addReelsPostCommentHandler(req, res, next) {
  try {
    const authorId = req.user?.userId || req.user?.id;
    const { postId } = req.params;
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment body is required.' });
    if (body.length > REELS_MAX_COMMENT_LENGTH) {
      return res.status(400).json({ error: `Comment must be ${REELS_MAX_COMMENT_LENGTH} characters or less.` });
    }
    const created = await addReelsPostComment(postId, authorId, body);
    const comments = await listReelsPostComments(postId);
    return res.status(201).json({ ok: true, comment: created, comments });
  } catch (err) {
    return next(err);
  }
}
