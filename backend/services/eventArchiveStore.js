import crypto from 'node:crypto';
import prisma from '../lib/prisma.js';
import { fetchCanonicalUserBlocks } from './canonicalFallbackStore.js';
import { extractEncodedTags } from '../controllers/miniEvent/eventFormatting.js';
import { hydrateAndPruneEventMedia } from '../controllers/miniEvent/eventMediaStore.js';

export const MAX_ARCHIVE_IMPRESSION_LENGTH = 280;

let archiveTablesChecked = false;

export function sanitizeArchiveImpression(raw) {
  return String(raw ?? '').trim().slice(0, MAX_ARCHIVE_IMPRESSION_LENGTH);
}

export function inferArchiveMediaType(url, mediaType = '') {
  if (String(mediaType || '').toLowerCase() === 'video') return 'video';
  return /\.(mp4|webm|mov|m4v|3gp|mkv)(\?|$)/i.test(String(url || '')) ? 'video' : 'photo';
}

export function filterVisibleArchivesForViewer({ archives = [], isOwnProfile = false, isArchivePrivate = false }) {
  if (isOwnProfile) return Array.isArray(archives) ? archives : [];
  if (isArchivePrivate) return [];
  return (archives || []).filter((a) => !a?.isHidden && Array.isArray(a?.mediaItems) && a.mediaItems.length > 0);
}

export async function ensureEventArchiveTables() {
  if (archiveTablesChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_event_archives (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        event_id VARCHAR(128) NOT NULL,
        event_title TEXT NOT NULL,
        event_category VARCHAR(32) NOT NULL DEFAULT 'cafe',
        event_location TEXT,
        impression TEXT NOT NULL DEFAULT '',
        is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, event_id)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_user_event_archives_user_updated
      ON user_event_archives (user_id, updated_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_event_archive_media (
        id VARCHAR(128) PRIMARY KEY,
        archive_id VARCHAR(128) NOT NULL REFERENCES user_event_archives(id) ON DELETE CASCADE,
        user_id VARCHAR(128) NOT NULL,
        event_id VARCHAR(128) NOT NULL,
        media_url TEXT NOT NULL,
        thumbnail_url TEXT,
        media_type VARCHAR(16) NOT NULL DEFAULT 'photo',
        caption TEXT NOT NULL DEFAULT '',
        source VARCHAR(32) NOT NULL DEFAULT 'event_clip',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (archive_id, media_url)
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_archive_media_archive_created
      ON user_event_archive_media (archive_id, created_at DESC)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_archive_settings (
        user_id VARCHAR(128) PRIMARY KEY,
        is_archive_private BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_event_archive_deleted (
        user_id VARCHAR(128) NOT NULL,
        event_id VARCHAR(128) NOT NULL,
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, event_id)
      )
    `);
    archiveTablesChecked = true;
  } catch (err) {
    console.warn('[EventArchiveStore] ensureEventArchiveTables warning:', err?.message);
  }
}

export async function getUserArchivePrivacy(userId) {
  if (!userId) return false;
  await ensureEventArchiveTables();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT is_archive_private FROM user_archive_settings WHERE user_id = $1 LIMIT 1`,
      String(userId)
    );
    return Boolean(rows?.[0]?.is_archive_private);
  } catch {
    return false;
  }
}

export async function setUserArchivePrivacy(userId, isPrivate) {
  if (!userId) return false;
  await ensureEventArchiveTables();
  const safeVal = Boolean(isPrivate);
  await prisma.$executeRawUnsafe(
    `INSERT INTO user_archive_settings (user_id, is_archive_private, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id)
     DO UPDATE SET is_archive_private = EXCLUDED.is_archive_private, updated_at = CURRENT_TIMESTAMP`,
    String(userId),
    safeVal
  );
  return safeVal;
}

/**
 * Automatically record media items uploaded by `userId` to `eventId` into permanent Event Archive.
 */
export async function recordEventArchiveMedia({
  userId,
  eventId,
  eventTitle = 'Mini Event',
  eventCategory = 'cafe',
  eventLocation = null,
  mediaItems = [],
  source = 'event_clip',
  clearTombstone = true,
}) {
  if (!userId || !eventId || !Array.isArray(mediaItems) || mediaItems.length === 0) return null;
  await ensureEventArchiveTables();

  const uid = String(userId);
  const eid = String(eventId);
  const cleanTitle = String(eventTitle || 'Mini Event').trim().slice(0, 120) || 'Mini Event';
  const cleanCat = String(eventCategory || 'cafe').trim().toLowerCase().slice(0, 32) || 'cafe';
  const cleanLoc = eventLocation ? String(eventLocation).trim().slice(0, 160) : null;

  const validMedia = mediaItems
    .map((m) => {
      const url = String(m?.mediaUrl || m?.url || '').trim();
      if (!url) return null;
      const mediaType = inferArchiveMediaType(url, m?.mediaType || m?.type);
      return {
        url: url.slice(0, 2000),
        thumbnailUrl: m?.thumbnailUrl ? String(m.thumbnailUrl).trim().slice(0, 2000) : null,
        mediaType,
        caption: String(m?.caption || '').trim().slice(0, 240),
        createdAt: m?.createdAt || (m?.uploadedAt ? new Date(Number(m.uploadedAt)).toISOString() : null),
      };
    })
    .filter(Boolean);

  if (validMedia.length === 0) return null;

  if (clearTombstone) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM user_event_archive_deleted WHERE user_id = $1 AND event_id = $2`,
      uid,
      eid
    ).catch(() => {});
  }

  const newArchiveId = `arch_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
  const upserted = await prisma.$queryRawUnsafe(
    `INSERT INTO user_event_archives (id, user_id, event_id, event_title, event_category, event_location)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, event_id)
     DO UPDATE SET
       event_title = EXCLUDED.event_title,
       event_category = EXCLUDED.event_category,
       event_location = COALESCE(EXCLUDED.event_location, user_event_archives.event_location),
       updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    newArchiveId,
    uid,
    eid,
    cleanTitle,
    cleanCat,
    cleanLoc
  );

  const archiveId = String(upserted?.[0]?.id || newArchiveId);

  for (const item of validMedia) {
    const mediaId = `amed_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_event_archive_media
        (id, archive_id, user_id, event_id, media_url, thumbnail_url, media_type, caption, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, CURRENT_TIMESTAMP))
       ON CONFLICT (archive_id, media_url) DO NOTHING`,
      mediaId,
      archiveId,
      uid,
      eid,
      item.url,
      item.thumbnailUrl,
      item.mediaType,
      item.caption,
      String(source || 'event_clip').slice(0, 32),
      item.createdAt
    ).catch(() => {});
  }

  return archiveId;
}

/**
 * Idempotently syncs any existing active MiniEvent clips & event-linked Reels posts
 * authored by `targetUserId` (strictly respecting deleted tombstones!).
 */
async function backfillUserLiveEventMedia(targetUserId) {
  const uid = String(targetUserId);
  try {
    const tombstoneRows = await prisma.$queryRawUnsafe(
      `SELECT event_id FROM user_event_archive_deleted WHERE user_id = $1`,
      uid
    );
    const deletedEventIds = new Set((tombstoneRows || []).map((r) => String(r.event_id)));

    // 1. Active MiniEvents where user is creator or posted a clip
    const activeEvents = await prisma.miniEvent.findMany({
      where: { isActive: true, expiresAt: { gt: new Date() } },
      select: { id: true, creatorId: true, title: true, description: true },
      take: 80,
    });

    for (const ev of activeEvents || []) {
      const eid = String(ev.id);
      if (deletedEventIds.has(eid)) continue;
      const tags = extractEncodedTags(ev.description);
      const hydrated = await hydrateAndPruneEventMedia(ev, null, null).catch(() => ({ mediaItems: [] }));
      const authoredClips = (hydrated.mediaItems || []).filter(
        (c) => String(c.authorId || ev.creatorId) === uid
      );
      if (authoredClips.length > 0) {
        await recordEventArchiveMedia({
          userId: uid,
          eventId: eid,
          eventTitle: ev.title,
          eventCategory: tags.category || 'cafe',
          eventLocation: tags.location || null,
          mediaItems: authoredClips,
          source: 'event_clip',
          clearTombstone: false,
        });
      }
    }

    // 2. Event-linked Reels posts authored by targetUserId
    const reelsRows = await prisma.$queryRawUnsafe(
      `SELECT id, event_id, category, media_url, thumbnail_url, media_type, caption, location, created_at
       FROM reels_media_posts
       WHERE author_id = $1 AND event_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 60`,
      uid
    ).catch(() => []);

    if (Array.isArray(reelsRows) && reelsRows.length > 0) {
      const eventIds = Array.from(new Set(reelsRows.map((r) => String(r.event_id)).filter((id) => !deletedEventIds.has(id))));
      const evMap = new Map();
      if (eventIds.length > 0) {
        const evRows = await prisma.miniEvent.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, title: true, description: true },
        });
        for (const e of evRows) evMap.set(String(e.id), e);
      }
      for (const r of reelsRows) {
        const eid = String(r.event_id);
        if (deletedEventIds.has(eid)) continue;
        const ev = evMap.get(eid);
        await recordEventArchiveMedia({
          userId: uid,
          eventId: eid,
          eventTitle: ev?.title || r.location || 'Kalceria Event',
          eventCategory: r.category || 'cafe',
          eventLocation: r.location || null,
          mediaItems: [{
            mediaUrl: r.media_url,
            thumbnailUrl: r.thumbnail_url,
            mediaType: r.media_type,
            caption: r.caption,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
          }],
          source: 'reels_post',
          clearTombstone: false,
        });
      }
    }
  } catch (err) {
    console.warn('[EventArchiveStore] backfill warning:', err?.message);
  }
}

export async function listUserEventArchives({ targetUserId, viewerId }) {
  await ensureEventArchiveTables();
  const tid = String(targetUserId);
  const vid = viewerId ? String(viewerId) : '';
  const isOwnProfile = Boolean(vid && tid === vid);

  if (!isOwnProfile && vid) {
    const blocks = await fetchCanonicalUserBlocks(vid).catch(() => ({ blockedUsers: [], blockedByUsers: [] }));
    const blockedSet = new Set([
      ...(blocks?.blockedUsers || []).map(String),
      ...(blocks?.blockedByUsers || []).map(String),
    ]);
    if (blockedSet.has(tid)) {
      return { isArchivePrivate: true, isOwnProfile: false, archives: [] };
    }
  }

  const isArchivePrivate = await getUserArchivePrivacy(tid);
  if (!isOwnProfile && isArchivePrivate) {
    return { isArchivePrivate: true, isOwnProfile: false, archives: [] };
  }

  await backfillUserLiveEventMedia(tid);

  const archiveRows = await prisma.$queryRawUnsafe(
    `SELECT id, user_id, event_id, event_title, event_category, event_location, impression, is_hidden, created_at, updated_at
     FROM user_event_archives
     WHERE user_id = $1
     ORDER BY updated_at DESC, created_at DESC`,
    tid
  );

  if (!Array.isArray(archiveRows) || archiveRows.length === 0) {
    return { isArchivePrivate, isOwnProfile, archives: [] };
  }

  const archiveIds = archiveRows.map((a) => String(a.id));
  const mediaRows = await prisma.$queryRawUnsafe(
    `SELECT id, archive_id, media_url, thumbnail_url, media_type, caption, source, created_at
     FROM user_event_archive_media
     WHERE archive_id = ANY($1::text[])
     ORDER BY created_at DESC`,
    archiveIds
  );

  const mediaByArchive = new Map();
  for (const m of mediaRows || []) {
    const aid = String(m.archive_id);
    if (!mediaByArchive.has(aid)) mediaByArchive.set(aid, []);
    mediaByArchive.get(aid).push({
      id: String(m.id),
      mediaUrl: String(m.media_url),
      thumbnailUrl: m.thumbnail_url ? String(m.thumbnail_url) : null,
      mediaType: String(m.media_type || 'photo'),
      caption: String(m.caption || ''),
      source: String(m.source || 'event_clip'),
      createdAt: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    });
  }

  const formatted = archiveRows
    .map((a) => {
      const aid = String(a.id);
      const items = mediaByArchive.get(aid) || [];
      return {
        id: aid,
        userId: String(a.user_id),
        eventId: String(a.event_id),
        eventTitle: String(a.event_title || 'Mini Event'),
        eventCategory: String(a.event_category || 'cafe'),
        eventLocation: a.event_location ? String(a.event_location) : null,
        impression: String(a.impression || ''),
        isHidden: Boolean(a.is_hidden),
        mediaCount: items.length,
        coverMedia: items.slice(0, 3),
        mediaItems: items,
        createdAt: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
        updatedAt: a.updated_at ? new Date(a.updated_at).toISOString() : new Date().toISOString(),
      };
    })
    .filter((a) => a.mediaCount > 0);

  const visible = filterVisibleArchivesForViewer({
    archives: formatted,
    isOwnProfile,
    isArchivePrivate,
  });

  return { isArchivePrivate, isOwnProfile, archives: visible };
}

export async function updateUserEventArchive({ archiveId, userId, impression, isHidden }) {
  await ensureEventArchiveTables();
  const aid = String(archiveId);
  const uid = String(userId);

  const existing = await prisma.$queryRawUnsafe(
    `SELECT id, user_id, impression, is_hidden FROM user_event_archives WHERE id = $1 LIMIT 1`,
    aid
  );
  if (!Array.isArray(existing) || existing.length === 0) return { notFound: true };
  if (String(existing[0].user_id) !== uid) return { forbidden: true };

  const nextImpression =
    impression !== undefined ? sanitizeArchiveImpression(impression) : String(existing[0].impression || '');
  const nextHidden =
    typeof isHidden === 'boolean' ? isHidden : Boolean(existing[0].is_hidden);

  await prisma.$executeRawUnsafe(
    `UPDATE user_event_archives
     SET impression = $1, is_hidden = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND user_id = $4`,
    nextImpression,
    nextHidden,
    aid,
    uid
  );

  return { ok: true, id: aid, impression: nextImpression, isHidden: nextHidden };
}

export async function deleteUserEventArchive({ archiveId, userId }) {
  await ensureEventArchiveTables();
  const aid = String(archiveId);
  const uid = String(userId);

  const existing = await prisma.$queryRawUnsafe(
    `SELECT id, user_id, event_id FROM user_event_archives WHERE id = $1 LIMIT 1`,
    aid
  );
  if (!Array.isArray(existing) || existing.length === 0) return { notFound: true };
  if (String(existing[0].user_id) !== uid) return { forbidden: true };

  const eid = String(existing[0].event_id);
  await prisma.$executeRawUnsafe(
    `DELETE FROM user_event_archives WHERE id = $1 AND user_id = $2`,
    aid,
    uid
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO user_event_archive_deleted (user_id, event_id, deleted_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, event_id) DO UPDATE SET deleted_at = CURRENT_TIMESTAMP`,
    uid,
    eid
  );

  return { deleted: true, id: aid, eventId: eid };
}

