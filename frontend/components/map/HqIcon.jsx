// HqIcon.jsx
// Stateless utility for generating Leaflet HQ icon HTML
export function getHqIconHtml() {
  return `
    <div class="hq-node">
      <div class="hq-pulse"></div>
      <div class="hq-core">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 21h18M3 10l9-7 9 7v11H3V10z" />
          <path d="M9 21V12h6v9" />
        </svg>
      </div>
    </div>
  `;
}

export function createHqIcon(L) {
  return L.divIcon({
    className: "custom-hq-icon",
    html: getHqIconHtml(),
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });
}
