// UserPopup.jsx
// Discord-style layout popup & minimalist 2D broadcast message box for Leaflet markers
import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function avatarUrl(user) {
  const candidate = resolvePersistentAvatarUrl(user);
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nickname || user?.id || user?.name || "anon")}`;
  if (typeof candidate !== "string" || candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  if (/^data:image\/(?:webp|png|jpeg|jpg|gif);base64,[A-Za-z0-9+/=\s]+$/.test(candidate)) return candidate;
  if (candidate.length > 2048) return fallback;
  if (candidate.startsWith("/")) return candidate;
  try { return new URL(candidate).protocol === "https:" ? candidate : fallback; } catch { return fallback; }
}

function formatJoinDate(dateStr) {
  if (!dateStr) return "Veteran";
  const date = new Date(dateStr);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatWIBTime(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now);
    }
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "11:28";
  }
}

export function getBroadcastMessageBoxHtml(user, isMapDark = false) {
  const displayName = user?.nickname || user?.name || "Kalcerian";
  const safeName = esc(displayName);
  const rawMessage = typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message;
  const safeMessage = esc(rawMessage || "");
  const timeInput = user?.broadcast?.createdAt || user?.updatedAt || user?.createdAt;
  const releaseTime = formatWIBTime(timeInput);

  const bgColor = isMapDark ? "#000000" : "#ffffff";
  const textColor = isMapDark ? "#ffffff" : "#000000";
  const borderColor = isMapDark ? "#ffffff" : "#000000";
  const timeColor = isMapDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.55)";
  const shadow = isMapDark
    ? "0 4px 20px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.4)"
    : "0 4px 16px rgba(0, 0, 0, 0.18)";

  return `
    <div class="broadcast-popup-box" style="
      position: relative;
      width: 250px;
      max-width: min(280px, 82vw);
      padding: 12px 14px 10px 14px;
      background: ${bgColor};
      border: 1.5px solid ${borderColor};
      border-radius: 12px;
      box-shadow: ${shadow};
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: left;
    ">
      <!-- Top Left: User Name (Picture 5 style: clean Arial, firm, medium weight, not all-caps) -->
      <div style="
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.25;
        color: ${textColor};
        letter-spacing: -0.01em;
      ">${safeName}</div>

      <!-- Message Text (Arial no bold and firm, not all capital) -->
      <div style="
        font-family: Arial, sans-serif;
        margin-top: 6px;
        margin-bottom: 8px;
        font-size: 13.5px;
        font-weight: 400;
        line-height: 1.42;
        color: ${textColor};
        word-break: break-word;
        white-space: pre-wrap;
      ">${safeMessage}</div>

      <!-- Bottom Right: Release Time (e.g. 11:28, tiny font, no bold, relevant style) -->
      <div style="
        font-family: Arial, sans-serif;
        align-self: flex-end;
        font-size: 11px;
        font-weight: 400;
        line-height: 1;
        color: ${timeColor};
        margin-top: 2px;
      ">${releaseTime}</div>

      <!-- Bottom-Left Speech Bubble Tail (Picture 4 style) -->
      <div style="
        position: absolute;
        bottom: -7.5px;
        left: 20px;
        width: 12px;
        height: 7.5px;
        overflow: hidden;
        pointer-events: none;
      ">
        <div style="
          width: 11px;
          height: 11px;
          background: ${bgColor};
          border-right: 1.5px solid ${borderColor};
          border-bottom: 1.5px solid ${borderColor};
          transform: rotate(45deg);
          margin-top: -6px;
          margin-left: 0.5px;
        "></div>
      </div>
    </div>
  `;
}

const svgIcons = {
  IG: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  WA: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  TW: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
};

export function userPopup(user, isMapDark = false, forceProfile = false) {
  const broadcastMsg = typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message;
  if (!forceProfile && broadcastMsg && broadcastMsg.trim()) {
    return getBroadcastMessageBoxHtml(user, isMapDark);
  }

  const color = typeof user?.color === "string" && /^#[\da-f]{3,8}$/i.test(user.color) ? user.color : "#ffd60a";
  const message = user?.broadcast?.message;

  // Build social rows
  const socials = [
    {
      key: "IG",
      label: "Instagram",
      icon: svgIcons.IG,
      value: user?.socialPlatform === "IG" ? user?.socialLink : null,
      brandColor: "#e4405f",
    },
    {
      key: "WA",
      label: "WhatsApp",
      icon: svgIcons.WA,
      value: user?.socialPlatform === "WA" ? user?.socialLink : null,
      brandColor: "#25d366",
    },
    {
      key: "TW",
      label: "X (Twitter)",
      icon: svgIcons.TW,
      value: null,
      brandColor: "#a0a0a0",
    },
  ];

  const socialHtml = socials
    .map((s) => {
      const connected = !!s.value;
      return `
      <div class="dc-conn-row dc-conn-${s.key} ${connected ? "connected" : ""}">
        <div class="dc-conn-icon" style="color:${s.brandColor}">${s.icon}</div>
        <div class="dc-conn-info">
          <span class="dc-conn-platform">${s.label}</span>
          <span class="dc-conn-handle">${connected ? esc(s.value) : "Not connected"}</span>
        </div>
      </div>
    `;
    })
    .join("");

  const statusSection = message
    ? `<div class="dc-section">
        <div class="dc-section-label">Status</div>
        <div class="dc-status-bubble">
          <p class="dc-status-text">${esc(message)}</p>
        </div>
      </div>`
    : "";

  return `
    <div class="dc-card" style="--accent:${color}">
      <!-- Internal Glows matching Kalcerian panel -->
      <div style="position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0;">
        <div style="position:absolute; top:-10%; left:-10%; width:60%; height:50%; background:rgba(8,145,178,0.07); border-radius:50%; filter:blur(60px);"></div>
        <div style="position:absolute; bottom:-15%; right:-10%; width:60%; height:50%; background:rgba(88,28,135,0.07); border-radius:50%; filter:blur(70px);"></div>
      </div>
      <div class="dc-banner"></div>

      <div class="dc-header">
        <div class="dc-avatar-ring">
          <div class="dc-avatar-img"><img src="${esc(avatarUrl(user))}" alt="${esc(user?.nickname || user?.name || '')}"></div>
          <div class="dc-status-dot ${user?.isOnline === false ? 'offline' : ''}"></div>
        </div>
        <div class="dc-header-info">
          <div class="dc-display-name" style="color:${color}">${esc(user?.name || '')}</div>
          ${user?.nickname ? `<div class="dc-username">@${esc(user.nickname)}</div>` : ""}
          ${user?.district && !/^(scanning|unknown)/i.test(user.district.trim()) ? `<div class="dc-sector">${esc(user.district)}</div>` : ""}
        </div>
      </div>

      <div class="dc-body">
        ${statusSection}

        <div class="dc-section">
          <div class="dc-section-label">Kalcerian since</div>
          <div class="dc-since-value">${formatJoinDate(user?.createdAt)}</div>
        </div>

        <div class="dc-section">
          <div class="dc-section-label">Connections</div>
          <div class="dc-conn-list">${socialHtml}</div>
        </div>

        <a class="dc-action-btn" href="/user/${esc(user?.id)}">View Profile</a>
      </div>
    </div>
    <div class="popup-tail" style="--border-color:${color}"></div>
  `;
}
