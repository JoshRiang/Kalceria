import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { sanitizeAndNormalizeMediaUrl } from '../../utils/urlSecurity.js';
import {
  MINI_EVENT_CLIP_TTL_MS,
  buildEncodedDescription,
  decodeClipMetaTag,
  extractEncodedTags,
  extractUrlsFromLegacyMediaString,
} from './eventFormatting.js';
import {
  deleteLegacyEventClips,
  purgeAllEventClips,
  readEventClips,
  readLegacyEventClips,
  removeEventClipIds,
  writeEventClips,
} from './eventMediaPersistence.js';

export const MAX_ACTIVE_EVENT_CLIPS = 100;
export const IMAGE_CLIP_DURATION_SECONDS = 3;

const SAFE_LOCAL_MEDIA_DATA_RE =
  /^data:(?:image|video)\/(?:png|jpeg|jpg|webp|mp4|webm);base64,[A-Za-z0-9+/=\s]+$/i;

export function inferIsVideoUrl(url) {
  const s = String(url || '').trim();
  if (/^data:video\//i.test(s)) return true;
  if (/\.(?:mp4|webm|ogg|mov|m4v|3gp)(?:$|\?|#)/i.test(s)) return true;
  if (s.includes('/api/blob/raw')) {
    try {
      const inner = new URL(s, 'https://kalceria.internal').searchParams.get('url') || '';
      if (/\.(?:mp4|webm|ogg|mov|m4v|3gp)(?:$|\?|#)/i.test(inner)) return true;
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
  id = null,
  url,
  width = null,
  height = null,
  duration = null,
  authorId = null,
  authorName = null,
  authorAvatarUrl = null,
  uploadedAt = Date.now(),
}) {
  const ts = Number.isFinite(Number(uploadedAt)) && Number(uploadedAt) > 0 ? Number(uploadedAt) : Date.now();
  const isVideo = inferIsVideoUrl(url);
  const safeWidth = normalizeDimension(width);
  const safeHeight = normalizeDimension(height);
  return {
    id: id || crypto.randomUUID(),
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
  if (redis.isQuotaExceeded) {
    // Postgres [CMETA] is authoritative during Redis fallback; skip split-brain local RAM caching
    return safeClips;
  }
  const keepIds = new Set(safeClips.map((c) => c.id));
  const stored = await readEventClips(eventId).catch(() => null);
  if (stored) {
    const staleIds = [
      ...stored.clips.filter((c) => !keepIds.has(c.id)).map((c) => c.id),
      ...stored.orphanIds,
    ];
    await removeEventClipIds(eventId, staleIds).catch(() => {});
  }
  await writeEventClips(eventId, safeClips).catch(() => {});
  return safeClips;
}

export async function syncEventDescriptionMedia(event, activeClipsOrUrls) {
  const tags = extractEncodedTags(event.description);
  const list = Array.isArray(activeClipsOrUrls) ? activeClipsOrUrls : [];
  const hasObjects = list.some((item) => item && typeof item === 'object' && item.url);
  const nextDesc = buildEncodedDescription({
    category: tags.category || 'cafe',
    location: tags.location || '',
    mediaUrls: hasObjects ? list.map((c) => c?.url).filter(Boolean) : list,
    mediaClips: hasObjects ? list.filter((c) => c && c.url) : null,
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

/**
 * Derives authoritative clips from Postgres `MiniEvent.description`:
 * - Prefers structured `[CMETA:...]` manifest (retains exact id, uploadedAt, dimensions, duration, author across all lambdas)
 * - Falls back cleanly to legacy `[MEDIA:...]` tag for pre-CMETA events.
 */
export function deriveAuthoritativeClipsFromDescription(
  ev,
  tags,
  createdMs,
  creatorName,
  creatorAvatarUrl,
  now
) {
  const clips = [];
  let droppedExpired = false;
  let droppedExplicitExpired = false;

  const decodedMeta = decodeClipMetaTag(tags.clipMetaStr);
  if (Array.isArray(decodedMeta) && decodedMeta.length > 0) {
    for (const raw of decodedMeta) {
      if (!raw || !raw.u) continue;
      const uploadedAt = Number(raw.t) || createdMs;
      const expiresAt = uploadedAt + MINI_EVENT_CLIP_TTL_MS;
      if (now >= expiresAt) {
        droppedExpired = true;
        droppedExplicitExpired = true;
        continue;
      }
      clips.push({
        ...buildClipRecord({
          id: raw.i || null,
          url: raw.u,
          width: raw.w ?? null,
          height: raw.h ?? null,
          duration: raw.d ?? null,
          authorId: raw.a || ev.creatorId,
          authorName: raw.n || creatorName || null,
          authorAvatarUrl: raw.p || creatorAvatarUrl || null,
          uploadedAt,
        }),
        expiresAt,
      });
    }
    return { clips, droppedExpired, droppedExplicitExpired, hasStructuredMeta: true };
  }

  const entries = extractUrlsFromLegacyMediaString(tags.mediaStr || ev.mediaUrl || '');
  for (const entry of entries) {
    const uploadedAt = entry.uploadedAt || createdMs;
    const expiresAt = uploadedAt + MINI_EVENT_CLIP_TTL_MS;
    if (now >= expiresAt) {
      droppedExpired = true;
      if (entry.uploadedAt) droppedExplicitExpired = true;
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
  return { clips, droppedExpired, droppedExplicitExpired, hasStructuredMeta: false };
}

function clipUrlSignature(clips) {
  return (Array.isArray(clips) ? clips : []).map((c) => `${c?.id || ''}:${c?.url || ''}`).join('|');
}

export async function hydrateAndPruneEventMedia(ev, creatorName = null, creatorAvatarUrl = null) {
  const now = Date.now();
  const createdMs = ev?.createdAt ? new Date(ev.createdAt).getTime() : now;
  const tags = extractEncodedTags(ev?.description);

  const pgDerived = deriveAuthoritativeClipsFromDescription(
    ev,
    tags,
    createdMs,
    creatorName,
    creatorAvatarUrl,
    now
  );

  // When Redis is in local-RAM quota fallback (split-brain across serverless lambdas),
  // ALWAYS treat Postgres as the single source of truth so media never flickers.
  if (redis.isQuotaExceeded) {
    if (pgDerived.droppedExplicitExpired) {
      await syncEventDescriptionMedia(ev, pgDerived.clips);
    }
    return toMediaResult(pgDerived.clips);
  }

  let stored = null;
  try {
    stored = await readEventClips(ev.id);
  } catch {
    stored = null;
  }

  // Redis unreachable: serve Postgres SSOT cleanly without mutating
  if (stored === null) {
    return toMediaResult(pgDerived.clips);
  }

  // If Postgres has structured [CMETA] clips, ensure Redis never serves stale clips
  if (pgDerived.hasStructuredMeta) {
    const pgSig = clipUrlSignature(pgDerived.clips);
    const redisActive = stored.clips.filter((c) => now < clipExpiryMs(c, createdMs));
    if (!stored.initialized || clipUrlSignature(redisActive) !== pgSig) {
      await saveEventMediaItems(ev.id, pgDerived.clips).catch(() => {});
    }
    if (pgDerived.droppedExpired) {
      await syncEventDescriptionMedia(ev, pgDerived.clips);
    }
    return toMediaResult(pgDerived.clips);
  }

  // Legacy event without [CMETA] yet: initialize from Redis legacy or Postgres [MEDIA]
  if (!stored.initialized) {
    let legacy = null;
    try {
      legacy = await readLegacyEventClips(ev.id);
    } catch {
      legacy = null;
    }

    let clips;
    let shouldSyncDesc = false;
    if (Array.isArray(legacy)) {
      let dropped = false;
      clips = legacy
        .filter((clip) => {
          if (!clip || !clip.url || now >= clipExpiryMs(clip, createdMs)) {
            dropped = true;
            return false;
          }
          return true;
        })
        .map((clip) => ({ ...clip, id: clip.id || crypto.randomUUID() }));
      shouldSyncDesc = dropped || clips.length > 0;
    } else {
      clips = pgDerived.clips;
      shouldSyncDesc = pgDerived.droppedExpired || clips.length > 0;
    }

    try {
      await writeEventClips(ev.id, clips, now);
      if (Array.isArray(legacy)) await deleteLegacyEventClips(ev.id);
    } catch {}
    if (shouldSyncDesc) {
      await syncEventDescriptionMedia(ev, clips);
    }
    return toMediaResult(clips);
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
    await syncEventDescriptionMedia(ev, active);
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
    const existing = currentByUrl.get(clip.url);
    if (existing) {
      // Reuse existing record while backfilling any newly supplied width/height/duration
      finalClips.push({
        ...existing,
        width: existing.width || clip.width || null,
        height: existing.height || clip.height || null,
        aspectRatio: existing.aspectRatio || clip.aspectRatio || null,
        orientation: existing.orientation || clip.orientation || null,
        duration: existing.duration || clip.duration || null,
      });
    } else {
      finalClips.push(clip);
    }
  }

  const syncedAtMs = Number(syncedAt);
  if (Number.isFinite(syncedAtMs) && syncedAtMs > 0) {
    for (const clip of currentClips) {
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
  if (redis.isQuotaExceeded) {
    return plan.finalClips;
  }
  await removeEventClipIds(eventId, plan.removedIds).catch(() => {});
  await writeEventClips(eventId, plan.finalClips).catch(() => {});
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

  const combined = [...current.mediaItems, ...accepted].sort(
    (a, b) => (Number(a.uploadedAt) || 0) - (Number(b.uploadedAt) || 0)
  );
  // Write authoritative Postgres manifest FIRST so every serverless lambda sees it immediately
  const updatedDesc = await syncEventDescriptionMedia(ev, combined);
  if (accepted.length > 0 && !redis.isQuotaExceeded) {
    await writeEventClips(ev.id, accepted).catch(() => {});
  }

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

  // Update Postgres manifest FIRST so deletion is 100% durable across all lambdas
  const updatedDesc = await syncEventDescriptionMedia(ev, remaining);
  if (!redis.isQuotaExceeded) {
    await removeEventClipIds(ev.id, [removedClip.id]).catch(() => {});
  }
  return {
    removed: true,
    ...toMediaResult(remaining),
    updatedDescription: updatedDesc,
  };
}

export async function purgeEventMediaByIds(eventIds) {
  if (redis.isQuotaExceeded) return;
  await purgeAllEventClips(eventIds).catch(() => {});
}
