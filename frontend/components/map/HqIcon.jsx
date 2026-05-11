// HqIcon.jsx
// Stateless utility for generating Leaflet HQ icon HTML
export function getHqIconHtml() {
  return `
    <div class="hq-node" style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
      <div class="hq-pulse" style="position: absolute; top: 0; left: 0; width: 60px; height: 60px; border-radius: 50%; border: 2px solid #ffd60a; opacity: 0; animation: hqPing 2s infinite cubic-bezier(0, 0, 0.2, 1);"></div>
      <div class="hq-bg" style="position: absolute; inset: 0; z-index: 1;">
        <svg viewBox="0 0 60 60" fill="none" style="width: 100%; height: 100%; filter: drop-shadow(0 0 12px rgba(255, 214, 10, 0.4));">
          <!-- Tactical Shield Shape (as requested) -->
          <path 
            d="M30 2 C10 2 4 12 4 30 C4 45 30 58 30 58 C30 58 56 45 56 30 C56 12 50 2 30 2 Z" 
            fill="#0a0e27" 
            stroke="#ffd60a" 
            stroke-width="3" 
            stroke-linejoin="round"
          />
          <path 
            d="M30 8 C16 8 10 16 10 30 C10 42 30 52 30 52 C30 52 50 42 50 30 C50 16 44 8 30 8 Z" 
            fill="rgba(255, 214, 10, 0.1)" 
            stroke="#ffd60a" 
            stroke-width="1" 
            stroke-dasharray="3 3" 
            opacity="0.5"
          />
        </svg>
      </div>
      <div class="hq-core" style="position: relative; z-index: 2; transform: translateY(-5px); width: 28px; height: 28px; color: #ffd60a; filter: drop-shadow(0 0 10px #ffd60a);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
