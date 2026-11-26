/**
 * Pure Landing Intro Car Video Pool & Responsive Node Grid Geometry Helpers.
 * Zero React/DOM/alias dependencies so it executes natively in both Next.js and Node --test.
 *
 * Hosts 15 compressed 480x270 24fps H.264 car micro-clips on Cloudflare R2 Edge CDN
 * (`https://cdn.kalceria.id/media/intro-cars/car-01.mp4` .. `car-15.mp4`).
 */

export const INTRO_CAR_CDN_BASE = "https://cdn.kalceria.id/media/intro-cars";

export const INTRO_CAR_VIDEO_POOL = Array.from({ length: 15 }, (_, idx) => {
  const num = String(idx + 1).padStart(2, "0");
  return `${INTRO_CAR_CDN_BASE}/car-${num}.mp4`;
});

/**
 * Computes a lightweight, responsive grid across HP, Tablet, Half-Desktop, and Desktop
 * where activeVideoCount is ALWAYS >= totalCells (up to 15 unique CDN clips) so EVERY
 * visible node can render a strictly distinct video with zero duplicates.
 */
export function computeResponsiveIntroGrid(viewportWidth, viewportHeight) {
  const w = Math.max(320, Number(viewportWidth) || 1280);
  const h = Math.max(320, Number(viewportHeight) || 720);
  const aspect = w / h;
  const maxPool = INTRO_CAR_VIDEO_POOL.length;

  // Wide Desktop (>= 1024px landscape) -> 12 nodes, 14 unique clips (2 spares for swaps)
  if (w >= 1024 && aspect >= 1.15) {
    return { cols: 4, rows: 3, totalCells: 12, activeVideoCount: Math.min(maxPool, 14) };
  }

  // Landscape Mobile (e.g. 844x390) -> 6 nodes, 8 unique clips
  if (h < 520 && aspect >= 1.35) {
    return { cols: 3, rows: 2, totalCells: 6, activeVideoCount: Math.min(maxPool, 8) };
  }

  // Landscape Tablet / Square-ish Half-Desktop -> 9 nodes, 11 unique clips
  if (w >= 640 && aspect >= 1.0) {
    return { cols: 3, rows: 3, totalCells: 9, activeVideoCount: Math.min(maxPool, 11) };
  }

  // Tall Half-Desktop -> 6 nodes, 8 unique clips
  if (w >= 640 && aspect >= 0.8) {
    return { cols: 2, rows: 3, totalCells: 6, activeVideoCount: Math.min(maxPool, 8) };
  }

  // Portrait Tablet / iPad -> 8 nodes, 10 unique clips
  if (w >= 640) {
    return { cols: 2, rows: 4, totalCells: 8, activeVideoCount: Math.min(maxPool, 10) };
  }

  // Portrait Mobile / HP -> 8 or 10 nodes, every node strictly distinct
  const rows = h / w > 1.95 ? 5 : 4;
  const totalCells = 2 * rows;
  return { cols: 2, rows, totalCells, activeVideoCount: Math.min(maxPool, totalCells + 2) };
}

/**
 * Assigns a strictly unique video index to every node using Fisher-Yates permutation.
 * Zero duplicate videos across nodes whenever poolSize >= totalCells.
 */
export function assignUniqueNodeVideos(totalCells, poolSize, rng = Math.random) {
  const count = Math.max(0, Math.floor(Number(totalCells) || 0));
  const pool = Math.max(0, Math.floor(Number(poolSize) || 0));
  if (count === 0 || pool === 0) return [];

  const rand = typeof rng === "function" ? rng : Math.random;
  const indices = Array.from({ length: pool }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const sample = Number(rand());
    const clamped = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
    const j = Math.floor(clamped * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }

  if (pool >= count) {
    return indices.slice(0, count);
  }
  return Array.from({ length: count }, (_, idx) => indices[idx % pool]);
}

/**
 * Swaps `cellIdx` to a video index NOT currently used by any other visible node,
 * preserving 100% node uniqueness at every tick.
 */
export function swapNodeWithUnusedVideo(assignments, cellIdx, poolSize, rng = Math.random) {
  if (!Array.isArray(assignments) || assignments.length === 0) return [];
  const next = [...assignments];
  const idx = Math.max(0, Math.min(next.length - 1, Math.floor(Number(cellIdx) || 0)));
  const pool = Math.max(0, Math.floor(Number(poolSize) || 0));
  if (pool <= 1) return next;

  const rand = typeof rng === "function" ? rng : Math.random;
  const inUse = new Set(next);
  const unused = [];
  for (let v = 0; v < pool; v++) {
    if (!inUse.has(v)) unused.push(v);
  }

  if (unused.length > 0) {
    const sample = Number(rand());
    const clamped = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
    next[idx] = unused[Math.floor(clamped * unused.length)];
    return next;
  }

  // Pool equals active cell count: cleanly exchange two distinct cells without creating duplicates
  if (next.length > 1) {
    const sample = Number(rand());
    const clamped = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
    let other = Math.floor(clamped * (next.length - 1));
    if (other >= idx) other += 1;
    const tmp = next[idx];
    next[idx] = next[other];
    next[other] = tmp;
  }
  return next;
}

/**
 * Pure object-fit: cover center-crop math so 16:9 car video frames render
 * undistorted inside any cell rectangle.
 */
export function computeCoverCropRect(srcWidth, srcHeight, dstWidth, dstHeight) {
  const sw0 = Number(srcWidth) || 0;
  const sh0 = Number(srcHeight) || 0;
  const dw = Number(dstWidth) || 0;
  const dh = Number(dstHeight) || 0;
  if (sw0 <= 0 || sh0 <= 0 || dw <= 0 || dh <= 0) {
    return { sx: 0, sy: 0, sw: sw0, sh: sh0 };
  }

  const srcAspect = sw0 / sh0;
  const dstAspect = dw / dh;

  if (srcAspect > dstAspect) {
    const sw = sh0 * dstAspect;
    return { sx: (sw0 - sw) / 2, sy: 0, sw, sh: sh0 };
  }
  const sh = sw0 / dstAspect;
  return { sx: 0, sy: (sh0 - sh) / 2, sw: sw0, sh };
}

/**
 * Selects `count` distinct video URLs from the 15-clip pool using Fisher-Yates shuffle.
 */
export function selectSessionIntroVideos(
  pool = INTRO_CAR_VIDEO_POOL,
  count = 8,
  rng = Math.random
) {
  const copy = Array.isArray(pool) ? [...pool] : [];
  if (copy.length === 0) return [];
  const safeCount = Math.max(1, Math.min(copy.length, Math.floor(Number(count) || 1)));
  const rand = typeof rng === "function" ? rng : Math.random;

  for (let i = copy.length - 1; i > 0; i--) {
    const sample = Number(rand());
    const clamped = Number.isFinite(sample) ? Math.min(0.999999999999, Math.max(0, sample)) : 0;
    const j = Math.floor(clamped * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, safeCount);
}
