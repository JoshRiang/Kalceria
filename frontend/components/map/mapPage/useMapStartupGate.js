"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * frontend/components/map/mapPage/useMapStartupGate.js
 *
 * Startup gate controller: intro sequence skip check, completion, and
 * consumption of password-reset-from-map return flags.
 * Ledger: M1
 *
 * Output: { showStartup, setShowStartup, checkShouldSkipStartup, handleStartupComplete }
 */
export function useMapStartupGate() {
  const checkShouldSkipStartup = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      // Fade in gracefully directly to map page without intro is for:
      // 1. Password reset return from map
      // 2. Active map session (already initialized in this session)
      const params = new URLSearchParams(window.location.search);
      const isPasswordResetReturn =
        params.get("from") === "password_reset" ||
        params.get("skip_intro") === "true" ||
        sessionStorage.getItem("kalceria_password_reset_from_map") === "true" ||
        localStorage.getItem("kalceria_password_reset_from_map") === "true" ||
        sessionStorage.getItem("kalceria_skip_map_intro") === "true" ||
        localStorage.getItem("kalceria_skip_map_intro") === "true";

      const isSessionMapActive = sessionStorage.getItem("kalceria_map_intro_seen") === "true";

      return Boolean(isPasswordResetReturn || isSessionMapActive);
    } catch {
      return false;
    }
  }, []);

  const [showStartup, setShowStartup] = useState(() => {
    if (typeof window === "undefined") return false;
    return !checkShouldSkipStartup();
  });

  const handleStartupComplete = useCallback(() => {
    setShowStartup(false);
    try {
      sessionStorage.setItem("kalceria_map_intro_seen", "true");
    } catch {}
  }, []);

  // Consume password-reset-from-map flag immediately on mount (M1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (checkShouldSkipStartup()) {
        setShowStartup(false);
        const params = new URLSearchParams(window.location.search);
        if (
          (params.get("skip_intro") === "true" || params.get("from") === "password_reset") &&
          window.history.replaceState
        ) {
          params.delete("skip_intro");
          params.delete("from");
          const cleanSearch = params.toString();
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "")
          );
        }
      } else {
        setShowStartup(true);
      }
      // Immediately clear the one-time bypass and any lingering legacy skip flags
      sessionStorage.removeItem("kalceria_password_reset_from_map");
      localStorage.removeItem("kalceria_password_reset_from_map");
      sessionStorage.removeItem("kalceria_skip_map_intro");
      localStorage.removeItem("kalceria_skip_map_intro");
      localStorage.removeItem("kalceria_skip_map_intro_until");
      localStorage.removeItem("kalceria_auth_return");
    } catch {}
  }, [checkShouldSkipStartup]);

  return {
    showStartup,
    setShowStartup,
    checkShouldSkipStartup,
    handleStartupComplete,
  };
}

