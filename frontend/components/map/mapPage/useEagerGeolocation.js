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
 *
 * Output: void
 */
export function useEagerGeolocation({
  mapRef,
  setSelfLiveCoords,
  setInitialCoordsResolved,
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
          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15, { animate: false });
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
