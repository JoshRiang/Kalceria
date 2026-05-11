// EventIcon.jsx
// Stateless utility for generating Leaflet event icon HTML
// EventIcon.jsx
// Stateless utility for generating Leaflet event icon HTML
export function getEventIconHtml(name = "??") {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return `
    <div class="event-node" style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
      <div class="event-pulse" style="position: absolute; top: 50%; left: 50%; width: 50px; height: 50px; border-radius: 50%; border: 2.5px solid #ff006e; opacity: 0; animation: radarPing 2.5s infinite cubic-bezier(0, 0, 0.2, 1); transform: translate(-50%, -50%); pointer-events: none;"></div>
      <div class="event-bg" style="position: absolute; inset: 0; z-index: 1;">

        <svg viewBox="0 0 60 60" fill="none" style="width: 100%; height: 100%; filter: drop-shadow(0 0 10px rgba(255, 0, 110, 0.4));">
          <!-- Tactical Shield Shape (matching HQ) -->
          <path 
            d="M30 2 C10 2 4 12 4 30 C4 45 30 58 30 58 C30 58 56 45 56 30 C56 12 50 2 30 2 Z" 
            fill="#0a0e27" 
            stroke="#ff006e" 
            stroke-width="3" 
            stroke-linejoin="round"
          />
          <path 
            d="M30 8 C16 8 10 16 10 30 C10 42 30 52 30 52 C30 52 50 42 50 30 C50 16 44 8 30 8 Z" 
            fill="rgba(255, 0, 110, 0.05)" 
            stroke="#ff006e" 
            stroke-width="0.5" 
            stroke-dasharray="2 2" 
            opacity="0.3"
          />
        </svg>
      </div>
      <div class="event-initials" style="position: relative; z-index: 2; transform: translateY(-3px) translateX(2px); font-family: 'ROGBOLD', 'Inter', sans-serif; font-size: 18px; font-weight: 900; color: #ff006e; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 12px rgba(255, 0, 110, 1);">
        ${initials}
      </div>

    </div>
  `;
}

export function createEventIcon(L, event) {
  const creatorName = event?.creator?.name || event?.creator?.nickname || "?";
  return L.divIcon({
    className: "custom-event-icon",
    html: getEventIconHtml(creatorName),
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  });
}

