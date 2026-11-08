"use client";

// videoPrewarmer.js — Zero-Latency Video Prewarming Engine for Kalceria
// Pre-fetches video moov atoms & initial frames in background via range fetch
// so Event Cards and Kalcerian Profile video covers start playing with ~0 latency.

const prewarmedSet = new Set();
const MAX_PREWARMED_CACHE = 50;

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
    if (oldest) prewarmedSet.delete(oldest);
  }
  prewarmedSet.add(url);

  const doPrewarm = () => {
    try {
      // Preload first 128KB chunk via range request to warm HTTP cache & CDN edge
      fetch(url, {
        headers: { Range: "bytes=0-131071" },
        cache: "force-cache",
        mode: "cors",
      }).catch(() => {});
    } catch {}
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(doPrewarm, { timeout: 2000 });
  } else {
    setTimeout(doPrewarm, 150);
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
