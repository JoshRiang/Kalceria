import { useEffect } from "react";
import { postLocation } from "@/lib/api";
import { prewarmOsmTiles } from "@/lib/osmTilePrewarmer";
import { createGpsCuratorState, curateGpsFix } from "../blend/gpsCurator";

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
    let watchId = null;
    let curator = createGpsCuratorState();
    let hasLiveGpsFix = false;

    const handleCuratedPosition = (pos) => {
      if (!isSubscribed || !pos?.coords) return;
      curator = curateGpsFix(curator, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp || Date.now(),
      });
      if (!curator.initialized || !Number.isFinite(curator.lat) || !Number.isFinite(curator.lng)) {
        return;
      }

      hasLiveGpsFix = true;
      const lat = curator.lat;
      const lng = curator.lng;
      setSelfLiveCoords({ lat, lng });

      try {
        window.__kalceriaCuratedGps = curator;
        window.dispatchEvent(new CustomEvent("kalceria:curated-gps", { detail: curator }));
        localStorage.setItem(
          `kalceria_last_known_coords_${currentUser.id}`,
          JSON.stringify({ lat, lng })
        );
      } catch (_) {}

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
      if (now - lastPostTimestamp >= 2500) {
        lastPostTimestamp = now;
        postLocation(lat, lng, {
          accuracy: curator.accuracy,
          heading: curator.heading,
          speed: curator.speed,
          isStationary: curator.isStationary,
        }).catch(() => {});
      }
    };

    const performKeepaliveSync = () => {
      if (!isSubscribed) return;
      if (hasLiveGpsFix && curator.initialized) {
        const now = Date.now();
        if (now - lastPostTimestamp >= 4000) {
          lastPostTimestamp = now;
          postLocation(curator.lat, curator.lng, {
            accuracy: curator.accuracy,
            heading: curator.heading,
            speed: curator.speed,
            isStationary: curator.isStationary,
          }).catch(() => {});
        }
        return;
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          handleCuratedPosition,
          () => {
            if (!isSubscribed || hasLiveGpsFix) return;
            const fbLat = selfLiveCoords?.lat || Number(currentUser.domicileLat);
            const fbLng = selfLiveCoords?.lng || Number(currentUser.domicileLng);
            if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
              const now = Date.now();
              if (now - lastPostTimestamp >= 4000) {
                lastPostTimestamp = now;
                postLocation(fbLat, fbLng).catch(() => {});
              }
            }
          },
          { timeout: 6000, enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        const fbLat = selfLiveCoords?.lat || Number(currentUser.domicileLat);
        const fbLng = selfLiveCoords?.lng || Number(currentUser.domicileLng);
        if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
          const now = Date.now();
          if (now - lastPostTimestamp >= 4000) {
            lastPostTimestamp = now;
            postLocation(fbLat, fbLng).catch(() => {});
          }
        }
      }
    };

    if (navigator.geolocation && typeof navigator.geolocation.watchPosition === "function") {
      try {
        watchId = navigator.geolocation.watchPosition(
          handleCuratedPosition,
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      } catch (_) {}
    }

    performKeepaliveSync();
    const keepaliveId = setInterval(performKeepaliveSync, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(keepaliveId);
      if (watchId !== null && navigator.geolocation?.clearWatch) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch (_) {}
      }
    };
  }, [currentUser?.id, presence, selfLiveCoords?.lat, selfLiveCoords?.lng, currentUser?.domicileLat, currentUser?.domicileLng, showStartup]);
}
