"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KalcerianCardItem } from "./panel/KalcerianCardItem";
import { ChatErrorBoundary } from "./panel/ChatErrorBoundary";
import { KalceriansHeader } from "./panel/KalceriansHeader";
import { KalceriansSkeletonList } from "./panel/KalceriansSkeletonList";
import {
  avatarUrl,
  cleanDesc,
  FAMILY_LIMITS,
  truncateWithEllipsis,
  getActiveBroadcast,
} from "./panel/kalceriansHelpers";
import { PersonalChatPanel } from "./chat/PersonalChatPanel";
import { IncomingCallModal } from "./chat/components/IncomingCallModal";
import { fetchCallSignals, postCallSignal } from "@/lib/api";
import { startIncomingRingtone, stopCallRingtone } from "@/lib/soundEngine";
import { generateCryptoNonce } from "@/lib/chatCrypto";
import {
  isEventOwner,
  isEventCollaborator,
  doesEventBelongToUser,
  getEventPendingRequests,
} from "./hooks/useMapChatAndNotifications";
import { prewarmVideoBatch, prewarmVideoUrl } from "@/lib/videoPrewarmer";

export const KalceriansPanel = memo(function KalceriansPanel({
  scheduleTimeout,
  mapUsersData,
  kalcerians,
  events,
  searchQuery,
  setSearchQuery,
  drawerOpen,
  setDrawerOpen,
  isDataLoading,
  isMapDark,
  setFocusedUserId,
  sidebarKalcerians,
  focusUser,
  blockedUserIds = [],
  onBlockUser,
  onUnblockUser,
  onOpenItemOnMap,
  currentUser = null,
  isSelfOffline = false,
  requestedEventId = null,
  eventRequestsMap = {},
  acceptedCollabsMap = {},
  eventGroupChatMap = {},
  personalChatMap = {},
  recentlyMessagedUserIds = {},
  favouriteUserIds = [],
  mutedUserIds = [],
  onToggleFavourite,
  onToggleMute,
  onOutgoingMessageUpdate,
  onPersonalChatOpen,
  onPromptCancelRequest,
  onOpenRequests,
}) {
  const [localHoveredKalcerian, setLocalHoveredKalcerian] = useState(null);
  const [hoveredEventIconId, setHoveredEventIconId] = useState(null);
  const [hoveredChatIconId, setHoveredChatIconId] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(null); // { userId, type: "block" | "unblock" }
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [deviceFamily, setDeviceFamily] = useState("desktop");
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const [activeChatUserSnapshot, setActiveChatUserSnapshot] = useState(null);
  const [isClosingForChat, setIsClosingForChat] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallInitialState, setIncomingCallInitialState] = useState(null);
  const listContainerRef = useRef(null);
  const chatTransitionTimerRef = useRef(null);
  const incomingCallRef = useRef(null);
  const handledCallIdsRef = useRef(new Set());
  const suspendedChatUserRef = useRef(null);
  const sidebarKalceriansRef = useRef(sidebarKalcerians);
  const mapUsersDataRef = useRef(mapUsersData);
  const activeChatUserIdRef = useRef(activeChatUserId);
  const activeChatUserSnapshotRef = useRef(activeChatUserSnapshot);
  const incomingCallInitialStateRef = useRef(incomingCallInitialState);
  const isSelfOfflineRef = useRef(Boolean(isSelfOffline));
  incomingCallRef.current = incomingCall;
  sidebarKalceriansRef.current = sidebarKalcerians;
  mapUsersDataRef.current = mapUsersData;
  activeChatUserIdRef.current = activeChatUserId;
  activeChatUserSnapshotRef.current = activeChatUserSnapshot;
  incomingCallInitialStateRef.current = incomingCallInitialState;
  isSelfOfflineRef.current = Boolean(isSelfOffline);

  // Parallel eager prewarming of sidebar Kalcerians' video/media covers to eliminate blank black screens
  useEffect(() => {
    if (!Array.isArray(sidebarKalcerians) || sidebarKalcerians.length === 0) return;
    const covers = sidebarKalcerians
      .map((u) => u.coverImage || u.coverUrl)
      .filter((c) => c && typeof c === "string" && !c.startsWith("#"));
    if (covers.length > 0) {
      prewarmVideoBatch(covers);
    }
  }, [sidebarKalcerians]);

  // When switching into Offline / Stealth ("Sniffer") mode, close active personal chat & suppress incoming call alerts
  useEffect(() => {
    if (!isSelfOffline) return;
    if (incomingCallRef.current) {
      stopCallRingtone();
      setIncomingCall(null);
    }
    if (activeChatUserIdRef.current) {
      setIncomingCallInitialState(null);
      setActiveChatUserId(null);
      setActiveChatUserSnapshot(null);
      setIsClosingForChat(false);
    }
  }, [isSelfOffline]);

  // Poll for incoming call signals across devices (event-driven, visibility-adaptive)
  useEffect(() => {
    if (!currentUser?.id) return;

    let active = true;
    let timerId = null;

    const checkSignals = async () => {
      if (!active) return;
      try {
        // When user intentionally toggles Offline (Eye shut), incoming calls are naturally not received
        if (isSelfOfflineRef.current) {
          if (active) {
            timerId = setTimeout(checkSignals, 3200);
          }
          return;
        }
        const res = await fetchCallSignals();
        const signals = res?.signals || [];

        for (const sig of signals) {
          if (sig.signalType === "offer") {
            if (sig.callId && handledCallIdsRef.current.has(sig.callId)) continue;
            // New incoming call offer from another user
            if (!incomingCallRef.current || incomingCallRef.current.callId !== sig.callId) {
              const currentSidebar = sidebarKalceriansRef.current || [];
              const currentMapUsers = mapUsersDataRef.current || [];
              const caller =
                currentSidebar.find(
                  (u) => String(u.id || u.nickname) === String(sig.fromUserId)
                ) ||
                currentMapUsers.find(
                  (u) => String(u.id || u.nickname) === String(sig.fromUserId)
                ) || {
                  id: sig.fromUserId,
                  name: "Kalcerian",
                  displayName: "Kalcerian",
                };

              // If chat box is currently open, suspend it and slide it down
              if (activeChatUserIdRef.current) {
                const currentChatUser =
                  currentSidebar.find(
                    (u) => String(u.id || u.nickname || u.name) === String(activeChatUserIdRef.current)
                  ) || activeChatUserSnapshotRef.current;
                if (currentChatUser) {
                  suspendedChatUserRef.current = currentChatUser;
                }
                setActiveChatUserId(null);
                setActiveChatUserSnapshot(null);
              }

              setIncomingCall({
                callId: sig.callId,
                fromUserId: sig.fromUserId,
                callerUser: caller,
                callMode: sig.callMode,
                offerSdp: sig.encryptedPayload,
              });

              postCallSignal(sig.fromUserId, {
                callId: sig.callId,
                callMode: sig.callMode,
                signalType: "ringing",
                nonce: generateCryptoNonce(),
              }).catch(() => {});

              startIncomingRingtone();

              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(`Panggilan Masuk dari ${caller.displayName || caller.name}`, {
                  body: `Panggilan ${sig.callMode === "video" ? "video" : "suara"} masuk di Kalceria Map`,
                  icon: "/ForChat/Coki_Speak.png",
                  tag: `call-${sig.callId}`,
                  renotify: true,
                });
              }
            }
          } else if (sig.signalType === "hangup") {
            if (sig.callId) handledCallIdsRef.current.add(sig.callId);
            if (incomingCallRef.current && incomingCallRef.current.callId === sig.callId) {
              stopCallRingtone();
              setIncomingCall(null);
              fetchCallSignals({ clear: "true" }).catch(() => {});
              // Gracefully return to state 0 if caller canceled
              if (suspendedChatUserRef.current) {
                const prevUser = suspendedChatUserRef.current;
                suspendedChatUserRef.current = null;
                handleOpenChatWithTransition(prevUser);
              } else {
                setDrawerOpen(true);
              }
            }
          }
        }
      } catch {}

      if (active) {
        const isHidden = typeof document !== "undefined" && document.hidden;
        timerId = setTimeout(checkSignals, isHidden ? 4800 : 1200);
      }
    };

    timerId = setTimeout(checkSignals, 600);

    const onVisibilityWake = () => {
      if (active && typeof document !== "undefined" && !document.hidden) {
        if (timerId) clearTimeout(timerId);
        checkSignals();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityWake);
    }

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityWake);
      }
    };
  }, [currentUser?.id]);

  const handleAcceptIncomingCall = (call) => {
    stopCallRingtone();
    const callData = call || incomingCall;
    if (!callData) return;

    if (callData.callId) {
      handledCallIdsRef.current.add(callData.callId);
    }
    suspendedChatUserRef.current = null;
    const caller = callData.callerUser;
    setIncomingCallInitialState({
      mode: callData.callMode,
      user: caller,
      isIncoming: true,
      offerSdp: callData.offerSdp,
      callId: callData.callId,
    });
    setIncomingCall(null);
    handleOpenChatWithTransition(caller);
  };

  const handleDeclineIncomingCall = () => {
    stopCallRingtone();
    if (incomingCall?.callId) {
      handledCallIdsRef.current.add(incomingCall.callId);
    }
    if (incomingCall?.fromUserId) {
      postCallSignal(incomingCall.fromUserId, {
        callId: incomingCall.callId,
        callMode: incomingCall.callMode,
        signalType: "hangup",
        nonce: generateCryptoNonce(),
      }).catch(() => {});
    }
    fetchCallSignals({ clear: "true" }).catch(() => {});
    setIncomingCall(null);

    // Return gracefully to State 0:
    // If chat was open before call, slide chat back up; else slide Kalcerians scroll bar drawer back up
    if (suspendedChatUserRef.current) {
      const prevUser = suspendedChatUserRef.current;
      suspendedChatUserRef.current = null;
      handleOpenChatWithTransition(prevUser);
    } else {
      setDrawerOpen(true);
    }
  };

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < 640) setDeviceFamily("hp");
      else if (w < 860) setDeviceFamily("tab");
      else if (w < 1180) setDeviceFamily("ipad");
      else setDeviceFamily("desktop");
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (chatTransitionTimerRef.current) clearTimeout(chatTransitionTimerRef.current);
    };
  }, []);

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
    const handleBroadcastReply = (e) => {
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
    window.addEventListener("kalceria:start-broadcast-reply", handleBroadcastReply);
    return () => window.removeEventListener("kalceria:start-broadcast-reply", handleBroadcastReply);
  }, [currentUser]);

  const handleOpenChatWithTransition = (user) => {
    if (!user || isSelfOfflineRef.current) return;
    // Strict guard: Cannot chat with oneself
    if (currentUser?.id && String(user.id) === String(currentUser.id)) return;
    setActiveChatUserSnapshot(user);
    const resolvedId = String(user.id || user.nickname || user.name);
    setActiveChatUserId(resolvedId);
    setIsClosingForChat(true);
    onPersonalChatOpen?.(user);
    setHoveredChatIconId(null);
    setLocalHoveredKalcerian(null);
  };

  const handleClosePersonalChat = () => {
    if (chatTransitionTimerRef.current) clearTimeout(chatTransitionTimerRef.current);
    // Step 1: Slide Personal Chat panel down
    setActiveChatUserId(null);
    setActiveChatUserSnapshot(null);
    // Step 2: Bring "Find other Kalcerians" scroll bar back up
    chatTransitionTimerRef.current = setTimeout(() => {
      setIsClosingForChat(false);
      setDrawerOpen(true);
    }, 240);
  };

  const activeChatUser = activeChatUserId
    ? sidebarKalcerians.find(
        (u) => String(u.id || u.nickname || u.name) === String(activeChatUserId)
      ) || activeChatUserSnapshot
    : null;

  const isKalceriansHiddenForChat = Boolean(isClosingForChat || activeChatUser || incomingCall);

  const limits = FAMILY_LIMITS[deviceFamily] || FAMILY_LIMITS.desktop;

  const blockedUserIdsRef = useRef(blockedUserIds);
  blockedUserIdsRef.current = blockedUserIds;

  const handleAvatarClick = useCallback((e, user) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (blockedUserIdsRef.current.includes(user.id)) return;
    if (Boolean(user?.isOnline && user?.allowLiveLocation !== false)) {
      focusUser(user);
    }
    // On all device families, keep drawer open and smoothly elongate profile card inline
    setExpandedUserId((prev) => (prev === user.id ? null : user.id));
  }, [focusUser]);

  return (
    <>
      <AnimatePresence>
        {activeChatUser && (
          <ChatErrorBoundary
            key={`chat-boundary-${activeChatUser.id}`}
            isMapDark={isMapDark}
            onCloseChat={() => {
              setIncomingCallInitialState(null);
              handleClosePersonalChat();
            }}
          >
            <PersonalChatPanel
              key={`chat-panel-${activeChatUser.id}`}
              activeChatUser={activeChatUser}
              currentUser={currentUser}
              isMapDark={isMapDark}
              avatarUrl={avatarUrl}
              isFavourite={favouriteUserIds.includes(String(activeChatUser.id))}
              isMuted={mutedUserIds.includes(String(activeChatUser.id))}
              initialCallState={incomingCallInitialState}
              onCallEnded={() => setIncomingCallInitialState(null)}
              onToggleFavourite={onToggleFavourite}
              onToggleMute={onToggleMute}
              onCloseChat={() => {
                setIncomingCallInitialState(null);
                handleClosePersonalChat();
              }}
              onOutgoingMessageUpdate={onOutgoingMessageUpdate}
            />
          </ChatErrorBoundary>
        )}
      </AnimatePresence>

      {/* Global Incoming Call Alert Across Devices */}
      <IncomingCallModal
        incomingCall={incomingCall}
        isMapDark={isMapDark}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      <motion.aside
        initial={{ y: 80, opacity: 0 }}
        animate={{
          y: isKalceriansHiddenForChat
            ? "115%"
            : drawerOpen
            ? "0%"
            : "calc(100% - 66px)",
          opacity: isKalceriansHiddenForChat ? 0 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.9,
        }}
        style={{
          pointerEvents: isKalceriansHiddenForChat ? "none" : "auto",
        }}
        className={`fixed z-[1000] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col overflow-hidden font-sans select-none max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[46vh] max-[860px]:max-h-[385px] max-[860px]:min-h-[340px] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
          isMapDark
            ? "bg-[#0f1014] border border-[#2a2d37] text-[#f0f6fc] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.12),inset_-1px_-1.5px_2px_rgba(0,0,0,0.8),0_14px_36px_rgba(0,0,0,0.85)]"
            : "bg-[#ffffff] border border-[#c4cbd4] text-[#1f2328] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.95),inset_-1px_-1.5px_2px_rgba(160,174,192,0.35),0_12px_36px_rgba(0,0,0,0.12)]"
        }`}
      >
      {/* Smooth-trimmed BGOtherKalcerian Background cut strictly at the top boundary of the Search box */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[74px] bottom-0 z-0 pointer-events-none select-none overflow-hidden"
        style={{
          backgroundColor: isMapDark ? "#0f1014" : "#ffffff",
          maskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 12px, black 26px)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 12px, black 26px)",
        }}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: isMapDark
              ? "url('/BG_IMPROVE_FOR_MAP/BGOtherKalcerian_Dark.webp')"
              : "url('/BG_IMPROVE_FOR_MAP/BGOtherKalcerian_Light.webp')",
            backgroundSize: "cover",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
            opacity: isMapDark ? 0.45 : 0.58,
          }}
        />
      </div>

      {/* 1-3. Pull Handle, Wave Title Header & Search Bar (Modularized Package Component) */}
      <KalceriansHeader
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        isMapDark={isMapDark}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 4. Content List: Unified Kalcerians list */}
      <div
        ref={listContainerRef}
        className="relative z-10 flex-1 flex flex-col min-h-0 overflow-y-auto px-2.5 pt-2 pb-3.5 modern-kalcerian-scrollbar overscroll-contain"
      >
        {isDataLoading ? (
          <KalceriansSkeletonList isMapDark={isMapDark} />
        ) : sidebarKalcerians.length > 0 ? (
          sidebarKalcerians.map((user) => {
            const isBlocked = blockedUserIds.includes(user.id);
            const isConfirming = confirmingAction?.userId === user.id;
            const isExpanded = expandedUserId === user.id;
            const activeBroadcastMsg = getActiveBroadcast(user);
            const displayName = user.displayName || user.name || user.nickname || "Kalcerian";
            const rawUsername = user.nickname || user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, '_') : "kalcerian");
            const cleanUsername = String(rawUsername).replace(/^@/, '');

            const userEvent =
              user.event && doesEventBelongToUser(user.event, user, currentUser?.id)
                ? user.event
                : events.find((e) => doesEventBelongToUser(e, user, currentUser?.id));
            const isOwnEvent = Boolean(userEvent && isEventOwner(userEvent, currentUser));
            const isCollaboratorEvent = Boolean(userEvent && isEventCollaborator(userEvent, currentUser, acceptedCollabsMap));
            const eventPendingRequests = userEvent && isOwnEvent ? getEventPendingRequests(userEvent, currentUser, eventRequestsMap) : [];
            const effectivePendingReqCount = userEvent && isOwnEvent
              ? Math.max(eventPendingRequests.length, Number(userEvent.pendingRequestsCount) || 0)
              : 0;
            const unreadGroupChatCount = userEvent && (isOwnEvent || isCollaboratorEvent) ? (eventGroupChatMap?.[userEvent.id]?.unreadCount || 0) : 0;
            const hasPendingRequests = effectivePendingReqCount > 0 || unreadGroupChatCount > 0;
            const isRequestedByMe = Boolean(userEvent && requestedEventId && String(requestedEventId) === String(userEvent.id));
            const isOtherEventDisabled = Boolean(userEvent && requestedEventId && String(requestedEventId) !== String(userEvent.id) && !isOwnEvent);
            const unreadPersonalChatCount = personalChatMap?.[user.id]?.unreadCount || 0;
            const isRecentlyMessaged = Boolean(recentlyMessagedUserIds?.[user.id]);
            const isFavourite = favouriteUserIds.includes(String(user.id));
            const isMuted = mutedUserIds.includes(String(user.id));

            return (
              <KalcerianCardItem
                key={user.id}
                user={user}
                userEvent={userEvent}
                isBlocked={isBlocked}
                isExpanded={isExpanded}
                isConfirming={isConfirming}
                confirmingAction={confirmingAction}
                setConfirmingAction={setConfirmingAction}
                isRequestedByMe={isRequestedByMe}
                isOwnEvent={isOwnEvent}
                hasPendingRequests={hasPendingRequests}
                eventPendingRequests={eventPendingRequests}
                unreadGroupChatCount={unreadGroupChatCount}
                unreadPersonalChatCount={unreadPersonalChatCount}
                isRecentlyMessaged={isRecentlyMessaged}
                isFavourite={isFavourite}
                isMuted={isMuted}
                isSelfOffline={isSelfOffline}
                onPersonalChatOpen={handleOpenChatWithTransition}
                isOtherEventDisabled={isOtherEventDisabled}
                displayName={displayName}
                cleanUsername={cleanUsername}
                activeBroadcastMsg={activeBroadcastMsg}
                limits={limits}
                deviceFamily={deviceFamily}
                isMapDark={isMapDark}
                isHovered={localHoveredKalcerian === user.id}
                setHoveredKalcerian={setLocalHoveredKalcerian}
                hoveredEventIconId={hoveredEventIconId}
                setHoveredEventIconId={setHoveredEventIconId}
                hoveredChatIconId={hoveredChatIconId}
                setHoveredChatIconId={setHoveredChatIconId}
                focusUser={focusUser}
                setFocusedUserId={setFocusedUserId}
                scheduleTimeout={scheduleTimeout}
                setExpandedUserId={setExpandedUserId}
                handleAvatarClick={handleAvatarClick}
                onPromptCancelRequest={onPromptCancelRequest}
                onOpenRequests={onOpenRequests}
                onOpenItemOnMap={onOpenItemOnMap}
                setDrawerOpen={setDrawerOpen}
                onBlockUser={onBlockUser}
                onUnblockUser={onUnblockUser}
                avatarUrl={avatarUrl}
                truncateWithEllipsis={truncateWithEllipsis}
                cleanDesc={cleanDesc}
              />
            );
          })
        ) : (
          <div
            className={`p-6 text-center text-xs ${
              isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
            }`}
          >
            No Kalcerians found.
          </div>
        )}
      </div>
    </motion.aside>
    </>
  );
});
