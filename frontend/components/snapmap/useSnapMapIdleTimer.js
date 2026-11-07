"use client";

import { useEffect, useRef, useCallback } from "react";
import { tickAllEventUptimeElements } from "./snapMapHelpers";

export function useSnapMapIdleTimer({ mapRef, markerRefs }) {
  const idleTimerRef = useRef(null);

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
  }, [mapRef, markerRefs]);

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

  return { resetIdleTimer };
}
