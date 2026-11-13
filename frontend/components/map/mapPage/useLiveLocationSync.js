import { useEffect } from "react";
import { postLocation } from "@/lib/api";
import { prewarmOsmTiles } from "@/lib/osmTilePrewarmer";

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
 * - hasInitialCenteredRef: React.MutableRefObject<boolean>
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
  hasInitialCenteredRef = null,
}) {
  // Sync live coordinates with backend ONLY when online (every 5s keepalive to refresh 15s Redis TTL)
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser?.id) return;
    if (presence !== "online") return;

    let isSubscribed = true;
    let lastPostTimestamp = 0;

    const performSync = () => {
      if (!isSubscribed) return;
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

            // CRITICAL FIX FOR MOBILE:
            // Background periodic location polling MUST NEVER redirect the camera
            // or close active popups while user is browsing or viewing cards.
            // Only perform setView if startup intro is still active, map has NOT yet centered,
            // and no popup is currently open.
            const isPopupOpen =
              typeof document !== "undefined" &&
              Boolean(
                document.querySelector(
                  ".leaflet-popup, .event-tactical-popup, .broadcast-tactical-popup, .broadcast-popup-box"
                )
              );

            if (showStartup && mapRef.current && !hasInitialCenteredRef?.current && !isPopupOpen) {
              try {
                mapRef.current.setView([lat, lng], 15, { animate: false });
                if (hasInitialCenteredRef) {
                  hasInitialCenteredRef.current = true;
                }
              } catch (_) {}
            }
            prewarmOsmTiles(lat, lng, 15);
            const now = Date.now();
            if (now - lastPostTimestamp >= 3000) {
              lastPostTimestamp = now;
              postLocation(lat, lng).catch(() => {});
            }
          },
          () => {
            if (!isSubscribed) return;
            // Fallback to active coordinates if GPS refresh has momentary delay
            const fbLat = selfLiveCoords?.lat || Number(currentUser.domicileLat);
            const fbLng = selfLiveCoords?.lng || Number(currentUser.domicileLng);
            if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
              const now = Date.now();
              if (now - lastPostTimestamp >= 3000) {
                lastPostTimestamp = now;
                postLocation(fbLat, fbLng).catch(() => {});
              }
            }
          },
          { timeout: 4000, enableHighAccuracy: false, maximumAge: 10000 }
        );
      } else {
        const fbLat = selfLiveCoords?.lat || Number(currentUser.domicileLat);
        const fbLng = selfLiveCoords?.lng || Number(currentUser.domicileLng);
        if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
          const now = Date.now();
          if (now - lastPostTimestamp >= 3000) {
            lastPostTimestamp = now;
            postLocation(fbLat, fbLng).catch(() => {});
          }
        }
      }
    };

    performSync();
    const keepaliveId = setInterval(performSync, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(keepaliveId);
    };
  }, [currentUser?.id, presence, selfLiveCoords?.lat, selfLiveCoords?.lng, currentUser?.domicileLat, currentUser?.domicileLng, showStartup]);
}
