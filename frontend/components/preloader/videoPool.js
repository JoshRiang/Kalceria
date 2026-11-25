import {
  INTRO_CAR_VIDEO_POOL,
  selectSessionIntroVideos,
} from "./introVideoGridLayout";

// ─── Cloudflare Edge CDN Car Video Pool (Lean Hardware Decoders + In-Memory Blob Cache) ───
export const INTRO_VIDEO_PATHS = INTRO_CAR_VIDEO_POOL;

let sharedVideoElements = null;
let sharedVideoUrls = [];
let sharedVideoBlobUrls = [];
let sharedVideoInitPromise = null;
let activeCanvasSubscribers = 0;

function createAutoplayVideoElement(srcPath) {
  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true;
  v.defaultMuted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = "auto";
  v.setAttribute("crossorigin", "anonymous");
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  const tryPlay = () => {
    v.play().catch(() => {});
  };
  v.addEventListener("loadeddata", tryPlay);
  v.addEventListener("canplay", tryPlay);
  v.src = srcPath;
  tryPlay();
  return v;
}

/**
 * Initializes or reuses a lean subset (4-8 decoders) sampled from the 15-clip
 * Cloudflare Edge CDN car video pool so intro playback stays 60fps across all devices.
 */
export function ensureIntroVideoPool(targetCount = 8) {
  if (typeof window === "undefined") return [];

  const desiredCount = Math.max(1, Math.min(INTRO_VIDEO_PATHS.length, Number(targetCount) || 8));

  if (sharedVideoElements && sharedVideoElements.length > 0) {
    // Expand gently only if viewport grew (e.g., portrait -> desktop resize)
    if (sharedVideoElements.length < desiredCount) {
      const remaining = INTRO_VIDEO_PATHS.filter((u) => !sharedVideoUrls.includes(u));
      const extras = selectSessionIntroVideos(remaining, desiredCount - sharedVideoElements.length);
      extras.forEach((srcPath) => {
        sharedVideoUrls.push(srcPath);
        sharedVideoElements.push(createAutoplayVideoElement(srcPath));
      });
    }
    sharedVideoElements.forEach((v) => {
      if (v.paused && v.src) v.play().catch(() => {});
    });
    return sharedVideoElements;
  }

  sharedVideoUrls = selectSessionIntroVideos(INTRO_VIDEO_PATHS, desiredCount);
  const elements = sharedVideoUrls.map((srcPath) => createAutoplayVideoElement(srcPath));
  sharedVideoElements = elements;

  if (!sharedVideoInitPromise) {
    sharedVideoInitPromise = Promise.all(
      sharedVideoUrls.map(async (srcPath, idx) => {
        try {
          const res = await fetch(srcPath, { mode: "cors", cache: "force-cache" });
          if (!res.ok) return;
          const blob = await res.blob();
          if (!blob || blob.size === 0) return;
          const blobUrl = URL.createObjectURL(blob);
          sharedVideoBlobUrls[idx] = blobUrl;
          const vid = sharedVideoElements?.[idx];
          if (vid && vid.readyState < 2) {
            vid.src = blobUrl;
            vid.load();
            vid.play().catch(() => {});
          }
        } catch {
          // Direct Cloudflare CDN video element remains active
        }
      })
    );
  }

  return elements;
}

export function subscribeIntroVideoPool() {
  activeCanvasSubscribers += 1;
}

export function releaseIntroVideoPoolSubscriber() {
  activeCanvasSubscribers = Math.max(0, activeCanvasSubscribers - 1);
  if (activeCanvasSubscribers === 0 && sharedVideoElements) {
    sharedVideoElements.forEach((v) => {
      try {
        v.pause();
      } catch {}
    });
  }
}
