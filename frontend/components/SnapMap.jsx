"use client";

import { useEffect, useRef, useState } from "react";
import { createUserIcon } from "./map/UserIcon";
import { createHqIcon } from "./map/HqIcon";
import { createEventIcon } from "./map/EventIcon";
import { userPopup } from "./map/UserPopup";
import { hqPopup } from "./map/HqPopup";
import { eventPopup } from "./map/EventPopup";

import "leaflet/dist/leaflet.css";

// Constants & Helpers
const DEFAULT_CENTER = [-6.2715, 106.7135];
const avatar = (seed) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
const esc = (str) =>
  String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );

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
    if (marker && mapRef.current) {
      // Small delay to ensure marker is in a layer if it was just added
      setTimeout(() => {
        const latLng = marker.getLatLng();
        mapRef.current.flyTo(latLng, 16);
        marker.openPopup();
      }, 50);
    }
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
          const rawClusterColor = firstUser.color || "#ffc300";
          const clusterColor = (rawClusterColor.toLowerCase() === "#ffd60a" || rawClusterColor.toLowerCase() === "#ffea00") ? "#ffc300" : rawClusterColor;
          const clusterAvatar =
            firstUser.profilePicture ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstUser.nickname || "anon")}`;
          return L.divIcon({
            html: `
              <div class="cluster-node" style="--user-color: ${clusterColor}">
                <div class="cluster-pulse"></div>
                <div class="cluster-avatar"><img src="${clusterAvatar}" alt="${esc(firstUser.nickname || "")}"></div>
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

        const newPopupContent = eventPopup(item);
        if (marker._lastPopupContent !== newPopupContent) {
          marker.getPopup().setContent(newPopupContent);
          marker._lastPopupContent = newPopupContent;
        }
      } else {
        const marker = L.marker([item.lat, item.lng], {
          icon: createEventIcon(L, item),
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
      if (!markerRefs.current["hq"]) {
        const hqMarker = L.marker([hqPoint.lat, hqPoint.lng], {
          icon: createHqIcon(L),
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
  }, [users, events, hqPoint, isReady]);

  return (
    <div className={`fixed inset-0 z-0 snap-tactical-map ${isMapDark ? "dark-theme" : "light-theme"}`}>
      <div
        ref={mapNodeRef}
        className="w-full h-full bg-transparent"
      />

      <style jsx global>{`
        /* ─── LIGHT MODE ─── */
        .snap-tactical-map.light-theme {
          background: #aad3df !important;
        }
        .snap-tactical-map.light-theme .leaflet-container {
          background: #aad3df !important;
        }
        .snap-tactical-map.light-theme .leaflet-tile {
          filter: none !important;
        }

        /* ─── DARK MODE ─── */
        .snap-tactical-map.dark-theme {
          background: #09090c !important;
        }
        /* CRITICAL: leaflet-container must be transparent so tiles show through */
        .snap-tactical-map.dark-theme .leaflet-container {
          background: transparent !important;
        }

        /*
          Classic Inverted Dark Mode.
          Inverts the standard OSM light tiles directly.
          hue-rotate(180deg) preserves original water/park colors (blue stays blue, green stays green)
          while turning the off-white land into dark charcoal!
        */
        .snap-tactical-map.dark-theme .leaflet-tile {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important;
        }

        /* Shared */
        .snap-tactical-map .leaflet-pane {
          background: transparent !important;
        }

        .snap-tactical-map .leaflet-tile-pane {
          opacity: 1.0;
        }

        .snap-tactical-map .leaflet-marker-pane,
        .snap-tactical-map .leaflet-popup-pane {
          opacity: 1 !important;
        }

        .snap-tactical-map .leaflet-tile-container {
          background: transparent !important;
        }

        /* Marker Styles */
        .snap-tactical-map .leaflet-marker-icon {
          transition: transform 0.2s ease-out !important;
        }

        .radar-node {
          position: relative;
          width: 48px;
          height: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }

        /* username tooltip */
        .radar-nametag {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) translateY(-100%);
          white-space: nowrap;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(10, 14, 39, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 0.25s ease,
            transform 0.25s ease;
          z-index: 20;
        }

        .radar-node:hover .radar-nametag {
          opacity: 1;
          transform: translateX(-50%) translateY(-100%) translateY(-4px);
        }

        /* floating wrapper */
        .radar-float-wrapper {
          animation: float-bob 2.5s ease-in-out infinite;
          position: relative;
          z-index: 2;
        }

        @keyframes float-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        .radar-avatar {
          position: relative;
          z-index: 2;
          width: 48px;
          height: 48px;
          overflow: hidden;
          border: 1.5px solid #ffffff !important;
          border-radius: 50%;
          background: #0a0e27;
          filter: grayscale(80%) brightness(0.8);
          transition: all 0.3s ease;
        }

        .radar-node:hover .radar-avatar,
        .radar-node.active .radar-avatar {
          border-color: #ffffff !important;
          box-shadow: 0 0 12px
            color-mix(in srgb, var(--user-color) 40%, transparent);
          filter: grayscale(0%) brightness(1.1);
          transform: scale(1.08);
        }

        /* droplet ripple synced to float bottom */
        .radar-droplet {
          position: absolute;
          bottom: 6px;
          left: 50%;
          width: 12px;
          height: 4px;
          border-radius: 50%;
          background: radial-gradient(
            ellipse,
            color-mix(in srgb, var(--user-color) 35%, transparent),
            transparent
          );
          transform: translateX(-50%);
          animation: droplet-ripple 2.5s ease-in-out infinite;
          z-index: 1;
        }

        @keyframes droplet-ripple {
          0%,
          40% {
            transform: translateX(-50%) scaleX(0.6);
            opacity: 0;
          }
          50% {
            transform: translateX(-50%) scaleX(1);
            opacity: 0.7;
          }
          70% {
            transform: translateX(-50%) scaleX(1.8);
            opacity: 0.3;
          }
          100% {
            transform: translateX(-50%) scaleX(0.6);
            opacity: 0;
          }
        }

        .cluster-node {
          position: relative;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .cluster-avatar {
          position: relative;
          z-index: 2;
          width: 48px;
          height: 48px;
          overflow: hidden;
          border: 1.5px solid #ffffff !important;
          border-radius: 50%;
          background: #0a0e27;
          box-shadow: 0 0 10px
            color-mix(in srgb, var(--user-color) 30%, transparent);
        }

        .cluster-count {
          position: absolute;
          right: -8px;
          bottom: -4px;
          z-index: 3;
          padding: 2px 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: rgba(5, 7, 20, 0.8);
          backdrop-filter: blur(8px);
          color: #ffffff;
          font-family: monospace;
          font-weight: 700;
          font-size: 11px;
        }

        @keyframes radarPing {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        @keyframes hqPing {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        .radar-pulse,
        .cluster-pulse,
        .event-pulse {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 1;
          width: 48px;
          height: 48px;
          border: 1px solid var(--user-color);
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%);
          animation: radarPing 2s infinite cubic-bezier(0, 0, 0.2, 1);
        }
        .tactical-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
        }
        .tactical-popup .leaflet-popup-tip-container {
          display: none;
        }
        .tactical-popup .leaflet-popup-content {
          width: auto !important;
          margin: 0;
        }

        /* ── Discord-style User Popup Card ── */
        .dc-card {
          position: relative;
          width: 300px;
          overflow: hidden;
          border-radius: 14px !important;
          transition: all 0.3s ease-in-out;
        }

        /* 3D HUD Button style for card - Dark Theme */
        .snap-tactical-map.dark-theme .dc-card {
          background: #0c0c0e !important;
          border: 1px solid #1f2937 !important;
          color: #ffffff !important;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.6), inset 0 -3px 5px rgba(0,0,0,0.8) !important;
        }

        /* 3D HUD Button style for card - Light Theme */
        .snap-tactical-map:not(.dark-theme) .dc-card {
          background: #ffffff !important;
          border: 1px solid #e5e7eb !important;
          color: #0f172a !important;
          box-shadow: inset 0 2px 4px rgba(255,255,255,1), 0 4px 12px rgba(0,0,0,0.1), inset 0 -2px 4px rgba(0,0,0,0.15) !important;
        }

        /* Close Button repositioned more leftward, 15% bigger, and theme-color corrected */
        .snap-tactical-map .leaflet-popup-close-button {
          right: 18px !important;
          top: 14px !important;
          font-size: 25px !important; /* 15% bigger close button */
          font-weight: 700 !important;
          z-index: 1000 !important;
          transition: all 0.2s ease-in-out !important;
        }
        .snap-tactical-map.dark-theme .leaflet-popup-close-button,
        .dark-theme .leaflet-popup-close-button {
          color: #ffffff !important;
          opacity: 1 !important;
        }
        .snap-tactical-map:not(.dark-theme) .leaflet-popup-close-button,
        .light-theme .leaflet-popup-close-button {
          color: #000000 !important;
          opacity: 1 !important;
        }
        .snap-tactical-map .leaflet-popup-close-button:hover {
          color: #ef4444 !important;
          opacity: 1 !important;
        }

        /* 3D User Name Display Name styles (Arial + heavy 3D pop shadow block) */
        .dc-display-name {
          font-family: 'Arial Black', 'Arial Bold', 'Arial', sans-serif !important;
          font-weight: 900 !important;
          font-size: 21px !important;
          letter-spacing: -0.2px !important;
        }

        .snap-tactical-map.dark-theme .dc-display-name,
        .dark-theme .dc-display-name {
          color: #ffffff !important;
          text-shadow: 1px 1px 0px #000, 2px 2px 0px #000, 3px 3px 0px #000, 4px 4px 6px rgba(0,0,0,0.85) !important;
        }

        .snap-tactical-map:not(.dark-theme) .dc-display-name,
        .light-theme .dc-display-name {
          color: #000000 !important;
          text-shadow: 1px 1px 0px #fff, 2px 2px 0px #fff, 3px 3px 0px #fff, 4px 4px 6px rgba(0,0,0,0.2) !important;
        }

        /* Light Mode Readability Overrides */
        .snap-tactical-map:not(.dark-theme) .dc-username {
          color: rgba(0, 0, 0, 0.6) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-sector {
          color: rgba(0, 0, 0, 0.5) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-section-label {
          color: rgba(0, 0, 0, 0.45) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-since-value {
          color: rgba(0, 0, 0, 0.8) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-status-bubble {
          background: rgba(0, 0, 0, 0.05) !important;
          border-left-color: var(--accent) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-status-text {
          color: rgba(0, 0, 0, 0.85) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-conn-row {
          background: rgba(0, 0, 0, 0.03) !important;
          opacity: 0.5;
        }
        .snap-tactical-map:not(.dark-theme) .dc-conn-row.connected {
          background: rgba(0, 0, 0, 0.05) !important;
          opacity: 1;
        }
        .snap-tactical-map:not(.dark-theme) .dc-conn-row.connected:hover {
          background: rgba(0, 0, 0, 0.08) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-conn-platform {
          color: rgba(0, 0, 0, 0.8) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-conn-handle {
          color: rgba(0, 0, 0, 0.5) !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-action-btn {
          background: rgba(0, 0, 0, 0.04) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
          color: #000000 !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-action-btn:hover {
          background: rgba(0, 0, 0, 0.08) !important;
          border-color: rgba(0, 0, 0, 0.2) !important;
          color: #000000 !important;
        }
        .snap-tactical-map:not(.dark-theme) .dc-divider {
          background: rgba(0, 0, 0, 0.08) !important;
        }


        /* Banner strip hidden completely per user request */
        .dc-banner {
          display: none !important;
        }

        @keyframes bannerMovingBlob {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── Dynamic Hover Distributed Blobs for Connections ── */
        .dc-conn-row {
          position: relative;
          z-index: 1;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Create two organic blurry floating blobs for each connection row */
        .dc-conn-row::before,
        .dc-conn-row::after {
          content: '' !important;
          position: absolute !important;
          border-radius: 50% !important;
          filter: blur(16px) !important;
          opacity: 0 !important;
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out !important;
          pointer-events: none !important;
          z-index: 0 !important;
        }

        .dc-conn-row:hover::before,
        .dc-conn-row:hover::after {
          opacity: 0.22 !important;
        }

        /* Ensure texts and icons stay above the background blobs */
        .dc-conn-icon, .dc-conn-info {
          position: relative;
          z-index: 2;
        }

        /* Instagram Hover: Orange-Magenta dynamic distributed blobs */
        .dc-conn-IG::before {
          width: 80px;
          height: 80px;
          background: #ff006e !important;
          left: -15px;
          top: -20px;
        }
        .dc-conn-IG::after {
          width: 90px;
          height: 90px;
          background: #ff5400 !important;
          right: -10px;
          bottom: -20px;
        }
        .dc-conn-IG:hover::before {
          transform: translate(25px, 12px) scale(1.25);
          animation: floatIG1 4s ease-in-out infinite alternate;
        }
        .dc-conn-IG:hover::after {
          transform: translate(-20px, -15px) scale(1.15);
          animation: floatIG2 4s ease-in-out infinite alternate;
        }

        /* WhatsApp Hover: Green + Blue Toska dynamic distributed blobs */
        .dc-conn-WA::before {
          width: 80px;
          height: 80px;
          background: #10b981 !important;
          left: -10px;
          top: -20px;
        }
        .dc-conn-WA::after {
          width: 95px;
          height: 95px;
          background: #00bacf !important;
          right: -15px;
          bottom: -15px;
        }
        .dc-conn-WA:hover::before {
          transform: translate(15px, 18px) scale(1.18);
          animation: floatWA1 4s ease-in-out infinite alternate;
        }
        .dc-conn-WA:hover::after {
          transform: translate(-22px, -10px) scale(1.22);
          animation: floatWA2 4s ease-in-out infinite alternate;
        }

        /* X (Twitter) Hover: Grey distributed blobs */
        .dc-conn-TW::before {
          width: 85px;
          height: 85px;
          background: #64748b !important;
          left: -20px;
          top: -15px;
        }
        .dc-conn-TW::after {
          width: 80px;
          height: 80px;
          background: #475569 !important;
          right: -10px;
          bottom: -20px;
        }
        .dc-conn-TW:hover::before {
          transform: translate(20px, 10px) scale(1.15);
          animation: floatTW1 4s ease-in-out infinite alternate;
        }
        .dc-conn-TW:hover::after {
          transform: translate(-15px, -15px) scale(1.2);
          animation: floatTW2 4s ease-in-out infinite alternate;
        }

        /* Keyframes for the float-shifting distributed blobs */
        @keyframes floatIG1 {
          0% { transform: translate(25px, 12px) scale(1.25) rotate(0deg); }
          100% { transform: translate(35px, -8px) scale(0.9) rotate(45deg); }
        }
        @keyframes floatIG2 {
          0% { transform: translate(-20px, -15px) scale(1.15) rotate(0deg); }
          100% { transform: translate(-35px, 10px) scale(1.3) rotate(-45deg); }
        }
        @keyframes floatWA1 {
          0% { transform: translate(15px, 18px) scale(1.18) rotate(0deg); }
          100% { transform: translate(-8px, -12px) scale(0.95) rotate(-35deg); }
        }
        @keyframes floatWA2 {
          0% { transform: translate(-22px, -10px) scale(1.22) rotate(0deg); }
          100% { transform: translate(15px, 22px) scale(0.85) rotate(35deg); }
        }
        @keyframes floatTW1 {
          0% { transform: translate(20px, 10px) scale(1.15) rotate(0deg); }
          100% { transform: translate(8px, -15px) scale(1.3) rotate(40deg); }
        }
        @keyframes floatTW2 {
          0% { transform: translate(-15px, -15px) scale(1.2) rotate(0deg); }
          100% { transform: translate(20px, 10px) scale(0.9) rotate(-40deg); }
        }


        /* Header: Avatar + Name + Sector in one row */
        .dc-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 16px 0px 16px !important;
          margin-top: 0px !important;
          position: relative;
          z-index: 5;
        }

        .dc-avatar-ring {
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }

        .dc-avatar-img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(10, 14, 39, 0.9);
          background: #0a0e27;
        }

        .dc-avatar-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .dc-status-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #34d399;
          border: 3px solid rgba(10, 14, 39, 0.9);
        }

        .dc-status-dot.offline {
          background: #6b7280;
        }

        .dc-header-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding-top: 10px;
        }

        .dc-display-name {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dc-username {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 600;
          margin-top: 2px;
        }

        .dc-sector {
          font-size: 13px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.35);
          margin-top: 4px;
        }

        /* Body content */
        .dc-body {
          padding: 10px 16px 14px;
        }

        .dc-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 10px 0;
        }

        /* Section blocks */
        .dc-section {
          margin-bottom: 10px;
        }

        .dc-section-label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .dc-since-value {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 6px;
        }

        .dc-status-bubble {
          position: relative !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, 0.04) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 10px !important;
          padding: 10px 12px 10px 22px !important; /* spacing for blob */
          border-left: none !important; /* remove static border */
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 8px;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }

        /* Large, highly blurred dynamic golden liquid blob - Soft glowing mist covering half the box */
        .dc-status-bubble::before {
          content: '' !important;
          position: absolute !important;
          left: -40px !important;
          top: 50% !important;
          width: 110px !important;
          height: 110px !important;
          border-radius: 50% !important;
          background: radial-gradient(circle, #ffd60a 0%, rgba(255, 214, 10, 0.4) 60%, rgba(255, 214, 10, 0) 100%) !important; /* Pure gold gradient */
          filter: blur(22px) !important; /* Huge blur for ultra-soft glow mist, spreading to half the box */
          opacity: 0.55 !important;
          animation: statusLiquidBlob 5s ease-in-out infinite alternate !important;
          z-index: 0 !important; /* Layered behind text */
          pointer-events: none !important;
        }

        @keyframes statusLiquidBlob {
          0% {
            transform: translateY(-50%) scale(1) rotate(0deg);
            border-radius: 40% 60% 50% 50% / 40% 50% 50% 60% !important;
            opacity: 0.45 !important;
          }
          100% {
            transform: translateY(-50%) scale(1.3) rotate(180deg);
            border-radius: 60% 40% 65% 35% / 50% 60% 40% 50% !important;
            opacity: 0.7 !important;
          }
        }

        .dc-status-text {
          position: relative !important;
          z-index: 2 !important; /* Stays above the blurred blob */
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.5;
          letter-spacing: 0.01em;
        }

        .dc-status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          flex-shrink: 0;
          margin-top: 5px;
          box-shadow: 0 0 12px #34d399cc;
        }

        /* Connection rows (vertical list with SVG logos) */
        .dc-conn-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 6px;
        }

        .dc-conn-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          opacity: 0.4;
          transition:
            background 0.2s,
            opacity 0.2s;
        }

        .dc-conn-row.connected {
          opacity: 1;
          background: rgba(255, 255, 255, 0.05);
        }

        .dc-conn-row.connected:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .dc-conn-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dc-conn-icon svg {
          width: 16px;
          height: 16px;
        }

        .dc-conn-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .dc-conn-platform {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.3;
        }

        .dc-conn-handle {
          font-size: 10px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dc-conn-row:not(.connected) .dc-conn-handle {
          font-style: italic;
          color: rgba(255, 255, 255, 0.25);
        }

        .dc-conn-row.connected .dc-conn-handle {
          color: rgba(255, 255, 255, 0.6);
        }

        /* CTA button */
        /* CTA Button styled as a high-fidelity glassmorphic box */
        .dc-action-btn {
          display: block;
          width: 100%;
          padding: 10px;
          margin-top: 14px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.03em;
          border-radius: 10px !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          cursor: pointer;
          text-decoration: none;
          box-shadow: none !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Dark Mode Button States */
        .snap-tactical-map.dark-theme .dc-action-btn,
        .dark-theme .dc-action-btn {
          background: rgba(255, 255, 255, 0.04) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
        }

        .snap-tactical-map.dark-theme .dc-action-btn:hover,
        .dark-theme .dc-action-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.18) !important;
          color: #ffffff !important;
          transform: translateY(-1.5px) !important;
          box-shadow: none !important;
        }

        /* Light Mode Button States */
        .snap-tactical-map:not(.dark-theme) .dc-action-btn,
        .light-theme .dc-action-btn {
          background: rgba(0, 0, 0, 0.03) !important;
          border: 1px solid rgba(0, 0, 0, 0.06) !important;
          color: #000000 !important;
        }

        .snap-tactical-map:not(.dark-theme) .dc-action-btn:hover,
        .light-theme .dc-action-btn:hover {
          background: rgba(0, 0, 0, 0.06) !important;
          border-color: rgba(0, 0, 0, 0.12) !important;
          color: #000000 !important;
          transform: translateY(-1.5px) !important;
          box-shadow: none !important;
        }

        /* Legacy popup classes kept for HQ & Event popups */
        .tactical-card {
          position: relative;
          width: 280px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          background: rgba(10, 14, 39, 0.6);
          backdrop-filter: blur(24px) saturate(160%);
          color: #fff;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          border-left: 2px solid var(--border-color, #ec4899);
        }

        .scanlines {
          display: none;
        }

        .popup-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 10;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hq-badge,
        .event-badge {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 14, 39, 0.6);
          color: var(--border-color, #fff);
          font-weight: 700;
          font-size: 13px;
        }

        .popup-status {
          padding: 12px 16px;
          background: transparent;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 11px;
          font-style: italic;
          color: rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 10;
        }

        .popup-status.active {
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }

        .popup-status span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          flex-shrink: 0;
        }

        .popup-action-wrap {
          padding: 10px 12px;
          position: relative;
          z-index: 10;
          background: transparent;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .popup-action {
          display: block;
          width: 100%;
          padding: 9px;
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          color: #fff;
          transition: background 0.2s;
          cursor: pointer;
          border: none;
        }

        .popup-action:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .popup-action.disabled {
          background: rgba(0, 0, 0, 0.3);
          color: rgba(255, 255, 255, 0.25);
          cursor: not-allowed;
        }

        .popup-action.hq-enter-btn {
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .popup-tail {
          width: 3px;
          height: 20px;
          margin: 0 auto;
          opacity: 0.5;
          border-radius: 2px;
          background: linear-gradient(
            to bottom,
            var(--border-color, #fff),
            transparent
          );
        }
      `}</style>
    </div>
  );
}
