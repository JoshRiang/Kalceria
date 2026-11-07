"use client";

import { useEffect } from "react";
import { prewarmOsmTiles } from "@/lib/osmTilePrewarmer";
import { tickAllEventUptimeElements } from "./snapMapHelpers";

export function useSnapMapFocus({
  isReady,
  mapRef,
  markerRefs,
  focusTarget,
  focusUserId,
}) {
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
          }, 720);

          prewarmOsmTiles(latLng.lat, latLng.lng, 16);
          map.flyTo(latLng, 16, {
            animate: true,
            duration: dist > 4500 ? 0.62 : 0.45,
            easeLinearity: 0.25,
          });

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
        prewarmOsmTiles(latLng.lat, latLng.lng, 16);
        mapRef.current.flyTo(latLng, 16, {
          animate: true,
          duration: 0.48,
          easeLinearity: 0.25,
        });
      }
    }
  }, [focusUserId, focusTarget, isReady, mapRef, markerRefs]);
}
