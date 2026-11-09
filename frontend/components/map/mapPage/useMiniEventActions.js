import { useCallback } from "react";
import { parseEventDesc } from "./eventDescCodec";
import { buildMiniEventPayload } from "./miniEventPayload";
import { cleanEventDesc, mergeEvents } from "@/components/map/mockMiniEvents";
import { splitMediaUrlListClient } from "@/lib/urlSecurity";
import { toSmartTitleCase } from "@/lib/titleCase";
import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";
import api, {
  postMiniEvent,
  putMiniEvent,
  delMiniEvent,
  fetchMiniEvents,
  fetchMiniEventsWithMeta,
} from "@/lib/api";

/**
 * useMiniEventActions
 * Hook Ledger Position: Event CRUD handlers & guarded collab actions
 *
 * Input:
 * - events: Array
 * - currentUser: object
 * - mapUsersData: Array
 * - eventForm: object
 * - editingEventId: string|null
 * - isSelfOffline: boolean
 * - setEvents: React.Dispatch<React.SetStateAction<Array>>
 * - setEditingEventId: React.Dispatch<React.SetStateAction<string|null>>
 * - setEventForm: React.Dispatch<React.SetStateAction<object>>
 * - setShowEventModal: React.Dispatch<React.SetStateAction<boolean>>
 * - setBusy: React.Dispatch<React.SetStateAction<boolean>>
 * - setStatusText: React.Dispatch<React.SetStateAction<string>>
 * - setNotice: React.Dispatch<React.SetStateAction<string|null>>
 * - syncCollabStateFromServer: Function
 * - triggerToolbarRetractCycle: Function
 * - handleOpenItemOnMap: Function
 * - handleRequestCollab: Function
 * - handlePromptCancelRequest: Function
 * - handleOpenRequests: Function
 * - handleCollaboratorUpload: Function
 *
 * Output:
 * - handleOpenEditEvent: Function
 * - saveMiniEvent: Function (non-memo, IL-6)
 * - handleOpenEventModal: Function
 * - guardedRequestCollab: Function
 * - guardedPromptCancelRequest: Function
 * - guardedOpenRequests: Function
 * - guardedCollaboratorUpload: Function
 * - deleteMiniEvent: Function (non-memo, IL-6)
 */
export function useMiniEventActions({
  events,
  currentUser,
  mapUsersData,
  eventForm,
  editingEventId,
  isSelfOffline,
  setEvents,
  setEditingEventId,
  setEventForm,
  setShowEventModal,
  setBusy,
  setNotice,
  syncCollabStateFromServer,
  triggerToolbarRetractCycle,
  handleOpenItemOnMap,
  handleRequestCollab,
  handlePromptCancelRequest,
  handleOpenRequests,
  handleCollaboratorUpload,
}) {
  const handleOpenEditEvent = useCallback((eventItem) => {
    if (!eventItem || isSelfOffline) return;
    const { category, mediaUrl, location, cleanDesc } = parseEventDesc(eventItem);

    const mediaMetadataByUrl = {};
    if (Array.isArray(eventItem.mediaItems)) {
      eventItem.mediaItems.forEach((m) => {
        if (m?.url && (m.width || m.height || m.duration)) {
          mediaMetadataByUrl[m.url] = {
            width: m.width || null,
            height: m.height || null,
            duration: m.duration || null,
          };
        }
      });
    }

    setEventForm({
      title: eventItem.title || "",
      description: cleanDesc,
      category,
      mediaUrl,
      mediaMetadataByUrl,
      mediaSyncedAt: Date.now(),
      location,
      lat: eventItem.lat || null,
      lng: eventItem.lng || null,
    });
    setEditingEventId(eventItem.id);
    setShowEventModal(true);
  }, [isSelfOffline]);

  async function saveMiniEvent(e) {
    e.preventDefault();
    if (isSelfOffline) return;
    setBusy(true);
    try {
      const me = mapUsersData.find((u) => u.id === currentUser?.id);

      // Prioritize coordinates from LocationAutocomplete if selected, otherwise current GPS / user domicile
      let currentLat = eventForm.lat ? Number(eventForm.lat) : (me?.lat || currentUser?.domicileLat || -6.2715);
      let currentLng = eventForm.lng ? Number(eventForm.lng) : (me?.lng || currentUser?.domicileLng || 106.7135);

      if (!eventForm.lat && typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 2000,
              maximumAge: 60000,
              enableHighAccuracy: false,
            });
          });
          if (pos?.coords) {
            currentLat = pos.coords.latitude;
            currentLng = pos.coords.longitude;
          }
        } catch {}
      }

      // Location string from form or reverse geocoding
      let locationName = (eventForm.location || "").trim();
      if (!locationName) {
        try {
          const revRes = await api.get('/location/reverse', {
            params: { lat: currentLat, lng: currentLng },
          });
          if (revRes?.data?.formatted) {
            locationName = revRes.data.formatted;
          }
        } catch {}
      }

      const payload = buildMiniEventPayload(
        { eventForm, currentLat, currentLng, locationName },
        { splitMediaUrlListClientFn: splitMediaUrlListClient, toSmartTitleCaseFn: toSmartTitleCase }
      );

      let eventIdToUpdate = editingEventId || events.find((ev) => ev.creator?.id === currentUser?.id)?.id;
      let savedEventObj = null;

      if (!eventIdToUpdate) {
        try {
          const createdRes = await postMiniEvent(payload);
          const createdEvent = createdRes?.data?.event || createdRes?.data || createdRes;
          if (createdEvent && typeof createdEvent === "object") {
            savedEventObj = cleanEventDesc({
              ...payload,
              ...createdEvent,
              id: createdEvent.id || `evt_${Date.now()}`,
              lat: Number(createdEvent.lat ?? currentLat),
              lng: Number(createdEvent.lng ?? currentLng),
              creator: {
                ...(createdEvent.creator || {}),
                id: currentUser?.id || createdEvent.creator?.id,
                name: currentUser?.displayName || currentUser?.name || createdEvent.creator?.name,
                displayName: currentUser?.displayName || currentUser?.name || createdEvent.creator?.displayName,
                nickname: currentUser?.nickname || createdEvent.creator?.nickname,
                profilePicture: resolvePersistentAvatarUrl(currentUser),
              },
            });
            setEvents((prev) => [
              savedEventObj,
              ...prev.filter((ev) => String(ev.id) !== String(savedEventObj.id) && String(ev.creator?.id) !== String(currentUser?.id)),
            ]);
          }
        } catch (postErr) {
          // If backend reports 409 (user already has an active event), fetch and update it
          const latestList = await fetchMiniEvents().catch(() => []);
          const existingOwn = (latestList || []).find((ev) => String(ev.creator?.id || ev.creatorId) === String(currentUser?.id));
          if (existingOwn?.id) {
            eventIdToUpdate = existingOwn.id;
          } else {
            throw postErr;
          }
        }
      }

      if (eventIdToUpdate) {
        const updatedRes = await putMiniEvent(eventIdToUpdate, payload);
        const updatedEvent = updatedRes?.data?.event || updatedRes?.data || updatedRes;
        savedEventObj = cleanEventDesc({
          ...payload,
          ...(updatedEvent && typeof updatedEvent === "object" ? updatedEvent : {}),
          id: eventIdToUpdate,
          lat: Number(updatedEvent?.lat ?? currentLat),
          lng: Number(updatedEvent?.lng ?? currentLng),
          creator: {
            ...(updatedEvent?.creator || {}),
            id: currentUser?.id,
            name: currentUser?.displayName || currentUser?.name,
            displayName: currentUser?.displayName || currentUser?.name,
            nickname: currentUser?.nickname,
            profilePicture: resolvePersistentAvatarUrl(currentUser),
          },
        });
        setEvents((prev) => {
          const exists = prev.some((ev) => String(ev.id) === String(eventIdToUpdate));
          if (exists) {
            return prev.map((ev) => (String(ev.id) === String(eventIdToUpdate) ? { ...ev, ...savedEventObj } : ev));
          }
          return [savedEventObj, ...prev];
        });
      }

      const refreshedMeta = await fetchMiniEventsWithMeta().catch(() => null);
      if (refreshedMeta?.events && refreshedMeta.events.length > 0) {
        const merged = mergeEvents(refreshedMeta.events);
        setEvents(merged);
        syncCollabStateFromServer(merged, refreshedMeta.requestedEventId ?? null);
        if (!savedEventObj && currentUser?.id) {
          savedEventObj = merged.find((ev) => String(ev.creator?.id) === String(currentUser.id)) || null;
        }
      }
      setNotice(eventIdToUpdate ? "Mini event updated." : "Mini event saved.");
      setEditingEventId(null);
      setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "", mediaMetadataByUrl: {}, location: "", lat: null, lng: null });
      setShowEventModal(false);
      triggerToolbarRetractCycle();

      // Immediately pan/fly to the created/updated event on the map and open its popup
      if (savedEventObj) {
        setTimeout(() => {
          handleOpenItemOnMap(savedEventObj, "event");
        }, 120);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.message || "Failed to save mini event.";
      setNotice(errorMsg);
      setBusy(false);
      throw err;
    }
    setBusy(false);
  }

  const handleOpenEventModal = useCallback((open = true) => {
    if (open && isSelfOffline) return;
    if (open) {
      if (!editingEventId) {
        const own = events.find((ev) => ev.creator?.id === currentUser?.id || ev.id === "own");
        if (own) {
          handleOpenEditEvent(own);
          return;
        } else {
          setEditingEventId(null);
          setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "", mediaMetadataByUrl: {}, location: "", lat: null, lng: null });
        }
      }
    } else {
      setEditingEventId(null);
    }
    setShowEventModal(open);
  }, [events, currentUser, editingEventId, handleOpenEditEvent, isSelfOffline]);

  const guardedRequestCollab = useCallback((id) => {
    if (isSelfOffline) return;
    handleRequestCollab?.(id);
  }, [isSelfOffline, handleRequestCollab]);

  const guardedPromptCancelRequest = useCallback((id, title) => {
    if (isSelfOffline) return;
    handlePromptCancelRequest?.(id, title);
  }, [isSelfOffline, handlePromptCancelRequest]);

  const guardedOpenRequests = useCallback((id) => {
    if (isSelfOffline) return;
    handleOpenRequests?.(id);
  }, [isSelfOffline, handleOpenRequests]);

  const guardedCollaboratorUpload = useCallback((id) => {
    if (isSelfOffline) return;
    handleCollaboratorUpload?.(id);
  }, [isSelfOffline, handleCollaboratorUpload]);

  async function deleteMiniEvent(targetId) {
    const idToDelete = targetId || editingEventId || events.find((ev) => ev.creator?.id === currentUser?.id)?.id;
    if (!idToDelete) return;

    // 1. Instant 0ms Optimistic UI Updates
    setEvents((prev) => prev.filter((ev) => ev.id !== idToDelete));
    setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "", mediaMetadataByUrl: {} });
    setEditingEventId(null);
    setShowEventModal(false);
    setNotice("Mini event deleted.");

    // Trigger auto-retract animation so toolbar tucks in and reconfigures cleanly
    triggerToolbarRetractCycle();

    // 2. Asynchronous backend deletion in background
    try {
      await delMiniEvent(idToDelete).catch(() => {});
      const refreshedMeta = await fetchMiniEventsWithMeta().catch(() => null);
      if (refreshedMeta?.events) {
        const merged = mergeEvents(refreshedMeta.events);
        setEvents(merged);
        syncCollabStateFromServer(merged, refreshedMeta.requestedEventId ?? null);
      }
    } catch (err) {
      console.warn("Delete mini event background sync warning:", err?.message);
    }
  }

  return {
    handleOpenEditEvent,
    saveMiniEvent,
    handleOpenEventModal,
    guardedRequestCollab,
    guardedPromptCancelRequest,
    guardedOpenRequests,
    guardedCollaboratorUpload,
    deleteMiniEvent,
  };
}
