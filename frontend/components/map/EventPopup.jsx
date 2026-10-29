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

function extractMediaUrl(item) {
  if (item.mediaUrl) return item.mediaUrl;
  if (item.videoUrl) return item.videoUrl;
  if (item.gifUrl) return item.gifUrl;
  const match = String(item.description || "").match(/\[MEDIA:([^\]]+)\]/i);
  if (match) return match[1];

  // Default GIF based on category (Mentalist, Toothless, Office prioritized)
  const categoryId = getEventCategory(item);
  switch (categoryId) {
    case "cafe":
      return "/media/gifs/the-mentalist.gif";
    case "special":
      return "/media/gifs/dragon-toothless.gif";
    case "eat":
      return "/media/gifs/the-office.gif";
    case "discuss":
      return "/media/gifs/event_disc_1.gif";
    default:
      return "/media/gifs/the-office.gif";
  }
}

function renderMediaFeed(mediaUrl) {
  const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(mediaUrl) || /^data:video/i.test(mediaUrl);

  if (isVideo) {
    return `
      <video 
        src="${esc(mediaUrl)}" 
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
      src="${esc(mediaUrl)}" 
      alt="Live Feed"
      loading="lazy"
      style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85; display: block;"
    />
  `;
}

const EVENT_COLOR_PALETTES = [
  // Deep Blue & Neon Pink (Like Create Event Form)
  { blob1: "rgba(37, 99, 235, 0.40)", blob2: "rgba(236, 72, 153, 0.32)" },
  // Deep Blue & Radiant Gold
  { blob1: "rgba(37, 99, 235, 0.38)", blob2: "rgba(255, 214, 10, 0.30)" },
  // Emerald Green & Cyan
  { blob1: "rgba(16, 185, 129, 0.38)", blob2: "rgba(6, 182, 212, 0.32)" },
  // Violet Purple & Electric Pink
  { blob1: "rgba(147, 51, 234, 0.40)", blob2: "rgba(244, 63, 94, 0.32)" },
  // Amber Gold & Crimson Red
  { blob1: "rgba(245, 158, 11, 0.40)", blob2: "rgba(239, 68, 68, 0.30)" },
  // Cyber Turquoise & Royal Blue
  { blob1: "rgba(20, 184, 166, 0.40)", blob2: "rgba(59, 130, 246, 0.32)" },
  // Sunset Orange & Indigo
  { blob1: "rgba(249, 115, 22, 0.38)", blob2: "rgba(99, 102, 241, 0.32)" },
  // Hot Magenta & Electric Violet
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
  const mediaUrl = extractMediaUrl(item);
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

      <!-- Live Feed GIF / Video Banner behaving exactly like HQ GIF -->
      <div class="popup-video" style="position: relative; z-index: 2; width: 100%; height: 120px; overflow: hidden; border-top: 1px solid rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #000;">
        ${renderMediaFeed(mediaUrl)}
        <div style="position: absolute; top: 10px; left: 10px; z-index: 5;">
          <span style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: -0.025em; line-height: 1; text-shadow: 0 1px 4px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.9);">LIVE FEED</span>
        </div>
      </div>

      <!-- Clean description with pure white font -->
      <div class="popup-status active" style="position: relative; z-index: 2; padding: 12px 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03);"><p style="font-style: italic; color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 13px; line-height: 1.4;">${esc(displayDesc)}</p></div>
      <div class="popup-action-wrap" style="position: relative; z-index: 2; border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 10px 14px;"><div class="popup-action disabled" style="color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 9px; font-weight: 700;">EXPIRES ${esc(new Date(item.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}</div></div>
    </div>
    <div class="popup-tail" style="background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent);"></div>
  `;
}
