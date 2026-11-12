import { redis } from '../../lib/redis.js';

const initKey = (eventId) => `mini_event:media:init:${eventId}`;
const indexKey = (eventId) => `mini_event:media:idx:${eventId}`;
const clipKey = (clipId) => `mini_event:media:clip:${clipId}`;
const viewKey = (clipId) => `mini_event:media:views:${clipId}`;
const legacyKey = (eventId) => `mini_event:media:${eventId}`;

export { clipKey, viewKey };

// Each clip key outlives its logical expiry so the pruner can still read the URL it removes.
const CLIP_KEY_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_CLIP_KEY_TTL_MS = 60 * 1000;

function clipKeyTtlMs(clip, now) {
  const expiresAt = Number(clip?.expiresAt) || now;
  return Math.max(MIN_CLIP_KEY_TTL_MS, expiresAt - now + CLIP_KEY_GRACE_MS);
}

function sortClips(clips) {
  return [...clips].sort((a, b) => {
    const diff = (Number(a.uploadedAt) || 0) - (Number(b.uploadedAt) || 0);
    if (diff !== 0) return diff;
    return String(a.id).localeCompare(String(b.id));
  });
}

function assertPipelineOk(results) {
  for (const entry of results || []) {
    if (entry && entry[0]) throw entry[0];
  }
}

/**
 * Per-clip persistence: every clip is its own Redis key plus one sorted-set member per event.
 * Writers never rewrite each other's clips, so concurrent uploads from the creator and any
 * approved guest cannot overwrite one another.
 */
export async function writeEventClips(eventId, clips, now = Date.now()) {
  const safeClips = (Array.isArray(clips) ? clips : []).filter((c) => c && c.id && c.url);
  const pipeline = redis.multi();
  for (const clip of safeClips) {
    pipeline.set(clipKey(clip.id), JSON.stringify(clip), 'PX', clipKeyTtlMs(clip, now));
    pipeline.zadd(indexKey(eventId), Number(clip.uploadedAt) || now, clip.id);
  }
  pipeline.set(initKey(eventId), '1');
  assertPipelineOk(await pipeline.exec());
  return safeClips;
}

export async function removeEventClipIds(eventId, clipIds) {
  const ids = (Array.isArray(clipIds) ? clipIds : []).filter(Boolean);
  if (ids.length === 0) return;
  const pipeline = redis.multi();
  pipeline.zrem(indexKey(eventId), ...ids);
  pipeline.del(...ids.map(clipKey));
  pipeline.del(...ids.map(viewKey));
  assertPipelineOk(await pipeline.exec());
}

/**
 * Reads every clip of an event in upload order.
 * `initialized` is false when the event has never been written with the per-clip layout.
 */
export async function readEventClips(eventId) {
  const [initialized, ids] = await Promise.all([
    redis.get(initKey(eventId)),
    redis.zrange(indexKey(eventId), 0, -1),
  ]);

  if (ids.length === 0) {
    return { initialized: Boolean(initialized), clips: [], orphanIds: [] };
  }

  const raws = await redis.mget(ids.map(clipKey));
  const clips = [];
  const orphanIds = [];
  ids.forEach((id, idx) => {
    const raw = raws[idx];
    if (!raw) {
      orphanIds.push(id);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url) {
        clips.push(parsed);
      } else {
        orphanIds.push(id);
      }
    } catch {
      orphanIds.push(id);
    }
  });

  return { initialized: true, clips: sortClips(clips), orphanIds };
}

export async function readLegacyEventClips(eventId) {
  const raw = await redis.get(legacyKey(eventId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function deleteLegacyEventClips(eventId) {
  await redis.del(legacyKey(eventId));
}

export async function purgeAllEventClips(eventIds) {
  const ids = (Array.isArray(eventIds) ? eventIds : []).filter(Boolean);
  if (ids.length === 0) return;
  await Promise.allSettled(
    ids.map(async (eventId) => {
      const clipIds = await redis.zrange(indexKey(eventId), 0, -1).catch(() => []);
      const keys = [
        initKey(eventId),
        indexKey(eventId),
        legacyKey(eventId),
        ...clipIds.map(clipKey),
        ...clipIds.map(viewKey),
      ];
      await redis.del(...keys);
    })
  );
}

