// EventIcon.jsx
// Stateless utility for generating Leaflet event icon HTML
import { escapeMapHtml, getSafeMapAvatarUrl } from "./UserIcon";

export const EVENT_CATEGORIES = {
  // Cafe Meeting: Combination of Black and White (from Picture 3, cannot be pure on just one color)
  cafe: {
    id: "cafe",
    label: "Cafe Meeting",
    svg: `<svg viewBox="0 0 24 24" style="width: 100%; height: 100%;" fill="none"><path d="M10 2c-.8 1.5.8 2.6 0 4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13.5 1.5c-.9 1.6.9 2.8 0 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4 9.5h13c0 5-3 7.8-6.5 7.8S4 14.5 4 9.5z" fill="#000000" stroke="#ffffff" stroke-width="0.75"/><ellipse cx="10.5" cy="9.5" rx="6" ry="1.6" fill="#ffffff" stroke="#000000" stroke-width="0.6"/><path d="M5.5 11c-.2 1.8 1.2 4 2.8 4.8" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/><path d="M17 10.5c2 0 3.5 1.2 3.5 2.8s-1.5 2.8-3.5 2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="10.5" cy="19.2" rx="8.5" ry="1.7" fill="#000000" stroke="#ffffff" stroke-width="0.6"/><ellipse cx="10.5" cy="18.8" rx="6" ry="1" fill="#ffffff"/></svg>`
  },
  // Something Special: Solid Exclamation Mark from Picture 1 (Full black or full white)
  special: {
    id: "special",
    label: "Something Special",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%;"><path d="M10.8 3h2.4l-.65 11h-1.1L10.8 3zM12 17.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5z"/></svg>`
  },
  // Eat Together: Solid Fork and Knife (Full black or full white)
  eat: {
    id: "eat",
    label: "Eat Together",
    svg: `<svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%;"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-7v8h2.5V22H21V2c-2.76 0-5 2.24-5 5z"/></svg>`
  },
  // Discuss More: Combination of Black and White figures + speech bubble (cannot be pure on just one color)
  discuss: {
    id: "discuss",
    label: "Discuss More",
    svg: `<svg viewBox="0 0 24 24" style="width: 100%; height: 100%;" fill="none"><path d="M9 2.5h6c1.8 0 3.2 1.2 3.2 2.8s-1.4 2.8-3.2 2.8h-1.5l-2.5 2.5v-2.5H9c-1.8 0-3.2-1.2-3.2-2.8S7.2 2.5 9 2.5z" fill="#000000" stroke="#ffffff" stroke-width="0.8"/><circle cx="10.5" cy="5.3" r="0.7" fill="#ffffff"/><circle cx="12" cy="5.3" r="0.7" fill="#ffffff"/><circle cx="13.5" cy="5.3" r="0.7" fill="#ffffff"/><circle cx="7.5" cy="13" r="2.5" fill="#000000" stroke="#ffffff" stroke-width="1"/><path d="M3 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill="#000000" stroke="#ffffff" stroke-width="1"/><circle cx="16.5" cy="13" r="2.5" fill="#ffffff" stroke="#000000" stroke-width="1.2"/><path d="M12 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill="#ffffff" stroke="#000000" stroke-width="1.2"/></svg>`
  }
};

export function getEventCategory(event) {
  if (event?.category && EVENT_CATEGORIES[event.category]) return event.category;
  const desc = event?.description || "";
  const match = desc.match(/\[CAT:([a-z_]+)\]/i);
  if (match && EVENT_CATEGORIES[match[1].toLowerCase()]) return match[1].toLowerCase();
  const lower = `${event?.title || ""} ${desc}`.toLowerCase();
  if (lower.includes("special") || lower.includes("!") || lower.includes("khusus")) return "special";
  if (lower.includes("eat") || lower.includes("makan") || lower.includes("food") || lower.includes("resto")) return "eat";
  if (lower.includes("discuss") || lower.includes("talk") || lower.includes("ngobrol")) return "discuss";
  return "cafe";
}

export function getEventIconHtml(event, isMapDark = false) {
  const categoryId = getEventCategory(event);
  const cat = EVENT_CATEGORIES[categoryId] || EVENT_CATEGORIES.cafe;
  
  // Icon color: white when dark mode, black when light mode (for solid icons like special and eat)
  const iconColor = isMapDark ? "#ffffff" : "#000000";
  const dropShadow = isMapDark
    ? "drop-shadow(0 2px 4px rgba(0,0,0,0.95)) drop-shadow(0 0 6px rgba(255,255,255,0.4))"
    : "drop-shadow(0 1px 3px rgba(255,255,255,0.95)) drop-shadow(0 2px 5px rgba(0,0,0,0.4))";

  // Profile picture of the user who declared the event
  const creatorUser = event?.creator || { name: event?.name || "Kalcerian" };
  const safeAvatar = escapeMapHtml(getSafeMapAvatarUrl(creatorUser));
  const safeCreator = escapeMapHtml(creatorUser.name || creatorUser.nickname || "Kalcerian");
  const avatarBorder = isMapDark ? "#0a0f1a" : "#ffffff";

  return `
    <div class="clean-event-node" style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <!-- Generic category event icon without encapsulation pin -->
      <div style="width: 32px; height: 32px; color: ${iconColor}; filter: ${dropShadow}; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;">
        ${cat.svg}
      </div>

      <!-- Right bottom: round profile picture of user who declared it -->
      <div style="position: absolute; right: -2px; bottom: -2px; width: 20px; height: 20px; border-radius: 50%; overflow: hidden; border: 2px solid ${avatarBorder}; box-shadow: 0 2px 6px rgba(0,0,0,0.5); background: ${avatarBorder}; z-index: 5;">
        <img src="${safeAvatar}" alt="${safeCreator}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
      </div>
    </div>
  `;
}

export function createEventIcon(L, event, isMapDark = false) {
  return L.divIcon({
    className: "custom-clean-event-icon",
    html: getEventIconHtml(event, isMapDark),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}
