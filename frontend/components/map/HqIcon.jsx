// HqIcon.jsx
// Stateless utility for generating Leaflet HQ icon HTML

export function getHqIconHtml(isMapDark = false) {
  const fontColor = isMapDark ? "#ffffff" : "#000000";
  const iconColor = isMapDark ? "#ffffff" : "#000000";
  const textShadow = isMapDark
    ? "0 2px 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.85)"
    : "0 1px 3px rgba(255,255,255,1), 0 0 6px rgba(255,255,255,0.95)";

  const circleBg = isMapDark ? "rgba(10, 15, 26, 0.9)" : "rgba(255, 255, 255, 0.95)";
  const circleShadow = isMapDark
    ? "0 0 14px rgba(255,255,255,0.2), 0 3px 8px rgba(0,0,0,0.8)"
    : "0 0 10px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.2)";

  return `
    <div class="clean-hq-node" style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <div style="position: absolute; top: -38px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 800; color: ${fontColor}; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px; text-shadow: ${textShadow}; pointer-events: none; z-index: 10; text-align: center; line-height: 1.25;">
        Fresh Market <br> Bintaro
      </div>

      <!-- HQ round circle container with Home Icon inside -->
      <div style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${iconColor}; background: ${circleBg}; backdrop-filter: blur(4px); box-shadow: ${circleShadow}; display: flex; align-items: center; justify-content: center; color: ${iconColor}; transition: all 0.3s ease;">
        <div style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
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
