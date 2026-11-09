"use client";

import { useEffect, useRef, useCallback } from "react";
import { tickAllEventUptimeElements } from "./snapMapHelpers";
import {
  FEED_ENDED_EVENT,
  FEED_INTERACTION_EVENT,
} from "../map/eventPopup/popupCarouselController";

export function useSnapMapIdleTimer({ mapRef, markerRefs }) {
  const idleTimerRef = useRef(null);
  const resetIdleTimerRef = useRef(null);

  // Smooth idle auto-collapse timer for event cards and broadcast popups on map
  const resetIdleTimer = useCallback((delayMs = 5000) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    idleTimerRef.current = setTimeout(() => {
      const activeEventPopups = document.querySelectorAll(".event-tactical-popup");
      const activeBroadcastPopups = document.querySelectorAll(".broadcast-tactical-popup, .broadcast-popup-box");
      if (!activeEventPopups.length && !activeBroadcastPopups.length) return;

      // The card never closes while its Live Media Feed is still playing; it closes once the
      // feed reaches its end (or when there is nothing playing and the viewer has gone idle).
      const hasActivePlayingFeed = Array.from(activeEventPopups).some((el) =>
        Boolean(el.querySelector('[data-feed-state="playing"], [data-feed-state="paused"]'))
      );
      if (hasActivePlayingFeed) {
        resetIdleTimerRef.current?.(3500);
        return;
      }

      const allActivePopups = [...activeEventPopups, ...activeBroadcastPopups];
      allActivePopups.forEach((el) => {
        const popupWrapper = el.closest(".leaflet-popup") || el;
        popupWrapper.classList.add("popup-shrinking");
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
        allActivePopups.forEach((el) => {
          const popupWrapper = el.closest(".leaflet-popup") || el;
          popupWrapper.classList.remove("popup-shrinking");
        });
      }, 380);
    }, delayMs);
  }, [mapRef, markerRefs]);
  resetIdleTimerRef.current = resetIdleTimer;

  // Wire popup idle collapse listeners
  useEffect(() => {
    const handlePopupMouseEnter = (e) => {
      if (e.target.closest?.(".event-tactical-popup, .broadcast-tactical-popup, .broadcast-popup-box")) {
        resetIdleTimer(6000);
      }
    };

    const handlePopupMouseLeave = (e) => {
      if (e.target.closest?.(".event-tactical-popup, .broadcast-tactical-popup, .broadcast-popup-box")) {
        resetIdleTimer(2500);
      }
    };

    const handleMapMove = () => {
      const openPopups = document.querySelectorAll(".event-tactical-popup, .broadcast-tactical-popup, .broadcast-popup-box");
      if (openPopups.length > 0) {
        resetIdleTimer(5000);
      }
    };

    const handleFeedEnded = () => {
      resetIdleTimer(1200);
    };

    const handleFeedInteraction = () => {
      resetIdleTimer(5000);
    };

    window.addEventListener("pointerdown", handleMapMove, { passive: true });
    window.addEventListener("touchstart", handleMapMove, { passive: true });
    window.addEventListener("keydown", handleMapMove, { passive: true });
    window.addEventListener(FEED_ENDED_EVENT, handleFeedEnded);
    window.addEventListener(FEED_INTERACTION_EVENT, handleFeedInteraction);
    document.addEventListener("mouseover", handlePopupMouseEnter, { passive: true });
    document.addEventListener("mouseout", handlePopupMouseLeave, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointerdown", handleMapMove);
      window.removeEventListener("touchstart", handleMapMove);
      window.removeEventListener("keydown", handleMapMove);
      window.removeEventListener(FEED_ENDED_EVENT, handleFeedEnded);
      window.removeEventListener(FEED_INTERACTION_EVENT, handleFeedInteraction);
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

  return { resetIdleTimer };
}
