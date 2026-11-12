"use client";

import { useMemo, useCallback, useEffect } from "react";
import {
  fetchMe,
  fetchMapUsers,
  postBroadcast,
  putBroadcast,
  delBroadcast,
  postLocation,
} from "@/lib/api";

/**
 * frontend/components/map/mapPage/useMapBroadcastActions.js
 *
 * Broadcast actions: active own broadcast detection, top dynamic click,
 * modal open/edit, save, delete, and remote edit event listener.
 * Ledger: M11
 *
 * Output: { hasActiveOwnBroadcast, handleGoToOwnEvent, handleTopDynamicBroadcastClick,
 *           saveBroadcast, handleOpenEditBroadcast, handleConfirmDeleteBroadcast }
 */
export function useMapBroadcastActions({
  currentUser = null,
  mapUsersData = [],
  statusText = "",
  isSelfOffline = false,
  activeOwnEvent = null,
  setStatusText = () => {},
  setIsEditingBroadcast = () => {},
  setShowStatusModal = () => {},
  setShowDeleteBroadcastConfirm = () => {},
  setCurrentUser = () => {},
  setMapUsersData = () => {},
  setNotice = () => {},
  setBusy = () => {},
  setSelfLiveCoords = () => {},
  triggerToolbarRetractCycle = () => {},
  handleOpenItemOnMap = () => {},
} = {}) {
  const handleGoToOwnEvent = useCallback(() => {
    if (!activeOwnEvent) return;
    handleOpenItemOnMap(activeOwnEvent, "event");
  }, [activeOwnEvent, handleOpenItemOnMap]);

  const hasActiveOwnBroadcast = useMemo(() => {
    const rawMsg =
      typeof currentUser?.broadcast === "string"
        ? currentUser.broadcast
        : currentUser?.broadcast?.message;
    return Boolean(rawMsg && rawMsg.trim());
  }, [currentUser?.broadcast]);

  const handleTopDynamicBroadcastClick = useCallback(() => {
    if (!currentUser?.id) return;
    const me = (mapUsersData || []).find((u) => String(u.id) === String(currentUser.id)) || currentUser;
    handleOpenItemOnMap(me, "user");
  }, [currentUser, mapUsersData, handleOpenItemOnMap]);

  // Real broadcast save (disabled when self is offline) - non-memo (IL-6)
  async function saveBroadcast(e, payloadOverride = null) {
    if (e?.preventDefault) e.preventDefault();
    if (isSelfOffline) return;
    const finalPayload =
      payloadOverride ||
      (typeof e === "object" && e && (e.message !== undefined || e.mediaUrl !== undefined) ? e : null);
    const textToSave = (finalPayload?.message !== undefined ? finalPayload.message : (statusText || "")).trim();
    const mediaToSave = (finalPayload?.mediaUrl !== undefined ? finalPayload.mediaUrl : "").trim();
    if (!textToSave && !mediaToSave) return;
    setBusy(true);
    try {
      // update location first if browser supports it
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setSelfLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            postLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
          },
          () => {}
        );
      }
      // create or update broadcast
      const broadcastPayload = mediaToSave
        ? { message: `[MEDIA:${mediaToSave}] ${textToSave}`.trim(), mediaUrl: mediaToSave }
        : { message: textToSave };
      if (currentUser?.broadcast) {
        await putBroadcast(broadcastPayload);
      } else {
        await postBroadcast(broadcastPayload);
      }
      // refresh user data
      const user = await fetchMe();
      setCurrentUser(user);
      const updatedMapUsers = await fetchMapUsers();
      if (updatedMapUsers) setMapUsersData(updatedMapUsers);
      setNotice("Broadcast updated.");
      setShowStatusModal(false);
      setIsEditingBroadcast(false);
      triggerToolbarRetractCycle();
    } catch (err) {
      setNotice(err.message || "Failed to update broadcast.");
    }
    setBusy(false);
  }

  const handleOpenEditBroadcast = useCallback(
    (userId) => {
      if (isSelfOffline) return;
      const currentMsg =
        typeof currentUser?.broadcast === "string"
          ? currentUser.broadcast
          : currentUser?.broadcast?.message || "";
      setStatusText(currentMsg);
      setIsEditingBroadcast(true);
      setShowStatusModal(true);
    },
    [isSelfOffline, currentUser, setStatusText]
  );

  const handleConfirmDeleteBroadcast = useCallback(async () => {
    // 1. Instant 0ms Optimistic UI Updates
    setShowStatusModal(false);
    setIsEditingBroadcast(false);
    setShowDeleteBroadcastConfirm(false);
    setStatusText("");
    setCurrentUser((prev) => (prev ? { ...prev, broadcast: null } : prev));
    setMapUsersData((prev) =>
      prev.map((u) => (u.id === currentUser?.id ? { ...u, broadcast: null } : u))
    );
    setNotice("Broadcast deleted.");

    // Trigger auto-retract animation so toolbar tucks in and reconfigures cleanly
    triggerToolbarRetractCycle();

    // 2. Asynchronous backend deletion in background
    try {
      await delBroadcast();
      const updatedMapUsers = await fetchMapUsers().catch(() => null);
      if (updatedMapUsers) setMapUsersData(updatedMapUsers);
    } catch (err) {
      console.warn("Delete broadcast background sync warning:", err?.message);
    }
  }, [currentUser?.id, setStatusText, triggerToolbarRetractCycle, fetchMapUsers, setNotice]);

  // Listener kalceria:open-edit-broadcast (M11)
  useEffect(() => {
    const handleRemoteEditBroadcast = (e) => {
      const userId = e.detail?.userId;
      handleOpenEditBroadcast(userId);
    };
    window.addEventListener("kalceria:open-edit-broadcast", handleRemoteEditBroadcast);
    return () => window.removeEventListener("kalceria:open-edit-broadcast", handleRemoteEditBroadcast);
  }, [handleOpenEditBroadcast]);

  return {
    hasActiveOwnBroadcast,
    handleGoToOwnEvent,
    handleTopDynamicBroadcastClick,
    saveBroadcast,
    handleOpenEditBroadcast,
    handleConfirmDeleteBroadcast,
  };
}

