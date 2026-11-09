"use client";

import { useEffect, useRef } from "react";
import {
  stepEventCarouselSlide,
  switchEventCarouselSlide,
} from "../map/eventPopup/popupCarouselController";
import { formatBroadcastDuration } from "../map/UserPopup";

export function useSnapMapGlobalCallbacks({
  events,
  users,
  mapRef,
  onEditEvent,
  onRequestCollab,
  onPromptCancelRequest,
  onOpenRequests,
  onCollaboratorUpload,
  onEditBroadcast,
  onReplyBroadcast,
  isSelfOffline = false,
}) {
  const latestRef = useRef({
    events,
    users,
    mapRef,
    onEditEvent,
    onRequestCollab,
    onPromptCancelRequest,
    onOpenRequests,
    onCollaboratorUpload,
    onEditBroadcast,
    onReplyBroadcast,
    isSelfOffline,
  });

  useEffect(() => {
    latestRef.current = {
      events,
      users,
      mapRef,
      onEditEvent,
      onRequestCollab,
      onPromptCancelRequest,
      onOpenRequests,
      onCollaboratorUpload,
      onEditBroadcast,
      onReplyBroadcast,
      isSelfOffline,
    };
  }, [
    events,
    users,
    mapRef,
    onEditEvent,
    onRequestCollab,
    onPromptCancelRequest,
    onOpenRequests,
    onCollaboratorUpload,
    onEditBroadcast,
    onReplyBroadcast,
    isSelfOffline,
  ]);

  // Wire global event & broadcast popup callbacks with stable window delegation (never unbinds across polling updates)
  useEffect(() => {
    window.__kalceriaEditEvent = (id) => {
      const { isSelfOffline, events, onEditEvent } = latestRef.current;
      if (isSelfOffline) return;
      const target = (events || []).find((e) => String(e.id) === String(id));
      if (target && onEditEvent) onEditEvent(target);
    };
    window.__kalceriaRequestCollab = (id) => {
      const { isSelfOffline, onRequestCollab } = latestRef.current;
      if (isSelfOffline) return;
      onRequestCollab?.(id);
    };
    window.__kalceriaPromptCancelRequest = (id, title) => {
      const { isSelfOffline, onPromptCancelRequest } = latestRef.current;
      if (isSelfOffline) return;
      onPromptCancelRequest?.(id, title);
    };
    window.__kalceriaOpenRequests = (id) => {
      const { isSelfOffline, onOpenRequests } = latestRef.current;
      if (isSelfOffline) return;
      onOpenRequests?.(id);
    };
    window.__kalceriaCollaboratorUpload = (id) => {
      const { isSelfOffline, onCollaboratorUpload } = latestRef.current;
      if (isSelfOffline) return;
      onCollaboratorUpload?.(id);
    };
    window.__kalceriaSwitchEventMedia = (safeId, targetIdx) => {
      switchEventCarouselSlide(safeId, targetIdx);
    };
    window.__kalceriaStepEventMedia = (safeId, delta) => {
      stepEventCarouselSlide(safeId, delta);
    };

    // Broadcast actions: Edit (creator) & Reply (other user)
    window.__kalceriaEditBroadcast = (id) => {
      const { isSelfOffline, onEditBroadcast } = latestRef.current;
      if (isSelfOffline) return;
      if (onEditBroadcast) onEditBroadcast(id);
      window.dispatchEvent(
        new CustomEvent("kalceria:open-edit-broadcast", {
          detail: { userId: id },
        })
      );
    };

    window.__kalceriaReplyBroadcast = (id) => {
      const { isSelfOffline, users, mapRef, onReplyBroadcast } = latestRef.current;
      if (isSelfOffline) return;
      const targetUser = (users || []).find((u) => String(u.id) === String(id));
      if (!targetUser) return;

      // Step 1: Genie-out / close the broadcast popup on the map
      if (mapRef?.current) {
        try {
          mapRef.current.closePopup();
        } catch (_) {}
      }

      const broadcastMsg =
        typeof targetUser.broadcast === "string"
          ? targetUser.broadcast
          : targetUser.broadcast?.message || "";
      const rawCreated =
        targetUser.broadcast?.createdAt ||
        targetUser.broadcastCreatedAt ||
        targetUser.updatedAt ||
        targetUser.createdAt;
      const elapsedMs = rawCreated
        ? Math.max(0, Date.now() - new Date(rawCreated).getTime())
        : 0;
      const durationStr = formatBroadcastDuration(elapsedMs);
      const creatorName = targetUser.nickname || targetUser.name || "Kalcerian";

      const replyPayload = {
        id: `broadcast_${targetUser.id}_${Date.now()}`,
        msgType: "broadcast",
        isBroadcast: true,
        senderName: creatorName,
        senderId: targetUser.id,
        userId: targetUser.id,
        creatorId: targetUser.id,
        text: broadcastMsg,
        broadcastMessage: broadcastMsg,
        broadcastDuration: durationStr,
        lat: targetUser.lat,
        lng: targetUser.lng,
        createdAt: rawCreated,
      };

      if (onReplyBroadcast) onReplyBroadcast(targetUser, replyPayload);

      // Step 2: Automated lively sequence (scroll down drawer/other chats, scroll up to personal chat)
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("kalceria:start-broadcast-reply", {
            detail: {
              targetUser,
              replyPayload,
            },
          })
        );
      }, 120);
    };

    window.__kalceriaReplyEvent = (id) => {
      const { isSelfOffline, events, users, mapRef } = latestRef.current;
      if (isSelfOffline) return;
      const targetEvent = (events || []).find((e) => String(e.id) === String(id));
      if (!targetEvent) return;

      // Step 1: Genie-out / close the event popup on the map
      if (mapRef?.current) {
        try {
          mapRef.current.closePopup();
        } catch (_) {}
      }

      const creatorId =
        targetEvent.creator?.id ||
        targetEvent.creatorId ||
        targetEvent.userId;

      let targetCreatorUser = (users || []).find((u) => String(u.id) === String(creatorId));
      if (!targetCreatorUser) {
        targetCreatorUser = targetEvent.creator || {
          id: creatorId,
          name: targetEvent.creator?.name || targetEvent.creator?.nickname || "Kalcerian",
          nickname: targetEvent.creator?.nickname,
          profilePicture: targetEvent.creator?.profilePicture,
        };
      }

      const creatorName =
        targetEvent.creator?.displayName ||
        targetEvent.creator?.name ||
        targetEvent.creator?.nickname ||
        targetCreatorUser?.displayName ||
        targetCreatorUser?.name ||
        targetCreatorUser?.nickname ||
        "Kalcerian";

      const eventTitle =
        targetEvent.name ||
        targetEvent.title ||
        targetEvent.description ||
        "Event";

      const replyPayload = {
        id: `event_${targetEvent.id}_${Date.now()}`,
        eventId: targetEvent.id,
        msgType: "event",
        isEvent: true,
        senderName: creatorName,
        senderId: creatorId,
        userId: creatorId,
        creatorId,
        eventName: eventTitle,
        title: eventTitle,
        caption: eventTitle,
        text: eventTitle,
        lat: targetEvent.lat,
        lng: targetEvent.lng,
        createdAt: targetEvent.createdAt,
      };

      // Step 2: Automated lively sequence (scroll down drawer/other chats, scroll up to personal chat)
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("kalceria:start-event-reply", {
            detail: {
              targetUser: targetCreatorUser,
              replyPayload,
            },
          })
        );
      }, 120);
    };

    return () => {
      delete window.__kalceriaEditEvent;
      delete window.__kalceriaRequestCollab;
      delete window.__kalceriaPromptCancelRequest;
      delete window.__kalceriaOpenRequests;
      delete window.__kalceriaCollaboratorUpload;
      delete window.__kalceriaSwitchEventMedia;
      delete window.__kalceriaStepEventMedia;
      delete window.__kalceriaEditBroadcast;
      delete window.__kalceriaReplyBroadcast;
      delete window.__kalceriaReplyEvent;
    };
  }, []);
}
