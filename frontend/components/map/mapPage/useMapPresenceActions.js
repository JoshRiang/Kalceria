"use client";

import {
  patchVisibility,
  postLocation,
  fetchMapUsers,
  fetchKalcerians,
  fetchMe,
} from "@/lib/api";

/**
 * frontend/components/map/mapPage/useMapPresenceActions.js
 *
 * Presence toggle handler: switches user mode between online radar & stealth mode.
 * Ledger: Non-memo action handler (IL-6), zero hooks.
 *
 * Input: Setters and state controllers.
 * Output: { handlePresenceChange }
 */
export function useMapPresenceActions({
  setIsStatusBusy = () => {},
  setPresence = () => {},
  setMenuOpen = () => {},
  setActionMenuOpen = () => {},
  setShowStatusModal = () => {},
  setShowEventModal = () => {},
  setShowRequestsModal = () => {},
  setShowCancelRequestModal = () => {},
  setSelfLiveCoords = () => {},
  setMapUsersData = () => {},
  setKalcerians = () => {},
  setCurrentUser = () => {},
  setNotice = () => {},
} = {}) {
  // Toggle visibility (broadcast status on/off) - non-memo (IL-6)
  async function handlePresenceChange(mode) {
    const isOnline = mode === "online";
    setIsStatusBusy(true);
    setPresence(mode);
    setMenuOpen(false);
    if (!isOnline) {
      setActionMenuOpen(false);
      setShowStatusModal(false);
      setShowEventModal(false);
      setShowRequestsModal(false);
      setShowCancelRequestModal(false);
    }
    try {
      await patchVisibility(isOnline);
      if (isOnline && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setSelfLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            postLocation(pos.coords.latitude, pos.coords.longitude)
              .then(() => {
                fetchMapUsers().then((u) => setMapUsersData(u || []));
                fetchKalcerians().then((k) => setKalcerians(k || []));
              })
              .catch(() => {});
          },
          () => {
            // Still update the list even if location fails
            fetchMapUsers().then((u) => setMapUsersData(u || []));
            fetchKalcerians().then((k) => setKalcerians(k || []));
          }
        );
      } else {
        fetchMapUsers().then((u) => setMapUsersData(u || []));
        fetchKalcerians().then((k) => setKalcerians(k || []));
      }

      const user = await fetchMe();
      setCurrentUser(user);
      setNotice(
        isOnline
          ? "Status ONLINE: tampil di radar."
          : "Status STEALTH: lokasi disembunyikan."
      );
    } catch (err) {
      setNotice(err?.message || "Failed to update visibility.");
    } finally {
      setIsStatusBusy(false);
    }
  }

  return {
    handlePresenceChange,
  };
}

