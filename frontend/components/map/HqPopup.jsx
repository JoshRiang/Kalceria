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

function renderSingleMedia(url) {
  const cleanUrl = url || "/media/gifs/hq_feed_1.gif";
  const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(cleanUrl) || /^data:video/i.test(cleanUrl);

  if (isVideo) {
    return `
      <video 
        src="${esc(cleanUrl)}" 
        autoplay 
        loop 
        muted 
        playsinline 
        style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95; display: block;"
      ></video>
    `;
  }

  return `
    <img 
      src="${esc(cleanUrl)}" 
      alt="HQ Live Feed" 
      loading="lazy" 
      style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95; display: block;" 
    />
  `;
}

function renderMediaCarousel(mediaUrls) {
  const list = Array.isArray(mediaUrls)
    ? mediaUrls.filter(Boolean)
    : (mediaUrls ? [mediaUrls] : []);

  if (list.length === 0) {
    return renderSingleMedia("/media/gifs/hq_feed_1.gif");
  }
  if (list.length === 1) {
    return renderSingleMedia(list[0]);
  }

  const N = list.length;
  const period = N * 4;
  const activePercent = Math.max(1, Math.floor(90 / N));
  const fullPercent = Math.max(2, Math.floor(100 / N));
  const animName = `hqCarouselFade${N}`;

  const slidesHtml = list
    .map((url, i) => {
      const delay = i * 4;
      return `
        <div style="position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; animation: ${animName} ${period}s infinite; animation-delay: ${delay}s;">
          ${renderSingleMedia(url)}
        </div>
      `;
    })
    .join("");

  const indicatorsHtml = list
    .map((_, i) => {
      const delay = i * 4;
      return `
        <div style="flex: 1; height: 2px; border-radius: 2px; background: rgba(255, 255, 255, 0.25); overflow: hidden;">
          <div style="height: 100%; background: #ffffff; width: 0%; animation: hqIndicatorRoll${N} ${period}s infinite; animation-delay: ${delay}s;"></div>
        </div>
      `;
    })
    .join("");

  return `
    <style>
      @keyframes ${animName} {
        0% { opacity: 0; }
        1.5% { opacity: 1; }
        ${activePercent}% { opacity: 1; }
        ${fullPercent}% { opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes hqIndicatorRoll${N} {
        0% { width: 0%; opacity: 0.4; }
        1.5% { opacity: 1; }
        ${activePercent}% { width: 100%; opacity: 1; }
        ${fullPercent}% { width: 100%; opacity: 0.3; }
        100% { width: 0%; opacity: 0.3; }
      }
    </style>
    <div class="popup-carousel-container" style="position: relative; width: 100%; height: 100%; overflow: hidden; background: #000;">
      ${slidesHtml}
      <div style="position: absolute; top: 8px; left: 10px; right: 10px; z-index: 10; display: flex; gap: 4px; pointer-events: none;">
        ${indicatorsHtml}
      </div>
    </div>
  `;
}

const HQ_PALETTE = {
  blob1: "rgba(37, 99, 235, 0.38)", // Deep Blue
  blob2: "rgba(255, 214, 10, 0.30)", // Cyber Gold (HQ theme)
};

export function hqPopup(hq) {
  const mediaList = hq.mediaUrls || (hq.gifUrl ? [hq.gifUrl] : ["/media/gifs/hq_feed_1.gif"]);

  return `
    <div class="tactical-card hq-card" style="position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 18px !important; background: rgba(10, 15, 30, 0.45) !important; backdrop-filter: blur(20px) saturate(180%) !important; -webkit-backdrop-filter: blur(20px) saturate(180%) !important; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5) !important;">
      <!-- Dynamic Floating Glass Blobs (GPU Accelerated, Zero CPU Regression) -->
      <div class="card-dynamic-blobs">
        <div class="card-dynamic-blob-1" style="background: ${HQ_PALETTE.blob1};"></div>
        <div class="card-dynamic-blob-2" style="background: ${HQ_PALETTE.blob2};"></div>
      </div>

      <!-- Pure White Title (Not all capital) & Subtitle -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.15);">
        <strong style="color: #ffffff; font-size: 15px; font-weight: 700; line-height: 1.25; word-break: break-word;">${esc(hq.title)}</strong>
        <small style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin-top: 2px; font-weight: 400;">${esc(hq.role)}</small>
      </div>

      <!-- Rolling Dynamic Media Feed (Zero LIVE FEED text) -->
      <div class="popup-video" style="position: relative; z-index: 2; width: 100%; height: 120px; overflow: hidden; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #000;">
        ${renderMediaCarousel(mediaList)}
      </div>

      <!-- Description Text -->
      <div class="popup-status active" style="position: relative; z-index: 2; padding: 12px 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03);"><p style="font-style: italic; color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 13px; line-height: 1.4;">${esc(hq.description)}</p></div>
    </div>
    <div class="popup-tail" style="background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent);"></div>
  `;
}
