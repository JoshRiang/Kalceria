"use client";

/**
 * Cross-platform hardware-safe media download pipeline for Kalceria Chat.
 * Engineered specifically for:
 * - macOS (Safari, Chrome, Arc, Firefox)
 * - Windows / Linux Desktop & Laptop
 * - iPadOS & iOS (Safari / WebKit)
 * - Android (Chrome, Samsung Internet, Firefox, Brave)
 * - Xiaomi / Redmi / POCO (MIUI / HyperOS China ROM Mi Browser & WebView,
 *   where OS-level DownloadManager cannot read renderer-only `blob:` URLs)
 */

function inferExtensionAndMime(cleanUrl, isVideo, explicitMime = "") {
  const mimeLower = String(explicitMime || "").toLowerCase();
  if (mimeLower.includes("video/mp4")) return { ext: "mp4", mime: "video/mp4" };
  if (mimeLower.includes("video/webm")) return { ext: "webm", mime: "video/webm" };
  if (mimeLower.includes("video/quicktime")) return { ext: "mov", mime: "video/quicktime" };
  if (mimeLower.includes("image/png")) return { ext: "png", mime: "image/png" };
  if (mimeLower.includes("image/webp")) return { ext: "webp", mime: "image/webp" };
  if (mimeLower.includes("image/jpeg") || mimeLower.includes("image/jpg")) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  if (cleanUrl.startsWith("data:")) {
    const header = cleanUrl.slice(5, 64).toLowerCase();
    if (header.startsWith("video/mp4")) return { ext: "mp4", mime: "video/mp4" };
    if (header.startsWith("video/webm")) return { ext: "webm", mime: "video/webm" };
    if (header.startsWith("video/quicktime")) return { ext: "mov", mime: "video/quicktime" };
    if (header.startsWith("image/png")) return { ext: "png", mime: "image/png" };
    if (header.startsWith("image/webp")) return { ext: "webp", mime: "image/webp" };
    if (header.startsWith("image/jpeg") || header.startsWith("image/jpg")) {
      return { ext: "jpg", mime: "image/jpeg" };
    }
  }

  // Inspect underlying URL path if wrapped in /api/blob/raw?url=...
  let targetPath = cleanUrl;
  try {
    if (cleanUrl.includes("/api/blob/raw")) {
      const u = new URL(cleanUrl, typeof window !== "undefined" ? window.location.origin : "https://kalceria.id");
      targetPath = u.searchParams.get("url") || cleanUrl;
    }
  } catch {}

  const pathLower = targetPath.split("?")[0].toLowerCase();
  if (pathLower.endsWith(".mp4")) return { ext: "mp4", mime: "video/mp4" };
  if (pathLower.endsWith(".webm")) return { ext: "webm", mime: "video/webm" };
  if (pathLower.endsWith(".mov")) return { ext: "mov", mime: "video/quicktime" };
  if (pathLower.endsWith(".png")) return { ext: "png", mime: "image/png" };
  if (pathLower.endsWith(".webp")) return { ext: "webp", mime: "image/webp" };
  if (pathLower.endsWith(".jpg") || pathLower.endsWith(".jpeg")) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  return isVideo
    ? { ext: "mp4", mime: "video/mp4" }
    : { ext: "jpg", mime: "image/jpeg" };
}

function decodeDataUrlToBlob(dataUrl, fallbackMime) {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) throw new Error("Malformed data URL");
  const meta = dataUrl.slice(0, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  const mimeMatch = meta.match(/^data:([^;]+)/i);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const isBase64 = /;base64/i.test(meta);

  if (isBase64) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  const decoded = decodeURIComponent(payload);
  return new Blob([decoded], { type: mime });
}

function buildSameOriginAttachmentUrl(cleanUrl, filename) {
  if (typeof window === "undefined") return null;

  try {
    if (cleanUrl.startsWith("/api/blob/raw")) {
      const parsed = new URL(cleanUrl, window.location.origin);
      const innerUrl = (parsed.searchParams.get("url") || "").split("#")[0];
      if (!innerUrl) return null;
      return `/api/blob/raw?url=${encodeURIComponent(innerUrl)}&download=1&filename=${encodeURIComponent(filename)}`;
    }

    const parsed = new URL(cleanUrl, window.location.origin);
    if (parsed.pathname === "/api/blob/raw") {
      const innerUrl = (parsed.searchParams.get("url") || "").split("#")[0];
      if (!innerUrl) return null;
      return `/api/blob/raw?url=${encodeURIComponent(innerUrl)}&download=1&filename=${encodeURIComponent(filename)}`;
    }

    if (parsed.hostname.toLowerCase().endsWith(".blob.vercel-storage.com")) {
      return `/api/blob/raw?url=${encodeURIComponent(cleanUrl)}&download=1&filename=${encodeURIComponent(filename)}`;
    }
  } catch {}

  return null;
}

function triggerHiddenIframeDownload(attachmentUrl) {
  if (typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = attachmentUrl;
  document.body.appendChild(iframe);
  setTimeout(() => {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch {}
  }, 60_000);
}

function triggerBlobAnchorDownload(blob, filename) {
  if (typeof document === "undefined") return;
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);

  // Dispatch click synchronously inside user gesture chain for Safari/macOS/iPadOS/Android compatibility
  anchor.click();

  setTimeout(() => {
    try {
      if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    } catch {}
  }, 1500);

  // Keep ObjectURL alive for 60s so Xiaomi/Android/iPadOS background writers finish flushing bytes
  setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60_000);
}

export async function downloadChatMedia({
  mediaUrl,
  isVideo = false,
  messageId = "",
  isViewOnce = false,
}) {
  // Strict View-Once Policy: View-Once media can NEVER be downloaded
  if (isViewOnce) return false;
  if (!mediaUrl || typeof window === "undefined") return false;

  // Strip #t=start,end trim fragments before fetching bytes
  const cleanUrl = String(mediaUrl).split("#")[0].trim();
  if (!cleanUrl) return false;

  const initialInfo = inferExtensionAndMime(cleanUrl, isVideo);
  const shortId = String(messageId || Date.now())
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8) || String(Date.now());
  const basePrefix = isVideo ? "kalceria-video" : "kalceria-photo";
  let filename = `${basePrefix}-${shortId}.${initialInfo.ext}`;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isXiaomiOrChinaWebView = /(MiuiBrowser|XiaoMi|Redmi|POCO|HM\s|MI\s|;\s*wv\)|WeChat|MQQBrowser|UCBrowser|VivoBrowser|HeyTapBrowser|OppoBrowser)/i.test(
    ua
  );

  // 1. Inline data: URL -> decode directly in memory without network RTT
  if (cleanUrl.startsWith("data:")) {
    const blob = decodeDataUrlToBlob(cleanUrl, initialInfo.mime);
    const refined = inferExtensionAndMime(cleanUrl, isVideo, blob.type);
    filename = `${basePrefix}-${shortId}.${refined.ext}`;
    triggerBlobAnchorDownload(blob, filename);
    return true;
  }

  // 2. Local blob: URL -> fetch local memory buffer and re-wrap with clean MIME + filename
  if (cleanUrl.startsWith("blob:")) {
    const res = await fetch(cleanUrl);
    const rawBlob = await res.blob();
    const refined = inferExtensionAndMime(cleanUrl, isVideo, rawBlob.type);
    const typedBlob =
      rawBlob.type === refined.mime ? rawBlob : new Blob([rawBlob], { type: refined.mime });
    filename = `${basePrefix}-${shortId}.${refined.ext}`;
    triggerBlobAnchorDownload(typedBlob, filename);
    return true;
  }

  const attachmentUrl = buildSameOriginAttachmentUrl(cleanUrl, filename);

  // 3. Xiaomi / MIUI / HyperOS / China ROM OEM browsers & Android WebViews:
  // Their native OS DownloadManager runs out-of-process and fails on `blob:` URLs,
  // so stream via same-origin HTTPS Content-Disposition: attachment inside a hidden iframe.
  if (isXiaomiOrChinaWebView && attachmentUrl) {
    triggerHiddenIframeDownload(attachmentUrl);
    return true;
  }

  // 4. macOS (Safari/Chrome), Windows/Linux Desktop, iPadOS/iOS, and standard Android Chrome:
  // Fetch via same-origin proxy (zero CORS block), wrap in typed Blob, and trigger <a download>.
  const fetchTarget = attachmentUrl || cleanUrl;
  try {
    const res = await fetch(fetchTarget, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") || initialInfo.mime;
    const refined = inferExtensionAndMime(cleanUrl, isVideo, contentType);
    filename = `${basePrefix}-${shortId}.${refined.ext}`;
    const buf = await res.arrayBuffer();
    const blob = new Blob([buf], { type: refined.mime });
    triggerBlobAnchorDownload(blob, filename);
    return true;
  } catch {
    // Graceful hardware-safe fallback via same-origin Content-Disposition stream
    if (attachmentUrl) {
      triggerHiddenIframeDownload(attachmentUrl);
      return true;
    }
    return false;
  }
}
