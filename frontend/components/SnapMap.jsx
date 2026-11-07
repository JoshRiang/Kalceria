"use client";

import { useRef } from "react";
import "leaflet/dist/leaflet.css";
import "./map/snapmap.css";
import "./map/map-card.css";

import { useSnapMapIdleTimer } from "./snapmap/useSnapMapIdleTimer";
import { useSnapMapGlobalCallbacks } from "./snapmap/useSnapMapGlobalCallbacks";
import { useSnapMapFocus } from "./snapmap/useSnapMapFocus";
import { useSnapMapInit } from "./snapmap/useSnapMapInit";
import { useSnapMapMarkers } from "./snapmap/useSnapMapMarkers";

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
  isSelfOffline = false,
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // Idle Timer auto-collapse & 1s uptime ticker
  const { resetIdleTimer } = useSnapMapIdleTimer({
    mapRef,
    markerRefs,
  });

  // Map Initialization, resize handling & tile layer
  const { usersLayerRef, eventsLayerRef, isReady } = useSnapMapInit({
    mapNodeRef,
    mapRef,
    isMapDark,
    onMapReady,
    resetIdleTimer,
  });

  // Marker reconciliation (Users & Events)
  useSnapMapMarkers({
    markerRefs,
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
  });

  // Global popup callbacks
  useSnapMapGlobalCallbacks({
    events,
    onEditEvent,
    onRequestCollab,
    onPromptCancelRequest,
    onOpenRequests,
    onCollaboratorUpload,
    isSelfOffline,
  });

  // Programmatic Focus & FlyTo
  useSnapMapFocus({
    isReady,
    mapRef,
    markerRefs,
    focusTarget,
    focusUserId,
  });

  return (
    <div className={`fixed inset-0 z-0 snap-tactical-map ${isMapDark ? "dark-theme" : "light-theme"}`}>
      <div
        ref={mapNodeRef}
        className="w-full h-full bg-transparent"
      />
    </div>
  );
}
