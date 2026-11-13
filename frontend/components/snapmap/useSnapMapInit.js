"use client";

import { useEffect, useRef, useState } from "react";
import { OSM_SUBDOMAINS } from "@/lib/osmTilePrewarmer";
import { DEFAULT_CENTER, getInstantInitialCenter, loadLeaflet, tickAllEventUptimeElements } from "./snapMapHelpers";
import {
  cleanupEventPopupCarouselsFromRoot,
  initEventPopupCarouselsFromRoot,
} from "../map/eventPopup/popupCarouselController";

export function useSnapMapInit({
  mapNodeRef,
  mapRef: externalMapRef,
  initialCenter,
  currentUser,
  isMapDark,
  onMapReady,
  resetIdleTimer,
}) {
  const internalMapRef = useRef(null);
  const mapRef = externalMapRef || internalMapRef;
  const usersLayerRef = useRef(null);
  const eventsLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Invalidate map size on theme toggle
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, [isMapDark]);

  // Continuously ensure map size and tiles are active on mount & window resize
  useEffect(() => {
    if (!isReady || !mapRef.current) return;
    mapRef.current.invalidateSize({ debounceMoveend: true });
    const handleResize = () => {
      mapRef.current?.invalidateSize({ debounceMoveend: true });
    };
    window.addEventListener("resize", handleResize);

    let resizeObserver = null;
    if (typeof window !== "undefined" && typeof window.ResizeObserver === "function" && mapNodeRef.current) {
      resizeObserver = new ResizeObserver(() => {
        mapRef.current?.invalidateSize({ debounceMoveend: true });
      });
      resizeObserver.observe(mapNodeRef.current);
    }

    const t1 = setTimeout(() => mapRef.current?.invalidateSize({ debounceMoveend: true }), 150);
    const t2 = setTimeout(() => mapRef.current?.invalidateSize({ debounceMoveend: true }), 600);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isReady]);

  // Leaflet map instance and tile layer bootstrap
  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !mapNodeRef.current || mapRef.current || !L) return;

      const resolvedCenter = initialCenter || getInstantInitialCenter(currentUser);

      const map = L.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: false,
        center: resolvedCenter,
        zoom: 15,
        minZoom: 3,
        maxZoom: 19,
        preferCanvas: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        wheelDebounceTime: 40,
        closePopupOnClick: false,
      });

      map.on("popupopen", (e) => {
        tickAllEventUptimeElements();
        resetIdleTimer?.();
        const popupEl = e?.popup?.getElement?.();
        if (popupEl) {
          popupEl.classList.remove("popup-shrinking");
          initEventPopupCarouselsFromRoot(popupEl, e.popup);
          const bcastViewEl = popupEl.querySelector?.("[data-broadcast-view-count]");
          if (bcastViewEl) {
            const bcastId = bcastViewEl.getAttribute("data-broadcast-view-count");
            if (bcastId && typeof window !== "undefined" && window.__kalceriaRecordBroadcastView) {
              window.__kalceriaRecordBroadcastView(bcastId);
            }
          }
        }
      });

      map.on("popupclose", (e) => {
        const popupEl = e?.popup?.getElement?.();
        if (popupEl) {
          cleanupEventPopupCarouselsFromRoot(popupEl);
        }
      });

      // High-performance OpenStreetMap tile layer with instant multi-CDN fallback for O(1) laptop/mobile rendering
      const tileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          subdomains: OSM_SUBDOMAINS,
          minZoom: 3,
          maxZoom: 19,
          maxNativeZoom: 19,
          keepBuffer: 6,
          updateWhenIdle: false,
          updateWhenZooming: true,
          attribution: "&copy; OpenStreetMap contributors",
        }
      ).addTo(map);

      // Multi-CDN instant failover (OSM -> CartoDB Voyager CDN) to guarantee zero grey tiles under aggressive zoom out
      tileLayer.on("tileerror", function (error) {
        const tile = error?.tile;
        const coords = error?.coords;
        if (!tile || !coords) return;
        if (tile._retryCount && tile._retryCount >= 2) return;
        tile._retryCount = (tile._retryCount || 0) + 1;

        if (!tile._hasFallenBackCdn) {
          tile._hasFallenBackCdn = true;
          // CartoDB Voyager CDN mirror resolves OSM tiles globally with zero rate-limiting
          const sub = ["a", "b", "c", "d"][(Math.abs(coords.x + coords.y)) % 4];
          tile.src = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${coords.z}/${coords.x}/${coords.y}.png`;
        } else if (!tile._hasFallenBackAltShard) {
          tile._hasFallenBackAltShard = true;
          const altShard = OSM_SUBDOMAINS[(Math.abs(coords.x + coords.y) + 1) % OSM_SUBDOMAINS.length];
          tile.src = `https://${altShard}.tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
        }
      });

      tileLayerRef.current = tileLayer;
      mapRef.current = map;

      // Unclustered dedicated layer groups so dummy events and users are ALWAYS visible
      eventsLayerRef.current = L.featureGroup().addTo(map);
      usersLayerRef.current = L.featureGroup().addTo(map);

      if (onMapReady) onMapReady(map);
      setIsReady(true);
    });

    return () => {
      alive = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapNodeRef, onMapReady, resetIdleTimer]);

  return {
    mapRef,
    usersLayerRef,
    eventsLayerRef,
    tileLayerRef,
    isReady,
  };
}
