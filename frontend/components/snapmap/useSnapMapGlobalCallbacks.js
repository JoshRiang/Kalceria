"use client";

import { useEffect, useRef } from "react";
import api from "@/lib/api";
import { delBroadcast, putBroadcast, removeEventMedia } from "@/lib/api";
import {
  stepEventCarouselSlide,
  switchEventCarouselSlide,
} from "../map/eventPopup/popupCarouselController";
import { animateViewCountSlideDown } from "../map/eventPopup/popupCountAnimation";
import { showFeedDeletePrompt } from "../map/eventPopup/popupFeedDeletePrompt";
import { formatBroadcastDuration } from "../map/UserPopup";

export function useSnapMapGlobalCallbacks({
  events,
  users,
  currentUser = null,
  mapRef,
  isMapDark = false,
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
    currentUser,
    mapRef,
    isMapDark,
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
      currentUser,
      mapRef,
      isMapDark,
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
    currentUser,
    mapRef,
    isMapDark,
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
      const { isSelfOffline, users, currentUser, mapRef, onReplyBroadcast } = latestRef.current;
      if (isSelfOffline) return;
      if (currentUser?.id && String(currentUser.id) === String(id)) return;
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
      const mediaMatch = String(broadcastMsg || "").match(/\[MEDIA:([^\]]+)\]/i);
      const broadcastMediaUrl = targetUser.broadcast?.mediaUrl || (mediaMatch ? mediaMatch[1].trim() : null);
      const cleanBroadcastMsg = String(broadcastMsg || "").replace(/\[MEDIA:[^\]]+\]\s*/gi, "").trim();
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
        text: cleanBroadcastMsg,
        broadcastMessage: cleanBroadcastMsg,
        broadcastDuration: durationStr,
        mediaUrl: broadcastMediaUrl,
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
      const { isSelfOffline, events, users, currentUser, mapRef } = latestRef.current;
      if (isSelfOffline) return;
      const targetEvent = (events || []).find((e) => String(e.id) === String(id));
      if (!targetEvent) return;

      const creatorId =
        targetEvent.creator?.id ||
        targetEvent.creatorId ||
        targetEvent.userId;
      if (currentUser?.id && creatorId && String(currentUser.id) === String(creatorId)) return;

      // Step 1: Genie-out / close the event popup on the map
      if (mapRef?.current) {
        try {
          mapRef.current.closePopup();
        } catch (_) {}
      }

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

    const inFlightMediaViews = new Set();
    const mediaViewCooldown = new Map();
    window.__kalceriaRecordMediaView = async (safeId, clipId, clipIndex) => {
      if (String(safeId || "").startsWith("bcast_")) {
        const bcastId = String(clipId || "").replace(/^bcast_/, "");
        return window.__kalceriaRecordBroadcastView?.(bcastId);
      }

      const cleanEventId = String(safeId || "").replace(/^event_/, "");
      if (!cleanEventId || !clipId) return;

      const sessionKey = `${cleanEventId}:${clipId}`;
      if (inFlightMediaViews.has(sessionKey)) return;
      if (Date.now() - (mediaViewCooldown.get(sessionKey) || 0) < 600) return;
      inFlightMediaViews.add(sessionKey);
      mediaViewCooldown.set(sessionKey, Date.now());

      try {
        const res = await api.post(`/mini-events/${encodeURIComponent(cleanEventId)}/media/${encodeURIComponent(clipId)}/view`);
        const data = res?.data;
        if (data?.success && typeof data.viewCount === "number") {
          const countEls = document.querySelectorAll(`[data-media-view-count="${clipId}"]`);
          countEls.forEach((el) => {
            animateViewCountSlideDown(el, data.viewCount);
          });

          const slideEls = document.querySelectorAll(`[data-carousel-slide][data-clip-id="${clipId}"]`);
          slideEls.forEach((slide) => {
            slide.dataset.viewCount = String(data.viewCount);
          });

          const ev = (latestRef.current.events || []).find(
            (e) => String(e.id) === String(cleanEventId)
          );
          if (ev && Array.isArray(ev.mediaItems)) {
            const c = ev.mediaItems.find((item) => String(item.id) === String(clipId));
            if (c) c.viewCount = data.viewCount;
          }
        }
      } catch (_) {
      } finally {
        inFlightMediaViews.delete(sessionKey);
      }
    };

    const inFlightBroadcastViews = new Set();
    const broadcastViewCooldown = new Map();
    window.__kalceriaRecordBroadcastView = async (broadcastId, broadcastUserId) => {
      if (!broadcastId) return;
      const cleanBroadcastId = String(broadcastId).replace(/^bcast_/, "");
      const sessionKey = `bcast:${cleanBroadcastId}`;
      if (inFlightBroadcastViews.has(sessionKey)) return;
      if (Date.now() - (broadcastViewCooldown.get(sessionKey) || 0) < 600) return;
      inFlightBroadcastViews.add(sessionKey);
      broadcastViewCooldown.set(sessionKey, Date.now());

      try {
        const res = await api.post(`/broadcast/${encodeURIComponent(cleanBroadcastId)}/view`);
        const data = res?.data;
        if (data?.success && typeof data.viewCount === "number") {
          const countEls = document.querySelectorAll(
            `[data-broadcast-view-count="${cleanBroadcastId}"], [data-broadcast-view-count="bcast_${cleanBroadcastId}"]`
          );
          countEls.forEach((el) => {
            animateViewCountSlideDown(el, data.viewCount);
          });

          const users = latestRef.current.users || [];
          for (const u of users) {
            if (u?.broadcast && String(u.broadcast.id) === String(cleanBroadcastId)) {
              u.broadcast.viewCount = data.viewCount;
              break;
            }
          }
        }
      } catch (_) {
      } finally {
        inFlightBroadcastViews.delete(sessionKey);
      }
    };

    window.__kalceriaReplyEventMedia = (safeId, clipId, clipIndex) => {
      const { isSelfOffline, events, users, currentUser, mapRef } = latestRef.current;
      if (isSelfOffline) return;
      const cleanEventId = String(safeId || "").replace(/^event_/, "");
      const targetEvent = (events || []).find(
        (e) => String(e.id) === String(safeId) || String(e.id) === String(cleanEventId)
      );
      if (!targetEvent) return;

      const mediaItems = Array.isArray(targetEvent.mediaItems) ? targetEvent.mediaItems : [];
      const clip =
        mediaItems.find((c) => String(c.id) === String(clipId)) ||
        mediaItems[clipIndex];
      if (!clip) return;

      const authorId = clip.authorId || targetEvent.creatorId || targetEvent.creator?.id;
      if (currentUser?.id && authorId && String(currentUser.id) === String(authorId)) return;

      if (mapRef?.current) {
        try {
          mapRef.current.closePopup();
        } catch (_) {}
      }

      let targetAuthorUser = (users || []).find((u) => String(u.id) === String(authorId));
      if (!targetAuthorUser) {
        const collabProfile = (targetEvent.collaboratorProfiles || []).find(
          (c) => String(c.id) === String(authorId)
        );
        if (collabProfile) {
          targetAuthorUser = collabProfile;
        } else if (String(authorId) === String(targetEvent.creatorId) && targetEvent.creator) {
          targetAuthorUser = targetEvent.creator;
        } else {
          targetAuthorUser = {
            id: authorId,
            name: clip.authorName || "Kalcerian",
            displayName: clip.authorName || "Kalcerian",
            nickname: clip.authorName || "Kalcerian",
            profilePicture: clip.authorAvatarUrl || null,
          };
        }
      }

      const authorName =
        clip.authorName ||
        targetAuthorUser?.displayName ||
        targetAuthorUser?.name ||
        targetAuthorUser?.nickname ||
        "Kalcerian";

      const replyPayload = {
        id: `media_${clip.id || clipId}_${Date.now()}`,
        eventId: targetEvent.id,
        clipId: clip.id || clipId,
        clipIndex: clipIndex !== undefined ? clipIndex : mediaItems.indexOf(clip),
        msgType: clip.isVideo ? "video" : "photo",
        isEventMedia: true,
        mediaUrl: clip.url,
        isVideo: Boolean(clip.isVideo),
        videoDuration: clip.duration || null,
        senderName: authorName,
        senderId: authorId,
        userId: authorId,
        text: clip.isVideo ? "Video" : "Photo",
        caption: targetEvent.title || "Event Feed",
        lat: targetEvent.lat,
        lng: targetEvent.lng,
        createdAt: clip.uploadedAt || Date.now(),
        uploadedAt: clip.uploadedAt || null,
        expiresAt: clip.expiresAt || null,
      };

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("kalceria:start-event-reply", {
            detail: {
              targetUser: targetAuthorUser,
              replyPayload,
            },
          })
        );
      }, 120);
    };

    if (typeof window !== "undefined") {
      window.__kalceriaCurrentUserId = currentUser?.id ? String(currentUser.id) : "";
    }

    // Dynamic Action Dispatcher for Event Media:
    // If current viewer is the author of this clip -> Prompt deletion confirmation overlay
    // Otherwise -> Dispatch reply to personal chat
    window.__kalceriaHandleMediaAction = (safeId, clipId, clipIndex) => {
      const { isSelfOffline, events, currentUser, isMapDark } = latestRef.current;
      if (isSelfOffline) return;
      const cleanEventId = String(safeId || "").replace(/^event_/, "");
      const targetEvent = (events || []).find(
        (e) => String(e.id) === String(safeId) || String(e.id) === String(cleanEventId)
      );
      if (!targetEvent) return;

      const mediaItems = Array.isArray(targetEvent.mediaItems) ? targetEvent.mediaItems : [];
      const clip =
        mediaItems.find((c) => String(c.id) === String(clipId)) ||
        mediaItems[clipIndex];
      const authorId = clip?.authorId || targetEvent.creatorId || targetEvent.creator?.id;
      const isSelfAuthor = Boolean(
        currentUser?.id && authorId && String(currentUser.id) === String(authorId)
      );

      if (!isSelfAuthor) {
        return window.__kalceriaReplyEventMedia?.(safeId, clipId, clipIndex);
      }

      // Self-author: show fade-in blur deletion confirmation inside the media frame (.popup-video)
      const cardEl =
        document.querySelector(`[data-event-card-id="${safeId}"]`) ||
        document.querySelector(`[data-event-card-id="event_${cleanEventId}"]`);
      const targetBoxEl = cardEl?.querySelector(".popup-video");
      if (!targetBoxEl) return;

      const authorDisplayName =
        clip?.authorName ||
        clip?.authorDisplayName ||
        currentUser?.displayName ||
        currentUser?.name ||
        currentUser?.nickname ||
        "Kalcerian";

      showFeedDeletePrompt({
        targetBoxEl,
        isMapDark,
        authorDisplayName,
        onConfirm: async () => {
          try {
            // Smoothly slide out the deleted media slide element
            const slideEl =
              targetBoxEl.querySelector(`[data-clip-id="${clip?.id || clipId}"]`) ||
              targetBoxEl.querySelector(`[data-carousel-slide="${clipIndex}"]`);
            if (slideEl) {
              slideEl.style.transition = "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease";
              slideEl.style.transform = "translateX(-100%)";
              slideEl.style.opacity = "0";
            }

            await removeEventMedia(cleanEventId, { clipId: clip?.id || clipId });
            await new Promise((resolve) => setTimeout(resolve, 240));
            window.dispatchEvent(new CustomEvent("kalceria:refresh-events"));
          } catch (err) {
            console.error("[useSnapMapGlobalCallbacks] Failed to remove event media:", err);
          }
        },
        onCancel: () => {},
      });
    };

    // Dynamic Action Dispatcher for User Broadcast Box:
    // If current user is the owner of the broadcast -> Prompt deletion confirmation overlay
    // Otherwise -> Dispatch reply to personal chat
    window.__kalceriaHandleBroadcastAction = (userId, broadcastId) => {
      const { isSelfOffline, currentUser, mapRef, isMapDark } = latestRef.current;
      if (isSelfOffline) return;
      const curId = currentUser?.id ? String(currentUser.id) : null;
      const isOwner = Boolean(
        currentUser &&
          (curId && userId
            ? String(userId) === curId
            : currentUser.nickname &&
              userId &&
              currentUser.nickname.trim().toLowerCase() === String(userId).trim().toLowerCase())
      );

      if (!isOwner) {
        return window.__kalceriaReplyBroadcast?.(userId);
      }

      // Owner: show fade-in blur deletion confirmation inside the broadcast media box or popup
      const targetBoxEl =
        document.querySelector(`#broadcast-carousel-${userId}`)?.closest(".popup-video") ||
        document.querySelector(".broadcast-popup-box .popup-video") ||
        document.querySelector(".broadcast-popup-box");
      if (!targetBoxEl) return;

      const authorDisplayName =
        currentUser?.displayName ||
        currentUser?.name ||
        currentUser?.nickname ||
        "Kalcerian";

      showFeedDeletePrompt({
        targetBoxEl,
        isMapDark,
        authorDisplayName,
        onConfirm: async () => {
          try {
            // Check if broadcast has text beyond the media tag
            const rawMessage = typeof currentUser?.broadcast === "object" ? currentUser.broadcast?.message : currentUser?.broadcast;
            const cleanText = String(rawMessage || "").replace(/\[MEDIA:[^\]]+\]\s*/gi, "").trim();

            if (cleanText) {
              // Strip media from broadcast, preserving clean text
              await putBroadcast({ message: cleanText });
              if (currentUser) {
                if (typeof currentUser.broadcast === "object" && currentUser.broadcast) {
                  currentUser.broadcast.message = cleanText;
                  currentUser.broadcast.mediaUrl = null;
                } else {
                  currentUser.broadcast = cleanText;
                }
              }
            } else {
              // No text left: delete entire broadcast
              await delBroadcast();
              if (currentUser) {
                currentUser.broadcast = null;
              }
            }

            // Smoothly collapse the inner media box so it disappears seamlessly
            if (targetBoxEl) {
              targetBoxEl.style.transition = "max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease, margin 280ms ease";
              targetBoxEl.style.maxHeight = "0px";
              targetBoxEl.style.opacity = "0";
              targetBoxEl.style.margin = "0px";
            }

            await new Promise((resolve) => setTimeout(resolve, 240));

            if (!cleanText && mapRef?.current) {
              try { mapRef.current.closePopup(); } catch (_) {}
            }

            window.dispatchEvent(
              new CustomEvent("kalceria:open-edit-broadcast", {
                detail: { userId, action: "deleted" },
              })
            );
            window.dispatchEvent(new CustomEvent("kalceria:refresh-events"));
          } catch (err) {
            console.error("[useSnapMapGlobalCallbacks] Failed to delete broadcast:", err);
          }
        },
        onCancel: () => {},
      });
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
      delete window.__kalceriaReplyEventMedia;
      delete window.__kalceriaHandleMediaAction;
      delete window.__kalceriaHandleBroadcastAction;
      delete window.__kalceriaRecordMediaView;
      delete window.__kalceriaRecordBroadcastView;
    };
  }, []);
}
