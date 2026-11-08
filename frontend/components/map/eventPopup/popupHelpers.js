import { splitMediaUrlListClient } from "@/lib/urlSecurity";

export function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function cleanDesc(value) {
  return String(value || "")
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .replace(/\[LOC:[^\]]+\]\s*/gi, "")
    .replace(/\[COLLABS:[^\]]+\]\s*/gi, "")
    .trim();
}

export function extractLocation(item) {
  if (item?.location && typeof item.location === "string" && item.location.trim()) {
    return item.location.trim();
  }
  if (item?.locationName && typeof item.locationName === "string" && item.locationName.trim()) {
    return item.locationName.trim();
  }
  const match = String(item?.description || "").match(/\[LOC:([^\]]+)\]/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function isMockOrDummyMedia(url) {
  const s = String(url || "").trim();
  if (!s) return true;
  if (/\/media\/gifs\//i.test(s)) return true;
  return false;
}

export function extractMediaList(item) {
  if (!item) return [];
  let rawList = [];
  if (Array.isArray(item.mediaItems) && item.mediaItems.length > 0) {
    rawList = item.mediaItems.map((entry) => entry?.url || entry).filter(Boolean);
  } else if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
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

  // Strictly filter out any mock/dummy GIFs — never return fallback dummy media
  return rawList.filter((u) => !isMockOrDummyMedia(u));
}

export function calculateUptime(createdAt) {
  if (!createdAt) return "00:00:00";
  const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function formatReleaseTime(createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date();
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${hours}.${mins}`;
}

export function formatCreatorDisplayName(rawName, maxChars = 10) {
  const cleaned = String(rawName || "Kalcerian").trim();
  if (!cleaned) return "Kalcerian";
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, 9).trimEnd()}...`;
}
