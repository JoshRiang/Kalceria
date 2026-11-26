"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchGroupChatsSummary } from "@/lib/api";
import {
  isEventOwner,
  isEventCollaborator,
  getEventPendingRequests,
} from "../hooks/useMapChatAndNotifications";

export function useBottomPanelSwitcher({
  setDrawerOpen,
  onCloseActivePersonalChat,
  personalChatMap = {},
  events = [],
  currentUser = null,
  acceptedCollabsMap = {},
  eventRequestsMap = {},
  eventGroupChatMap = {},
  hasGlobalNotif = false,
}) {
  const [activePanel, setActivePanel] = useState("peeps"); // "peeps" | "chat" | "meeting"
  const [isPanelSwitching, setIsPanelSwitching] = useState(false);
  const [pinnedMeetingEventIds, setPinnedMeetingEventIds] = useState([]);
  const [groupSummaryMap, setGroupSummaryMap] = useState({});
  const [activeGroupEventId, setActiveGroupEventId] = useState(null);
  const switchTimerRef = useRef(null);
  const activePanelRef = useRef(activePanel);
  const onCloseChatRef = useRef(onCloseActivePersonalChat);
  activePanelRef.current = activePanel;
  onCloseChatRef.current = onCloseActivePersonalChat;

  const transitionToPanel = useCallback(
    (nextPanel) => {
      if (!nextPanel || !["peeps", "chat", "meeting", "reels"].includes(nextPanel)) return;
      // Single-layer rule: switching HUD tabs always closes any open Personal Chat or Group Chat cleanly
      onCloseChatRef.current?.();
      setActiveGroupEventId(null);
      if (activePanelRef.current === nextPanel) {
        setDrawerOpen?.(true);
        return;
      }
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      setIsPanelSwitching(true);
      switchTimerRef.current = setTimeout(() => {
        setActivePanel(nextPanel);
        setDrawerOpen?.(true);
        setIsPanelSwitching(false);
      }, 210);
    },
    [setDrawerOpen]
  );

  // Sync live Event GroupChat summary (custom avatar, description, unread counts, ongoing calls)
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    let alive = true;
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const summary = await fetchGroupChatsSummary();
      if (alive && summary && typeof summary === "object") {
        setGroupSummaryMap(summary);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const onSwitch = (e) => {
      const targetPanel = e?.detail?.panel;
      if (targetPanel) transitionToPanel(targetPanel);
    };
    window.addEventListener("kalceria:switch-bottom-panel", onSwitch);

    window.__kalceriaOpenEventGroupChat = (eventId) => {
      if (eventId) {
        const eid = String(eventId);
        setPinnedMeetingEventIds((prev) => (prev.includes(eid) ? prev : [eid, ...prev]));
        setActivePanel("meeting");
        setActiveGroupEventId(eid);
      } else {
        transitionToPanel("meeting");
      }
    };

    return () => {
      window.removeEventListener("kalceria:switch-bottom-panel", onSwitch);
      delete window.__kalceriaOpenEventGroupChat;
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, [transitionToPanel]);

  // Compute parent notification red dots for the 3-icon HUD Panel Switcher Box
  useEffect(() => {
    const hasChatNotif = Object.values(personalChatMap || {}).some(
      (entry) => Number(entry?.unreadCount || 0) > 0
    );

    let hasMeetingNotif = Object.values(groupSummaryMap || {}).some(
      (g) => Number(g?.unreadCount || 0) > 0 || Boolean(g?.activeCall?.active)
    );
    if (!hasMeetingNotif) {
      for (const ev of events || []) {
        const owned = isEventOwner(ev, currentUser);
        const collab = isEventCollaborator(ev, currentUser, acceptedCollabsMap);
        if (!owned && !collab) continue;
        const unreadGroup = Number(eventGroupChatMap?.[ev.id]?.unreadCount || 0);
        const pendingReqs = owned ? getEventPendingRequests(ev, currentUser, eventRequestsMap).length : 0;
        if (unreadGroup > 0 || pendingReqs > 0) {
          hasMeetingNotif = true;
          break;
        }
      }
    }

    const hasPeepsNotif = Boolean(hasGlobalNotif);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kalceria:panel-notif-state", {
          detail: {
            activePanel,
            hasChatNotif,
            hasMeetingNotif,
            hasPeepsNotif,
          },
        })
      );
    }
  }, [
    activePanel,
    personalChatMap,
    groupSummaryMap,
    events,
    currentUser,
    acceptedCollabsMap,
    eventRequestsMap,
    eventGroupChatMap,
    hasGlobalNotif,
  ]);

  const activeGroupEvent = activeGroupEventId
    ? (events || []).find((ev) => String(ev.id) === String(activeGroupEventId)) || null
    : null;

  return {
    activePanel,
    isPanelSwitching,
    pinnedMeetingEventIds,
    groupSummaryMap,
    activeGroupEvent,
    setActiveGroupEventId,
    transitionToPanel,
  };
}
