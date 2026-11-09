"use client";

import { useState, useCallback } from "react";
import {
  requestEventCollab,
  cancelEventCollabRequest,
  fetchEventCollabRequests,
  acceptEventCollab,
  declineEventCollab,
  addEventMedia,
  uploadBlobMedia,
} from "@/lib/api";
import { cleanEventDesc } from "../mockMiniEvents";
import { probeMediaFileMetadata } from "../eventPopup/popupMediaMetadata";

export function useEventCollab({ events, setEvents, setNotice }) {
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
    return {};
  });

  const [eventRequestsMap, setEventRequestsMap] = useState({});

  const [cancelRequestTarget, setCancelRequestTarget] = useState(null);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [viewingRequestsEventId, setViewingRequestsEventId] = useState(null);
  const [collaboratorUploadState, setCollaboratorUploadState] = useState(null);

  const persistRequestedEventId = useCallback((nextId) => {
    setRequestedEventId(nextId || null);
    try {
      if (nextId) {
        localStorage.setItem("kalceria_requested_event_id", String(nextId));
      } else {
        localStorage.removeItem("kalceria_requested_event_id");
      }
    } catch {}
  }, []);

  const syncCollabStateFromServer = useCallback(
    (activeEvents = [], serverRequestedEventId = undefined) => {
      if (serverRequestedEventId !== undefined) {
        persistRequestedEventId(serverRequestedEventId || null);
      }

      if (Array.isArray(activeEvents)) {
        const nextCollabs = {};
        activeEvents.forEach((ev) => {
          if (!ev?.id) return;
          const ids = new Set();
          if (Array.isArray(ev.collaborators)) {
            ev.collaborators.forEach((entry) => {
              const cid = typeof entry === "object" ? entry?.id : entry;
              if (cid) ids.add(String(cid));
            });
          }
          if (Array.isArray(ev.collaboratorIds)) {
            ev.collaboratorIds.forEach((cid) => {
              if (cid) ids.add(String(cid));
            });
          }
          if (ids.size > 0) {
            nextCollabs[ev.id] = Array.from(ids);
          }
        });
        setAcceptedCollabsMap(nextCollabs);
        try {
          localStorage.setItem("kalceria_accepted_collabs", JSON.stringify(nextCollabs));
        } catch {}
      }
    },
    [persistRequestedEventId]
  );

  const handleRequestCollab = useCallback(
    async (eventId) => {
      if (!eventId) return;
      const ev = events.find((e) => String(e.id) === String(eventId));
      persistRequestedEventId(eventId);
      try {
        const res = await requestEventCollab(eventId);
        if (res?.alreadyCollaborator) {
          persistRequestedEventId(null);
          setNotice?.(`You are already a collaborator on ${ev?.title || "this event"}!`);
          return;
        }
        persistRequestedEventId(res?.requestedEventId || eventId);
        setNotice?.(`Collab requested for ${ev?.title || "event"}!`);
        try {
          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("kalceria_realtime_channel");
            bc.postMessage({
              type: "envelope_request",
              payload: {
                eventId,
                request: res?.request || {
                  id: `req_${Date.now()}`,
                  createdAt: new Date().toISOString(),
                },
              },
            });
            bc.close();
          }
        } catch {}
      } catch (err) {
        const serverReqId = err?.response?.data?.requestedEventId || null;
        persistRequestedEventId(serverReqId);
        setNotice?.(err?.response?.data?.error || err?.message || "Failed to send collab request.");
      }
    },
    [events, persistRequestedEventId, setNotice]
  );

  const handlePromptCancelRequest = useCallback(
    (eventId, title) => {
      const targetId = eventId || requestedEventId;
      const ev = events.find((e) => String(e.id) === String(targetId));
      const resolvedTitle =
        title && title !== "active event" ? title : ev?.title || "Event";
      setCancelRequestTarget({
        id: targetId,
        title: resolvedTitle,
        eventTitle: resolvedTitle,
      });
      setShowCancelRequestModal(true);
    },
    [events, requestedEventId]
  );

  const handleConfirmCancelRequest = useCallback(async () => {
    const targetId = cancelRequestTarget?.id || requestedEventId;
    persistRequestedEventId(null);
    setShowCancelRequestModal(false);
    setCancelRequestTarget(null);

    if (targetId) {
      try {
        await cancelEventCollabRequest(targetId);
      } catch (err) {
        setNotice?.(err?.response?.data?.error || err?.message || "Failed to remove request.");
        return;
      }
    }
    setNotice?.("Request removed.");
  }, [cancelRequestTarget, requestedEventId, persistRequestedEventId, setNotice]);

  const handleOpenRequests = useCallback(
    async (eventId) => {
      if (!eventId) return;
      setViewingRequestsEventId(eventId);
      setShowRequestsModal(true);
      try {
        const requests = await fetchEventCollabRequests(eventId);
        const list = Array.isArray(requests) ? requests : [];
        setEventRequestsMap((prev) => ({
          ...prev,
          [eventId]: list,
        }));
        setEvents((prev) =>
          prev.map((ev) =>
            String(ev.id) === String(eventId)
              ? { ...ev, pendingRequestsCount: list.length }
              : ev
          )
        );
      } catch (err) {
        setNotice?.(err?.response?.data?.error || err?.message || "Failed to load requests.");
      }
    },
    [setEvents, setNotice]
  );

  const handleAcceptCollabRequest = useCallback(
    async (requestId, eventId) => {
      const targetId = eventId || viewingRequestsEventId;
      if (!targetId || !requestId) return;
      try {
        const res = await acceptEventCollab(targetId, requestId);

        let nextPendingCount = 0;
        setEventRequestsMap((prev) => {
          const existing = Array.isArray(prev[targetId]) ? prev[targetId] : [];
          const updatedList = existing.filter((r) => String(r.id) !== String(requestId));
          nextPendingCount = updatedList.length;
          return {
            ...prev,
            [targetId]: updatedList,
          };
        });

        if (res?.event) {
          const hydrated = cleanEventDesc(res.event);
          setEvents((prev) =>
            prev.map((ev) => (String(ev.id) === String(targetId) ? hydrated : ev))
          );
          if (Array.isArray(hydrated.collaborators)) {
            setAcceptedCollabsMap((prev) => {
              const next = { ...prev, [targetId]: hydrated.collaborators.map(String) };
              try {
                localStorage.setItem("kalceria_accepted_collabs", JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        } else {
          setEvents((prev) =>
            prev.map((ev) => {
              if (String(ev.id) !== String(targetId)) return ev;
              const existingCollabs = Array.isArray(ev.collaborators) ? ev.collaborators.map(String) : [];
              const acceptedId = res?.acceptedUserId ? String(res.acceptedUserId) : null;
              const mergedCollabs =
                acceptedId && !existingCollabs.includes(acceptedId)
                  ? [...existingCollabs, acceptedId]
                  : existingCollabs;
              return {
                ...ev,
                collaborators: mergedCollabs,
                pendingRequestsCount: nextPendingCount,
              };
            })
          );
          if (res?.acceptedUserId) {
            setAcceptedCollabsMap((prev) => {
              const existing = prev[targetId] || [];
              const acceptedId = String(res.acceptedUserId);
              if (existing.includes(acceptedId)) return prev;
              const next = { ...prev, [targetId]: [...existing, acceptedId] };
              try {
                localStorage.setItem("kalceria_accepted_collabs", JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        }

        setNotice?.("Collab request accepted! User is now a collaborator.");
      } catch (err) {
        setNotice?.(err?.response?.data?.error || err?.message || "Failed to accept collab request.");
      }
    },
    [viewingRequestsEventId, setEvents, setNotice]
  );

  const handleDeclineCollabRequest = useCallback(
    async (requestId, eventId) => {
      const targetId = eventId || viewingRequestsEventId;
      if (!targetId || !requestId) return;
      try {
        const res = await declineEventCollab(targetId, requestId);

        let nextPendingCount = 0;
        setEventRequestsMap((prev) => {
          const existing = Array.isArray(prev[targetId]) ? prev[targetId] : [];
          const updatedList = existing.filter((r) => String(r.id) !== String(requestId));
          nextPendingCount = updatedList.length;
          return {
            ...prev,
            [targetId]: updatedList,
          };
        });

        if (res?.event) {
          const hydrated = cleanEventDesc(res.event);
          setEvents((prev) =>
            prev.map((ev) => (String(ev.id) === String(targetId) ? hydrated : ev))
          );
        } else {
          setEvents((prev) =>
            prev.map((ev) =>
              String(ev.id) === String(targetId)
                ? { ...ev, pendingRequestsCount: nextPendingCount }
                : ev
            )
          );
        }

        setNotice?.("Collab request declined.");
      } catch (err) {
        setNotice?.(err?.response?.data?.error || err?.message || "Failed to decline collab request.");
      }
    },
    [viewingRequestsEventId, setEvents, setNotice]
  );

  const handleCollaboratorUpload = useCallback(
    (eventId) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".png,.jpg,.jpeg,.webp,.mp4,.m4v,.mp4v,.mpg4,.mov,.3gp,.webm,image/png,image/jpeg,image/webp,video/mp4,video/x-m4v,video/mp4v-es,video/quicktime,video/3gpp,video/webm";
      input.onchange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          setCollaboratorUploadState({
            status: "error",
            errorMessage: "Upload media Gagal/Ukuran Media melebihi 10 MB",
          });
          return;
        }
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!["png", "jpg", "jpeg", "webp", "mp4", "m4v", "mp4v", "mpg4", "mov", "3gp", "webm"].includes(ext)) {
          setCollaboratorUploadState({
            status: "error",
            errorMessage: "Upload media Gagal/Ukuran Media melebihi 10 MB",
          });
          return;
        }
        setCollaboratorUploadState({ status: "uploading" });
        try {
          const meta = await probeMediaFileMetadata(file).catch(() => ({
            width: null,
            height: null,
            duration: null,
          }));
          const uploadRes = await uploadBlobMedia(file, { purpose: "event-clip" });
          if (!uploadRes?.url) {
            setCollaboratorUploadState({
              status: "error",
              errorMessage: uploadRes?.error || "Upload media Gagal/Ukuran Media melebihi 10 MB",
            });
            return;
          }
          const addRes = await addEventMedia(eventId, {
            mediaUrl: uploadRes.url,
            ...(meta.width ? { width: meta.width } : {}),
            ...(meta.height ? { height: meta.height } : {}),
            ...(meta.duration ? { duration: meta.duration } : {}),
          });
          if (addRes?.event) {
            const hydrated = cleanEventDesc(addRes.event);
            setEvents((prev) =>
              prev.map((ev) => (String(ev.id) === String(eventId) ? hydrated : ev))
            );
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("kalceria:refresh-events-request", {
                  detail: { eventId, updatedEvent: hydrated },
                })
              );
            }
          }
          // Graceful lively transition to clear overlay
          setCollaboratorUploadState(null);
          setNotice?.("Media added to event by collaborator!");
        } catch (err) {
          setCollaboratorUploadState({
            status: "error",
            errorMessage: err?.response?.data?.error || err?.message || "Upload media Gagal/Ukuran Media melebihi 10 MB",
          });
        }
      };
      input.click();
    },
    [setEvents, setNotice]
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
    collaboratorUploadState,
    setCollaboratorUploadState,
    syncCollabStateFromServer,
    handleRequestCollab,
    handlePromptCancelRequest,
    handleConfirmCancelRequest,
    handleOpenRequests,
    handleAcceptCollabRequest,
    handleCollaboratorUpload,
    handleDeclineCollabRequest,
  };
}
