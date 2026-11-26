/**
 * Pure domain helpers for Backend Event Archive (Zero Prisma/Redis imports).
 */

export const MAX_ARCHIVE_IMPRESSION_LENGTH = 280;

export function sanitizeArchiveImpression(raw) {
  return String(raw ?? '').trim().slice(0, MAX_ARCHIVE_IMPRESSION_LENGTH);
}

export function inferArchiveMediaType(url, mediaType = '') {
  if (String(mediaType || '').toLowerCase() === 'video') return 'video';
  return /\.(mp4|webm|mov|m4v|3gp|mkv)(\?|$)/i.test(String(url || '')) ? 'video' : 'photo';
}

export function filterVisibleArchivesForViewer({
  archives = [],
  isOwnProfile = false,
  isArchivePrivate = false,
}) {
  if (isOwnProfile) return Array.isArray(archives) ? archives : [];
  if (isArchivePrivate) return [];
  return (archives || []).filter(
    (a) => !a?.isHidden && Array.isArray(a?.mediaItems) && a.mediaItems.length > 0
  );
}

