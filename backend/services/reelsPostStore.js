import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import { ensurePersistentUserProfilesBatch, CANONICAL_USER_SELECT } from '../utils/profileDefaults.js';
import { getFriendRelations } from './friendsStore.js';
import { fetchCanonicalUserBlocks } from './canonicalFallbackStore.js';

export const REELS_CATEGORIES = ['cafe', 'eat', 'special', 'discuss', 'broadcast'];
export const REELS_DEFAULT_PAGE_SIZE = 18;
export const REELS_MAX_CAPTION_LENGTH = 240;
export const REELS_MAX_COMMENT_LENGTH = 200;

let reelsTablesChecked = false;

export async function ensureReelsTables() {
  if (reelsTablesChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reels_media_posts (
        id VARCHAR(128) PRIMARY KEY,
        author_id VARCHAR(128) NOT NULL,
        event_id VARCHAR(128),
        category VARCHAR(32) NOT NULL DEFAULT 'cafe',
        visibility VARCHAR(16) NOT NULL DEFAULT 'private',
        media_url TEXT NOT NULL,
        thumbnail_url TEXT,
        media_type VARCHAR(16) NOT NULL DEFAULT 'photo',
        width INT,
        height INT,
        duration_sec DOUBLE PRECISION,
        caption TEXT,
        location TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_reels_posts_cat_vis_created
      ON reels_media_posts (category, visibility, created_at DESC, id DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_reels_posts_author_created
      ON reels_media_posts (author_id, created_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reels_post_likes (
        post_id VARCHAR(128) NOT NULL,
        user_id VARCHAR(128) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id, user_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS reels_post_comments (
        id VARCHAR(128) PRIMARY KEY,
        post_id VARCHAR(128) NOT NULL,
        author_id VARCHAR(128) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_reels_comments_post_created
      ON reels_post_comments (post_id, created_at ASC)
    `);
    reelsTablesChecked = true;
  } catch (err) {
    console.warn('[ReelsPostStore] ensureReelsTables error:', err?.message);
  }
}

export async function createReelsPost({
  authorId,
  eventId = null,
  category = 'cafe',
  visibility = 'private',
  mediaUrl,
  thumbnailUrl = null,
  mediaType = 'photo',
  width = null,
  height = null,
  durationSec = null,
  caption = '',
  location = null,
  lat = null,
  lng = null,
}) {
  await ensureReelsTables();
  const safeCat = REELS_CATEGORIES.includes(String(category).toLowerCase())
    ? String(category).toLowerCase()
    : 'cafe';
  const safeVis = visibility === 'public' ? 'public' : 'private';
  const safeType = mediaType === 'video' ? 'video' : 'photo';
  const safeCaption = String(caption || '').trim().slice(0, REELS_MAX_CAPTION_LENGTH);
  const safeLoc = location ? String(location).trim().slice(0, 160) : null;
  const safeMedia = String(mediaUrl || '').trim().slice(0, 2000);
  const safeThumb = thumbnailUrl ? String(thumbnailUrl).trim().slice(0, 2000) : null;
  const postId = `reel_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO reels_media_posts
      (id, author_id, event_id, category, visibility, media_url, thumbnail_url, media_type, width, height, duration_sec, caption, location, lat, lng)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    postId,
    String(authorId),
    eventId ? String(eventId) : null,
    safeCat,
    safeVis,
    safeMedia,
    safeThumb,
    safeType,
    Number.isFinite(Number(width)) ? Math.round(Number(width)) : null,
    Number.isFinite(Number(height)) ? Math.round(Number(height)) : null,
    Number.isFinite(Number(durationSec)) ? Number(durationSec) : null,
    safeCaption,
    safeLoc,
    Number.isFinite(Number(lat)) ? Number(lat) : null,
    Number.isFinite(Number(lng)) ? Number(lng) : null
  );

  return { id: postId, category: safeCat, visibility: safeVis };
}

export async function listReelsFeed({ viewerId, scope = 'friends', category = 'cafe', cursor = null, limit = REELS_DEFAULT_PAGE_SIZE }) {
  await ensureReelsTables();
  const vid = String(viewerId);
  const safeScope = scope === 'global' ? 'global' : 'friends';
  const safeCat = category === 'all' ? 'all' : (REELS_CATEGORIES.includes(String(category).toLowerCase()) ? String(category).toLowerCase() : 'cafe');
  const safeLimit = Math.min(36, Math.max(1, Number(limit) || REELS_DEFAULT_PAGE_SIZE));

  const [relations, blockInfo] = await Promise.all([
    getFriendRelations(vid),
    fetchCanonicalUserBlocks(vid).catch(() => ({ blockedUsers: [], blockedByUsers: [] })),
  ]);

  const friendSet = new Set(relations.friendIds || []);
  const blockedSet = new Set([
    ...(blockInfo?.blockedUsers || []).map(String),
    ...(blockInfo?.blockedByUsers || []).map(String),
  ]);

  const params = [];
  const clauses = [];

  if (safeCat !== 'all') {
    params.push(safeCat);
    clauses.push(`category = $${params.length}`);
  }

  if (safeScope === 'global') {
    clauses.push(`visibility = 'public'`);
  } else {
    const allowedAuthors = Array.from(new Set([vid, ...relations.friendIds]));
    params.push(allowedAuthors);
    clauses.push(`author_id = ANY($${params.length}::text[])`);
  }

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      params.push(cursorDate);
      clauses.push(`created_at < $${params.length}`);
    }
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(safeLimit + 1);

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, author_id, event_id, category, visibility, media_url, thumbnail_url, media_type, width, height, duration_sec, caption, location, lat, lng, created_at
     FROM reels_media_posts
     ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length}`,
    ...params
  );

  const visibleRows = (rows || []).filter((r) => !blockedSet.has(String(r.author_id)));
  const hasMore = visibleRows.length > safeLimit;
  const pageRows = visibleRows.slice(0, safeLimit);

  if (pageRows.length === 0) {
    return { posts: [], nextCursor: null, hasMore: false };
  }

  const postIds = pageRows.map((r) => String(r.id));
  const authorIds = Array.from(new Set(pageRows.map((r) => String(r.author_id))));

  const [authors, likeRows, commentCountRows] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: authorIds } }, select: CANONICAL_USER_SELECT }),
    prisma.$queryRawUnsafe(
      `SELECT post_id, user_id FROM reels_post_likes WHERE post_id = ANY($1::text[])`,
      postIds
    ),
    prisma.$queryRawUnsafe(
      `SELECT post_id, COUNT(*)::int AS cnt FROM reels_post_comments WHERE post_id = ANY($1::text[]) GROUP BY post_id`,
      postIds
    ),
  ]);

  const enrichedAuthors = await ensurePersistentUserProfilesBatch(authors);
  const authorMap = new Map(enrichedAuthors.map((u) => [String(u.id), u]));

  const likeCountMap = new Map();
  const likedByMeSet = new Set();
  for (const lr of likeRows || []) {
    const pid = String(lr.post_id);
    likeCountMap.set(pid, (likeCountMap.get(pid) || 0) + 1);
    if (String(lr.user_id) === vid) likedByMeSet.add(pid);
  }
  const commentCountMap = new Map((commentCountRows || []).map((c) => [String(c.post_id), Number(c.cnt || 0)]));

  const posts = pageRows.map((r) => {
    const pid = String(r.id);
    const aid = String(r.author_id);
    const author = authorMap.get(aid) || { id: aid, name: 'Kalcerian', displayName: 'Kalcerian', nickname: 'kalcerian' };
    return {
      id: pid,
      authorId: aid,
      author,
      isFriendWithAuthor: aid !== vid && friendSet.has(aid),
      isOwnPost: aid === vid,
      eventId: r.event_id ? String(r.event_id) : null,
      category: String(r.category || 'cafe'),
      visibility: String(r.visibility || 'private'),
      mediaUrl: String(r.media_url),
      thumbnailUrl: r.thumbnail_url ? String(r.thumbnail_url) : null,
      mediaType: String(r.media_type || 'photo'),
      width: r.width ? Number(r.width) : null,
      height: r.height ? Number(r.height) : null,
      durationSec: r.duration_sec ? Number(r.duration_sec) : null,
      caption: r.caption || '',
      location: r.location || null,
      lat: Number.isFinite(Number(r.lat)) ? Number(r.lat) : null,
      lng: Number.isFinite(Number(r.lng)) ? Number(r.lng) : null,
      likeCount: likeCountMap.get(pid) || 0,
      likedByMe: likedByMeSet.has(pid),
      commentCount: commentCountMap.get(pid) || 0,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  });

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && lastRow?.created_at ? new Date(lastRow.created_at).toISOString() : null;
  return { posts, nextCursor, hasMore };
}

export async function toggleReelsPostLike(postId, userId) {
  await ensureReelsTables();
  const pid = String(postId);
  const uid = String(userId);
  const existing = await prisma.$queryRawUnsafe(
    `SELECT 1 AS ok FROM reels_post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
    pid,
    uid
  );
  let liked = false;
  if (Array.isArray(existing) && existing.length > 0) {
    await prisma.$executeRawUnsafe(`DELETE FROM reels_post_likes WHERE post_id = $1 AND user_id = $2`, pid, uid);
    liked = false;
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO reels_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      pid,
      uid
    );
    liked = true;
  }
  const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM reels_post_likes WHERE post_id = $1`, pid);
  return { liked, likeCount: Number(countRows?.[0]?.cnt || 0) };
}

export async function listReelsPostComments(postId) {
  await ensureReelsTables();
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, post_id, author_id, body, created_at FROM reels_post_comments WHERE post_id = $1 ORDER BY created_at ASC LIMIT 100`,
    String(postId)
  );
  if (!rows || rows.length === 0) return [];
  const authorIds = Array.from(new Set(rows.map((r) => String(r.author_id))));
  const users = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: CANONICAL_USER_SELECT });
  const enriched = await ensurePersistentUserProfilesBatch(users);
  const uMap = new Map(enriched.map((u) => [String(u.id), u]));

  return rows.map((r) => {
    const a = uMap.get(String(r.author_id));
    return {
      id: String(r.id),
      postId: String(r.post_id),
      authorId: String(r.author_id),
      authorName: a?.displayName || a?.name || 'Kalcerian',
      authorAvatar: a?.profilePicture || null,
      author: a || null,
      body: String(r.body || ''),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  });
}

export async function addReelsPostComment(postId, authorId, body) {
  await ensureReelsTables();
  const safeBody = String(body || '').trim().slice(0, REELS_MAX_COMMENT_LENGTH);
  if (!safeBody) return null;
  const cid = `rcmt_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO reels_post_comments (id, post_id, author_id, body) VALUES ($1, $2, $3, $4)`,
    cid,
    String(postId),
    String(authorId),
    safeBody
  );
  return { id: cid, postId: String(postId), authorId: String(authorId), body: safeBody };
}

export async function deleteReelsPost(postId, actorId) {
  await ensureReelsTables();
  const pid = String(postId);
  const aid = String(actorId);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT author_id FROM reels_media_posts WHERE id = $1 LIMIT 1`,
    pid
  );
  if (!rows || rows.length === 0) return { notFound: true };
  if (String(rows[0].author_id) !== aid) return { forbidden: true };
  await Promise.allSettled([
    prisma.$executeRawUnsafe(`DELETE FROM reels_post_comments WHERE post_id = $1`, pid),
    prisma.$executeRawUnsafe(`DELETE FROM reels_post_likes WHERE post_id = $1`, pid),
    prisma.$executeRawUnsafe(`DELETE FROM reels_media_posts WHERE id = $1`, pid),
  ]);
  return { ok: true, deletedId: pid };
}
