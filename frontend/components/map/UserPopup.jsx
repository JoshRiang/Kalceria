// UserPopup.jsx
// popup HTML for leaflet markers — adapted for real backend data
function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function avatarUrl(user) {
  return user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.nickname || user.name || 'anon')}`;
}

export function userPopup(user) {
  const color = user.color || '#ffd60a';
  const message = user.broadcast?.message;
  const status = message
    ? `<div class="popup-status active"><span></span><p>"${esc(message)}"</p></div>`
    : ``;

  const action = `<a class="popup-action" href="/user/${esc(user.id)}" style="color: ${color}; border-color: ${color}44; background: ${color}11;">VISIT PROFILE</a>`;

  return `
    <div class="tactical-card" style="--border-color:${color}">
      <div class="scanlines"></div>
      <div class="popup-profile">
        <div class="popup-avatar" style="--border-color:${color}"><img src="${avatarUrl(user)}" alt="${esc(user.nickname || user.name)}"></div>
        <div>
          <strong style="color:${color}">${esc(user.name)}</strong>
          <small>${esc(user.district || '')}</small>
        </div>
      </div>
      ${status}
      <div class="popup-action-wrap">${action}</div>
    </div>
    <div class="popup-tail" style="--border-color:${color}"></div>
  `;
}
