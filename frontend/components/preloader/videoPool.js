// ─── In-Memory Blob Video Pool (Eliminates Chromium HTTP 206 Range-Cache Deadlock) ───
export const INTRO_VIDEO_PATHS = ["/vid_login1.mp4", "/vid_login2.mp4", "/vid_login3.mp4"];
let sharedVideoElements = null;
let sharedVideoBlobUrls = [];
let sharedVideoInitPromise = null;
let activeCanvasSubscribers = 0;

export function ensureIntroVideoPool() {
  if (typeof window === "undefined") return [];
  if (sharedVideoElements && sharedVideoElements.length === INTRO_VIDEO_PATHS.length) {
    sharedVideoElements.forEach((v) => {
      if (v.paused && v.src) v.play().catch(() => {});
    });
    return sharedVideoElements;
  }

  const elements = INTRO_VIDEO_PATHS.map((srcPath) => {
    const v = document.createElement("video");
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    const tryPlay = () => {
      v.play().catch(() => {});
    };
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("canplay", tryPlay);
    // Attach direct source immediately for instant t=0 decode, then upgrade to full in-memory Blob URL if needed
    v.src = srcPath;
    tryPlay();
    return v;
  });

  sharedVideoElements = elements;

  if (!sharedVideoInitPromise) {
    sharedVideoInitPromise = Promise.all(
      INTRO_VIDEO_PATHS.map(async (srcPath, idx) => {
        try {
          const res = await fetch(srcPath, { cache: "no-cache" });
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
          // Direct video element fallback remains active
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
