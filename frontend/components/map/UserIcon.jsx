// UserIcon.jsx
// Generates Leaflet user icons: radar floating avatar or 2D broadcast speech bubble with attached avatar
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
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nickname || user?.name || "anon")}`;
  const candidate = user?.profilePicture;
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
  const displayName = user?.nickname || user?.name || "";
  const random = createSeededRandom(`map-user-icon-${user?.id || user?.nickname || user?.name || "anon"}`);
  const randomDelay = (random() * -2).toFixed(2);
  const rawColor = getSafeMapColor(user?.color);
  const cleanColor = (rawColor.toLowerCase() === "#ffd60a" || rawColor.toLowerCase() === "#ffea00") ? "#ffc300" : rawColor;
  const safeName = escapeMapHtml(displayName);
  const safeAvatar = escapeMapHtml(getSafeMapAvatarUrl(user));

  // Echoing animation is only for people who are online (green color #10b981)
  const isOnline = user?.isOnline !== false;
  const pulseHtml = isOnline
    ? `<div class="radar-pulse online-green-pulse" style="animation-delay: ${randomDelay}s; border: 2px solid #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);"></div>`
    : "";

  return `
    <div class="radar-node" style="--user-color: ${cleanColor}">
      ${pulseHtml}
      <div class="radar-nametag">${safeName}</div>
      <div class="radar-float-wrapper" style="animation-delay: ${randomDelay}s">
        <div class="radar-avatar"><img src="${safeAvatar}" alt="${safeName}"></div>
      </div>
      <div class="radar-droplet" style="animation-delay: ${randomDelay}s"></div>
    </div>
  `;
}

export function getBroadcastUserIconHtml(user, isMapDark = false) {
  const displayName = user?.nickname || user?.name || "Kalcerian";
  const safeName = escapeMapHtml(displayName);
  const safeAvatar = escapeMapHtml(getSafeMapAvatarUrl(user));

  // Picture 3 speech bubble styling:
  // Light mode: black bubble, 3 white dots, white border
  // Dark mode: white bubble, 3 black dots, black border
  const bubbleFill = isMapDark ? "#ffffff" : "#000000";
  const bubbleStroke = isMapDark ? "#000000" : "#ffffff";
  const dotFill = isMapDark ? "#000000" : "#ffffff";
  const avatarBorder = isMapDark ? "#000000" : "#ffffff";
  const dropShadow = isMapDark
    ? "drop-shadow(0 2px 6px rgba(0,0,0,0.95)) drop-shadow(0 0 4px rgba(255,255,255,0.35))"
    : "drop-shadow(0 2px 4px rgba(0,0,0,0.35)) drop-shadow(0 1px 2px rgba(255,255,255,0.8))";

  const isOnline = user?.isOnline !== false;
  const statusDot = isOnline
    ? `<span style="position: absolute; right: -1px; bottom: -1px; width: 6.5px; height: 6.5px; border-radius: 50%; background: #10b981; border: 1.5px solid ${avatarBorder}; z-index: 6;"></span>`
    : "";

  return `
    <div class="broadcast-map-node" style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <!-- Username hover tooltip -->
      <div class="radar-nametag" style="top: -6px;">${safeName}</div>

      <!-- Main Speech Bubble Icon (Picture 3 style) -->
      <div style="width: 34px; height: 34px; filter: ${dropShadow}; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease;">
        <svg viewBox="0 0 24 24" style="width: 100%; height: 100%;" fill="none">
          <path
            d="M 20 4.5 H 4 C 2.34 4.5 1 5.84 1 7.5 v 7.5 c 0 1.66 1.34 3 3 3 h 1 v 3.8 l 4.2 -3.8 h 10.8 c 1.66 0 3 -1.34 3 -3 V 7.5 c 0 -1.66 -1.34 -3 -3 -3 z"
            fill="${bubbleFill}"
            stroke="${bubbleStroke}"
            stroke-width="1.4"
            stroke-linejoin="round"
            style="paint-order: stroke fill;"
          />
          <circle cx="7" cy="11.25" r="1.35" fill="${dotFill}" />
          <circle cx="12" cy="11.25" r="1.35" fill="${dotFill}" />
          <circle cx="17" cy="11.25" r="1.35" fill="${dotFill}" />
        </svg>
      </div>

      <!-- User Profile Avatar next to it (Picture 3 + Avatar behavior) -->
      <div style="position: absolute; right: -2px; bottom: -2px; width: 20px; height: 20px; border-radius: 50%; overflow: hidden; border: 2px solid ${avatarBorder}; box-shadow: 0 2px 6px rgba(0,0,0,0.5); background: ${avatarBorder}; z-index: 5;">
        <img src="${safeAvatar}" alt="${safeName}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        ${statusDot}
      </div>
    </div>
  `;
}

export function createUserIcon(L, user, isMapDark = false) {
  const broadcastMsg = typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message;
  const hasBroadcast = Boolean(broadcastMsg && broadcastMsg.trim());

  if (hasBroadcast) {
    return L.divIcon({
      className: "custom-broadcast-user-icon",
      html: getBroadcastUserIconHtml(user, isMapDark),
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -26],
    });
  }

  return L.divIcon({
    className: "custom-div-icon",
    html: getUserIconHtml(user),
    iconSize: [48, 80],
    iconAnchor: [24, 70],
    popupAnchor: [0, -60],
  });
}
