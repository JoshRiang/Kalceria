// HqPopup.jsx
// Stateless utility for generating HQ popup HTML for Leaflet
function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function hqPopup(hq) {
  return `
    <div class="tactical-card hq-card" style="--border-color: #ffd60a">
      <div class="scanlines"></div>
      <div class="popup-profile">
        <div class="hq-badge" style="--border-color: #ffd60a">HQ</div>
        <div>
          <strong style="color: #ffd60a">${esc(hq.title)}</strong>
          <small>${esc(hq.role)}</small>
        </div>
      </div>
      <div class="popup-status active" style="--border-color: #ffd60a"><span style="background: #ffd60a; box-shadow: 0 0 5px #ffd60a"></span><p>${esc(hq.description)}</p></div>
      <div class="popup-action-wrap">
        <button class="popup-action hq-enter-btn" onclick="window.dispatchEvent(new CustomEvent('openHq'))">VIEW DETAIL</button>
      </div>
    </div>
    <div class="popup-tail" style="--border-color: #ffd60a"></div>
  `;
}
