"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createUserIcon, escapeMapHtml, getSafeMapAvatarUrl, getSafeMapColor } from "./map/UserIcon";
import { createEventIcon } from "./map/EventIcon";
import { userPopup } from "./map/UserPopup";
import { eventPopup } from "./map/EventPopup";
import {
  isEventOwner,
  isEventCollaborator,
  getEventPendingRequests,
} from "./map/hooks/useMapChatAndNotifications";

import "leaflet/dist/leaflet.css";
import "./map/snapmap.css";
import "./map/map-card.css";

// Constants & Helpers
const DEFAULT_CENTER = [-6.2735, 106.7150];

function stripDynamicUptime(html) {
  return String(html || "").replace(
    /(data-event-uptime="[^"]+"[^>]*>)\d{2}:\d{2}:\d{2}(<\/span>)/g,
    "$100:00:00$2"
  );
}

function tickAllEventUptimeElements() {
  if (typeof document === "undefined") return;
  const nodes = document.querySelectorAll("[data-event-uptime]");
  if (!nodes || nodes.length === 0) return;
  const now = Date.now();
  nodes.forEach((el) => {
    const startMs = Number(el.getAttribute("data-event-uptime"));
    if (!Number.isFinite(startMs) || startMs <= 0) return;
    const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
    const h = String(Math.floor(diffSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
    const s = String(diffSec % 60).padStart(2, "0");
    const nextText = `${h}:${m}:${s}`;
    if (el.textContent !== nextText) {
      el.textContent = nextText;
    }
  });
}

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
  eventGroupChatMap = {},
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
  const idleTimerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Smooth idle auto-collapse timer for event cards on map
  const resetIdleTimer = useCallback((delayMs = 5000) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    idleTimerRef.current = setTimeout(() => {
      const activeEventPopups = document.querySelectorAll(".event-tactical-popup");
      if (!activeEventPopups.length) return;
      activeEventPopups.forEach((el) => {
        el.classList.add("popup-shrinking");
      });
      setTimeout(() => {
        if (mapRef.current) {
          try {
            mapRef.current.closePopup();
          } catch {}
        }
        if (markerRefs.current) {
          Object.keys(markerRefs.current).forEach((key) => {
            const m = markerRefs.current[key];
            if (m?.closePopup) {
              try {
                m.closePopup();
              } catch {}
            }
          });
        }
        activeEventPopups.forEach((el) => {
          el.classList.remove("popup-shrinking");
        });
      }, 300);
    }, delayMs);
  }, []);

  // Wire event popup idle collapse listeners
  useEffect(() => {
    const handlePopupMouseEnter = (e) => {
      if (e.target.closest?.(".event-tactical-popup")) {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      }
    };

    const handlePopupMouseLeave = (e) => {
      if (e.target.closest?.(".event-tactical-popup")) {
        resetIdleTimer(3000);
      }
    };

    const handleMapMove = () => {
      const openPopups = document.querySelectorAll(".event-tactical-popup");
      if (openPopups.length > 0) {
        resetIdleTimer(5000);
      }
    };

    window.addEventListener("pointerdown", handleMapMove, { passive: true });
    window.addEventListener("touchstart", handleMapMove, { passive: true });
    window.addEventListener("keydown", handleMapMove, { passive: true });
    document.addEventListener("mouseover", handlePopupMouseEnter, { passive: true });
    document.addEventListener("mouseout", handlePopupMouseLeave, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointerdown", handleMapMove);
      window.removeEventListener("touchstart", handleMapMove);
      window.removeEventListener("keydown", handleMapMove);
      document.removeEventListener("mouseover", handlePopupMouseEnter);
      document.removeEventListener("mouseout", handlePopupMouseLeave);
    };
  }, [resetIdleTimer]);

  // Live 1-second ticker for all open event popups (data-event-uptime)
  useEffect(() => {
    tickAllEventUptimeElements();
    const intervalId = setInterval(tickAllEventUptimeElements, 1000);
    return () => clearInterval(intervalId);
  }, []);

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
            if (targetMarker.getPopup && targetMarker.getPopup()) {
              targetMarker.openPopup();
              tickAllEventUptimeElements();
            }
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
        closePopupOnClick: false,
      });

      map.on("popupopen", (e) => {
        tickAllEventUptimeElements();
        resetIdleTimer();
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

        const popupContent = userPopup(user, isMapDark);
        if (popupContent) {
          if (!marker.getPopup()) {
            marker.bindPopup(popupContent, {
              className: "tactical-popup",
              offset: [0, -26],
              autoClose: true,
              closeButton: false,
            });
          } else if (marker._lastPopupContent !== popupContent) {
            marker.getPopup().setContent(popupContent);
            if (marker.getPopup().options) {
              marker.getPopup().options.offset = [0, -26];
            }
          }
          marker._lastPopupContent = popupContent;
        } else {
          if (marker.getPopup()) {
            marker.unbindPopup();
          }
          marker._lastPopupContent = null;
        }

        marker.options.userData = user;
      } else {
        const popupContent = userPopup(user, isMapDark);
        const marker = L.marker([user.lat, user.lng], {
          icon: createUserIcon(L, user, isMapDark),
          userData: user,
        });

        if (popupContent) {
          marker.bindPopup(popupContent, {
            className: "tactical-popup",
            offset: [0, -26],
            autoClose: true,
            closeButton: false,
          });
          marker._lastPopupContent = popupContent;
        } else {
          marker._lastPopupContent = null;
        }

        // When tapping an avatar marker on the map, trigger inline profile animation in the scroll bar
        marker.on("click", () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("kalceria:expand-kalcerian-profile", {
                detail: { userId: user.id, id: user.id },
              })
            );
          }
        });

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

      const isOwner = isEventOwner(item, currentUser);
      const isCollaborator = isEventCollaborator(item, currentUser, acceptedCollabsMap);
      const pendingReqs = isOwner ? getEventPendingRequests(item, currentUser, eventRequestsMap) : [];
      const pendingCount = pendingReqs.length;
      const unreadGroupChatCount = (isOwner || isCollaborator) ? (eventGroupChatMap?.[item.id]?.unreadCount || 0) : 0;
      const hasEventNotif = pendingCount > 0 || unreadGroupChatCount > 0;

      if (markerRefs.current[markerId]) {
        const marker = markerRefs.current[markerId];

        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== item.lat || currentLatLng.lng !== item.lng) {
          marker.setLatLng([item.lat, item.lng]);
        }

        marker.setIcon(createEventIcon(L, item, isMapDark, hasEventNotif));

        const newPopupContent = eventPopup(
          item,
          isMapDark,
          currentUser,
          requestedEventId,
          pendingCount,
          isCollaborator,
          unreadGroupChatCount
        );
        const newSig = stripDynamicUptime(newPopupContent);
        if (marker.getPopup()) {
          marker.getPopup().options.autoClose = false;
          marker.getPopup().options.closeOnClick = false;
        }
        if (marker._lastPopupSig !== newSig) {
          marker.getPopup().setContent(newPopupContent);
          marker._lastPopupContent = newPopupContent;
          marker._lastPopupSig = newSig;
          tickAllEventUptimeElements();
        }
      } else {
        const newPopupContent = eventPopup(
          item,
          isMapDark,
          currentUser,
          requestedEventId,
          pendingCount,
          isCollaborator,
          unreadGroupChatCount
        );
        const marker = L.marker([item.lat, item.lng], {
          icon: createEventIcon(L, item, isMapDark, hasEventNotif),
          userData: { color: "#ff006e" },
        }).bindPopup(newPopupContent, {
          className: "tactical-popup event-tactical-popup",
          offset: [0, -34],
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
        });
        marker._lastPopupContent = newPopupContent;
        marker._lastPopupSig = stripDynamicUptime(newPopupContent);
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
  }, [users, events, isReady, isMapDark, currentUser, requestedEventId, eventRequestsMap, acceptedCollabsMap, eventGroupChatMap]);

  return (
    <div className={`fixed inset-0 z-0 snap-tactical-map ${isMapDark ? "dark-theme" : "light-theme"}`}>
      <div
        ref={mapNodeRef}
        className="w-full h-full bg-transparent"
      />
    </div>
  );
}
