"use client";

/**
 * [TEMPORARY FEATURE FLAG] Reactive Landing-Page Map Whitelist Hook
 *
 * Reads authenticated state from `useAuthStore` (already hydrated & verified
 * against `/api/users/me` by `LandingPage.jsx`) without adding extra network
 * requests. Keeps SSR/initial hydration safe (defaults to `false` until mounted).
 */

import { useAuthStore } from "@/stores/useAuthStore";
import { useHasMounted } from "@/hooks/useHasMounted";
import {
  TEMP_MAP_WHITELIST_ENABLED,
  canUserAccessMap,
  extractUserEmail,
} from "./mapWhitelistConfig";

export function useMapWhitelistAccess() {
  const mounted = useHasMounted();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);

  const userEmail = extractUserEmail(user);
  const canAccessMap = !TEMP_MAP_WHITELIST_ENABLED
    ? true
    : mounted && canUserAccessMap({ isLoggedIn, user });

  return {
    isWhitelistFlagEnabled: TEMP_MAP_WHITELIST_ENABLED,
    canAccessMap,
    isLoggedIn: mounted ? isLoggedIn : false,
    userEmail: mounted ? userEmail : "",
  };
}

