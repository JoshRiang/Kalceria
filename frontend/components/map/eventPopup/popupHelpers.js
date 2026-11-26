import { splitMediaUrlListClient } from "../../../lib/urlSecurity.js";

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
    .replace(/\[CMETA:[^\]]+\]\s*/gi, "")
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

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;

/**
 * Formats elapsed seconds cleanly across months (mo), days (d), hours (h), minutes (m), and seconds (s)
 * so multi-day or multi-month events never pile up into hundreds of hours (e.g. "16d 16h 54m 13s").
 */
export function formatElapsedUptime(totalSec) {
  const safeSec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const mo = Math.floor(safeSec / SECONDS_PER_MONTH);
  const d = Math.floor((safeSec % SECONDS_PER_MONTH) / SECONDS_PER_DAY);
  const h = Math.floor((safeSec % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const m = String(Math.floor((safeSec % SECONDS_PER_HOUR) / 60)).padStart(2, "0");
  const s = String(safeSec % 60).padStart(2, "0");

  const parts = [];
  if (mo > 0) parts.push(`${mo}mo`);
  if (d > 0 || mo > 0) parts.push(`${d}d`);
  parts.push(`${h}h`, `${m}m`, `${s}s`);
  return parts.join(" ");
}

export function calculateUptime(createdAt) {
  if (!createdAt) return "0h 00m 00s";
  const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  return formatElapsedUptime(Math.floor(diffMs / 1000));
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
