"use client";

import { useEffect } from "react";

export function useKalceriansMapEvents({
  listContainerRef,
  isSelfOfflineRef,
  currentUser,
  activeChatUserIdRef,
  setActiveChatUserId,
  setActiveChatUserSnapshot,
  handleOpenChatWithTransition,
  setExpandedUserId,
}) {
  // Whenever an incoming personal chat message arrives, smoothly scroll list to top so the rolling card is visible
  useEffect(() => {
    const handleScrollTop = () => {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("kalceria:personal-chat-sorted-top", handleScrollTop);
    return () => window.removeEventListener("kalceria:personal-chat-sorted-top", handleScrollTop);
  }, []);

  useEffect(() => {
    const handleRemoteChatOpen = (e) => {
      if (isSelfOfflineRef.current) return;
      const targetUser = e.detail?.user;
      if (targetUser) {
        if (currentUser?.id && String(targetUser.id) === String(currentUser.id)) return;
        handleOpenChatWithTransition(targetUser);
      }
    };
    window.addEventListener("kalceria:open-personal-chat", handleRemoteChatOpen);
    return () => window.removeEventListener("kalceria:open-personal-chat", handleRemoteChatOpen);
  }, [currentUser]);

  // Expand and animate profile card in the scroll bar when avatar marker is tapped on the map
  useEffect(() => {
    const handleRemoteProfileExpand = (e) => {
      const targetId = e.detail?.userId || e.detail?.id;
      if (targetId) {
        setExpandedUserId((prev) => (prev === targetId ? null : targetId));
      }
    };
    window.addEventListener("kalceria:expand-kalcerian-profile", handleRemoteProfileExpand);
    return () => window.removeEventListener("kalceria:expand-kalcerian-profile", handleRemoteProfileExpand);
  }, []);

  // Handle lively Broadcast Reply sequence:
  // Slide down current view / drawer / previous chat, then slide up personal chat with creator, and inject reply
  useEffect(() => {
    const handleReplyLaunch = (e) => {
      if (isSelfOfflineRef.current) return;
      const { targetUser, replyPayload } = e.detail || {};
      if (!targetUser) return;
      if (currentUser?.id && String(targetUser.id) === String(currentUser.id)) return;

      // Close expanded profile card if open
      setExpandedUserId(null);

      // Store pending reply payload on window
      if (typeof window !== "undefined") {
        window.__kalceriaPendingReplyPayload = replyPayload;
      }

      // If already chatting with someone else, close first then transition
      if (
        activeChatUserIdRef.current &&
        String(activeChatUserIdRef.current) !== String(targetUser.id)
      ) {
        setActiveChatUserId(null);
        setActiveChatUserSnapshot(null);
        setTimeout(() => {
          handleOpenChatWithTransition(targetUser);
          if (replyPayload && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("kalceria:set-reply-payload", {
                detail: replyPayload,
              })
            );
          }
        }, 160);
      } else {
        handleOpenChatWithTransition(targetUser);
        if (replyPayload && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kalceria:set-reply-payload", {
              detail: replyPayload,
            })
          );
        }
      }
    };
    window.addEventListener("kalceria:start-broadcast-reply", handleReplyLaunch);
    window.addEventListener("kalceria:start-event-reply", handleReplyLaunch);
    return () => {
      window.removeEventListener("kalceria:start-broadcast-reply", handleReplyLaunch);
      window.removeEventListener("kalceria:start-event-reply", handleReplyLaunch);
    };
  }, [currentUser]);
}
