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
    <div class="tactical-card event-card" style="border: 1px solid rgba(255, 255, 255, 0.15) !important; border-left: 1px solid rgba(255, 255, 255, 0.15) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;">
      <div class="scanlines"></div>
      <div class="popup-profile" style="align-items: center; gap: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <!-- Icon without circle encapsulation -->
        <div style="width: 26px; height: 26px; min-width: 26px; display: flex; align-items: center; justify-content: center; color: #ffffff;">
          ${cat.svg}
        </div>
        <!-- Pure white event title with declarer subtitle -->
        <div style="display: flex; flex-direction: column; align-items: flex-start; min-width: 0;">
          <strong style="color: #ffffff; font-size: 14px; font-weight: 700; line-height: 1.25; word-break: break-word;">${esc(item.title)}</strong>
          <small style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin-top: 2px; font-weight: 400;">${esc(creatorName)}</small>
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

      <!-- Clean description with pure white font -->
      <div class="popup-status active" style="padding-left: 14px; border-top: 1px solid rgba(255, 255, 255, 0.08);"><p style="font-style: italic; color: rgba(255, 255, 255, 0.9);">${esc(displayDesc)}</p></div>
      <div class="popup-action-wrap" style="border-top: 1px solid rgba(255, 255, 255, 0.08);"><div class="popup-action disabled" style="color: rgba(255, 255, 255, 0.6); background: rgba(255, 255, 255, 0.06);">EXPIRES ${esc(new Date(item.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}</div></div>
    </div>
    <div class="popup-tail" style="background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2), transparent);"></div>
  `;
}
