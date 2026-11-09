"use client";

import { useEffect, useRef } from "react";
import { createUserIcon } from "../map/UserIcon";
import { createEventIcon } from "../map/EventIcon";
import { userPopup } from "../map/UserPopup";
import { eventPopup } from "../map/EventPopup";
import {
  isEventOwner,
  isEventCollaborator,
  getEventPendingRequests,
} from "../map/hooks/useMapChatAndNotifications";
import { hasValidCoordinates } from "@/lib/osmTilePrewarmer";
import { stripDynamicUptime, tickAllEventUptimeElements } from "./snapMapHelpers";
import { initEventPopupCarouselsFromRoot } from "../map/eventPopup/popupCarouselController";

export function useSnapMapMarkers({
  markerRefs: externalMarkerRefs,
  isReady,
  mapRef,
  usersLayerRef,
  eventsLayerRef,
  users,
  events,
  isMapDark,
  currentUser,
  requestedEventId,
  eventRequestsMap,
  acceptedCollabsMap,
  eventGroupChatMap,
  isSelfOffline,
}) {
  const internalMarkerRefs = useRef({});
  const markerRefs = externalMarkerRefs || internalMarkerRefs;

  useEffect(() => {
    if (
      !isReady ||
      !mapRef.current ||
      !usersLayerRef.current ||
      !eventsLayerRef.current ||
      !window.L
    )
      return;
    const L = window.L;
    const usersLayer = usersLayerRef.current;
    const eventsLayer = eventsLayerRef.current;

    if (!markerRefs.current) markerRefs.current = {};

    // 1. Reconcile Users (strictly online & live-location-enabled users only; offline users never render on map)
    const currentUserIds = new Set();
    (users || []).forEach((user) => {
      if (!user?.isOnline || user.allowLiveLocation === false) return;
      if (!hasValidCoordinates(user.lat, user.lng)) return;
      const markerId = `user_${user.id}`;
      currentUserIds.add(markerId);

      const nextUserIcon = createUserIcon(L, user, isMapDark);
      const nextUserIconHtml = nextUserIcon?.options?.html || "";

      if (markerRefs.current[markerId]) {
        const marker = markerRefs.current[markerId];

        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== user.lat || currentLatLng.lng !== user.lng) {
          marker.setLatLng([user.lat, user.lng]);
        }

        if (marker._lastIconHtml !== nextUserIconHtml) {
          marker.setIcon(nextUserIcon);
          marker._lastIconHtml = nextUserIconHtml;
        }

        const popupContent = userPopup(user, isMapDark, currentUser);
        const userSig = popupContent ? stripDynamicUptime(popupContent) : null;
        if (popupContent) {
          if (!marker.getPopup()) {
            marker.bindPopup(popupContent, {
              className: "tactical-popup",
              offset: [0, -26],
              autoClose: true,
              closeButton: false,
            });
            marker._lastPopupContent = popupContent;
            marker._lastPopupSig = userSig;
          } else if (marker._lastPopupSig !== userSig) {
            marker.getPopup().setContent(popupContent);
            if (marker.getPopup().options) {
              marker.getPopup().options.offset = [0, -26];
            }
            marker._lastPopupContent = popupContent;
            marker._lastPopupSig = userSig;
            tickAllEventUptimeElements();
          }
        } else {
          if (marker.getPopup()) {
            marker.unbindPopup();
          }
          marker._lastPopupContent = null;
          marker._lastPopupSig = null;
        }

        marker.options.userData = user;
      } else {
        const popupContent = userPopup(user, isMapDark, currentUser);
        const userSig = popupContent ? stripDynamicUptime(popupContent) : null;
        const marker = L.marker([user.lat, user.lng], {
          icon: nextUserIcon,
          userData: user,
        });
        marker._lastIconHtml = nextUserIconHtml;

        if (popupContent) {
          marker.bindPopup(popupContent, {
            className: "tactical-popup",
            offset: [0, -26],
            autoClose: true,
            closeButton: false,
          });
          marker._lastPopupContent = popupContent;
          marker._lastPopupSig = userSig;
        } else {
          marker._lastPopupContent = null;
          marker._lastPopupSig = null;
        }

        // When tapping an avatar marker on the map, show username tooltip box AND trigger inline profile animation in the scroll bar
        marker.on("click", () => {
          if (typeof document !== "undefined") {
            document
              .querySelectorAll(
                ".radar-node.is-nametag-open, .broadcast-map-node.is-nametag-open"
              )
              .forEach((el) => {
                el.classList.remove("is-nametag-open");
              });
            const iconEl = marker.getElement?.();
            const nodeEl = iconEl?.querySelector?.(
              ".radar-node, .broadcast-map-node"
            );
            if (nodeEl) {
              nodeEl.classList.add("is-nametag-open");
              setTimeout(() => {
                nodeEl.classList.remove("is-nametag-open");
              }, 3500);
            }
          }
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
      if (!hasValidCoordinates(item.lat, item.lng)) return;
      const markerId = `event_${item.id}`;
      currentEventIds.add(markerId);

      const isOwner = isEventOwner(item, currentUser);
      const isCollaborator = isEventCollaborator(
        item,
        currentUser,
        acceptedCollabsMap
      );
      const pendingReqs = isOwner
        ? getEventPendingRequests(item, currentUser, eventRequestsMap)
        : [];
      const pendingCount = isOwner
        ? Math.max(pendingReqs.length, Number(item.pendingRequestsCount) || 0)
        : 0;
      const unreadGroupChatCount =
        isOwner || isCollaborator
          ? eventGroupChatMap?.[item.id]?.unreadCount || 0
          : 0;
      const hasEventNotif = pendingCount > 0 || unreadGroupChatCount > 0;

      const nextEventIcon = createEventIcon(L, item, isMapDark, hasEventNotif);
      const nextEventIconHtml = nextEventIcon?.options?.html || "";

      if (markerRefs.current[markerId]) {
        const marker = markerRefs.current[markerId];

        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== item.lat || currentLatLng.lng !== item.lng) {
          marker.setLatLng([item.lat, item.lng]);
        }

        if (marker._lastIconHtml !== nextEventIconHtml) {
          marker.setIcon(nextEventIcon);
          marker._lastIconHtml = nextEventIconHtml;
        }

        const newPopupContent = eventPopup(
          item,
          isMapDark,
          currentUser,
          requestedEventId,
          pendingCount,
          isCollaborator,
          unreadGroupChatCount,
          isSelfOffline
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
          if (marker.isPopupOpen?.()) {
            const popupEl = marker.getPopup()?.getElement?.();
            if (popupEl) {
              initEventPopupCarouselsFromRoot(popupEl, marker.getPopup());
            }
          }
        }
      } else {
        const newPopupContent = eventPopup(
          item,
          isMapDark,
          currentUser,
          requestedEventId,
          pendingCount,
          isCollaborator,
          unreadGroupChatCount,
          isSelfOffline
        );
        const marker = L.marker([item.lat, item.lng], {
          icon: nextEventIcon,
          userData: { color: "#ff006e" },
        }).bindPopup(newPopupContent, {
          className: "tactical-popup event-tactical-popup",
          offset: [0, -34],
          maxWidth: 480,
          minWidth: 0,
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
        });
        marker._lastIconHtml = nextEventIconHtml;
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
  }, [
    users,
    events,
    isReady,
    isMapDark,
    currentUser,
    requestedEventId,
    eventRequestsMap,
    acceptedCollabsMap,
    eventGroupChatMap,
    isSelfOffline,
    mapRef,
    usersLayerRef,
    eventsLayerRef,
  ]);

  // Purge expired broadcast instantly when 24h is reached
  useEffect(() => {
    const handlePurge = (e) => {
      const userId = e.detail?.userId;
      if (!userId || !markerRefs.current) return;
      const marker = markerRefs.current[`user_${userId}`];
      if (marker && marker.getPopup()) {
        try {
          marker.closePopup();
          marker.unbindPopup();
        } catch (_) {}
        marker._lastPopupContent = null;
        marker._lastPopupSig = null;
      }
    };
    window.addEventListener("kalceria:purge-expired-broadcast", handlePurge);
    return () => window.removeEventListener("kalceria:purge-expired-broadcast", handlePurge);
  }, [markerRefs]);

  return { markerRefs };
}
