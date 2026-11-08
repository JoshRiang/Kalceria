import { createSeededRandom } from "@/lib/seededRandom";
import { splitMediaUrlListClient } from "@/lib/urlSecurity";
import { esc, isMockOrDummyMedia } from "./popupHelpers";

const DARK_MODE_COUNT_COLORS = [
  "#38bdf8", // Sky Cyan
  "#fbbf24", // Amber Gold
  "#f472b6", // Rose Pink
  "#34d399", // Emerald Mint
  "#a78bfa", // Violet
  "#fb923c", // Tangerine
  "#22d3ee", // Electric Cyan
  "#f87171", // Coral Red
];

const LIGHT_MODE_COUNT_COLORS = [
  "#0284c7", // Deep Sky Blue
  "#b45309", // Deep Amber
  "#be185d", // Rich Rose
  "#047857", // Forest Emerald
  "#6d28d9", // Deep Violet
  "#c2410c", // Burnt Orange
  "#0e7490", // Deep Cyan
  "#b91c1c", // Crimson
];

export function inferIsVideoMediaUrl(url, metadata = null) {
  if (metadata && typeof metadata.isVideo === "boolean") return metadata.isVideo;
  const s = String(url || "").trim();
  if (!s) return false;
  if (/^data:video\//i.test(s)) return true;
  if (/\.(?:mp4|webm|ogg|mov|m4v)(?:$|\?|#)/i.test(s)) return true;
  if (s.includes("/api/blob/raw")) {
    try {
      const inner = new URL(s, "https://kalceria.internal").searchParams.get("url") || "";
      if (/\.(?:mp4|webm|ogg|mov|m4v)(?:$|\?|#)/i.test(inner)) return true;
    } catch {}
  }
  if (s.startsWith("blob:") && (s.includes("video") || metadata?.duration || metadata?.isVideo)) return true;
  return false;
}

export function extractMediaItemsNormalized(item) {
  if (!item) return [];

  if (Array.isArray(item.mediaItems) && item.mediaItems.length > 0) {
    const normalized = item.mediaItems
      .map((entry) => {
        if (!entry) return null;
        const url = typeof entry === "string" ? entry.trim() : String(entry.url || "").trim();
        if (!url || isMockOrDummyMedia(url)) return null;
        const w = Number(entry.width);
        const h = Number(entry.height);
        const dur = Number(entry.duration);
        return {
          id: entry.id || null,
          url,
          isVideo:
            typeof entry.isVideo === "boolean" ? entry.isVideo : inferIsVideoMediaUrl(url),
          width: Number.isFinite(w) && w > 0 ? w : null,
          height: Number.isFinite(h) && h > 0 ? h : null,
          duration: Number.isFinite(dur) && dur > 0 ? dur : null,
          authorId: entry.authorId || null,
          authorName: entry.authorName || null,
        };
      })
      .filter(Boolean);

    if (normalized.length > 0) return normalized;
  }

  let rawList = [];
  if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
    rawList = item.mediaUrls.filter(Boolean);
  } else if (item.mediaUrl && typeof item.mediaUrl === "string") {
    rawList = splitMediaUrlListClient(item.mediaUrl);
  } else if (item.videoUrl) {
    rawList = [item.videoUrl];
  } else if (item.gifUrl) {
    rawList = [item.gifUrl];
  } else {
    const match = String(item.description || "").match(/\[MEDIA:([^\]]+)\]/i);
    if (match && match[1]) {
      rawList = splitMediaUrlListClient(match[1]);
    }
  }

  return rawList
    .filter((u) => u && !isMockOrDummyMedia(u))
    .map((url) => ({
      id: null,
      url,
      isVideo: inferIsVideoMediaUrl(url),
      width: null,
      height: null,
      duration: null,
      authorId: null,
      authorName: null,
    }));
}

export function getUniqueCollaboratorCount(item, creatorId = null) {
  if (!item) return 0;
  const ownerId =
    creatorId || item.creator?.id || item.creatorId || item.userId || null;
  const uniqueIds = new Set();

  const pushId = (raw) => {
    if (!raw) return;
    const str = String(raw).trim();
    if (!str) return;
    if (ownerId && str === String(ownerId)) return;
    uniqueIds.add(str);
  };

  if (Array.isArray(item.collaborators)) {
    item.collaborators.forEach((entry) => {
      pushId(typeof entry === "object" ? entry?.id : entry);
    });
  }
  if (Array.isArray(item.collaboratorIds)) {
    item.collaboratorIds.forEach(pushId);
  }
  if (uniqueIds.size === 0 && Array.isArray(item.collaboratorProfiles)) {
    item.collaboratorProfiles.forEach((profile) => pushId(profile?.id));
  }

  return uniqueIds.size;
}

export function getSeededCollabCountColor(seedKey, isMapDark) {
  const palette = isMapDark ? DARK_MODE_COUNT_COLORS : LIGHT_MODE_COUNT_COLORS;
  const rng = createSeededRandom(`collab-count-color:${String(seedKey || "event")}`);
  const idx = Math.floor(rng() * palette.length);
  return palette[idx % palette.length];
}

export function renderByAuthorLine({
  creatorDisplayName,
  othersCount = 0,
  seedKey = "event",
  isMapDark = false,
}) {
  const safeCreator = esc(creatorDisplayName || "Kalcerian");
  if (!othersCount || othersCount <= 0) {
    return `by <strong style="font-weight: 700;">${safeCreator}</strong>`;
  }
  const countColor = getSeededCollabCountColor(seedKey, isMapDark);
  return `by <strong style="font-weight: 700;">${safeCreator}</strong> &amp; <strong style="font-weight: 700; color: ${countColor};">${othersCount}</strong> <strong style="font-weight: 700;">lainnya</strong>`;
}

export async function probeMediaFileMetadata(fileOrUrl) {
  if (typeof window === "undefined" || !fileOrUrl) {
    return { width: null, height: null, duration: null };
  }

  const isFile = typeof Blob !== "undefined" && fileOrUrl instanceof Blob;
  const objectUrl = isFile ? URL.createObjectURL(fileOrUrl) : String(fileOrUrl);
  const mime = isFile ? String(fileOrUrl.type || "").toLowerCase() : "";
  const isVideo = mime.startsWith("video/") || inferIsVideoMediaUrl(objectUrl);

  const cleanup = () => {
    if (isFile) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    }
  };

  if (!isVideo) {
    return new Promise((resolve) => {
      const img = new window.Image();
      const timeout = setTimeout(() => {
        cleanup();
        resolve({ width: null, height: null, duration: null });
      }, 3000);

      img.onload = () => {
        clearTimeout(timeout);
        const result = {
          width: img.naturalWidth || null,
          height: img.naturalHeight || null,
          duration: null,
        };
        cleanup();
        resolve(result);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        resolve({ width: null, height: null, duration: null });
      };
      img.src = objectUrl;
    });
  }

  return new Promise((resolve) => {
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.muted = true;
    vid.playsInline = true;

    let finished = false;
    const finish = (res) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      try {
        vid.onloadedmetadata = null;
        vid.onseeked = null;
        vid.onerror = null;
        vid.removeAttribute("src");
        vid.load();
      } catch {}
      cleanup();
      resolve(res);
    };

    const timeout = setTimeout(() => {
      finish({
        width: vid.videoWidth || null,
        height: vid.videoHeight || null,
        duration:
          Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : null,
      });
    }, 3500);

    vid.onloadedmetadata = () => {
      const w = vid.videoWidth || null;
      const h = vid.videoHeight || null;
      if (Number.isFinite(vid.duration) && vid.duration > 0) {
        finish({ width: w, height: h, duration: Number(vid.duration.toFixed(3)) });
        return;
      }
      if (vid.duration === Infinity) {
        vid.onseeked = () => {
          const resolvedDur =
            Number.isFinite(vid.duration) && vid.duration > 0
              ? Number(vid.duration.toFixed(3))
              : null;
          finish({ width: vid.videoWidth || w, height: vid.videoHeight || h, duration: resolvedDur });
        };
        try {
          vid.currentTime = 1e6;
        } catch {
          finish({ width: w, height: h, duration: null });
        }
      } else {
        finish({ width: w, height: h, duration: null });
      }
    };

    vid.onerror = () => {
      finish({ width: null, height: null, duration: null });
    };

    vid.src = objectUrl;
  });
}

