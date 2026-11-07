"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { playNotificationSound } from "@/lib/soundEngine";
import {
  fetchFavouriteUsers,
  favouriteKalcerian,
  unfavouriteKalcerian,
  fetchMutedUsers,
  muteKalcerian,
  unmuteKalcerian,
} from "@/lib/api";

import {
  PERSONAL_CHAT_STORAGE_KEY,
  EVENT_GROUP_CHAT_STORAGE_KEY,
  FAVOURITES_STORAGE_KEY,
  MUTED_STORAGE_KEY,
  isEventOwner,
  doesEventBelongToUser,
  isEventCollaborator,
  isUserInEvent,
  getEventPendingRequests,
} from "./mapChat/eventChatHelpers";
import { useRankedDynamicEvents } from "./mapChat/useRankedDynamicEvents";
import { useInboxSummarySync } from "./mapChat/useInboxSummarySync";

export {
  PERSONAL_CHAT_STORAGE_KEY,
  EVENT_GROUP_CHAT_STORAGE_KEY,
  FAVOURITES_STORAGE_KEY,
  MUTED_STORAGE_KEY,
  isEventOwner,
  doesEventBelongToUser,
  isEventCollaborator,
  isUserInEvent,
  getEventPendingRequests,
};

export function useMapChatAndNotifications({
  events = [],
  kalcerians = [],
  currentUser = null,
  isSelfOffline = false,
  blockedUserIds = [],
  eventRequestsMap = {},
  setEventRequestsMap,
  acceptedCollabsMap = {},
  requestedEventId = null,
  focusUser,
  handleOpenItemOnMap,
  handleOpenRequests,
}) {
  const isSelfOfflineRef = useRef(Boolean(isSelfOffline));
  isSelfOfflineRef.current = Boolean(isSelfOffline);
  // 1. Personal Chat Metadata: { [userId]: { lastMessageAt, unreadCount, lastMessageText } }
  const [personalChatMap, setPersonalChatMap] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(PERSONAL_CHAT_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });

  // Track cards that just received a personal message so they glow while rolling to index 0
  const [recentlyMessagedUserIds, setRecentlyMessagedUserIds] = useState({});
  const highlightTimersRef = useRef({});

  // Favourites (Love badge + Priority slot) synced with localStorage & backend
  const [favouriteUserIds, setFavouriteUserIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(FAVOURITES_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  // Muted Notifications (Muted Speaker badge + Silences personal chat chime) synced with localStorage & backend
  const [mutedUserIds, setMutedUserIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(MUTED_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    fetchFavouriteUsers()
      .then((ids) => {
        if (Array.isArray(ids) && ids.length) {
          setFavouriteUserIds((prev) => {
            const next = Array.from(new Set([...prev, ...ids]));
            try {
              localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      })
      .catch(() => {});

    fetchMutedUsers()
      .then((ids) => {
        if (Array.isArray(ids) && ids.length) {
          setMutedUserIds((prev) => {
            const next = Array.from(new Set([...prev, ...ids]));
            try {
              localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  const toggleFavouriteUser = useCallback((targetId) => {
    if (!targetId) return;
    const strId = String(targetId);
    setFavouriteUserIds((prev) => {
      const exists = prev.includes(strId);
      const next = exists ? prev.filter((id) => id !== strId) : [...prev, strId];
      try {
        localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      if (exists) {
        unfavouriteKalcerian(strId).catch(() => {});
      } else {
        favouriteKalcerian(strId).catch(() => {});
      }
      return next;
    });
  }, []);

  const toggleMuteUser = useCallback((targetId) => {
    if (!targetId) return;
    const strId = String(targetId);
    setMutedUserIds((prev) => {
      const exists = prev.includes(strId);
      const next = exists ? prev.filter((id) => id !== strId) : [...prev, strId];
      try {
        localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      if (exists) {
        unmuteKalcerian(strId).catch(() => {});
      } else {
        muteKalcerian(strId).catch(() => {});
      }
      return next;
    });
  }, []);

  // 2. Event Group Chat Metadata: { [eventId]: { lastMessageAt, unreadCount, lastMessageText, senderName } }
  const [eventGroupChatMap, setEventGroupChatMap] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(EVENT_GROUP_CHAT_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });

  // Resolve a sender identifier (id, nickname, or name) to the canonical Kalcerian card id
  const resolveKalcerianId = useCallback(
    (senderIdOrHandle) => {
      if (!senderIdOrHandle) return null;
      const needle = String(senderIdOrHandle).trim().replace(/^@/, "").toLowerCase();
      if (!needle) return null;

      for (const ev of events || []) {
        if (ev?.creator) {
          const cid = String(ev.creator.id || `creator_${ev.creator.name || ev.id}`);
          const cNick = String(ev.creator.nickname || "").toLowerCase();
          const cName = String(ev.creator.name || "").toLowerCase();
          if (cid.toLowerCase() === needle || cNick === needle || cName === needle) {
            return cid;
          }
        }
      }

      for (const u of kalcerians || []) {
        const uid = String(u.id || "");
        const uNick = String(u.nickname || "").toLowerCase();
        const uName = String(u.name || "").toLowerCase();
        if (uid.toLowerCase() === needle || uNick === needle || uName === needle) {
          return uid;
        }
      }

      return String(senderIdOrHandle);
    },
    [events, kalcerians]
  );

  // Incoming Personal Chat Handler -> plays sound (unless user is muted), updates timestamp so card rolls to top, highlights card
  const receivePersonalChatMessage = useCallback(
    (payload = {}) => {
      const rawSender = payload.senderId || payload.userId || payload.nickname || payload.sender;
      const resolvedUserId = resolveKalcerianId(rawSender);
      if (!resolvedUserId) return;

      // Ignore if sender is blocked or is current user
      if (blockedUserIds.includes(resolvedUserId)) return;
      if (currentUser?.id && String(currentUser.id) === String(resolvedUserId)) return;

      const ts = Number(payload.timestamp) || Date.now();
      const messageText = String(payload.message || payload.text || "").trim();

      // Play personal chat notification chime ONLY if online and this sender is NOT muted
      if (!isSelfOfflineRef.current && !mutedUserIds.includes(String(resolvedUserId))) {
        playNotificationSound("personal_chat");
      }

      setPersonalChatMap((prev) => {
        const existing = prev[resolvedUserId] || { unreadCount: 0, lastMessageAt: 0 };
        const next = {
          ...prev,
          [resolvedUserId]: {
            lastMessageAt: Math.max(ts, Date.now()),
            unreadCount: (existing.unreadCount || 0) + 1,
            lastMessageText: messageText || existing.lastMessageText || "",
          },
        };
        try {
          sessionStorage.setItem(PERSONAL_CHAT_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Trigger visual roll-to-top highlight pulse on the card
      setRecentlyMessagedUserIds((prev) => ({ ...prev, [resolvedUserId]: true }));
      if (highlightTimersRef.current[resolvedUserId]) {
        clearTimeout(highlightTimersRef.current[resolvedUserId]);
      }
      highlightTimersRef.current[resolvedUserId] = setTimeout(() => {
        setRecentlyMessagedUserIds((prev) => {
          const copy = { ...prev };
          delete copy[resolvedUserId];
          return copy;
        });
      }, 2800);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("kalceria:personal-chat-sorted-top", {
            detail: { userId: resolvedUserId, timestamp: ts },
          })
        );
      }
    },
    [resolveKalcerianId, blockedUserIds, currentUser, mutedUserIds]
  );

  const recordOutgoingPersonalMessage = useCallback((userId, messageText = "", ts = Date.now()) => {
    if (!userId) return;
    setPersonalChatMap((prev) => {
      const existing = prev[userId] || { unreadCount: 0, lastMessageAt: 0 };
      const next = {
        ...prev,
        [userId]: {
          ...existing,
          lastMessageAt: Math.max(ts, existing.lastMessageAt || 0),
          unreadCount: 0,
          lastMessageText: messageText || existing.lastMessageText || "",
        },
      };
      try {
        sessionStorage.setItem(PERSONAL_CHAT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const markPersonalChatRead = useCallback((userId) => {
    if (!userId) return;
    setPersonalChatMap((prev) => {
      if (!prev[userId] || !prev[userId].unreadCount) return prev;
      const next = {
        ...prev,
        [userId]: {
          ...prev[userId],
          unreadCount: 0,
        },
      };
      try {
        sessionStorage.setItem(PERSONAL_CHAT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Incoming Event Group Chat Handler -> ONLY notifies & plays sound if currentUser is owner or collaborator
  const receiveEventGroupChatMessage = useCallback(
    (payload = {}) => {
      const targetEventId = payload.eventId || payload.id;
      if (!targetEventId) return;

      const targetEvent = (events || []).find((e) => String(e.id) === String(targetEventId));
      if (!targetEvent) return;

      // Strict membership check: only notify if user is creator or collaborator/member of this event
      const isMember =
        isEventOwner(targetEvent, currentUser) ||
        isEventCollaborator(targetEvent, currentUser, acceptedCollabsMap);

      if (!isMember) return;

      // Do not play sound if the message was sent by currentUser themselves
      if (payload.senderId && currentUser?.id && String(payload.senderId) === String(currentUser.id)) {
        return;
      }

      const ts = Number(payload.timestamp) || Date.now();
      const messageText = String(payload.message || payload.text || "").trim();

      if (!isSelfOfflineRef.current) {
        playNotificationSound("group_chat", { isMember: true });
      }

      setEventGroupChatMap((prev) => {
        const existing = prev[targetEvent.id] || { unreadCount: 0, lastMessageAt: 0 };
        const next = {
          ...prev,
          [targetEvent.id]: {
            lastMessageAt: Math.max(ts, Date.now()),
            unreadCount: (existing.unreadCount || 0) + 1,
            lastMessageText: messageText || existing.lastMessageText || "",
            senderName: payload.senderName || existing.senderName || "Kalcerian",
          },
        };
        try {
          sessionStorage.setItem(EVENT_GROUP_CHAT_STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [events, currentUser, acceptedCollabsMap]
  );

  const markEventGroupChatRead = useCallback((eventId) => {
    if (!eventId) return;
    setEventGroupChatMap((prev) => {
      if (!prev[eventId] || !prev[eventId].unreadCount) return prev;
      const next = {
        ...prev,
        [eventId]: {
          ...prev[eventId],
          unreadCount: 0,
        },
      };
      try {
        sessionStorage.setItem(EVENT_GROUP_CHAT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Incoming Envelope / Collaboration Request Handler -> plays envelope chime and appends request
  const receiveEnvelopeNotification = useCallback(
    (payload = {}) => {
      const targetEventId = payload.eventId || payload.id;
      if (!targetEventId) return;

      const targetEvent = (events || []).find((e) => String(e.id) === String(targetEventId));
      const isOwner = targetEvent ? isEventOwner(targetEvent, currentUser) : true;
      if (!isOwner) return;

      if (!isSelfOfflineRef.current) {
        playNotificationSound("envelope");
      }

      if (payload.request && typeof setEventRequestsMap === "function") {
        const reqObj = {
          id: payload.request.id || `req_${Date.now()}`,
          user: payload.request.user || {
            id: payload.request.userId || `user_${Date.now()}`,
            name: payload.request.name || "Kalcerian",
            nickname: payload.request.nickname || "Kalcerian",
            profilePicture: payload.request.profilePicture || null,
          },
          message: payload.request.message || "Wants to collaborate on this event",
          createdAt: payload.request.createdAt || new Date().toISOString(),
        };
        setEventRequestsMap((prev) => {
          const existing = prev[targetEventId] || [];
          if (existing.some((r) => r.id === reqObj.id)) return prev;
          const updated = { ...prev, [targetEventId]: [reqObj, ...existing] };
          try {
            localStorage.setItem("kalceria_event_collab_requests", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    },
    [events, currentUser, setEventRequestsMap]
  );

  // Register global event listeners & imperative test/integration helpers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPersonalChat = (e) => receivePersonalChatMessage(e?.detail || {});
    const onEventChat = (e) => receiveEventGroupChatMessage(e?.detail || {});
    const onEnvelope = (e) => receiveEnvelopeNotification(e?.detail || {});

    window.addEventListener("kalceria:incoming-personal-chat", onPersonalChat);
    window.addEventListener("kalceria:incoming-event-chat", onEventChat);
    window.addEventListener("kalceria:incoming-envelope-request", onEnvelope);

    window.__kalceriaTriggerPersonalChat = (senderIdOrHandle, message = "Hey, let's roll!") => {
      receivePersonalChatMessage({ senderId: senderIdOrHandle, message, timestamp: Date.now() });
    };
    window.__kalceriaTriggerEventGroupChat = (eventId, message = "New group update!", senderName = "Kalcerian") => {
      receiveEventGroupChatMessage({ eventId, message, senderName, timestamp: Date.now() });
    };
    window.__kalceriaTriggerEnvelopeRequest = (eventId, request) => {
      receiveEnvelopeNotification({ eventId, request });
    };

    return () => {
      window.removeEventListener("kalceria:incoming-personal-chat", onPersonalChat);
      window.removeEventListener("kalceria:incoming-event-chat", onEventChat);
      window.removeEventListener("kalceria:incoming-envelope-request", onEnvelope);
      delete window.__kalceriaTriggerPersonalChat;
      delete window.__kalceriaTriggerEventGroupChat;
      delete window.__kalceriaTriggerEnvelopeRequest;
    };
  }, [receivePersonalChatMessage, receiveEventGroupChatMessage, receiveEnvelopeNotification]);

  // Cleanup highlight timers on unmount
  useEffect(() => {
    const timers = highlightTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Listen for real incoming personal chat events and background-poll for genuine unread peer messages
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleIncomingPersonalMsg = (e) => {
      const detail = e?.detail;
      if (!detail || !detail.senderId) return;
      if (currentUser?.id && String(detail.senderId) === String(currentUser.id)) return;
      receivePersonalChatMessage({
        senderId: detail.senderId,
        message: detail.message || "Pesan baru",
        timestamp: detail.timestamp || Date.now(),
      });
    };
    window.addEventListener("kalceria:incoming-personal-message", handleIncomingPersonalMsg);
    return () => {
      window.removeEventListener("kalceria:incoming-personal-message", handleIncomingPersonalMsg);
    };
  }, [currentUser?.id, receivePersonalChatMessage]);

  // O(1) Global Unread Inbox Watermark Sync (Modularized Package Hook)
  useInboxSummarySync({
    currentUser,
    blockedUserIds,
    mutedUserIds,
    isSelfOfflineRef,
    setPersonalChatMap,
    setRecentlyMessagedUserIds,
    highlightTimersRef,
  });

  // Unified check: does an event have an unread notification (from Envelope OR Group Chat)?
  const hasEventNotification = useCallback(
    (eventItem) => {
      if (!eventItem) return false;
      const isOwner = isEventOwner(eventItem, currentUser);
      const isCollab = isEventCollaborator(eventItem, currentUser, acceptedCollabsMap);

      const pendingReqs = isOwner ? getEventPendingRequests(eventItem, currentUser, eventRequestsMap) : [];
      const hasEnvelopeNotif = pendingReqs.length > 0;

      const groupChatEntry = (isOwner || isCollab) ? eventGroupChatMap[eventItem.id] : null;
      const hasGroupChatNotif = Boolean(groupChatEntry && groupChatEntry.unreadCount > 0);

      return hasEnvelopeNotif || hasGroupChatNotif;
    },
    [currentUser, acceptedCollabsMap, eventRequestsMap, eventGroupChatMap]
  );

  // Compute user's active events and rank by newest notification (Modularized Package Hook)
  const {
    userRankedEvents,
    topDynamicEvent,
    hasTopDynamicEventNotif,
    handleTopDynamicEventClick,
  } = useRankedDynamicEvents({
    events,
    currentUser,
    acceptedCollabsMap,
    requestedEventId,
    eventRequestsMap,
    eventGroupChatMap,
    focusUser,
    handleOpenItemOnMap,
    handleOpenRequests,
    markEventGroupChatRead,
  });

  return {
    personalChatMap,
    recentlyMessagedUserIds,
    receivePersonalChatMessage,
    markPersonalChatRead,
    recordOutgoingPersonalMessage,
    favouriteUserIds,
    mutedUserIds,
    toggleFavouriteUser,
    toggleMuteUser,
    eventGroupChatMap,
    receiveEventGroupChatMessage,
    markEventGroupChatRead,
    receiveEnvelopeNotification,
    hasEventNotification,
    topDynamicEvent,
    hasTopDynamicEventNotif,
    handleTopDynamicEventClick,
  };
}

