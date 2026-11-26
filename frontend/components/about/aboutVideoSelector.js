/**
 * Pure unique-per-node video selector for About Us VideoCollage.
 * Guarantees every visible About Us node plays a distinct clip with zero sibling duplicates.
 */

export const ABOUT_VIDEOS = Array.from({ length: 8 }, (_, i) => `/vid_abt${i + 1}.mp4`);

export function assignDistinctAboutVideos(cellCount, pool = ABOUT_VIDEOS, rng = Math.random) {
  const count = Math.max(0, Math.floor(Number(cellCount) || 0));
  const list = Array.isArray(pool) ? [...pool] : [];
  if (count === 0 || list.length === 0) return [];

  const rand = typeof rng === "function" ? rng : Math.random;
  for (let i = list.length - 1; i > 0; i--) {
    const sample = Number(rand());
    const clamped = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
    const j = Math.floor(clamped * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }

  return list.slice(0, Math.min(count, list.length));
}

export function pickNextDistinctAboutVideo(
  currentSrc,
  activeSrcs,
  pool = ABOUT_VIDEOS,
  rng = Math.random
) {
  const activeSet = activeSrcs instanceof Set ? activeSrcs : new Set(activeSrcs || []);
  const candidates = (pool || []).filter((src) => src !== currentSrc && !activeSet.has(src));
  if (candidates.length === 0) {
    // All pool clips are already displayed across sibling nodes: cleanly loop current clip
    return currentSrc;
  }
  const rand = typeof rng === "function" ? rng : Math.random;
  const sample = Number(rand());
  const clamped = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
  return candidates[Math.floor(clamped * candidates.length)];
}
