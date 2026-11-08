import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { sanitizeAndNormalizeMediaUrl } from '../../utils/urlSecurity.js';
import {
  MINI_EVENT_CLIP_TTL_MS,
  buildEncodedDescription,
  extractEncodedTags,
  extractUrlsFromLegacyMediaString,
} from './eventFormatting.js';

const mediaKey = (eventId) => `mini_event:media:${eventId}`;

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

function buildClipRecord({
  url,
  width = null,
  height = null,
  duration = null,
  authorId = null,
  authorName = null,
  uploadedAt = Date.now(),
}) {
  const ts = Number.isFinite(uploadedAt) && uploadedAt > 0 ? uploadedAt : Date.now();
  return {
    id: crypto.randomUUID(),
    url,
    isVideo: inferIsVideoUrl(url),
    width: normalizeDimension(width),
    height: normalizeDimension(height),
    duration: normalizeDuration(duration),
    authorId: authorId || null,
    authorName: authorName || null,
    uploadedAt: ts,
    expiresAt: ts + MINI_EVENT_CLIP_TTL_MS,
  };
}

export function parseSubmittedMediaItems({
  mediaUrl,
  mediaItems,
  authorId,
  authorName,
}) {
  const parsedClips = [];
  const now = Date.now();

  if (Array.isArray(mediaItems) && mediaItems.length > 0) {
    for (const entry of mediaItems.slice(0, 24)) {
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
            uploadedAt: part.uploadedAt || now,
          })
        );
      }
    }
    return { valid: true, clips: parsedClips };
  }

  if (typeof mediaUrl === 'string' && mediaUrl.trim()) {
    const check = validateEventMediaUrl(mediaUrl);
    if (!check.valid) return { valid: false, error: check.error, clips: [] };
    if (check.normalized) {
      const parts = extractUrlsFromLegacyMediaString(check.normalized);
      for (const part of parts.slice(0, 24)) {
        parsedClips.push(
          buildClipRecord({
            url: part.url,
            authorId,
            authorName,
            uploadedAt: part.uploadedAt || now,
          })
        );
      }
    }
  }

  return { valid: true, clips: parsedClips };
}

export async function saveEventMediaItems(eventId, clips) {
  const safeClips = Array.isArray(clips) ? clips.filter((c) => c && c.url) : [];
  try {
    if (safeClips.length === 0) {
      await redis.del(mediaKey(eventId));
    } else {
      await redis.set(mediaKey(eventId), JSON.stringify(safeClips));
    }
  } catch {}
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

export async function hydrateAndPruneEventMedia(ev, creatorName = null) {
  const now = Date.now();
  const createdMs = ev?.createdAt ? new Date(ev.createdAt).getTime() : now;
  const tags = extractEncodedTags(ev?.description);
  let storedClips = null;

  try {
    const raw = await redis.get(mediaKey(ev.id));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) storedClips = parsed;
    }
  } catch {
    storedClips = null;
  }

  let didPruneOrMigrate = false;
  let clips = [];

  if (Array.isArray(storedClips)) {
    clips = storedClips.filter((clip) => {
      if (!clip || !clip.url) {
        didPruneOrMigrate = true;
        return false;
      }
      const exp = Number(clip.expiresAt) || Number(clip.uploadedAt || createdMs) + MINI_EVENT_CLIP_TTL_MS;
      if (now >= exp) {
        didPruneOrMigrate = true;
        return false;
      }
      return true;
    });
  } else {
    const fallbackEntries = extractUrlsFromLegacyMediaString(tags.mediaStr || ev.mediaUrl || '');
    for (const entry of fallbackEntries) {
      const uploadedAt = entry.uploadedAt || createdMs;
      const expiresAt = uploadedAt + MINI_EVENT_CLIP_TTL_MS;
      if (now < expiresAt) {
        clips.push({
          ...buildClipRecord({
            url: entry.url,
            authorId: ev.creatorId,
            authorName: creatorName || null,
            uploadedAt,
          }),
          expiresAt,
        });
      } else {
        didPruneOrMigrate = true;
      }
    }
    if (clips.length > 0) {
      await saveEventMediaItems(ev.id, clips);
    }
  }

  if (didPruneOrMigrate) {
    await saveEventMediaItems(ev.id, clips);
    await syncEventDescriptionMedia(ev, clips.map((c) => c.url));
  }

  return {
    mediaItems: clips,
    mediaUrl: clips.length > 0 ? clips.map((c) => c.url).join(', ') : null,
  };
}

export async function appendClipsToEventMedia(ev, newClips, fallbackCreatorName = null) {
  const current = await hydrateAndPruneEventMedia(ev, fallbackCreatorName);
  const existingUrls = new Set(current.mediaItems.map((c) => c.url));
  const combined = [...current.mediaItems];
  for (const clip of newClips) {
    if (!clip?.url) continue;
    if (!existingUrls.has(clip.url) || combined.length < 24) {
      combined.push(clip);
      existingUrls.add(clip.url);
    }
    if (combined.length >= 24) break;
  }
  await saveEventMediaItems(ev.id, combined);
  const updatedDesc = await syncEventDescriptionMedia(ev, combined.map((c) => c.url));
  return {
    mediaItems: combined,
    mediaUrl: combined.length > 0 ? combined.map((c) => c.url).join(', ') : null,
    updatedDescription: updatedDesc,
  };
}

export async function removeClipFromEventMedia(ev, { clipId, url }, userId) {
  const current = await hydrateAndPruneEventMedia(ev);
  const isOwner = String(ev.creatorId) === String(userId);
  const remaining = [];
  let removed = false;

  for (const clip of current.mediaItems) {
    const matches =
      (clipId && String(clip.id) === String(clipId)) ||
      (url && String(clip.url) === String(url));
    if (matches && !removed) {
      const isAuthor = clip.authorId && String(clip.authorId) === String(userId);
      if (!isOwner && !isAuthor) {
        return { forbidden: true, mediaItems: current.mediaItems };
      }
      removed = true;
      continue;
    }
    remaining.push(clip);
  }

  if (!removed) {
    return { notFound: true, mediaItems: current.mediaItems };
  }

  await saveEventMediaItems(ev.id, remaining);
  const updatedDesc = await syncEventDescriptionMedia(ev, remaining.map((c) => c.url));
  return {
    removed: true,
    mediaItems: remaining,
    mediaUrl: remaining.length > 0 ? remaining.map((c) => c.url).join(', ') : null,
    updatedDescription: updatedDesc,
  };
}

export async function purgeEventMediaByIds(eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) return;
  await Promise.allSettled(eventIds.map((id) => redis.del(mediaKey(id))));
}

