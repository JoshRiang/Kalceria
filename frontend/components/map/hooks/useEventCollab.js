"use client";

import { useState, useCallback } from "react";
import api from "@/lib/api";
import {
  INITIAL_ACCEPTED_COLLABS,
  INITIAL_EVENT_REQUESTS,
} from "../mockMiniEvents";

export function useEventCollab({ events, setEvents, currentUser, setNotice, avatarUrl }) {
  const [requestedEventId, setRequestedEventId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("kalceria_requested_event_id") || null;
      } catch {}
    }
    return null;
  });

  const [acceptedCollabsMap, setAcceptedCollabsMap] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kalceria_accepted_collabs");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return INITIAL_ACCEPTED_COLLABS;
  });

  const [eventRequestsMap, setEventRequestsMap] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kalceria_event_collab_requests");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return INITIAL_EVENT_REQUESTS;
  });

  const [cancelRequestTarget, setCancelRequestTarget] = useState(null);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [viewingRequestsEventId, setViewingRequestsEventId] = useState(null);

  const handleRequestCollab = useCallback(
    (eventId) => {
      setRequestedEventId(eventId);
      try {
        localStorage.setItem("kalceria_requested_event_id", eventId);
      } catch {}
      const ev = events.find((e) => String(e.id) === String(eventId));
      setNotice(`Collab requested for ${ev?.title || "event"}!`);

      if (currentUser) {
        setEventRequestsMap((prev) => {
          const existing = prev[eventId] || [];
          if (existing.some((r) => r.user.id === currentUser.id)) return prev;
          const newReq = {
            id: `req_${Date.now()}`,
            user: {
              id: currentUser.id,
              name: currentUser.name || currentUser.nickname || "You",
              nickname: currentUser.nickname || currentUser.name || "You",
              profilePicture: currentUser.profilePicture || avatarUrl(currentUser),
              broadcast: currentUser.broadcast?.message || "Collab requested",
            },
            message: "Wants to collaborate on this event",
            createdAt: new Date().toISOString(),
          };
          const updated = { ...prev, [eventId]: [newReq, ...existing] };
          try {
            localStorage.setItem("kalceria_event_collab_requests", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    },
    [events, currentUser, avatarUrl, setNotice]
  );

  const handlePromptCancelRequest = useCallback(
    (eventId, title) => {
      const ev = events.find((e) => String(e.id) === String(eventId));
      setCancelRequestTarget({ id: eventId, title: title || ev?.title || "Event" });
      setShowCancelRequestModal(true);
    },
    [events]
  );

  const handleConfirmCancelRequest = useCallback(() => {
    const targetId = cancelRequestTarget?.id || requestedEventId;
    setRequestedEventId(null);
    try {
      localStorage.removeItem("kalceria_requested_event_id");
    } catch {}
    if (targetId && currentUser) {
      setEventRequestsMap((prev) => {
        const existing = prev[targetId] || [];
        const updated = { ...prev, [targetId]: existing.filter((r) => r.user.id !== currentUser.id) };
        try {
          localStorage.setItem("kalceria_event_collab_requests", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    setShowCancelRequestModal(false);
    setCancelRequestTarget(null);
    setNotice("Request removed.");
  }, [cancelRequestTarget, requestedEventId, currentUser, setNotice]);

  const handleOpenRequests = useCallback((eventId) => {
    setViewingRequestsEventId(eventId);
    setShowRequestsModal(true);
  }, []);

  const handleAcceptCollabRequest = useCallback(
    (requestId, eventId) => {
      const targetId = eventId || viewingRequestsEventId;
      setEventRequestsMap((prev) => {
        if (!targetId) return prev;
        const bucketKey = Array.isArray(prev[targetId]) ? targetId : (Array.isArray(prev["own"]) ? "own" : null);
        if (!bucketKey || !prev[bucketKey]) return prev;
        const targetReq = prev[bucketKey].find((r) => r.id === requestId);
        if (targetReq?.user?.id) {
          try {
            api.post(`/mini-events/${targetId}/collaborators`, { collaboratorId: targetReq.user.id }).catch(() => {});
          } catch {}
          setAcceptedCollabsMap((collabs) => {
            const list = collabs[targetId] || [];
            if (!list.includes(targetReq.user.id)) {
              const next = { ...collabs, [targetId]: [...list, targetReq.user.id] };
              try {
                localStorage.setItem("kalceria_accepted_collabs", JSON.stringify(next));
              } catch {}
              return next;
            }
            return collabs;
          });
        }
        const updatedList = prev[bucketKey].filter((r) => r.id !== requestId);
        const updated = { ...prev, [bucketKey]: updatedList, [targetId]: updatedList };
        try {
          localStorage.setItem("kalceria_event_collab_requests", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setNotice("Collab request accepted! User is now a collaborator.");
    },
    [viewingRequestsEventId, setNotice]
  );

  const handleCollaboratorUpload = useCallback(
    (eventId) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".png,.jpg,.jpeg,.mp4,image/png,image/jpeg,video/mp4";
      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          setNotice("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
          return;
        }
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!["png", "jpg", "jpeg", "mp4"].includes(ext)) {
          setNotice("Only .png, .jpeg, and .mp4 files are allowed");
          return;
        }
        setNotice("Uploading media as collaborator...");
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
          const json = await res.json();
          if (json.url) {
            try {
              const postRes = await api.post(`/mini-events/${eventId}/media`, { mediaUrl: json.url });
              if (postRes.data?.event) {
                const updatedEvent = postRes.data.event;
                setEvents((prev) =>
                  prev.map((ev) => (String(ev.id) === String(eventId) ? { ...ev, ...updatedEvent } : ev))
                );
              } else {
                setEvents((prev) =>
                  prev.map((ev) => {
                    if (String(ev.id) === String(eventId)) {
                      const current = ev.mediaUrl ? ev.mediaUrl.split(",") : [];
                      return { ...ev, mediaUrl: [...current, json.url].join(",") };
                    }
                    return ev;
                  })
                );
              }
            } catch {
              setEvents((prev) =>
                prev.map((ev) => {
                  if (String(ev.id) === String(eventId)) {
                    const current = ev.mediaUrl ? ev.mediaUrl.split(",") : [];
                    return { ...ev, mediaUrl: [...current, json.url].join(",") };
                  }
                  return ev;
                })
              );
            }
            setNotice("Media added to event by collaborator!");
          } else {
            setNotice(json.error || "Upload failed");
          }
        } catch (err) {
          setNotice(err.message || "Upload error");
        }
      };
      input.click();
    },
    [setEvents, setNotice]
  );

  const handleDeclineCollabRequest = useCallback(
    (requestId, eventId) => {
      setEventRequestsMap((prev) => {
        const targetId = eventId || viewingRequestsEventId;
        if (!targetId) return prev;
        const bucketKey = Array.isArray(prev[targetId]) ? targetId : (Array.isArray(prev["own"]) ? "own" : null);
        if (!bucketKey || !prev[bucketKey]) return prev;
        const updatedList = prev[bucketKey].filter((r) => r.id !== requestId);
        const updated = { ...prev, [bucketKey]: updatedList, [targetId]: updatedList };
        try {
          localStorage.setItem("kalceria_event_collab_requests", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setNotice("Collab request declined.");
    },
    [viewingRequestsEventId, setNotice]
  );

  return {
    requestedEventId,
    setRequestedEventId,
    acceptedCollabsMap,
    setAcceptedCollabsMap,
    eventRequestsMap,
    setEventRequestsMap,
    cancelRequestTarget,
    setCancelRequestTarget,
    showCancelRequestModal,
    setShowCancelRequestModal,
    showRequestsModal,
    setShowRequestsModal,
    viewingRequestsEventId,
    setViewingRequestsEventId,
    handleRequestCollab,
    handlePromptCancelRequest,
    handleConfirmCancelRequest,
    handleOpenRequests,
    handleAcceptCollabRequest,
    handleCollaboratorUpload,
    handleDeclineCollabRequest,
  };
}
