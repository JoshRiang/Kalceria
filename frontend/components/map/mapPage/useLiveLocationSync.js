import { useEffect } from "react";
import { postLocation } from "@/lib/api";
import { prewarmOsmTiles } from "@/lib/osmTilePrewarmer";

// Module-scoped synchronization state ensuring zero React hook count divergence (IL-2 & K3)
let lastLocationSyncTimestamp = 0;
let cachedLiveCoords = null;

/**
 * useLiveLocationSync
 * Hook Ledger Position: M5 (Live coordinate synchronization with backend)
 *
 * Input:
 * - currentUser: object
 * - presence: string
 * - selfLiveCoords: object
 * - showStartup: boolean
 * - mapRef: React.MutableRefObject
 * - setSelfLiveCoords: React.Dispatch<React.SetStateAction<any>>
 *
 * Output: void
 */
export function useLiveLocationSync({
  currentUser,
  presence,
  selfLiveCoords,
  showStartup,
  mapRef,
  setSelfLiveCoords,
}) {
  if (selfLiveCoords && (selfLiveCoords.lat || selfLiveCoords.lng)) {
    cachedLiveCoords = selfLiveCoords;
  }

  // Sync live coordinates with backend ONLY when online (keepalive every 8s to refresh 15s Redis TTL)
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser?.id) return;
    if (presence !== "online") return;

    let isSubscribed = true;

    const performSync = () => {
      if (!isSubscribed) return;
      const now = Date.now();
      // Client-side rate-limit gate: prevent firing faster than 4000ms
      // (Guarantees zero 429 Too Many Requests against backend 3s cooldown)
      if (now - lastLocationSyncTimestamp < 4000) return;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isSubscribed) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setSelfLiveCoords({ lat, lng });
            try {
              localStorage.setItem(`kalceria_last_known_coords_${currentUser.id}`, JSON.stringify({ lat, lng }));
            } catch (_) {}
            if (showStartup && mapRef.current) {
              mapRef.current.setView([lat, lng], 15, { animate: false });
            }
            prewarmOsmTiles(lat, lng, 15);
            lastLocationSyncTimestamp = Date.now();
            postLocation(lat, lng).catch(() => {});
          },
          () => {
            if (!isSubscribed) return;
            // Fallback to active coordinates if GPS refresh has momentary delay
            const fbLat = cachedLiveCoords?.lat || selfLiveCoords?.lat || Number(currentUser.domicileLat);
            const fbLng = cachedLiveCoords?.lng || selfLiveCoords?.lng || Number(currentUser.domicileLng);
            if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
              lastLocationSyncTimestamp = Date.now();
              postLocation(fbLat, fbLng).catch(() => {});
            }
          },
          { timeout: 4000, enableHighAccuracy: false, maximumAge: 15000 }
        );
      } else {
        const fbLat = cachedLiveCoords?.lat || selfLiveCoords?.lat || Number(currentUser.domicileLat);
        const fbLng = cachedLiveCoords?.lng || selfLiveCoords?.lng || Number(currentUser.domicileLng);
        if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
          lastLocationSyncTimestamp = Date.now();
          postLocation(fbLat, fbLng).catch(() => {});
        }
      }
    };

    performSync();
    const keepaliveId = setInterval(performSync, 8000);
    return () => {
      isSubscribed = false;
      clearInterval(keepaliveId);
    };
  }, [currentUser?.id, presence, currentUser?.domicileLat, currentUser?.domicileLng]);
}
