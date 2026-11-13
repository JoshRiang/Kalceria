import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { incrementViewCounter, readViewCounter } from '../../utils/viewCounter.js';
import { sanitizeAndNormalizeMediaUrl } from '../../utils/urlSecurity.js';
import {
  MINI_EVENT_CLIP_TTL_MS,
  buildEncodedDescription,
  extractEncodedTags,
  extractUrlsFromLegacyMediaString,
} from './eventFormatting.js';
import {
  clipKey,
  deleteLegacyEventClips,
  purgeAllEventClips,
  readEventClips,
  readLegacyEventClips,
  removeEventClipIds,
  viewKey,
  writeEventClips,
} from './eventMediaPersistence.js';

export const MAX_ACTIVE_EVENT_CLIPS = 100;
export const IMAGE_CLIP_DURATION_SECONDS = 3;

const SAFE_LOCAL_MEDIA_DATA_RE =
  /^data:(?:image|video)\/(?:png|jpeg|jpg|webp|mp4|webm);base64,[A-Za-z0-9+/=\s]+$/i;

export function inferIsVideoUrl(url) {
  const s = String(url || '').trim();
  if (/^data:video\//i.test(s)) return true;
  if (/\.(?:mp4|webm|ogg)(?:$|\?|#)/i.test(s)) return true;
  if (s.includes('/api/blob/raw')) {
    try {
      const inner = new URL(s, 'https://kalceria.internal').searchParams.get('url') || '';
      if (/\.(?:mp4|webm|ogg)(?:$|\?|#)/i.test(inner)) return true;
    } catch {}
  }
  return false;
}

export function validateEventMediaUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL media harus berupa teks string.' };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: true, normalized: null };
  }
  if (SAFE_LOCAL_MEDIA_DATA_RE.test(trimmed) && trimmed.length <= 14_000_000) {
    return { valid: true, normalized: trimmed };
  }
  return sanitizeAndNormalizeMediaUrl(trimmed);
}

function normalizeDimension(val) {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num <= 8192 ? Math.round(num) : null;
}

function normalizeDuration(val) {
  const num = Number(val);
  return Number.isFinite(num) && num > 0 && num <= 600 ? Number(num.toFixed(3)) : null;
}

export function classifyClipOrientation(width, height) {
  if (!width || !height) return null;
  const ratio = width / height;
  if (ratio >= 1.15) return 'landscape';
  if (ratio < 0.92) return 'portrait';
  return 'square';
}

export function buildClipRecord({
  url,
  width = null,
  height = null,
  duration = null,
  authorId = null,
  authorName = null,
  authorAvatarUrl = null,
  viewCount = 0,
  uploadedAt = Date.now(),
}) {
  const ts = Number.isFinite(uploadedAt) && uploadedAt > 0 ? uploadedAt : Date.now();
  const isVideo = inferIsVideoUrl(url);
  const safeWidth = normalizeDimension(width);
  const safeHeight = normalizeDimension(height);
  return {
    id: crypto.randomUUID(),
    url,
    isVideo,
    width: safeWidth,
    height: safeHeight,
    aspectRatio: safeWidth && safeHeight ? Number((safeWidth / safeHeight).toFixed(4)) : null,
    orientation: classifyClipOrientation(safeWidth, safeHeight),
    duration: isVideo ? normalizeDuration(duration) : IMAGE_CLIP_DURATION_SECONDS,
    authorId: authorId || null,
    authorName: authorName || null,
    authorAvatarUrl: authorAvatarUrl || null,
    viewCount: Number(viewCount) || 0,
    uploadedAt: ts,
    expiresAt: ts + MINI_EVENT_CLIP_TTL_MS,
  };
}

export function parseSubmittedMediaItems({
  mediaUrl,
  mediaItems,
  authorId,
  authorName,
  authorAvatarUrl = null,
}) {
  const parsedClips = [];
  const now = Date.now();

  if (Array.isArray(mediaItems) && mediaItems.length > 0) {
    for (const entry of mediaItems.slice(0, MAX_ACTIVE_EVENT_CLIPS)) {
      const candidateUrl = typeof entry === 'string' ? entry : entry?.url;
      if (!candidateUrl || typeof candidateUrl !== 'string') continue;
      const check = validateEventMediaUrl(candidateUrl);
      if (!check.valid) return { valid: false, error: check.error, clips: [] };
      if (!check.normalized) continue;
      const parts = extractUrlsFromLegacyMediaString(check.normalized);
      for (const part of parts) {
        parsedClips.push(
          buildClipRecord({
            url: part.url,
            width: typeof entry === 'object' ? entry?.width : null,
            height: typeof entry === 'object' ? entry?.height : null,
            duration: typeof entry === 'object' ? entry?.duration : null,
            authorId,
            authorName,
            authorAvatarUrl: (typeof entry === 'object' ? entry?.authorAvatarUrl : null) || authorAvatarUrl,
            uploadedAt: part.uploadedAt || now,
          })
        );
      }
    }
    return { valid: true, clips: parsedClips.slice(0, MAX_ACTIVE_EVENT_CLIPS) };
  }

  if (typeof mediaUrl === 'string' && mediaUrl.trim()) {
    const check = validateEventMediaUrl(mediaUrl);
    if (!check.valid) return { valid: false, error: check.error, clips: [] };
    if (check.normalized) {
      const parts = extractUrlsFromLegacyMediaString(check.normalized);
      for (const part of parts.slice(0, MAX_ACTIVE_EVENT_CLIPS)) {
        parsedClips.push(
          buildClipRecord({
            url: part.url,
            authorId,
            authorName,
            authorAvatarUrl,
            uploadedAt: part.uploadedAt || now,
          })
        );
      }
    }
  }

  return { valid: true, clips: parsedClips };
}

function toMediaResult(clips) {
  return {
    mediaItems: clips,
    mediaUrl: clips.length > 0 ? clips.map((c) => c.url).join(', ') : null,
  };
}

function clipExpiryMs(clip, fallbackBaseMs) {
  return Number(clip?.expiresAt) || Number(clip?.uploadedAt || fallbackBaseMs) + MINI_EVENT_CLIP_TTL_MS;
}

export async function saveEventMediaItems(eventId, clips) {
  const safeClips = Array.isArray(clips) ? clips.filter((c) => c && c.url) : [];
  const keepIds = new Set(safeClips.map((c) => c.id));
  const stored = await readEventClips(eventId).catch(() => null);
  if (stored) {
    const staleIds = [
      ...stored.clips.filter((c) => !keepIds.has(c.id)).map((c) => c.id),
      ...stored.orphanIds,
    ];
    await removeEventClipIds(eventId, staleIds);
  }
  await writeEventClips(eventId, safeClips);
  return safeClips;
}

export async function syncEventDescriptionMedia(event, activeUrls) {
  const tags = extractEncodedTags(event.description);
  const nextDesc = buildEncodedDescription({
    category: tags.category || 'cafe',
    location: tags.location || '',
    mediaUrls: activeUrls,
    plainDescription: tags.plainDescription,
  });
  if (nextDesc !== (event.description || '')) {
    await prisma.miniEvent
      .update({
        where: { id: event.id },
        data: { description: nextDesc },
      })
      .catch(() => {});
  }
  return nextDesc;
}

function deriveActiveClipsFromDescription(ev, tags, createdMs, creatorName, creatorAvatarUrl, now) {
  const clips = [];
  let droppedExpired = false;
  const entries = extractUrlsFromLegacyMediaString(tags.mediaStr || ev.mediaUrl || '');
  for (const entry of entries) {
    const uploadedAt = entry.uploadedAt || createdMs;
    const expiresAt = uploadedAt + MINI_EVENT_CLIP_TTL_MS;
    if (now >= expiresAt) {
      droppedExpired = true;
      continue;
    }
    clips.push({
      ...buildClipRecord({
        url: entry.url,
        authorId: ev.creatorId,
        authorName: creatorName || null,
        authorAvatarUrl: creatorAvatarUrl || null,
        uploadedAt,
      }),
      expiresAt,
    });
  }
  return { clips, droppedExpired };
}

async function initializeFromLegacySources(ev, tags, createdMs, creatorName, creatorAvatarUrl, now) {
  let legacy = null;
  try {
    legacy = await readLegacyEventClips(ev.id);
  } catch {
    legacy = null;
  }

  let clips;
  let dropped = false;
  if (Array.isArray(legacy)) {
    clips = legacy.filter((clip) => {
      if (!clip || !clip.url) {
        dropped = true;
        return false;
      }
      if (now >= clipExpiryMs(clip, createdMs)) {
        dropped = true;
        return false;
      }
      return true;
    });
    clips = clips.map((clip) => ({ ...clip, id: clip.id || crypto.randomUUID() }));
  } else {
    const derived = deriveActiveClipsFromDescription(ev, tags, createdMs, creatorName, creatorAvatarUrl, now);
    clips = derived.clips;
    dropped = derived.droppedExpired;
  }

  try {
    await writeEventClips(ev.id, clips, now);
    if (Array.isArray(legacy)) await deleteLegacyEventClips(ev.id);
  } catch {}
  if (dropped) {
    await syncEventDescriptionMedia(ev, clips.map((c) => c.url));
  }
  return clips;
}

export async function hydrateAndPruneEventMedia(ev, creatorName = null, creatorAvatarUrl = null) {
  const now = Date.now();
  const createdMs = ev?.createdAt ? new Date(ev.createdAt).getTime() : now;
  const tags = extractEncodedTags(ev?.description);

  let stored = null;
  try {
    stored = await readEventClips(ev.id);
  } catch {
    stored = null;
  }

  // Storage unreachable: serve what the description records, never mutate anything.
  if (stored === null) {
    return toMediaResult(deriveActiveClipsFromDescription(ev, tags, createdMs, creatorName, creatorAvatarUrl, now).clips);
  }

  if (!stored.initialized) {
    return toMediaResult(await initializeFromLegacySources(ev, tags, createdMs, creatorName, creatorAvatarUrl, now));
  }

  const active = [];
  const expiredIds = [];
  for (const clip of stored.clips) {
    if (now >= clipExpiryMs(clip, createdMs)) {
      expiredIds.push(clip.id);
    } else {
      active.push(clip);
    }
  }

  const idsToRemove = [...expiredIds, ...stored.orphanIds];
  if (idsToRemove.length > 0) {
    await removeEventClipIds(ev.id, idsToRemove).catch(() => {});
    await syncEventDescriptionMedia(ev, active.map((c) => c.url));
  }

  if (active.length > 0) {
    try {
      const counts = await Promise.all(active.map((clip) => readViewCounter(viewKey(clip.id))));
      active.forEach((clip, idx) => {
        clip.viewCount = counts[idx] ?? clip.viewCount ?? 0;
      });
    } catch {}
  }

  return toMediaResult(active);
}

/**
 * Pure planner for an owner edit: which clips remain, which are removed.
 * Clips another collaborator attached after the editor was opened (`syncedAt`) are preserved.
 */
export function planEventMediaSelection(currentClips, submittedClips, syncedAt = null, editorAuthorId = null) {
  const currentByUrl = new Map(currentClips.map((c) => [c.url, c]));
  const seenUrls = new Set();
  const finalClips = [];

  for (const clip of submittedClips) {
    if (!clip?.url || seenUrls.has(clip.url)) continue;
    seenUrls.add(clip.url);
    finalClips.push(currentByUrl.get(clip.url) || clip);
  }

  const syncedAtMs = Number(syncedAt);
  if (Number.isFinite(syncedAtMs) && syncedAtMs > 0) {
    for (const clip of currentClips) {
      // Only preserve concurrent clips uploaded by another collaborator while editor was open
      const isOtherAuthor = editorAuthorId ? String(clip.authorId) !== String(editorAuthorId) : true;
      if (!seenUrls.has(clip.url) && Number(clip.uploadedAt) > syncedAtMs && isOtherAuthor) {
        seenUrls.add(clip.url);
        finalClips.push(clip);
      }
    }
  }

  const ordered = [...finalClips]
    .sort((a, b) => (Number(a.uploadedAt) || 0) - (Number(b.uploadedAt) || 0))
    .slice(-MAX_ACTIVE_EVENT_CLIPS);
  const keptIds = new Set(ordered.map((c) => c.id));
  const removedIds = currentClips.filter((c) => !keptIds.has(c.id)).map((c) => c.id);

  return { finalClips: ordered, removedIds };
}

export async function persistEventMediaSelection(eventId, plan) {
  await removeEventClipIds(eventId, plan.removedIds);
  await writeEventClips(eventId, plan.finalClips);
  return plan.finalClips;
}

export async function appendClipsToEventMedia(ev, newClips, fallbackCreatorName = null) {
  const current = await hydrateAndPruneEventMedia(ev, fallbackCreatorName);
  const existingUrls = new Set(current.mediaItems.map((c) => c.url));
  const accepted = [];
  for (const clip of newClips) {
    if (!clip?.url || existingUrls.has(clip.url)) continue;
    if (current.mediaItems.length + accepted.length >= MAX_ACTIVE_EVENT_CLIPS) break;
    existingUrls.add(clip.url);
    accepted.push(clip);
  }

  // Only the new clips are written; existing clips are never rewritten, so concurrent uploads coexist.
  if (accepted.length > 0) {
    await writeEventClips(ev.id, accepted);
  }

  const combined = [...current.mediaItems, ...accepted].sort(
    (a, b) => (Number(a.uploadedAt) || 0) - (Number(b.uploadedAt) || 0)
  );
  const updatedDesc = await syncEventDescriptionMedia(ev, combined.map((c) => c.url));
  return {
    ...toMediaResult(combined),
    updatedDescription: updatedDesc,
  };
}

export async function removeClipFromEventMedia(ev, { clipId, url }, userId) {
  const current = await hydrateAndPruneEventMedia(ev);
  const isOwner = String(ev.creatorId) === String(userId);
  const remaining = [];
  let removedClip = null;

  for (const clip of current.mediaItems) {
    const matches =
      (clipId && String(clip.id) === String(clipId)) ||
      (url && String(clip.url) === String(url));
    if (matches && !removedClip) {
      const isAuthor = clip.authorId && String(clip.authorId) === String(userId);
      if (!isOwner && !isAuthor) {
        return { forbidden: true, mediaItems: current.mediaItems };
      }
      removedClip = clip;
      continue;
    }
    remaining.push(clip);
  }

  if (!removedClip) {
    return { notFound: true, mediaItems: current.mediaItems };
  }

  await removeEventClipIds(ev.id, [removedClip.id]);
  const updatedDesc = await syncEventDescriptionMedia(ev, remaining.map((c) => c.url));
  return {
    removed: true,
    ...toMediaResult(remaining),
    updatedDescription: updatedDesc,
  };
}

export async function purgeEventMediaByIds(eventIds) {
  await purgeAllEventClips(eventIds);
}

export async function recordClipView({ eventId, clipId, viewerKey, viewerUserId = null }) {
  if (!clipId) return 0;
  const k = viewKey(clipId);

  // Read clip info to check author
  let clip = null;
  try {
    const raw = await redis.get(clipKey(clipId));
    if (raw) clip = JSON.parse(raw);
  } catch {}

  // If clip not found in individual key, check event
  if (!clip && eventId) {
    try {
      const stored = await readEventClips(eventId);
      clip = (stored?.clips || []).find((c) => String(c.id) === String(clipId));
    } catch {}
  }

  // Check if viewer is author: author of that media clip cannot increment the count
  let isAuthor = false;
  if (viewerUserId) {
    if (clip?.authorId) {
      isAuthor = String(clip.authorId) === String(viewerUserId);
    } else if (eventId) {
      try {
        const ev = await prisma.miniEvent.findUnique({
          where: { id: String(eventId) },
          select: { creatorId: true },
        });
        if (ev?.creatorId && String(ev.creatorId) === String(viewerUserId)) {
          isAuthor = true;
        }
      } catch {}
    }
  }

  // Only increment if viewer is NOT the author
  if (!isAuthor) {
    return incrementViewCounter(k);
  }

  return readViewCounter(k);
}
