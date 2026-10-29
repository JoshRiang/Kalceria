// HqIcon.jsx
// Stateless utility for generating Leaflet HQ icon HTML

export function getHqIconHtml(isMapDark = false) {
  const fontColor = isMapDark ? "#ffffff" : "#000000";
  const iconColor = isMapDark ? "#ffffff" : "#000000";
  const textShadow = isMapDark
    ? "0 2px 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.85)"
    : "0 1px 3px rgba(255,255,255,1), 0 0 6px rgba(255,255,255,0.95)";
  const iconShadow = isMapDark
    ? "drop-shadow(0 2px 4px rgba(0,0,0,0.95)) drop-shadow(0 0 6px rgba(255,255,255,0.4))"
    : "drop-shadow(0 1px 3px rgba(255,255,255,0.95)) drop-shadow(0 2px 5px rgba(0,0,0,0.4))";

  return `
    <div class="clean-hq-node" style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <div style="position: absolute; top: -38px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 800; color: ${fontColor}; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px; text-shadow: ${textShadow}; pointer-events: none; z-index: 10; text-align: center; line-height: 1.25;">
        Fresh Market <br> Bintaro
      </div>

      <!-- Generic Home Icon (no encapsulation, white/black per theme) -->
      <div style="width: 32px; height: 32px; color: ${iconColor}; filter: ${iconShadow}; display: flex; align-items: center; justify-content: center; transition: color 0.3s ease;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    </div>
  `;
}

export function createHqIcon(L, isMapDark = false) {
  return L.divIcon({
    className: "custom-clean-hq-icon",
    html: getHqIconHtml(isMapDark),
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}
