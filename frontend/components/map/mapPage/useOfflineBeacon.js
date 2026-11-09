"use client";

import { useEffect } from "react";

/**
 * frontend/components/map/mapPage/useOfflineBeacon.js
 *
 * Immediately marks user offline in Redis when navigating away from map,
 * closing browser tab, or unmounting component.
 * Ledger: M6
 *
 * Input: { currentUser }
 * Output: {}
 */
export function useOfflineBeacon({ currentUser = null } = {}) {
  // Immediately mark offline in Redis when leaving map, closing tab, or shutting down laptop (M6)
  useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;

    const markOffline = () => {
      try {
        const payload = JSON.stringify({ userId });
        // 1. SendBeacon with Blob application/json
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/location/offline", blob);
        }
        // 2. Fetch with keepalive (standard across desktop Chrome/Edge/Firefox)
        if (typeof fetch === "function") {
          fetch("/api/location/offline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
            credentials: "include",
          }).catch(() => {});
        }
      } catch {}
    };

    window.addEventListener("pagehide", markOffline);
    window.addEventListener("beforeunload", markOffline);

    return () => {
      window.removeEventListener("pagehide", markOffline);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [currentUser?.id]);
}

