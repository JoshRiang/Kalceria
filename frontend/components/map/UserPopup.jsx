// UserPopup.jsx
// Stateless utility for generating user popup HTML for Leaflet
function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function avatar(seed) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function userPopup(user, contactUrl) {
  const contact = contactUrl(user.socialPlatform, user.socialLink);
  const message = user.broadcast?.message;
  const status = message ? `<div class="popup-status active"><span style="background:${user.color}; box-shadow:0 0 5px ${user.color};"></span><p>"${esc(message)}"</p></div>` : `<div class="popup-status"><span></span><p>[NO TRANSMISSION]</p></div>`;
  const action = contact ? `<a class="popup-action" href="${esc(contact)}" target="_blank" rel="noreferrer">VIEW PROFILE</a>` : `<div class="popup-action disabled">PROFILE UNAVAILABLE</div>`;

  return `
    <div class="tactical-card" style="--border-color:${user.color}">
      <div class="scanlines"></div>
      <div class="popup-profile">
        <div class="popup-avatar" style="--border-color:${user.color}"><img src="${avatar(user.avatarSeed)}" alt="${esc(user.nickname)}"></div>
        <div>
          <strong style="color:${user.color}">${esc(user.name)}</strong>
          <small>${esc(user.district)}</small>
        </div>
      </div>
      ${status}
      <div class="popup-action-wrap">${action}</div>
    </div>
    <div class="popup-tail" style="--border-color:${user.color}"></div>
  `;
}
