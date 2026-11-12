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
    mapRef.current.invalidateSize();
    const handleResize = () => {
      mapRef.current?.invalidateSize();
    };
    window.addEventListener("resize", handleResize);
    const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 150);
    const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 600);
    return () => {
      window.removeEventListener("resize", handleResize);
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
        preferCanvas: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        wheelDebounceTime: 35,
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

      // Keyless multi-shard OpenStreetMap CDN with right-sized viewport keepBuffer so Desktop/iPad never mount 500+ tile bitmaps
      const tileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          subdomains: OSM_SUBDOMAINS,
          maxZoom: 19,
          maxNativeZoom: 19,
          keepBuffer: typeof window !== "undefined" && window.innerWidth >= 768 ? 2 : 3,
          updateWhenIdle: false,
          updateWhenZooming: false,
          updateInterval: 140,
          attribution: "&copy; OpenStreetMap contributors",
        }
      ).addTo(map);

      // Dual keyless OpenStreetMap fallback in case a single regional edge shard times out
      tileLayer.on("tileerror", function (error) {
        const tile = error?.tile;
        const coords = error?.coords;
        if (!tile || !coords) return;
        if (!tile._hasFallenBackPrimary) {
          tile._hasFallenBackPrimary = true;
          tile.src = `https://tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
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
