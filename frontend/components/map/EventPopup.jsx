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
  return String(value || "").replace(/\[CAT:[a-z_]+\]\s*/i, "").trim();
}

export function eventPopup(item) {
  const displayDesc = cleanDesc(item.description);
  const categoryId = getEventCategory(item);
  const cat = EVENT_CATEGORIES[categoryId] || EVENT_CATEGORIES.cafe;
  const creatorName = item.creator?.nickname || item.creator?.name || "Kalcerian";

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
      <!-- Clean description with dot removed as requested in picture 3 -->
      <div class="popup-status active" style="--border-color: #ff006e; padding-left: 14px;"><p style="font-style: italic;">${esc(displayDesc)}</p></div>
      <div class="popup-action-wrap"><div class="popup-action disabled">EXPIRES ${esc(new Date(item.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}</div></div>
    </div>
    <div class="popup-tail" style="--border-color: #ff006e"></div>
  `;
}
