// EventPopup.jsx
// Stateless utility for generating event popup HTML for Leaflet
import { EVENT_CATEGORIES, getEventCategory } from "./EventIcon";

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
      return "/media/gifs/the-mentalist.gif";
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

export function eventPopup(item) {
  const displayDesc = cleanDesc(item.description);
  const categoryId = getEventCategory(item);
  const cat = EVENT_CATEGORIES[categoryId] || EVENT_CATEGORIES.cafe;
  const creatorName = item.creator?.nickname || item.creator?.name || "Kalcerian";
  const mediaUrl = extractMediaUrl(item);

  return `
    <div class="tactical-card event-card" style="--border-color: #ff006e">
      <div class="scanlines"></div>
      <div class="popup-profile" style="align-items: center; gap: 12px;">
        <!-- Clean category icon without dummy AB or + characters -->
        <div class="event-badge" style="--border-color: #ff006e; width: 34px; height: 34px; min-width: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 6px; color: #ff006e; background: rgba(255, 0, 110, 0.08);">
          ${cat.svg}
        </div>
        <!-- Event title with declarer name sitting directly underneath as subtitle -->
        <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0;">
          <strong style="color: #ff006e; font-size: 14px; font-weight: 700; line-height: 1.25; word-break: break-word;">${esc(item.title)}</strong>
          <small style="color: rgba(255, 255, 255, 0.75); font-size: 11px; margin-top: 2px; font-weight: 400;">${esc(creatorName)}</small>
        </div>
      </div>

      <!-- Live Feed GIF / Video Banner behaving exactly like HQ GIF -->
      <div class="popup-video" style="width: 100%; height: 120px; overflow: hidden; position: relative; border-top: 1px solid rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #000;">
        ${renderMediaFeed(mediaUrl)}
        <div style="position: absolute; top: 10px; left: 10px; z-index: 5;">
          <span style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; font-size: 11px; color: #ffffff; text-transform: uppercase; letter-spacing: -0.025em; line-height: 1; text-shadow: 0 1px 4px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.9);">LIVE FEED</span>
        </div>
        <div class="scanlines" style="opacity: 0.2;"></div>
      </div>

      <!-- Clean description with dot removed as requested in picture 3 -->
      <div class="popup-status active" style="--border-color: #ff006e; padding-left: 14px;"><p style="font-style: italic;">${esc(displayDesc)}</p></div>
      <div class="popup-action-wrap"><div class="popup-action disabled">EXPIRES ${esc(new Date(item.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}</div></div>
    </div>
    <div class="popup-tail" style="--border-color: #ff006e"></div>
  `;
}
