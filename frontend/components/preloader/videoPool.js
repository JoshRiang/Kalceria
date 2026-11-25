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

/**
 * Waits until at least `minReady` car clips in the shared pool have decoded a real
 * paintable frame (`readyState >= 2 && videoWidth > 0`) so the K-silhouette canvas
 * is already pre-rendered before opacity fades in, bounded by `maxWaitMs`.
 */
export function waitForIntroVideoPoolReady(
  targetCount = 4,
  minReady = 2,
  maxWaitMs = 1800
) {
  if (typeof window === "undefined") return Promise.resolve();
  const elements = ensureIntroVideoPool(targetCount);
  if (!elements.length) return Promise.resolve();

  const required = Math.max(1, Math.min(elements.length, Number(minReady) || 1));
  const isVideoFrameReady = (v) => Boolean(v && v.readyState >= 2 && v.videoWidth > 0);

  if (elements.filter(isVideoFrameReady).length >= required) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      elements.forEach((v) => {
        v.removeEventListener("loadeddata", checkReady);
        v.removeEventListener("canplay", checkReady);
        v.removeEventListener("playing", checkReady);
      });
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const checkReady = () => {
      if (elements.filter(isVideoFrameReady).length >= required) {
        finish();
      }
    };

    elements.forEach((v) => {
      v.addEventListener("loadeddata", checkReady);
      v.addEventListener("canplay", checkReady);
      v.addEventListener("playing", checkReady);
      if (v.paused && v.src) v.play().catch(() => {});
    });

    timer = setTimeout(finish, Math.max(200, Number(maxWaitMs) || 1800));
    checkReady();
  });
}
