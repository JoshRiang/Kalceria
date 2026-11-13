import { useCallback, useEffect, useMemo } from "react";
import { prewarmOsmTiles, hasValidCoordinates } from "@/lib/osmTilePrewarmer";
import { getInstantInitialCenter } from "@/components/snapmap/snapMapHelpers";

/**
 * useMapViewport
 * Hook Ledger Position: M9, M10 + recenterMap, handleMapReady, initialCenter
 *
 * Viewport calculations, camera animations, and Leaflet map instance readiness.
 *
 * Input:
 * - mapRef: React.MutableRefObject
 * - mapUsersData: Array
 * - currentUser: object
 * - selfLiveCoords: object
 * - showStartup: boolean
 * - setIsRecentering: React.Dispatch<React.SetStateAction<boolean>>
 * - setIsMapEngineReady: React.Dispatch<React.SetStateAction<boolean>>
 *
 * Output:
 * - recenterMap: Function
 * - handleMapReady: Function
 * - initialCenter: [number, number]
 */
export function useMapViewport({
  mapRef,
  mapUsersData,
  currentUser,
  selfLiveCoords,
  showStartup,
  setIsRecentering,
  setIsMapEngineReady,
  hasInitialCenteredRef = null,
}) {
  const recenterMap = useCallback(() => {
    if (!mapRef.current) return;
    setIsRecentering(true);
    if (hasInitialCenteredRef) {
      hasInitialCenteredRef.current = true;
    }
    const me = mapUsersData.find((u) => u.id === currentUser?.id);
    if (me && me.isOnline !== false && hasValidCoordinates(me.lat, me.lng)) {
      const mLat = Number(me.lat);
      const mLng = Number(me.lng);
      prewarmOsmTiles(mLat, mLng, 15);
      mapRef.current.flyTo([mLat, mLng], 15, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    } else if (selfLiveCoords && hasValidCoordinates(selfLiveCoords.lat, selfLiveCoords.lng)) {
      prewarmOsmTiles(selfLiveCoords.lat, selfLiveCoords.lng, 15);
      mapRef.current.flyTo([selfLiveCoords.lat, selfLiveCoords.lng], 15, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    } else if (hasValidCoordinates(currentUser?.domicileLat, currentUser?.domicileLng)) {
      const dLat = Number(currentUser.domicileLat);
      const dLng = Number(currentUser.domicileLng);
      prewarmOsmTiles(dLat, dLng, 15);
      mapRef.current.flyTo([dLat, dLng], 15, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    } else {
      prewarmOsmTiles(-6.2735, 106.715, 14);
      mapRef.current.flyTo([-6.2735, 106.7150], 14, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    }
  }, [mapUsersData, currentUser, selfLiveCoords, hasInitialCenteredRef]);

  // Map Event Tracking
  const handleMapReady = useCallback((mapInstance) => {
    // eslint-disable-next-line react-hooks/immutability -- Leaflet calls this external ref callback; the live map must be available synchronously.
    mapRef.current = mapInstance;
    setIsMapEngineReady(true);

    // Invalidate size immediately so tiles compute & load in background
    mapInstance.invalidateSize();

    mapInstance.on("moveend", () => {
      setIsRecentering(false);
    });

    // Mark initial centering as done if user manually drags or zooms the map
    mapInstance.on("dragstart", () => {
      if (hasInitialCenteredRef) {
        hasInitialCenteredRef.current = true;
      }
    });
    mapInstance.on("zoomstart", (e) => {
      if (!e?.fromSetView && hasInitialCenteredRef) {
        hasInitialCenteredRef.current = true;
      }
    });
  }, [hasInitialCenteredRef]);

  // Guarantee tile loading & viewport synchronization when startup sequence completes
  useEffect(() => {
    if (!showStartup && mapRef.current) {
      mapRef.current.invalidateSize({ debounceMoveend: true });
      const t1 = setTimeout(() => {
        mapRef.current?.invalidateSize({ debounceMoveend: true });
      }, 100);
      return () => clearTimeout(t1);
    }
  }, [showStartup]);

  // Calculate instant initial map coordinates and set view silently behind startup sequence
  const initialCenter = useMemo(() => {
    if (selfLiveCoords && hasValidCoordinates(selfLiveCoords.lat, selfLiveCoords.lng)) {
      return [selfLiveCoords.lat, selfLiveCoords.lng];
    }
    return getInstantInitialCenter(currentUser);
  }, [currentUser, selfLiveCoords]);

  useEffect(() => {
    if (showStartup && mapRef.current && !hasInitialCenteredRef?.current) {
      const isPopupOpen =
        typeof document !== "undefined" &&
        Boolean(
          document.querySelector(
            ".leaflet-popup, .event-tactical-popup, .broadcast-tactical-popup, .broadcast-popup-box"
          )
        );
      if (isPopupOpen) return;

      const coords =
        selfLiveCoords ||
        (hasValidCoordinates(currentUser?.domicileLat, currentUser?.domicileLng)
          ? { lat: Number(currentUser.domicileLat), lng: Number(currentUser.domicileLng) }
          : null);
      if (coords && hasValidCoordinates(coords.lat, coords.lng)) {
        try {
          mapRef.current.setView([coords.lat, coords.lng], 15, { animate: false });
          if (hasInitialCenteredRef) {
            hasInitialCenteredRef.current = true;
          }
        } catch (_) {}
      }
    }
  }, [showStartup, selfLiveCoords, currentUser, hasInitialCenteredRef]);

  return {
    recenterMap,
    handleMapReady,
    initialCenter,
  };
}
