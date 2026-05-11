"use client";

import { useEffect, useRef, useState } from "react";
import { createUserIcon } from "./map/UserIcon";
import { createHqIcon } from "./map/HqIcon";
import { createEventIcon } from "./map/EventIcon";
import { userPopup } from "./map/UserPopup";
import { hqPopup } from "./map/HqPopup";
import { eventPopup } from "./map/EventPopup";

// Constants & Helpers
const DEFAULT_CENTER = [-6.2715, 106.7135];
const avatar = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
const esc = (str) => String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

async function loadLeaflet() {
  if (typeof window === "undefined") return null;
  const Leaflet = await import("leaflet");
  const L = Leaflet.default || Leaflet;
  window.L = L;
  await import("leaflet.markercluster");
  // Ensure styles are loaded
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  return L;
}

export default function SnapMap({ users, events, hqPoint, onMapReady }) {

  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markerRefs = useRef({});
  const [isReady, setIsReady] = useState(false);



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

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      mapRef.current = map;

      layerRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        iconCreateFunction(cluster) {
          const firstMarker = cluster.getAllChildMarkers()[0];
          const firstUser = firstMarker.options.userData || { color: "#ffd60a", nickname: "Kalcerian", avatarSeed: "default" };
          const remaining = cluster.getChildCount() - 1;
          const clusterColor = firstUser.color || "#ffd60a";
          return L.divIcon({
            html: `
              <div class="cluster-node" style="--user-color: ${clusterColor}">
                <div class="cluster-pulse"></div>
                <div class="cluster-avatar"><img src="${avatar(firstUser.avatarSeed)}" alt="${esc(firstUser.nickname)}"></div>
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
    
    markerRefs.current = {};
    layer.clearLayers();

    (users || []).forEach((user) => {
      if (!Number.isFinite(user.lat) || !Number.isFinite(user.lng)) return;
      const marker = L.marker([user.lat, user.lng], { 
        icon: createUserIcon(L, user), 
        userData: user 
      }).bindPopup(userPopup(user), { 
        className: "tactical-popup", 
        offset: [0, -60] 
      });

      markerRefs.current[user.id] = marker;
      layer.addLayer(marker);
    });

    (events || []).forEach((item) => {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      layer.addLayer(L.marker([item.lat, item.lng], { 
        icon: createEventIcon(L, item), 
        userData: { color: "#ff006e" } 
      })
.bindPopup(eventPopup(item), { 
        className: "tactical-popup", 
        offset: [0, -34] 
      }));
    });

    if (hqPoint) {
      const hqMarker = L.marker([hqPoint.lat, hqPoint.lng], {
        icon: createHqIcon(L),
        userData: { color: "#ffd60a", nickname: "HQ", avatarSeed: "hq" },
      }).bindPopup(hqPopup(hqPoint), { 
        className: "tactical-popup hq-tactical-popup", 
        offset: [0, -30] 
      });
      layer.addLayer(hqMarker);
    }


    layer.addTo(mapRef.current);
  }, [users, events, hqPoint, isReady]);


  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapNodeRef} className="w-full h-full bg-transparent snap-tactical-map" />

      <style jsx global>{`
        .snap-tactical-map .leaflet-pane,
        .snap-tactical-map .leaflet-tile-pane {
          opacity: 0.95;
        }

        .snap-tactical-map .leaflet-tile-container {
          filter: sepia(58%) saturate(170%) hue-rotate(-10deg) brightness(1.22) contrast(1.08);
        }

        /* Marker Styles */
        .radar-node {
          position: relative;
          width: 48px;
          height: 70px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }

        .radar-avatar {
          position: relative;
          z-index: 2;
          width: 48px;
          height: 48px;
          overflow: hidden;
          border: 2px solid #374151;
          border-radius: 50%;
          background: #0a0e27;
          filter: grayscale(100%) brightness(0.7);
          transition: all 0.3s ease;
        }

        .radar-node:hover .radar-avatar,
        .radar-node.active .radar-avatar {
          border-color: var(--user-color);
          box-shadow: 0 0 15px var(--user-color), inset 0 0 10px var(--user-color);
          filter: grayscale(0%) brightness(1.2);
          transform: scale(1.1);
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
          border: 2px solid var(--user-color);
          border-radius: 50%;
          background: #0a0e27;
          box-shadow: 0 0 15px var(--user-color), inset 0 0 10px var(--user-color);
        }

        .cluster-count {
          position: absolute;
          right: -8px;
          bottom: -4px;
          z-index: 3;
          padding: 2px 6px;
          border: 2px solid #ffffff;
          background: #050714;
          color: #ffffff;
          font-family: monospace;
          font-weight: 900;
          font-size: 12px;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
        }


        @keyframes radarPing {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }

        @keyframes hqPing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .radar-pulse, .cluster-pulse, .event-pulse {

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

        /* Popups */
        .tactical-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
        }
        .tactical-popup .leaflet-popup-tip-container { display: none; }
        .tactical-popup .leaflet-popup-content { width: auto !important; margin: 0; }

        .tactical-card {
          position: relative;
          width: 260px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #0a0e27;
          color: #fff;
          clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          border-left: 4px solid var(--border-color, #ff006e);
        }

        .scanlines {
          position: absolute;
          inset: 0;
          opacity: 0.1;
          pointer-events: none;
          background: linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px);
          background-size: 4px 4px;
        }

        .popup-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.4);
          position: relative;
          z-index: 10;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .popup-avatar, .hq-badge, .event-badge {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 2px solid var(--border-color, #fff);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 14, 39, 0.8);
          color: var(--border-color, #fff);
          font-weight: 900;
          font-size: 14px;
        }

        .popup-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .popup-profile strong {
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          display: block;
        }

        .popup-profile small {
          font-family: sans-serif;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 6px;
          margin-top: 4px;
          display: inline-block;
        }


        .popup-status {
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          font-size: 10px;
          font-style: italic;
          color: rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 10;
        }

        .popup-status.active {
          background: #111633;
          color: rgba(255, 255, 255, 0.8);
          border-left: 2px solid var(--border-color, #fff);
        }

        .popup-status span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          flex-shrink: 0;
        }

        .popup-action-wrap {
          padding: 12px;
          position: relative;
          z-index: 10;
          background: rgba(0, 0, 0, 0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .popup-action {
          display: block;
          width: 100%;
          padding: 10px;
          text-align: center;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transition: background 0.2s;
          clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
          cursor: pointer;
          border: none;
        }

        .popup-action:hover { background: rgba(255, 255, 255, 0.2); }
        .popup-action.disabled { background: rgba(0, 0, 0, 0.4); color: rgba(255, 255, 255, 0.3); cursor: not-allowed; }
        
        .popup-action.hq-enter-btn {
          background: rgba(255, 214, 10, 0.1);
          color: #ffd60a;
          border: 1px solid rgba(255, 214, 10, 0.3);
        }

        .popup-tail {
          width: 6px;
          height: 24px;
          margin: 0 auto;
          opacity: 0.8;
          background: linear-gradient(to bottom, var(--border-color, #fff), transparent);
        }
      `}</style>
    </div>
  );
}
