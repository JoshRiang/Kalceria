// UserPopup.jsx
// Discord-style layout popup for leaflet map markers
function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function avatarUrl(user) {
  return (
    user.profilePicture ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.nickname || user.name || "anon")}`
  );
}

function formatJoinDate(dateStr) {
  if (!dateStr) return "Veteran";
  const date = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

const svgIcons = {
  IG: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  WA: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  TW: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
};

export function userPopup(user) {
  const color = user.color || "#ffd60a";
  const message = user.broadcast?.message;

  // Build social rows
  const socials = [
    {
      key: "IG",
      label: "Instagram",
      icon: svgIcons.IG,
      value: user.socialPlatform === "IG" ? user.socialLink : null,
      brandColor: "#e4405f",
    },
    {
      key: "WA",
      label: "WhatsApp",
      icon: svgIcons.WA,
      value: user.socialPlatform === "WA" ? user.socialLink : null,
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
      <div class="dc-conn-row ${connected ? "connected" : ""}">
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
          <div class="dc-avatar-img"><img src="${avatarUrl(user)}" alt="${esc(user.nickname || user.name)}"></div>
          <div class="dc-status-dot ${user.isOnline === false ? 'offline' : ''}"></div>
        </div>
        <div class="dc-header-info">
          <div class="dc-display-name" style="color:${color}">${esc(user.name)}</div>
          ${user.nickname ? `<div class="dc-username">@${esc(user.nickname)}</div>` : ""}
          <div class="dc-sector">${esc(user.district || "Unknown Sector")}</div>
        </div>
      </div>

      <div class="dc-body">
        ${statusSection}

        <div class="dc-section">
          <div class="dc-section-label">Kalcerian since</div>
          <div class="dc-since-value">${formatJoinDate(user.createdAt)}</div>
        </div>

        <div class="dc-section">
          <div class="dc-section-label">Connections</div>
          <div class="dc-conn-list">${socialHtml}</div>
        </div>

        <a class="dc-action-btn" href="/user/${esc(user.id)}">View Profile</a>
      </div>
    </div>
    <div class="popup-tail" style="--border-color:${color}"></div>
  `;
}
