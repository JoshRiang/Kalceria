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
      <div class="popup-video" style="width: 100%; height: 120px; overflow: hidden; position: relative; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: #000;">
        <video 
          src="${hq.videoUrl}" 
          autoplay 
          loop 
          muted 
          playsinline 
          style="width: 100%; height: 100%; object-fit: cover; opacity: 0.7;"
        ></video>
        <div style="position: absolute; top: 10px; left: 10px; display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; background: #ff0000; border-radius: 50%; animation: pulse 1s infinite;"></span>
          <span style="font-family: monospace; font-size: 8px; color: #ffd60a; text-transform: uppercase; letter-spacing: 1px; font-weight: 900; text-shadow: 0 0 5px #ffd60a;">REC :: HQ-CAM-01</span>
        </div>
        <div class="scanlines" style="opacity: 0.2;"></div>
      </div>
      <div class="popup-status active" style="--border-color: #ffd60a"><span style="background: #ffd60a; box-shadow: 0 0 5px #ffd60a"></span><p>${esc(hq.description)}</p></div>
      <div class="popup-action-wrap">
        <button class="popup-action hq-enter-btn" onclick="window.dispatchEvent(new CustomEvent('openHq'))">ENTER HEADQUARTER</button>
      </div>

    </div>
    <div class="popup-tail" style="--border-color: #ffd60a"></div>
  `;
}
