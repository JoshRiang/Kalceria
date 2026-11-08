"use client";

// videoPrewarmer.js — Zero-Latency Video Prewarming Engine for Kalceria
// Pre-fetches video moov atoms & initial frames in background via range fetch
// and primes browser video decoders so Event Cards and Kalcerian Profile video covers start playing with ~0 latency.

const prewarmedSet = new Set();
const videoElementPool = new Map();
const MAX_PREWARMED_CACHE = 40;

export function prewarmVideoUrl(rawUrl) {
  if (typeof window === "undefined" || !rawUrl) return;
  const url = String(rawUrl).trim();
  if (
    !url ||
    url.startsWith("#") ||
    url.startsWith("rgb") ||
    url.startsWith("blob:") ||
    prewarmedSet.has(url)
  ) {
    return;
  }

  // Only prewarm video URLs
  const isVideo =
    /\.(?:mp4|webm|mov|m4v)(?:$|\?|#)/i.test(url) ||
    url.includes("/api/blob/raw") ||
    url.includes("video");

  if (!isVideo) return;

  if (prewarmedSet.size >= MAX_PREWARMED_CACHE) {
    const oldest = prewarmedSet.values().next().value;
    if (oldest) {
      prewarmedSet.delete(oldest);
      const pooledVid = videoElementPool.get(oldest);
      if (pooledVid) {
        pooledVid.src = "";
        pooledVid.remove();
        videoElementPool.delete(oldest);
      }
    }
  }
  prewarmedSet.add(url);

  const doPrewarm = () => {
    try {
      // 1. Preload first 256KB chunk via range request to warm HTTP cache & CDN edge
      fetch(url, {
        headers: { Range: "bytes=0-262143" },
        cache: "force-cache",
        mode: "cors",
      }).catch(() => {});

      // 2. Hardware Video Decoder priming via headless video element
      if (typeof document !== "undefined") {
        const vid = document.createElement("video");
        vid.preload = "auto";
        vid.muted = true;
        vid.playsInline = true;
        vid.style.position = "fixed";
        vid.style.width = "1px";
        vid.style.height = "1px";
        vid.style.opacity = "0.001";
        vid.style.pointerEvents = "none";
        vid.style.zIndex = "-9999";
        vid.src = url;
        vid.load();
        videoElementPool.set(url, vid);
      }
    } catch {}
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(doPrewarm, { timeout: 1200 });
  } else {
    setTimeout(doPrewarm, 60);
  }
}

export function prewarmVideoBatch(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  urls.forEach((u) => {
    if (typeof u === "string") {
      prewarmVideoUrl(u);
    } else if (u?.url) {
      prewarmVideoUrl(u.url);
    }
  });
}
