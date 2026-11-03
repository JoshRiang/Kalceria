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
  currentUser = null,
  onEditEvent,
  requestedEventId = null,
  eventRequestsMap = {},
  acceptedCollabsMap = {},
  onRequestCollab,
  onPromptCancelRequest,
  onOpenRequests,
  onCollaboratorUpload,
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const usersLayerRef = useRef(null);
  const eventsLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRefs = useRef({});
  const [isReady, setIsReady] = useState(false);

  // Wire global event popup callbacks (edit, collab request, cancel request, open requests)
  useEffect(() => {
    window.__kalceriaEditEvent = (id) => {
      const target = (events || []).find((e) => String(e.id) === String(id));
      if (target && onEditEvent) onEditEvent(target);
    };
    window.__kalceriaRequestCollab = (id) => {
      onRequestCollab?.(id);
    };
    window.__kalceriaPromptCancelRequest = (id, title) => {
      onPromptCancelRequest?.(id, title);
    };
    window.__kalceriaOpenRequests = (id) => {
      onOpenRequests?.(id);
    };
    window.__kalceriaCollaboratorUpload = (id) => {
      onCollaboratorUpload?.(id);
    };
    return () => {
      delete window.__kalceriaEditEvent;
      delete window.__kalceriaRequestCollab;
      delete window.__kalceriaPromptCancelRequest;
      delete window.__kalceriaOpenRequests;
      delete window.__kalceriaCollaboratorUpload;
    };
  }, [events, onEditEvent, onRequestCollab, onPromptCancelRequest, onOpenRequests, onCollaboratorUpload]);

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

  // Handle programmatic focus/popup opening (supports both user and event markers)
  useEffect(() => {
    if (!isReady || !markerRefs.current || !mapRef.current) return;

    if (focusTarget) {
      const { id, type, openPopup = true } = focusTarget;
      let targetMarker = null;

      if (type === "event") {
        targetMarker = markerRefs.current[`event_${id}`] || markerRefs.current[id];
      } else {
        targetMarker = markerRefs.current[`user_${id}`] || markerRefs.current[id];
      }

      if (!targetMarker) {
        targetMarker = markerRefs.current[`user_${id}`] || markerRefs.current[`event_${id}`];
      }

      if (!targetMarker && markerRefs.current) {
        const idLower = String(id).toLowerCase();
        for (const key of Object.keys(markerRefs.current)) {
          const m = markerRefs.current[key];
          const ud = m?.options?.userData;
          if (ud) {
            const udId = String(ud.id || "").toLowerCase();
            const udName = String(ud.name || "").toLowerCase();
            const udNick = String(ud.nickname || "").toLowerCase();
            const creatorId = String(ud.creator?.id || "").toLowerCase();
            const creatorName = String(ud.creator?.name || ud.creator?.nickname || "").toLowerCase();

            if (
              udId === idLower ||
              udName === idLower ||
              udNick === idLower ||
              creatorId === idLower ||
              creatorName === idLower ||
              (idLower.includes(udNick) && udNick.length > 2) ||
              (udId.includes(idLower) && idLower.length > 2)
            ) {
              targetMarker = m;
              break;
            }
          }
        }
      }

      if (targetMarker && mapRef.current) {
        const latLng = targetMarker.getLatLng();
        const map = mapRef.current;
        const currentCenter = map.getCenter();
        const dist = currentCenter ? currentCenter.distanceTo(latLng) : 9999;

        const openPopupSafe = () => {
          try {
            targetMarker.openPopup();
          } catch (_) {}
        };

        if (dist < 20) {
          if (openPopup) openPopupSafe();
        } else {
          let timer = null;
          const onMoveEnd = () => {
            map.off("moveend", onMoveEnd);
            if (timer) clearTimeout(timer);
            if (openPopup) {
              setTimeout(openPopupSafe, 50);
            }
          };

          map.once("moveend", onMoveEnd);
          timer = setTimeout(() => {
            map.off("moveend", onMoveEnd);
            if (openPopup) openPopupSafe();
          }, 650);

          map.flyTo(latLng, 16, { animate: true, duration: 0.5 });

          return () => {
            map.off("moveend", onMoveEnd);
            if (timer) clearTimeout(timer);
          };
        }
      }
      return;
    }

    if (focusUserId) {
      const markerId = `user_${focusUserId}`;
      const marker = markerRefs.current[markerId];
      if (marker && mapRef.current) {
        const latLng = marker.getLatLng();
        mapRef.current.flyTo(latLng, 16, { animate: true, duration: 0.5 });
        mapRef.current.once("moveend", () => {
          marker.openPopup();
        });
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

      // Standard OpenStreetMap tiles - matching Picture 3 and late October commits
      const tileLayer = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }
      ).addTo(map);

      // Multi-shard fallback in case of regional edge timeout
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

        const pendingCount = (eventRequestsMap?.[item.id] || []).length;
        const isCollaborator = Boolean(
          (acceptedCollabsMap?.[item.id] && currentUser?.id && acceptedCollabsMap[item.id].includes(currentUser.id)) ||
          item.isCollaborator ||
          (item.collaboratorIds && currentUser?.id && item.collaboratorIds.includes(currentUser.id))
        );
        const newPopupContent = eventPopup(item, isMapDark, currentUser, requestedEventId, pendingCount, isCollaborator);
        if (marker._lastPopupContent !== newPopupContent) {
          marker.getPopup().setContent(newPopupContent);
          marker._lastPopupContent = newPopupContent;
        }
      } else {
        const pendingCount = (eventRequestsMap?.[item.id] || []).length;
        const isCollaborator = Boolean(
          (acceptedCollabsMap?.[item.id] && currentUser?.id && acceptedCollabsMap[item.id].includes(currentUser.id)) ||
          item.isCollaborator ||
          (item.collaboratorIds && currentUser?.id && item.collaboratorIds.includes(currentUser.id))
        );
        const newPopupContent = eventPopup(item, isMapDark, currentUser, requestedEventId, pendingCount, isCollaborator);
        const marker = L.marker([item.lat, item.lng], {
          icon: createEventIcon(L, item, isMapDark),
          userData: { color: "#ff006e" },
        }).bindPopup(newPopupContent, {
          className: "tactical-popup",
          offset: [0, -34],
          autoClose: true,
          closeButton: false,
        });
        marker._lastPopupContent = newPopupContent;
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
  }, [users, events, isReady, isMapDark, currentUser, requestedEventId, eventRequestsMap]);

  return (
    <div className={`fixed inset-0 z-0 snap-tactical-map ${isMapDark ? "dark-theme" : "light-theme"}`}>
      <div
        ref={mapNodeRef}
        className="w-full h-full bg-transparent"
      />

    </div>
  );
}
