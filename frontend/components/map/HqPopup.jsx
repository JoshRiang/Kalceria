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
    <div class="tactical-card hq-card" style="border: 1px solid rgba(255, 255, 255, 0.15) !important; border-left: 1px solid rgba(255, 255, 255, 0.15) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;">
      <div class="scanlines"></div>

      <div class="popup-profile" style="align-items: center; gap: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="width: 26px; height: 26px; min-width: 26px; display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%;">
            <path d="M18 5.5h-2.2v1.9l2.2 1.8V5.5zM12 3L2 12h3.5v9h5v-5.5h3v5.5h5v-9H22L12 3z"/>
          </svg>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0;">
          <strong style="color: #ffffff; font-size: 14px; font-weight: 700; line-height: 1.25; word-break: break-word;">${esc(hq.title)}</strong>
          <small style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin-top: 2px; font-weight: 400;">${esc(hq.role)}</small>
        </div>
      </div>
      <div class="popup-video" style="width: 100%; height: 120px; overflow: hidden; position: relative; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #000;">
        ${renderMediaFeed(mediaUrl)}
        <div style="position: absolute; top: 10px; left: 10px; z-index: 5;">
          <span style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: -0.025em; line-height: 1; text-shadow: 0 1px 4px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.9);">LIVE FEED</span>
        </div>
        <div class="scanlines" style="opacity: 0.2;"></div>
      </div>
      <div class="popup-status active" style="padding-left: 14px; border-top: 1px solid rgba(255, 255, 255, 0.08);"><p style="font-style: italic; color: rgba(255, 255, 255, 0.9);">${esc(hq.description)}</p></div>
    </div>
    <div class="popup-tail" style="background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent);"></div>
  `;
}
