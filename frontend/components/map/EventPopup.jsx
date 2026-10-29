// EventPopup.jsx
// Stateless utility for generating event popup HTML for Leaflet
import { getEventCategory } from "./EventIcon";

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanDesc(value) {
  return String(value || "")
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .trim();
}

function extractMediaList(item) {
  if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
    return item.mediaUrls.filter(Boolean);
  }
  if (item.mediaUrl) {
    if (item.mediaUrl.includes(",")) {
      return item.mediaUrl.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [item.mediaUrl];
  }
  if (item.videoUrl) return [item.videoUrl];
  if (item.gifUrl) return [item.gifUrl];
  const match = String(item.description || "").match(/\[MEDIA:([^\]]+)\]/i);
  if (match) {
    const raw = match[1];
    if (raw.includes(",")) {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [raw];
  }

  // Fallback GIFs based on category
  const categoryId = getEventCategory(item);
  switch (categoryId) {
    case "cafe":
      return ["/media/gifs/event_cafe_1.gif", "/media/gifs/event_cafe_2.gif"];
    case "special":
      return ["/media/gifs/event_spec_1.gif", "/media/gifs/event_spec_2.gif", "/media/gifs/event_spec_3.gif"];
    case "eat":
      return ["/media/gifs/event_eat_1.gif", "/media/gifs/event_eat_2.gif"];
    case "discuss":
      return ["/media/gifs/event_disc_1.gif", "/media/gifs/event_disc_2.gif"];
    default:
      return ["/media/gifs/the-office.gif"];
  }
}

function renderSingleMedia(url) {
  const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(url) || /^data:video/i.test(url);

  if (isVideo) {
    return `
      <video 
        src="${esc(url)}" 
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
      src="${esc(url)}" 
      alt="Event Live Feed" 
      loading="lazy" 
      style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95; display: block;" 
    />
  `;
}

function renderMediaCarousel(mediaList) {
  const list = Array.isArray(mediaList)
    ? mediaList.filter(Boolean)
    : (mediaList ? [mediaList] : []);

  if (list.length === 0) {
    return renderSingleMedia("/media/gifs/event_cafe_1.gif");
  }
  if (list.length === 1) {
    return renderSingleMedia(list[0]);
  }

  const N = list.length;
  const period = N * 4;
  const activePercent = Math.max(1, Math.floor(90 / N));
  const fullPercent = Math.max(2, Math.floor(100 / N));
  const animName = `eventCarouselFade${N}`;

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
          <div style="height: 100%; background: #ffffff; width: 0%; animation: eventIndicatorRoll${N} ${period}s infinite; animation-delay: ${delay}s;"></div>
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
      @keyframes eventIndicatorRoll${N} {
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

const EVENT_COLOR_PALETTES = [
  { blob1: "rgba(37, 99, 235, 0.40)", blob2: "rgba(236, 72, 153, 0.32)" },
  { blob1: "rgba(37, 99, 235, 0.38)", blob2: "rgba(255, 214, 10, 0.30)" },
  { blob1: "rgba(16, 185, 129, 0.38)", blob2: "rgba(6, 182, 212, 0.32)" },
  { blob1: "rgba(147, 51, 234, 0.40)", blob2: "rgba(244, 63, 94, 0.32)" },
  { blob1: "rgba(245, 158, 11, 0.40)", blob2: "rgba(239, 68, 68, 0.30)" },
  { blob1: "rgba(20, 184, 166, 0.40)", blob2: "rgba(59, 130, 246, 0.32)" },
  { blob1: "rgba(249, 115, 22, 0.38)", blob2: "rgba(99, 102, 241, 0.32)" },
  { blob1: "rgba(217, 70, 239, 0.40)", blob2: "rgba(124, 58, 237, 0.32)" },
];

function getEventPalette(item) {
  const seed = String(item?.id || item?.title || item?.createdAt || "event");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % EVENT_COLOR_PALETTES.length;
  return EVENT_COLOR_PALETTES[index];
}

export function eventPopup(item) {
  const displayDesc = cleanDesc(item.description);
  const creatorName = item.creator?.nickname || item.creator?.name || "Kalcerian";
  const mediaList = extractMediaList(item);
  const palette = getEventPalette(item);

  return `
    <div class="tactical-card event-card" style="position: relative; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.15) !important; border-radius: 18px !important; background: rgba(10, 15, 30, 0.45) !important; backdrop-filter: blur(20px) saturate(180%) !important; -webkit-backdrop-filter: blur(20px) saturate(180%) !important; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5) !important;">
      <!-- Dynamic Floating Glass Blobs (Random Color Pair per Event) -->
      <div class="card-dynamic-blobs">
        <div class="card-dynamic-blob-1" style="background: ${palette.blob1};"></div>
        <div class="card-dynamic-blob-2" style="background: ${palette.blob2};"></div>
      </div>

      <!-- Pure White Title & Declarer (NO LOGO/ICON) -->
      <div class="popup-profile" style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.15);">
        <strong style="color: #ffffff; font-size: 15px; font-weight: 700; line-height: 1.25; word-break: break-word;">${esc(item.title)}</strong>
        <small style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin-top: 2px; font-weight: 400;">${esc(creatorName)}</small>
      </div>

      <!-- Dynamic Rolling Media Carousel (Zero LIVE FEED text) -->
      <div class="popup-video" style="position: relative; z-index: 2; width: 100%; height: 120px; overflow: hidden; border-top: 1px solid rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #000;">
        ${renderMediaCarousel(mediaList)}
      </div>

      <!-- Clean description with pure white font -->
      <div class="popup-status active" style="position: relative; z-index: 2; padding: 12px 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03);"><p style="font-style: italic; color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 13px; line-height: 1.4;">${esc(displayDesc)}</p></div>
      <div class="popup-action-wrap" style="position: relative; z-index: 2; border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 10px 14px;"><div class="popup-action disabled" style="color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 9px; font-weight: 700;">EXPIRES ${esc(new Date(item.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}</div></div>
    </div>
    <div class="popup-tail" style="background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent);"></div>
  `;
}
