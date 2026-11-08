"use client";

// videoPrewarmer.js — Zero-Latency Video Prewarming Engine for Kalceria
// Pre-fetches and pre-decodes video moov atoms & initial frames in background
// so Event Cards and Kalcerian Profile video covers start playing with ~0 latency.

const prewarmedSet = new Set();
const MAX_PREWARMED_CACHE = 40;

export function prewarmVideoUrl(rawUrl) {
  if (typeof window === "undefined" || !rawUrl) return;
  const url = String(rawUrl).trim();
  if (!url || url.startsWith("#") || url.startsWith("rgb") || prewarmedSet.has(url)) return;

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
      // 1. Preload first 64KB chunk via range request to warm HTTP cache & CDN edge
      fetch(url, {
        headers: { Range: "bytes=0-65535" },
        cache: "force-cache",
        mode: "cors",
      }).catch(() => {});

      // 2. Pre-decode initial video frame via headless DOM element
      const probeVid = document.createElement("video");
      probeVid.preload = "auto";
      probeVid.muted = true;
      probeVid.defaultMuted = true;
      probeVid.playsInline = true;
      probeVid.setAttribute("muted", "");
      probeVid.setAttribute("playsinline", "");
      probeVid.src = url;

      const cleanup = () => {
        probeVid.onloadedmetadata = null;
        probeVid.onerror = null;
        probeVid.removeAttribute("src");
        try {
          probeVid.load();
        } catch {}
      };

      probeVid.onloadedmetadata = cleanup;
      probeVid.onerror = cleanup;

      // Safety timeout to avoid dangling media element
      setTimeout(cleanup, 4000);
    } catch {}
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(doPrewarm, { timeout: 1500 });
  } else {
    setTimeout(doPrewarm, 100);
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
