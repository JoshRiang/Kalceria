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

function renderMediaFeed(mediaUrl) {
  const url = mediaUrl || "/media/gifs/hq-live.gif";
  const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);

  if (isVideo) {
    return `
      <video 
        src="${esc(url)}" 
        autoplay 
        loop 
        muted 
        playsinline 
        style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; display: block;"
      ></video>
    `;
  }

  return `
    <img 
      src="${esc(url)}" 
      alt="Live Feed"
      loading="lazy"
      style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; display: block;"
    />
  `;
}

export function hqPopup(hq) {
  const mediaUrl = hq.gifUrl || hq.videoUrl || "/media/gifs/hq-live.gif";

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
        ${renderMediaFeed(mediaUrl)}
        <div style="position: absolute; top: 10px; left: 10px; z-index: 5;">
          <span style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: -0.025em; line-height: 1; text-shadow: 0 1px 4px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.9);">LIVE FEED</span>
        </div>
        <div class="scanlines" style="opacity: 0.2;"></div>
      </div>
      <div class="popup-status active" style="--border-color: #ffd60a; padding-left: 14px;"><p style="font-style: italic;">${esc(hq.description)}</p></div>
    </div>
    <div class="popup-tail" style="--border-color: #ffd60a"></div>
  `;
}
