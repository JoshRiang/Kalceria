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
 * so node counts stay lean (6-12 cells, zero lag) and every cell retains a natural
 * landscape/balanced aspect ratio (never overly narrow portrait strips).
 */
export function computeResponsiveIntroGrid(viewportWidth, viewportHeight) {
  const w = Math.max(320, Number(viewportWidth) || 1280);
  const h = Math.max(320, Number(viewportHeight) || 720);
  const aspect = w / h;

  // Wide Desktop (>= 1024px landscape)
  if (w >= 1024 && aspect >= 1.15) {
    return { cols: 4, rows: 3, totalCells: 12, activeVideoCount: 8 };
  }

  // Landscape Mobile (e.g. 844x390)
  if (h < 520 && aspect >= 1.35) {
    return { cols: 3, rows: 2, totalCells: 6, activeVideoCount: 4 };
  }

  // Landscape Tablet / Square-ish Half-Desktop (aspect >= 1.0)
  if (w >= 640 && aspect >= 1.0) {
    return { cols: 3, rows: 3, totalCells: 9, activeVideoCount: 6 };
  }

  // Tall Half-Desktop (e.g. 720x900, 820x900) -> 2x3 = 6 wide landscape nodes (~1.2-1.45 ratio)
  if (w >= 640 && aspect >= 0.8) {
    return { cols: 2, rows: 3, totalCells: 6, activeVideoCount: 6 };
  }

  // Portrait Tablet / iPad (e.g. 768x1024, 820x1180) -> 2x4 = 8 wide cells (~1.4-1.5 ratio)
  if (w >= 640) {
    return { cols: 2, rows: 4, totalCells: 8, activeVideoCount: 6 };
  }

  // Portrait Mobile / HP: keep cell aspect ~1.10-1.20 (slightly horizontal, never forced portrait)
  const rows = h / w > 1.95 ? 5 : 4;
  return { cols: 2, rows, totalCells: 2 * rows, activeVideoCount: 4 };
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
