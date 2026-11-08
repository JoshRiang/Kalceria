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

      const isSelf = Boolean(currentUser?.id && String(user.id) === String(currentUser.id));
      const resolvedUser = isSelf
        ? { ...user, ...currentUser, profilePicture: currentUser.profilePicture || user.profilePicture }
        : user;

      const nextUserIcon = createUserIcon(L, resolvedUser, isMapDark);
      const nextUserIconHtml = nextUserIcon?.options?.html || "";

      if (markerRefs.current[markerId]) {
        const marker = markerRefs.current[markerId];

        const currentLatLng = marker.getLatLng();
        if (currentLatLng.lat !== resolvedUser.lat || currentLatLng.lng !== resolvedUser.lng) {
          marker.setLatLng([resolvedUser.lat, resolvedUser.lng]);
        }

        if (marker._lastIconHtml !== nextUserIconHtml) {
          marker.setIcon(nextUserIcon);
          marker._lastIconHtml = nextUserIconHtml;
        }

        const popupContent = userPopup(resolvedUser, isMapDark);
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

        marker.options.userData = resolvedUser;
      } else {
        const popupContent = userPopup(resolvedUser, isMapDark);
        const marker = L.marker([resolvedUser.lat, resolvedUser.lng], {
          icon: nextUserIcon,
          userData: resolvedUser,
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
        } else {
          marker._lastPopupContent = null;
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
      const pendingCount = pendingReqs.length;
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

  return { markerRefs };
}
