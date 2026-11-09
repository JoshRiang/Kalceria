export const DEFAULT_CENTER = [-6.2735, 106.7150];

export function getInstantInitialCenter(currentUser = null) {
  if (typeof window !== "undefined" && currentUser?.id) {
    try {
      const userCoordKey = `kalceria_last_known_coords_${currentUser.id}`;
      const raw = localStorage.getItem(userCoordKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Number.isFinite(parsed?.lat) &&
          Number.isFinite(parsed?.lng) &&
          Math.abs(parsed.lat) <= 90 &&
          Math.abs(parsed.lng) <= 180
        ) {
          return [Number(parsed.lat), Number(parsed.lng)];
        }
      }
    } catch (_) {}
  }
  if (
    currentUser &&
    Number.isFinite(Number(currentUser.domicileLat)) &&
    Number.isFinite(Number(currentUser.domicileLng)) &&
    Math.abs(Number(currentUser.domicileLat)) <= 90 &&
    Math.abs(Number(currentUser.domicileLng)) <= 180
  ) {
    return [Number(currentUser.domicileLat), Number(currentUser.domicileLng)];
  }
  return DEFAULT_CENTER;
}

export function stripDynamicUptime(html) {
  return String(html || "")
    .replace(
      /(data-event-uptime="[^"]+"[^>]*>)\d{2}:\d{2}:\d{2}(<\/span>)/g,
      "$100:00:00$2"
    )
    .replace(
      /(data-broadcast-uptime="[^"]+"[^>]*>)[^<]*(<\/span>)/g,
      "$10m$2"
    );
}

export function tickAllEventUptimeElements() {
  if (typeof document === "undefined") return;
  const now = Date.now();

  // 1. Event uptime elements (hh:mm:ss)
  const eventNodes = document.querySelectorAll("[data-event-uptime]");
  if (eventNodes && eventNodes.length > 0) {
    eventNodes.forEach((el) => {
      const startMs = Number(el.getAttribute("data-event-uptime"));
      if (!Number.isFinite(startMs) || startMs <= 0) return;
      const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
      const h = String(Math.floor(diffSec / 3600)).padStart(2, "0");
      const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
      const s = String(diffSec % 60).padStart(2, "0");
      const nextText = `${h}:${m}:${s}`;
      if (el.textContent !== nextText) {
        el.textContent = nextText;
      }
    });
  }

  // 2. Broadcast uptime elements (0m, 15m, 1h 32m) - auto purge at 24h
  const broadcastNodes = document.querySelectorAll("[data-broadcast-uptime]");
  if (broadcastNodes && broadcastNodes.length > 0) {
    broadcastNodes.forEach((el) => {
      const startMs = Number(el.getAttribute("data-broadcast-uptime"));
      if (!Number.isFinite(startMs) || startMs <= 0) return;
      const diffMs = Math.max(0, now - startMs);

      // Auto-purge when touching 24h
      if (diffMs >= 24 * 60 * 60 * 1000) {
        const userId = el.getAttribute("data-user-id");
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kalceria:purge-expired-broadcast", {
              detail: { userId },
            })
          );
        }
        const box = el.closest(".broadcast-box") || el.closest(".leaflet-popup");
        if (box && box.parentElement) {
          box.style.display = "none";
        }
        return;
      }

      const totalMin = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const nextText = h > 0 ? `${h}h ${m}m` : `${m}m`;
      if (el.textContent !== nextText) {
        el.textContent = nextText;
      }
    });
  }
}

export async function loadLeaflet() {
  if (typeof window === "undefined") return null;
  const Leaflet = await import("leaflet");
  const L = Leaflet.default || Leaflet;
  window.L = L;
  return L;
}
