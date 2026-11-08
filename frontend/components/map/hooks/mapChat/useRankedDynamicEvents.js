"use client";

import { useMemo, useCallback } from "react";
import {
  isEventOwner,
  isEventCollaborator,
  isUserInEvent,
  getEventPendingRequests,
} from "./eventChatHelpers";

export function useRankedDynamicEvents({
  events = [],
  currentUser = null,
  acceptedCollabsMap = {},
  requestedEventId = null,
  eventRequestsMap = {},
  eventGroupChatMap = {},
  focusUser,
  handleOpenItemOnMap,
  handleOpenRequests,
  markEventGroupChatRead,
}) {
  // Compute user's active events (created or registered/collaborating) and rank by newest notification / activity
  const userRankedEvents = useMemo(() => {
    if (!currentUser || !Array.isArray(events)) return [];

    const matching = events.filter((ev) =>
      isUserInEvent(ev, currentUser, acceptedCollabsMap, requestedEventId)
    );

    const enriched = matching.map((ev) => {
      const isOwner = isEventOwner(ev, currentUser);
      const isCollab = isEventCollaborator(ev, currentUser, acceptedCollabsMap);

      const pendingReqs = isOwner ? getEventPendingRequests(ev, currentUser, eventRequestsMap) : [];
      const effectivePendingCount = isOwner
        ? Math.max(pendingReqs.length, Number(ev.pendingRequestsCount) || 0)
        : 0;
      let latestEnvelopeAt = 0;
      if (pendingReqs.length > 0) {
        latestEnvelopeAt = Math.max(
          ...pendingReqs.map((r) => {
            const t = r?.createdAt ? new Date(r.createdAt).getTime() : 0;
            return Number.isFinite(t) && t > 0 ? t : 1;
          })
        );
      } else if (effectivePendingCount > 0) {
        const fallbackTs = new Date(ev.updatedAt || ev.createdAt || 0).getTime();
        latestEnvelopeAt = Number.isFinite(fallbackTs) && fallbackTs > 0 ? fallbackTs : 1;
      }

      const groupChatEntry = (isOwner || isCollab) ? eventGroupChatMap[ev.id] : null;
      const latestGroupChatAt =
        groupChatEntry && groupChatEntry.unreadCount > 0
          ? Number(groupChatEntry.lastMessageAt) || 1
          : 0;

      const hasNotif = latestEnvelopeAt > 0 || latestGroupChatAt > 0;
      const latestNotifAt = Math.max(latestEnvelopeAt, latestGroupChatAt);
      const latestNotifType =
        latestGroupChatAt > latestEnvelopeAt
          ? "group_chat"
          : latestEnvelopeAt > 0
          ? "envelope"
          : "event_card";

      const createdOrUpdated = new Date(ev.updatedAt || ev.createdAt || 0).getTime();
      const baseEventTime = Number.isFinite(createdOrUpdated) ? createdOrUpdated : 0;

      return {
        event: ev,
        isOwner,
        isCollab,
        hasNotif,
        latestEnvelopeAt,
        latestGroupChatAt,
        latestNotifAt,
        latestNotifType,
        baseEventTime,
      };
    });

    // Sort:
    // 1. Events with active unread notification first (ordered by newest notification timestamp)
    // 2. Owned events before joined events
    // 3. Newest event timestamp
    enriched.sort((a, b) => {
      if (a.hasNotif !== b.hasNotif) return a.hasNotif ? -1 : 1;
      if (a.latestNotifAt !== b.latestNotifAt) return b.latestNotifAt - a.latestNotifAt;
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      return b.baseEventTime - a.baseEventTime;
    });

    return enriched;
  }, [events, currentUser, acceptedCollabsMap, requestedEventId, eventRequestsMap, eventGroupChatMap]);

  const topDynamicEvent = userRankedEvents[0]?.event || null;
  const hasTopDynamicEventNotif = userRankedEvents.some((entry) => entry.hasNotif);

  // Direct Icon Tap Algorithm for Top Bar Dynamic Event Icon:
  // Opens the newest notification box (Envelope vs. Group Chat) or falls back safely to opening the newest Event Card on the map
  const handleTopDynamicEventClick = useCallback(() => {
    const best = userRankedEvents[0];
    if (!best || !best.event) return;

    const targetEvent = best.event;

    if (best.latestNotifType === "envelope") {
      // Envelope notification is the newest -> focus event on map and directly open the Envelope CollabRequestsModal box
      focusUser?.(targetEvent);
      handleOpenItemOnMap?.(targetEvent, "event");
      handleOpenRequests?.(targetEvent.id);
      return;
    }

    if (best.latestNotifType === "group_chat") {
      // Group chat notification is the newest -> mark read, dispatch group chat open event, and open the Event Card on map (safe fallback before chat UI is mounted)
      markEventGroupChatRead?.(targetEvent.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("kalceria:open-event-group-chat", {
            detail: { eventId: targetEvent.id, event: targetEvent },
          })
        );
      }
      handleOpenItemOnMap?.(targetEvent, "event");
      return;
    }

    // Default (no pending notifications, or as current fallback before chat UI): directly open the newest Event Card on the map
    handleOpenItemOnMap?.(targetEvent, "event");
  }, [userRankedEvents, focusUser, handleOpenItemOnMap, handleOpenRequests, markEventGroupChatRead]);

  return {
    userRankedEvents,
    topDynamicEvent,
    hasTopDynamicEventNotif,
    handleTopDynamicEventClick,
  };
}
