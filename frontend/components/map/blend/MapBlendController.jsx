"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchMyActiveBlends,
  updateGroupBlendState,
  leaveGroupBlend,
} from "@/lib/api";
import { createBlendMapRenderer } from "./blendLeafletRenderer";
import { BlendFocusHud } from "./BlendFocusHud";
import { cycleFocusIndex, smoothAngleDegrees } from "./gpsCurator";

export function MapBlendController({
  mapRef,
  isReady,
  currentUser,
  isMapDark,
}) {
  const [activeBlend, setActiveBlend] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const rendererRef = useRef(null);
  const lastSyncSentRef = useRef(0);
  const activeBlendRef = useRef(null);
  const compassHeadingRef = useRef(null);
  activeBlendRef.current = activeBlend;

  const loadActiveBlends = useCallback(async () => {
    if (!currentUser?.id) return;
    const res = await fetchMyActiveBlends();
    const list = Array.isArray(res?.blends) ? res.blends : [];
    const next = list[0] || null;
    setActiveBlend(next);
    if (!next) {
      setIsFocusMode(false);
      setFocusedIndex(0);
    }
  }, [currentUser?.id]);

  // Adaptive polling: 4s when inside active Blend, 14s idle check
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    loadActiveBlends();
    const ms = activeBlend?.isJoined ? 4000 : 14000;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadActiveBlends();
    }, ms);
    return () => clearInterval(timer);
  }, [currentUser?.id, activeBlend?.isJoined, loadActiveBlends]);

  // Event bridges from GroupChat Banner + Curated GPS stream
  useEffect(() => {
    const onBlendUpdated = () => loadActiveBlends();
    const onBlendFocus = (e) => {
      loadActiveBlends().then(() => {
        if (e?.detail?.focus !== false) {
          setIsFocusMode(true);
        }
      });
    };
    const onCuratedGps = (e) => {
      const gps = e?.detail;
      const blend = activeBlendRef.current;
      if (!gps || !blend?.isJoined || !blend?.eventId) return;

      // Immediately update own local position & heading for ultra-responsive 2D triangle
      setActiveBlend((prev) => {
        if (!prev?.participants) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.isSelf
              ? {
                  ...p,
                  lat: gps.lat,
                  lng: gps.lng,
                  heading: gps.isStationary && compassHeadingRef.current !== null
                    ? compassHeadingRef.current
                    : gps.heading,
                  speed: gps.speed,
                  accuracy: gps.accuracy,
                  isStationary: gps.isStationary,
                }
              : p
          ),
        };
      });

      const now = Date.now();
      if (now - lastSyncSentRef.current >= 3500) {
        lastSyncSentRef.current = now;
        updateGroupBlendState(blend.eventId, {
          lat: gps.lat,
          lng: gps.lng,
          accuracy: gps.accuracy,
          heading:
            gps.isStationary && compassHeadingRef.current !== null
              ? compassHeadingRef.current
              : gps.heading,
          speed: gps.speed,
          isStationary: gps.isStationary,
        })
          .then((updated) => {
            if (updated?.ok) setActiveBlend(updated);
          })
          .catch(() => {});
      }
    };

    window.addEventListener("kalceria:blend-updated", onBlendUpdated);
    window.addEventListener("kalceria:blend-focus", onBlendFocus);
    window.addEventListener("kalceria:curated-gps", onCuratedGps);
    return () => {
      window.removeEventListener("kalceria:blend-updated", onBlendUpdated);
      window.removeEventListener("kalceria:blend-focus", onBlendFocus);
      window.removeEventListener("kalceria:curated-gps", onCuratedGps);
    };
  }, [loadActiveBlends]);

  // Device compass listener in Focus Mode so 2D triangle faces user direction when standing still
  useEffect(() => {
    if (!isFocusMode || typeof window === "undefined") return undefined;
    const handleOrientation = (ev) => {
      let deg = null;
      if (typeof ev.webkitCompassHeading === "number" && Number.isFinite(ev.webkitCompassHeading)) {
        deg = ev.webkitCompassHeading;
      } else if (typeof ev.alpha === "number" && Number.isFinite(ev.alpha)) {
        deg = (360 - ev.alpha) % 360;
      }
      if (deg === null) return;
      compassHeadingRef.current = smoothAngleDegrees(
        compassHeadingRef.current ?? deg,
        deg,
        0.28
      );
      setActiveBlend((prev) => {
        if (!prev?.participants) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.isSelf && p.isStationary
              ? { ...p, heading: compassHeadingRef.current }
              : p
          ),
        };
      });
    };

    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [isFocusMode]);

  const participants = Array.isArray(activeBlend?.participants) ? activeBlend.participants : [];
  const safeIndex = participants.length > 0 ? focusedIndex % participants.length : 0;
  const focusedParticipant = participants[safeIndex] || null;

  // Render Leaflet Blend Layer (routes, traffic congestion, dotted transit transfers, moving avatars + 2D cone)
  useEffect(() => {
    if (!isReady || !mapRef?.current || typeof window === "undefined" || !window.L) return undefined;
    if (!rendererRef.current) {
      rendererRef.current = createBlendMapRenderer();
    }
    rendererRef.current.render({
      map: mapRef.current,
      L: window.L,
      blend: activeBlend,
      isFocusMode,
      focusedUserId: focusedParticipant?.userId || null,
      isMapDark,
      onSelectParticipant: (uid) => {
        const idx = participants.findIndex((p) => String(p.userId) === String(uid));
        if (idx >= 0) {
          setFocusedIndex(idx);
          setIsFocusMode(true);
        }
      },
    });
  }, [isReady, mapRef, activeBlend, isFocusMode, focusedParticipant?.userId, isMapDark]);

  // Cleanup Leaflet layers on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.clear(mapRef?.current);
    };
  }, [mapRef]);

  // Smooth Google Maps-style Focus Camera Tracking + Left/Right Arrow Rotation to Friends!
  useEffect(() => {
    if (!isFocusMode || !mapRef?.current || !focusedParticipant) return;
    const lat = Number(focusedParticipant.lat);
    const lng = Number(focusedParticipant.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      const currentZoom = mapRef.current.getZoom?.() || 15;
      const targetZoom = currentZoom < 16 ? 17 : Math.min(18, currentZoom);
      mapRef.current.flyTo([lat, lng], targetZoom, {
        animate: true,
        duration: 0.75,
        easeLinearity: 0.25,
      });
    } catch {}
  }, [isFocusMode, focusedParticipant?.userId, focusedParticipant?.lat, focusedParticipant?.lng, mapRef]);

  const handleToggleFocusMode = (nextFocus) => {
    if (nextFocus) {
      const selfIdx = participants.findIndex((p) => p.isSelf);
      if (selfIdx >= 0) setFocusedIndex(selfIdx);
    }
    setIsFocusMode(Boolean(nextFocus));
  };

  const handleCycleFocus = (delta) => {
    if (participants.length <= 1) return;
    setFocusedIndex((prev) => cycleFocusIndex(participants.length, prev, delta));
  };

  const handleChangeTransportMode = async (nextMode) => {
    if (!activeBlend?.eventId || isUpdatingMode) return;
    setIsUpdatingMode(true);
    try {
      const g = typeof window !== "undefined" ? window.__kalceriaCuratedGps : null;
      const updated = await updateGroupBlendState(activeBlend.eventId, {
        transportMode: nextMode,
        ...(g && Number.isFinite(g.lat) && Number.isFinite(g.lng)
          ? {
              lat: g.lat,
              lng: g.lng,
              accuracy: g.accuracy,
              heading: g.heading,
              speed: g.speed,
              isStationary: g.isStationary,
            }
          : {}),
      });
      if (updated?.ok) setActiveBlend(updated);
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleLeaveBlend = async () => {
    if (!activeBlend?.eventId) return;
    const eid = activeBlend.eventId;
    setIsFocusMode(false);
    setActiveBlend(null);
    await leaveGroupBlend(eid).catch(() => {});
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:blend-updated", { detail: { eventId: eid } }));
    }
  };

  if (!activeBlend?.isJoined) return null;

  return (
    <BlendFocusHud
      blend={activeBlend}
      isMapDark={isMapDark}
      isFocusMode={isFocusMode}
      focusedParticipant={focusedParticipant}
      focusedIndex={safeIndex}
      myMode={activeBlend.myTransportMode || "foot"}
      isUpdatingMode={isUpdatingMode}
      onToggleFocusMode={handleToggleFocusMode}
      onCycleFocus={handleCycleFocus}
      onChangeTransportMode={handleChangeTransportMode}
      onLeaveBlend={handleLeaveBlend}
    />
  );
}

