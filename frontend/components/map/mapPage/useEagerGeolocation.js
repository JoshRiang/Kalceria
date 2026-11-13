import { useEffect } from "react";
import { prewarmOsmTiles } from "@/lib/osmTilePrewarmer";

/**
 * useEagerGeolocation
 * Hook Ledger Position: M2 (Eager pre-calculation of GPS coordinates on mount)
 *
 * Input:
 * - mapRef: React.MutableRefObject
 * - setSelfLiveCoords: React.Dispatch<React.SetStateAction<any>>
 * - setInitialCoordsResolved: React.Dispatch<React.SetStateAction<boolean>>
 * - showStartup: boolean
 * - hasInitialCenteredRef: React.MutableRefObject<boolean>
 *
 * Output: void
 */
export function useEagerGeolocation({
  mapRef,
  setSelfLiveCoords,
  setInitialCoordsResolved,
  showStartup = true,
  hasInitialCenteredRef = null,
}) {
  // Eager pre-calculation of GPS coordinates immediately on component mount (during startup intro)
  useEffect(() => {
    let active = true;
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!active) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setSelfLiveCoords({ lat, lng });
          setInitialCoordsResolved(true);

          // Popup & Interaction Protection:
          // NEVER jump camera or call setView if:
          // 1. Map has already centered once (hasInitialCenteredRef)
          // 2. An event card or broadcast box popup is currently open
          // 3. The startup sequence has already completed
          const isPopupOpen =
            typeof document !== "undefined" &&
            Boolean(
              document.querySelector(
                ".leaflet-popup, .event-tactical-popup, .broadcast-tactical-popup, .broadcast-popup-box"
              )
            );

          const canCenter =
            mapRef.current &&
            !hasInitialCenteredRef?.current &&
            showStartup &&
            !isPopupOpen;

          if (canCenter) {
            try {
              mapRef.current.setView([lat, lng], 15, { animate: false });
              if (hasInitialCenteredRef) {
                hasInitialCenteredRef.current = true;
              }
            } catch (_) {}
          }
          prewarmOsmTiles(lat, lng, 15);
        },
        () => {
          if (active) setInitialCoordsResolved(true);
        },
        { timeout: 3500, enableHighAccuracy: false, maximumAge: 30000 }
      );
    } else {
      setInitialCoordsResolved(true);
    }
    const safetyTimeout = setTimeout(() => {
      if (active) setInitialCoordsResolved(true);
    }, 2800);
    return () => {
      active = false;
      clearTimeout(safetyTimeout);
    };
  }, []);
}
