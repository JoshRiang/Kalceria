"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchFriendsState,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from "@/lib/api";
import {
  GLOBAL_CARDS_LIMIT,
  resolveFriendshipStatus,
  buildScopedKalcerians,
  computeScopeNotifications,
} from "./kalceriansFriendsPure";

export {
  GLOBAL_CARDS_LIMIT,
  resolveFriendshipStatus,
  buildScopedKalcerians,
  computeScopeNotifications,
};

export function useKalceriansFriends({
  currentUser,
  sidebarKalcerians,
  personalChatMap,
  events,
  eventRequestsMap,
  eventGroupChatMap,
}) {
  const [activeScope, setActiveScope] = useState("friends"); // "friends" | "global"
  const [rawFriends, setRawFriends] = useState({
    loaded: false,
    friendIds: [],
    outgoingRequestIds: [],
    incomingRequestIds: [],
  });

  const applyServerRelations = useCallback((data) => {
    if (!data) return;
    setRawFriends({
      loaded: true,
      friendIds: Array.isArray(data.friendIds) ? data.friendIds.map(String) : [],
      outgoingRequestIds: Array.isArray(data.outgoingRequestIds) ? data.outgoingRequestIds.map(String) : [],
      incomingRequestIds: Array.isArray(data.incomingRequestIds) ? data.incomingRequestIds.map(String) : [],
    });
  }, []);

  const refreshFriends = useCallback(async () => {
    if (!currentUser?.id) return;
    const data = await fetchFriendsState();
    applyServerRelations(data);
  }, [currentUser?.id, applyServerRelations]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let active = true;
    const load = async () => {
      const data = await fetchFriendsState();
      if (active) applyServerRelations(data);
    };
    load();
    const timer = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [currentUser?.id, applyServerRelations]);

  const friendsState = useMemo(
    () => ({
      loaded: rawFriends.loaded,
      friendIds: rawFriends.friendIds,
      outgoingRequestIds: rawFriends.outgoingRequestIds,
      incomingRequestIds: rawFriends.incomingRequestIds,
      friendSet: new Set(rawFriends.friendIds),
      outgoingSet: new Set(rawFriends.outgoingRequestIds),
      incomingSet: new Set(rawFriends.incomingRequestIds),
    }),
    [rawFriends]
  );

  const getFriendshipStatus = useCallback(
    (user) => resolveFriendshipStatus(user, currentUser?.id, friendsState),
    [currentUser?.id, friendsState]
  );

  const isUserFriend = useCallback(
    (user) => {
      const status = resolveFriendshipStatus(user, currentUser?.id, friendsState);
      return status === "friend" || status === "self";
    },
    [currentUser?.id, friendsState]
  );

  const scopedKalcerians = useMemo(
    () => buildScopedKalcerians(sidebarKalcerians, activeScope, currentUser?.id, friendsState),
    [sidebarKalcerians, activeScope, currentUser?.id, friendsState]
  );

  const { hasFriendsNotif, hasGlobalNotif } = useMemo(
    () =>
      computeScopeNotifications({
        sidebarKalcerians,
        currentUserId: currentUser?.id,
        friendsState,
        personalChatMap,
        events,
        eventRequestsMap,
        eventGroupChatMap,
      }),
    [sidebarKalcerians, currentUser?.id, friendsState, personalChatMap, events, eventRequestsMap, eventGroupChatMap]
  );

  const notifyMapRefresh = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:refresh-events"));
    }
  };

  const handleSendFriendRequest = useCallback(
    async (targetId) => {
      const tid = String(targetId || "");
      if (!tid) return;
      setRawFriends((prev) => ({
        ...prev,
        loaded: true,
        outgoingRequestIds: prev.outgoingRequestIds.includes(tid)
          ? prev.outgoingRequestIds
          : [...prev.outgoingRequestIds, tid],
      }));
      try {
        const res = await sendFriendRequest(tid);
        applyServerRelations(res);
        if (res?.status === "accepted") notifyMapRefresh();
      } catch {
        refreshFriends();
      }
    },
    [applyServerRelations, refreshFriends]
  );

  const handleCancelFriendRequest = useCallback(
    async (targetId) => {
      const tid = String(targetId || "");
      if (!tid) return;
      setRawFriends((prev) => ({
        ...prev,
        loaded: true,
        outgoingRequestIds: prev.outgoingRequestIds.filter((id) => id !== tid),
      }));
      try {
        const res = await cancelFriendRequest(tid);
        applyServerRelations(res);
      } catch {
        refreshFriends();
      }
    },
    [applyServerRelations, refreshFriends]
  );

  const handleAcceptFriendRequest = useCallback(
    async (targetId) => {
      const tid = String(targetId || "");
      if (!tid) return;
      setRawFriends((prev) => ({
        ...prev,
        loaded: true,
        incomingRequestIds: prev.incomingRequestIds.filter((id) => id !== tid),
        friendIds: prev.friendIds.includes(tid) ? prev.friendIds : [...prev.friendIds, tid],
      }));
      try {
        const res = await acceptFriendRequest(tid);
        applyServerRelations(res);
        notifyMapRefresh();
      } catch {
        refreshFriends();
      }
    },
    [applyServerRelations, refreshFriends]
  );

  const handleRejectFriendRequest = useCallback(
    async (targetId) => {
      const tid = String(targetId || "");
      if (!tid) return;
      setRawFriends((prev) => ({
        ...prev,
        loaded: true,
        incomingRequestIds: prev.incomingRequestIds.filter((id) => id !== tid),
      }));
      try {
        const res = await rejectFriendRequest(tid);
        applyServerRelations(res);
      } catch {
        refreshFriends();
      }
    },
    [applyServerRelations, refreshFriends]
  );

  return {
    activeScope,
    setActiveScope,
    scopedKalcerians,
    hasFriendsNotif,
    hasGlobalNotif,
    getFriendshipStatus,
    isUserFriend,
    handleSendFriendRequest,
    handleCancelFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
  };
}
