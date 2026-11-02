"use client";

import { useEffect, useRef, useState } from "react";
import { createUserIcon, escapeMapHtml, getSafeMapAvatarUrl, getSafeMapColor } from "./map/UserIcon";
import { createEventIcon } from "./map/EventIcon";
import { userPopup } from "./map/UserPopup";
import { eventPopup } from "./map/EventPopup";

import "leaflet/dist/leaflet.css";
import "./map/snapmap.css";
import "./map/map-card.css";

// Constants & Helpers
const DEFAULT_CENTER = [-6.2735, 106.7150];

async function loadLeaflet() {
  if (typeof window === "undefined") return null;
  const Leaflet = await import("leaflet");
  const L = Leaflet.default || Leaflet;
  window.L = L;
  return L;
}

export default function SnapMap({
  users,
  events,
  onMapReady,
  focusUserId,
  focusTarget,
  isMapDark = false,
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const usersLayerRef = useRef(null);
  const eventsLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRefs = useRef({});
  const [isReady, setIsReady] = useState(false);

  // Update tile layer & invalidate map size on theme toggle
  useEffect(() => {
    if (tileLayerRef.current) {
      const tileUrl = isMapDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
      tileLayerRef.current.setUrl(tileUrl);
    }
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

  // Handle programmatic focus/popup opening (supports both user and event markers)
  useEffect(() => {
    if (!isReady || !markerRefs.current || !mapRef.current) return;

    if (focusTarget) {
      const { id, type, openPopup = true } = focusTarget;
      const markerId = type === "event" ? `event_${id}` : `user_${id}`;
      const marker =
        markerRefs.current[markerId] ||
        markerRefs.current[`event_${id}`] ||
        markerRefs.current[`user_${id}`];

      if (marker) {
        const latLng = marker.getLatLng();
        mapRef.current.flyTo(latLng, 16, { animate: true, duration: 0.6 });
        if (openPopup) {
          const timeout = setTimeout(() => {
            marker.openPopup();
          }, 120);
          return () => clearTimeout(timeout);
        }
      }
      return;
    }

    if (focusUserId) {
      const markerId = `user_${focusUserId}`;
      const marker = markerRefs.current[markerId];
      if (marker) {
        const timeout = setTimeout(() => {
          const latLng = marker.getLatLng();
          mapRef.current.flyTo(latLng, 16);
          marker.openPopup();
        }, 50);
        return () => clearTimeout(timeout);
      }
    }
  }, [focusUserId, focusTarget, isReady]);

  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !mapNodeRef.current || mapRef.current || !L) return;

      const map = L.map(mapNodeRef.current, {
        zoomControl: false,
        attributionControl: false,
        center: DEFAULT_CENTER,
        zoom: 14,
        closePopupOnClick: true,
      });

      // High-performance CartoDB tiles (Voyager for Light, Dark Matter for Dark)
      // Fast Cloudflare-backed CDN with abcd domain sharding, zero API key requirement
      const tileUrl = isMapDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";

      const tileLayer = L.tileLayer(tileUrl, {
        subdomains: "abcd",
        maxZoom: 19,
        attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
      }).addTo(map);

      // Automatic bulletproof fallback: if any tile fails to load, fallback to alternate mirror
      tileLayer.on("tileerror", function (error) {
        if (error.tile && !error.tile._hasFallenBack) {
          error.tile._hasFallenBack = true;
          const coords = error.coords;
          if (coords) {
            const shard = ["a", "b", "c"][Math.abs(coords.x + coords.y) % 3];
            error.tile.src = `https://${shard}.tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;
          }
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
  }, [onMapReady]);

  useEffect(() => {
    if (!isReady || !mapRef.current || !usersLayerRef.current || !eventsLayerRef.current || !window.L) return;
    const L = window.L;
    const usersLayer = usersLayerRef.current;
    const eventsLayer = eventsLayerRef.current;

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

        marker.setIcon(createUserIcon(L, user, isMapDark));

        const hasBroadcast = Boolean(
          (typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message)?.trim()
        );
        const newPopupContent = userPopup(user, isMapDark);
        if (marker._lastPopupContent !== newPopupContent) {
          marker.getPopup().setContent(newPopupContent);
          if (marker.getPopup().options) {
            marker.getPopup().options.offset = hasBroadcast ? [0, -26] : [0, -60];
          }
          marker._lastPopupContent = newPopupContent;
        }

        marker.options.userData = user;
      } else {
        const hasBroadcast = Boolean(
          (typeof user?.broadcast === "string" ? user.broadcast : user?.broadcast?.message)?.trim()
        );
        const marker = L.marker([user.lat, user.lng], {
          icon: createUserIcon(L, user, isMapDark),
          userData: user,
        }).bindPopup(userPopup(user, isMapDark), {
          className: "tactical-popup",
          offset: hasBroadcast ? [0, -26] : [0, -60],
          autoClose: true,
          closeButton: false,
        });
        marker._lastPopupContent = userPopup(user, isMapDark);
        markerRefs.current[markerId] = marker;
        usersLayer.addLayer(marker);
      }
    });

    // 2. Reconcile Dummy & Live Events (Always unclustered and visible!)
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
          autoClose: true,
        });
        marker._lastPopupContent = eventPopup(item);
        markerRefs.current[markerId] = marker;
        eventsLayer.addLayer(marker);
      }
    });

    // 3. Remove Stale Markers
    Object.keys(markerRefs.current).forEach((id) => {
      if (!currentUserIds.has(id) && !currentEventIds.has(id)) {
        if (usersLayer.hasLayer(markerRefs.current[id])) {
          usersLayer.removeLayer(markerRefs.current[id]);
        }
        if (eventsLayer.hasLayer(markerRefs.current[id])) {
          eventsLayer.removeLayer(markerRefs.current[id]);
        }
        delete markerRefs.current[id];
      }
    });
  }, [users, events, isReady, isMapDark]);

  return (
    <div className={`fixed inset-0 z-0 snap-tactical-map ${isMapDark ? "dark-theme" : "light-theme"}`}>
      <div
        ref={mapNodeRef}
        className="w-full h-full bg-transparent"
      />

    </div>
  );
}
