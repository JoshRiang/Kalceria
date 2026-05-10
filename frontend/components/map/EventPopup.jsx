// EventPopup.jsx
// Stateless utility for generating event popup HTML for Leaflet
function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function eventPopup(item) {
  return `
    <div class="tactical-card event-card" style="--border-color: #ff006e">
      <div class="scanlines"></div>
      <div class="popup-profile">
        <div class="event-badge" style="--border-color: #ff006e">+</div>
        <div>
          <strong style="color: #ff006e">${esc(item.title)}</strong>
          <small>${esc(item.creator?.nickname || item.creator?.name || "Kalcerian")}</small>
        </div>
      </div>
      <div class="popup-status active" style="--border-color: #ff006e"><span style="background: #ff006e; box-shadow: 0 0 5px #ff006e"></span><p>${esc(item.description)}</p></div>
      <div class="popup-action-wrap"><div class="popup-action disabled">EXPIRES ${esc(new Date(item.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}</div></div>
    </div>
    <div class="popup-tail" style="--border-color: #ff006e"></div>
  `;
}
