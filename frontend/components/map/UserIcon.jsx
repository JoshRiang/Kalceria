// UserIcon.jsx
// Generates the Leaflet user icon with its floating animation and name tag.
import { createSeededRandom } from "@/lib/seededRandom";

export function escapeMapHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function getSafeMapAvatarUrl(user) {
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.nickname || user.name || "anon")}`;
  const candidate = user.profilePicture;
  if (typeof candidate !== "string" || candidate.length > 2048 || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }
  if (candidate.startsWith("/")) return candidate;
  try {
    return new URL(candidate).protocol === "https:" ? candidate : fallback;
  } catch {
    return fallback;
  }
}

export function getSafeMapColor(value) {
  return typeof value === "string" && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)
    ? value
    : "#ffc300";
}

export function getUserIconHtml(user) {
  const displayName = user.nickname || user.name || '';
  const random = createSeededRandom(`map-user-icon-${user.id || user.nickname || user.name || "anon"}`);
  const randomDelay = (random() * -2).toFixed(2);
  const rawColor = getSafeMapColor(user.color);
  const cleanColor = (rawColor.toLowerCase() === '#ffd60a' || rawColor.toLowerCase() === '#ffea00') ? '#ffc300' : rawColor;
  const safeName = escapeMapHtml(displayName);
  const safeAvatar = escapeMapHtml(getSafeMapAvatarUrl(user));
  return `
    <div class="radar-node" style="--user-color: ${cleanColor}">
      <div class="radar-pulse" style="animation-delay: ${randomDelay}s"></div>
      <div class="radar-nametag">${safeName}</div>
      <div class="radar-float-wrapper" style="animation-delay: ${randomDelay}s">
        <div class="radar-avatar"><img src="${safeAvatar}" alt="${safeName}"></div>
      </div>
      <div class="radar-droplet" style="animation-delay: ${randomDelay}s"></div>
    </div>
  `;
}

export function createUserIcon(L, user) {
  return L.divIcon({
    className: "custom-div-icon",
    html: getUserIconHtml(user),
    iconSize: [48, 80],
    iconAnchor: [24, 70],
  });
}
