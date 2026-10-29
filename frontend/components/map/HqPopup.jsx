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

const HQ_PALETTE = {
  blob1: "rgba(37, 99, 235, 0.38)", // Deep Blue
  blob2: "rgba(255, 214, 10, 0.30)", // Cyber Gold (HQ theme)
};

export function hqPopup(hq) {
  const mediaUrl = hq.gifUrl || hq.videoUrl || "/media/gifs/hq-live.gif";

  return `
    <div class="tactical-card hq-card" style="position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 18px !important; background: rgba(10, 15, 30, 0.45) !important; backdrop-filter: blur(20px) saturate(180%) !important; -webkit-backdrop-filter: blur(20px) saturate(180%) !important; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5) !important;">
      <!-- Dynamic Floating Glass Blobs (GPU Accelerated, Zero CPU Regression) -->
      <div class="card-dynamic-blobs">
        <div class="card-dynamic-blob-1" style="background: ${HQ_PALETTE.blob1};"></div>
        <div class="card-dynamic-blob-2" style="background: ${HQ_PALETTE.blob2};"></div>
      </div>

      <!-- Pure White Title & Subtitle (NO HOME/HQ LOGO) -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.15);">
        <strong style="color: #ffffff; font-size: 15px; font-weight: 700; line-height: 1.25; word-break: break-word;">${esc(hq.title)}</strong>
        <small style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin-top: 2px; font-weight: 400;">${esc(hq.role)}</small>
      </div>

      <!-- Live Feed GIF / Video Banner -->
      <div class="popup-video" style="position: relative; z-index: 2; width: 100%; height: 120px; overflow: hidden; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #000;">
        ${renderMediaFeed(mediaUrl)}
        <div style="position: absolute; top: 10px; left: 10px; z-index: 5;">
          <span style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: -0.025em; line-height: 1; text-shadow: 0 1px 4px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.9);">LIVE FEED</span>
        </div>
      </div>

      <!-- Description Text -->
      <div class="popup-status active" style="position: relative; z-index: 2; padding: 12px 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03);"><p style="font-style: italic; color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 13px; line-height: 1.4;">${esc(hq.description)}</p></div>
    </div>
    <div class="popup-tail" style="background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent);"></div>
  `;
}
