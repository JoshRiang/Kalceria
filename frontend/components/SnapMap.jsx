"use client";

import { useEffect, useRef, useState } from "react";
import { createUserIcon, escapeMapHtml, getSafeMapAvatarUrl, getSafeMapColor } from "./map/UserIcon";
import { createHqIcon } from "./map/HqIcon";
import { createEventIcon } from "./map/EventIcon";
import { userPopup } from "./map/UserPopup";
import { hqPopup } from "./map/HqPopup";
import { eventPopup } from "./map/EventPopup";

import "leaflet/dist/leaflet.css";
import "./map/snapmap.css";

// Constants & Helpers
const DEFAULT_CENTER = [-6.2715, 106.7135];

async function loadLeaflet() {
  if (typeof window === "undefined") return null;
  const Leaflet = await import("leaflet");
  const L = Leaflet.default || Leaflet;
  window.L = L;
  await import("leaflet.markercluster");
  return L;
}

export default function SnapMap({
  users,
  events,
  hqPoint,
  onMapReady,
  focusUserId,
  isMapDark = false,
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRefs = useRef({});
  const [isReady, setIsReady] = useState(false);

  // Force tile container size invalidation on theme class transitions
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
  }, [isMapDark]);

  // Handle programmatic focus/popup opening
  useEffect(() => {
    if (!isReady || !focusUserId || !markerRefs.current) return;
    const markerId = `user_${focusUserId}`;
    const marker = markerRefs.current[markerId];
    let focusTimeout;
    if (marker && mapRef.current) {
      // Small delay to ensure marker is in a layer if it was just added
      focusTimeout = setTimeout(() => {
        const latLng = marker.getLatLng();
        mapRef.current.flyTo(latLng, 16);
        marker.openPopup();
      }, 50);
    }
    return () => {
      if (focusTimeout) clearTimeout(focusTimeout);
    };
  }, [focusUserId, isReady]);

  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !mapNodeRef.current || mapRef.current || !L) return;

      const map = L.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: false,
        center: DEFAULT_CENTER,
        zoom: 13,
      });

      const tileLayer = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
        },
      ).addTo(map);

      tileLayerRef.current = tileLayer;

      mapRef.current = map;

      layerRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction(cluster) {
          const firstMarker = cluster.getAllChildMarkers()[0];
          const firstUser = firstMarker.options.userData || {
            color: "#ffc300",
            nickname: "Kalcerian",
          };
          const remaining = cluster.getChildCount() - 1;
          const rawClusterColor = getSafeMapColor(firstUser.color);
          const clusterColor = (rawClusterColor.toLowerCase() === "#ffd60a" || rawClusterColor.toLowerCase() === "#ffea00") ? "#ffc300" : rawClusterColor;
          const clusterAvatar = escapeMapHtml(getSafeMapAvatarUrl(firstUser));
          const clusterNickname = escapeMapHtml(firstUser.nickname || "");
          return L.divIcon({
            html: `
              <div class="cluster-node" style="--user-color: ${clusterColor}">
                <div class="cluster-pulse"></div>
                <div class="cluster-avatar"><img src="${clusterAvatar}" alt="${clusterNickname}"></div>
                <div class="cluster-count">+${remaining}</div>
              </div>
            `,
            className: "custom-cluster-icon",
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          });
        },
      }).addTo(map);

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
  }, [onMapReady]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !layerRef.current || !window.L) return;
    const L = window.L;
    const layer = layerRef.current;

    if (!markerRefs.current) markerRefs.current = {};

    // 1. Reconcile Users
    const currentUserIds = new Set();
    (users || []).forEach((user) => {
      if (!Number.isFinite(user.lat) || !Number.isFinite(user.lng)) return;
      const markerId = `user_${user.id}`;
      currentUserIds.add(markerId);

      if (markerRefs.current[markerId]) {
        const marker = markerRefs.current[markerId];

        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== user.lat || currentLatLng.lng !== user.lng) {
          marker.setLatLng([user.lat, user.lng]);
        }

        const newPopupContent = userPopup(user);
        if (marker._lastPopupContent !== newPopupContent) {
          marker.getPopup().setContent(newPopupContent);
          marker._lastPopupContent = newPopupContent;
        }

        marker.options.userData = user;
      } else {
        const marker = L.marker([user.lat, user.lng], {
          icon: createUserIcon(L, user),
          userData: user,
        }).bindPopup(userPopup(user), {
          className: "tactical-popup",
          offset: [0, -60],
        });
        marker._lastPopupContent = userPopup(user);
        markerRefs.current[markerId] = marker;
        layer.addLayer(marker);
      }
    });

    // 2. Reconcile Events
    const currentEventIds = new Set();
    (events || []).forEach((item) => {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      const markerId = `event_${item.id}`;
      currentEventIds.add(markerId);

      if (markerRefs.current[markerId]) {
        const marker = markerRefs.current[markerId];

        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== item.lat || currentLatLng.lng !== item.lng) {
          marker.setLatLng([item.lat, item.lng]);
        }

        marker.setIcon(createEventIcon(L, item, isMapDark));

        const newPopupContent = eventPopup(item);
        if (marker._lastPopupContent !== newPopupContent) {
          marker.getPopup().setContent(newPopupContent);
          marker._lastPopupContent = newPopupContent;
        }
      } else {
        const marker = L.marker([item.lat, item.lng], {
          icon: createEventIcon(L, item, isMapDark),
          userData: { color: "#ff006e" },
        }).bindPopup(eventPopup(item), {
          className: "tactical-popup",
          offset: [0, -34],
        });
        marker._lastPopupContent = eventPopup(item);
        markerRefs.current[markerId] = marker;
        layer.addLayer(marker);
      }
    });

    // 3. Reconcile HQ
    if (hqPoint) {
      currentEventIds.add("hq");
      if (markerRefs.current["hq"]) {
        markerRefs.current["hq"].setIcon(createHqIcon(L, isMapDark));
      } else {
        const hqMarker = L.marker([hqPoint.lat, hqPoint.lng], {
          icon: createHqIcon(L, isMapDark),
          userData: { color: "#ffd60a", nickname: "HQ", avatarSeed: "hq" },
        }).bindPopup(hqPopup(hqPoint), {
          className: "tactical-popup hq-tactical-popup",
          offset: [0, -30],
        });
        markerRefs.current["hq"] = hqMarker;
        layer.addLayer(hqMarker);
      }
    }

    // 4. Remove Stale Markers
    Object.keys(markerRefs.current).forEach((id) => {
      if (!currentUserIds.has(id) && !currentEventIds.has(id)) {
        layer.removeLayer(markerRefs.current[id]);
        delete markerRefs.current[id];
      }
    });

    layer.addTo(mapRef.current);
  }, [users, events, hqPoint, isReady, isMapDark]);

  return (
    <div className={`fixed inset-0 z-0 snap-tactical-map ${isMapDark ? "dark-theme" : "light-theme"}`}>
      <div
        ref={mapNodeRef}
        className="w-full h-full bg-transparent"
      />

    </div>
  );
}
