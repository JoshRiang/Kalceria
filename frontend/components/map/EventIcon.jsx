// EventIcon.jsx
// Stateless utility for generating Leaflet event icon HTML
export function getEventIconHtml() {
  return `
    <div class="event-node">
      <div class="event-pulse"></div>
      <span>+</span>
    </div>
  `;
}

export function createEventIcon(L) {
  return L.divIcon({
    className: "custom-event-icon",
    html: getEventIconHtml(),
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}
