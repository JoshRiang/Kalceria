/**
 * Pure domain helpers for Profile Event Archives.
 * Zero React or `@/` imports so Gate 3b (`node --test`) verifies directly.
 */

export const MAX_ARCHIVE_IMPRESSION_CHARS = 280;

export function isArchiveVideoUrl(url, mediaType = "") {
  if (String(mediaType || "").toLowerCase() === "video") return true;
  return /\.(mp4|webm|mov|m4v|3gp|mkv)(\?|$)/i.test(String(url || ""));
}

export function buildArchiveDiscoveryHeading(displayName, eventTitle) {
  const cleanName = String(displayName || "Kalcerian").trim() || "Kalcerian";
  const cleanTitle = String(eventTitle || "Event").trim() || "Event";
  return `${cleanName} pada Event "${cleanTitle}"`;
}

export function getArchiveStackPreviewCards(archive) {
  if (!archive) return [];
  const list = Array.isArray(archive.coverMedia) && archive.coverMedia.length > 0
    ? archive.coverMedia
    : Array.isArray(archive.mediaItems)
    ? archive.mediaItems
    : [];
  return list.filter((m) => Boolean(m?.mediaUrl || m?.url)).slice(0, 3);
}

export function filterVisibleArchiveStacks(
  archives = [],
  { isOwnProfile = false, isArchivePrivate = false } = {}
) {
  if (isOwnProfile) return Array.isArray(archives) ? archives : [];
  if (isArchivePrivate) return [];
  return (archives || []).filter(
    (a) => !a?.isHidden && Array.isArray(a?.mediaItems) && a.mediaItems.length > 0
  );
}

