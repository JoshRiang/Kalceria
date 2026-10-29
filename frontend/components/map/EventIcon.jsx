// EventIcon.jsx
// Stateless utility for generating Leaflet event icon HTML
import { escapeMapHtml, getSafeMapAvatarUrl } from "./UserIcon";

export const EVENT_CATEGORIES = {
  cafe: {
    id: "cafe",
    label: "Cafe Meeting",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`
  },
  special: {
    id: "special",
    label: "Something Special",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
  },
  eat: {
    id: "eat",
    label: "Eat Together",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><line x1="15" y1="11" x2="15" y2="22"></line><path d="M6 2v20"></path><path d="M6 2c2 0 3 2 3 5s-1 5-3 5"></path></svg>`
  },
  discuss: {
    id: "discuss",
    label: "Discuss More",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
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
  
  // Icon color: white when dark mode, black when light mode (no encapsulation pin)
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
