"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatErrorBoundary } from "./panel/ChatErrorBoundary";
import { KalceriansHeader } from "./panel/KalceriansHeader";
import { KalceriansPanelBody } from "./panel/KalceriansPanelBody";
import { avatarUrl, FAMILY_LIMITS } from "./panel/kalceriansHelpers";
import { PersonalChatPanel } from "./chat/PersonalChatPanel";
import { EventGroupChatPanel } from "./groupChat/EventGroupChatPanel";
import { IncomingCallModal } from "./chat/components/IncomingCallModal";
import { stopCallRingtone } from "@/lib/soundEngine";
import { useKalceriansIncomingCall } from "./panel/useKalceriansIncomingCall";
import { useKalceriansMapEvents } from "./panel/useKalceriansMapEvents";
import { useKalceriansFriends } from "./panel/useKalceriansFriends";
import { useBottomPanelSwitcher } from "./panel/useBottomPanelSwitcher";
import { prewarmVideoBatch } from "@/lib/videoPrewarmer";
import {
  KALCERIANS_PANEL_BG_DARK,
  KALCERIANS_PANEL_BG_LIGHT,
  CHAT_PANEL_BG_DARK,
  CHAT_PANEL_BG_LIGHT,
  MEETING_PANEL_BG_DARK,
  MEETING_PANEL_BG_LIGHT,
  getInstantMapBgUrl,
} from "@/lib/mapBgCache";

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
  blockedByUserIds = [],
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
  const [confirmingAction, setConfirmingAction] = useState(null);
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

  const {
    activeScope,
    setActiveScope,
    scopedKalcerians,
    hasFriendsNotif,
    hasGlobalNotif,
    getFriendshipStatus,
    isUserFriend,
    handleSendFriendRequest,
    handleCancelFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
  } = useKalceriansFriends({
    currentUser,
    sidebarKalcerians,
    personalChatMap,
    events,
    eventRequestsMap,
    eventGroupChatMap,
  });

  const {
    activePanel,
    isPanelSwitching,
    pinnedMeetingEventIds,
    groupSummaryMap,
    activeGroupEvent,
    setActiveGroupEventId,
  } = useBottomPanelSwitcher({
    setDrawerOpen,
    personalChatMap,
    events,
    currentUser,
    acceptedCollabsMap,
    eventRequestsMap,
    eventGroupChatMap,
    hasGlobalNotif,
  });

  useEffect(() => {
    if (!Array.isArray(sidebarKalcerians) || sidebarKalcerians.length === 0) return;
    const covers = sidebarKalcerians
      .map((u) => u.coverImage || u.coverUrl)
      .filter((c) => c && typeof c === "string" && !c.startsWith("#"));
    if (covers.length > 0) prewarmVideoBatch(covers);
  }, [sidebarKalcerians]);

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

  const handleOpenChatWithTransition = (user) => {
    if (!user || isSelfOfflineRef.current) return;
    if (currentUser?.id && String(user.id) === String(currentUser.id)) return;
    setActiveChatUserSnapshot(user);
    setActiveChatUserId(String(user.id || user.nickname || user.name));
    setIsClosingForChat(true);
    onPersonalChatOpen?.(user);
    setHoveredChatIconId(null);
    setLocalHoveredKalcerian(null);
  };

  const { handleAcceptIncomingCall, handleDeclineIncomingCall } = useKalceriansIncomingCall({
    currentUser,
    isSelfOfflineRef,
    sidebarKalceriansRef,
    mapUsersDataRef,
    activeChatUserIdRef,
    activeChatUserSnapshotRef,
    setActiveChatUserId,
    setActiveChatUserSnapshot,
    incomingCall,
    setIncomingCall,
    incomingCallRef,
    setIncomingCallInitialState,
    handledCallIdsRef,
    suspendedChatUserRef,
    handleOpenChatWithTransition,
    setDrawerOpen,
  });

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

  useKalceriansMapEvents({
    listContainerRef,
    isSelfOfflineRef,
    currentUser,
    activeChatUserIdRef,
    setActiveChatUserId,
    setActiveChatUserSnapshot,
    handleOpenChatWithTransition,
    setExpandedUserId,
  });

  const handleClosePersonalChat = () => {
    if (chatTransitionTimerRef.current) clearTimeout(chatTransitionTimerRef.current);
    setActiveChatUserId(null);
    setActiveChatUserSnapshot(null);
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

  const isKalceriansHiddenForChat = Boolean(
    isClosingForChat || activeChatUser || activeGroupEvent || incomingCall || isPanelSwitching
  );
  const panelBgAsset =
    activePanel === "chat"
      ? isMapDark ? CHAT_PANEL_BG_DARK : CHAT_PANEL_BG_LIGHT
      : activePanel === "meeting"
      ? isMapDark ? MEETING_PANEL_BG_DARK : MEETING_PANEL_BG_LIGHT
      : isMapDark ? KALCERIANS_PANEL_BG_DARK : KALCERIANS_PANEL_BG_LIGHT;
  const limits = FAMILY_LIMITS[deviceFamily] || FAMILY_LIMITS.desktop;
  const blockedRef = useRef({ out: blockedUserIds, in: blockedByUserIds });
  blockedRef.current = { out: blockedUserIds, in: blockedByUserIds };

  const handleAvatarClick = useCallback((e, user) => {
    if (e?.stopPropagation) e.stopPropagation();
    const isBlocked = (blockedRef.current.out || []).some((id) => String(id).toLowerCase() === String(user.id).toLowerCase());
    const isBlockedByTarget = (blockedRef.current.in || []).some((id) => String(id).toLowerCase() === String(user.id).toLowerCase());
    if (isUserFriend(user) && !isBlocked && !isBlockedByTarget && Boolean(user?.isOnline && user?.allowLiveLocation !== false)) {
      focusUser(user);
    }
    setExpandedUserId((prev) => (prev === user.id ? null : user.id));
  }, [focusUser, isUserFriend]);

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
              events={events}
              avatarUrl={avatarUrl}
              isFriend={isUserFriend(activeChatUser)}
              isFavourite={favouriteUserIds.includes(String(activeChatUser.id))}
              isMuted={mutedUserIds.includes(String(activeChatUser.id))}
              isBlockedByTarget={(blockedByUserIds || []).some((id) => String(id).toLowerCase() === String(activeChatUser.id).toLowerCase())}
              isTargetBlocked={(blockedUserIds || []).some((id) => String(id).toLowerCase() === String(activeChatUser.id).toLowerCase())}
              initialCallState={incomingCallInitialState}
              onCallEnded={() => setIncomingCallInitialState(null)}
              onToggleFavourite={onToggleFavourite}
              onToggleMute={onToggleMute}
              onBlockUser={onBlockUser}
              onUnblockUser={onUnblockUser}
              onCloseChat={() => {
                setIncomingCallInitialState(null);
                handleClosePersonalChat();
              }}
              onOutgoingMessageUpdate={onOutgoingMessageUpdate}
            />
          </ChatErrorBoundary>
        )}
        {!activeChatUser && activeGroupEvent && (
          <EventGroupChatPanel
            key={`group-chat-panel-${activeGroupEvent.id}`}
            event={activeGroupEvent}
            currentUser={currentUser}
            isMapDark={isMapDark}
            avatarUrl={avatarUrl}
            onClose={() => setActiveGroupEventId(null)}
          />
        )}
      </AnimatePresence>

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
        transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.9 }}
        style={{ pointerEvents: isKalceriansHiddenForChat ? "none" : "auto" }}
        className={`fixed z-[1000] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col overflow-hidden font-sans select-none max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[46vh] max-[860px]:max-h-[385px] max-[860px]:min-h-[340px] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
          isMapDark
            ? "bg-[#0f1014] border border-[#2a2d37] text-[#f0f6fc] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.12),inset_-1px_-1.5px_2px_rgba(0,0,0,0.8),0_14px_36px_rgba(0,0,0,0.85)]"
            : "bg-[#ffffff] border border-[#c4cbd4] text-[#1f2328] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.95),inset_-1px_-1.5px_2px_rgba(160,174,192,0.35),0_12px_36px_rgba(0,0,0,0.12)]"
        }`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[104px] bottom-0 z-0 pointer-events-none select-none overflow-hidden"
          style={{
            backgroundColor: isMapDark ? "#0f1014" : "#ffffff",
            maskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 12px, black 26px)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.5) 12px, black 26px)",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("${getInstantMapBgUrl(panelBgAsset)}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: isMapDark ? 0.82 : 0.88,
            }}
          />
        </div>

        <KalceriansHeader
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          isMapDark={isMapDark}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activePanel={activePanel}
          activeScope={activeScope}
          setActiveScope={setActiveScope}
          hasFriendsNotif={hasFriendsNotif}
          hasGlobalNotif={hasGlobalNotif}
        />

        <KalceriansPanelBody
          activePanel={activePanel}
          pinnedMeetingEventIds={pinnedMeetingEventIds}
          groupSummaryMap={groupSummaryMap}
          onOpenGroupChat={(eid) => setActiveGroupEventId(eid)}
          searchQuery={searchQuery}
          listContainerRef={listContainerRef}
          isDataLoading={isDataLoading}
          isMapDark={isMapDark}
          activeScope={activeScope}
          scopedKalcerians={scopedKalcerians}
          events={events}
          currentUser={currentUser}
          blockedUserIds={blockedUserIds}
          blockedByUserIds={blockedByUserIds}
          confirmingAction={confirmingAction}
          setConfirmingAction={setConfirmingAction}
          expandedUserId={expandedUserId}
          setExpandedUserId={setExpandedUserId}
          requestedEventId={requestedEventId}
          eventRequestsMap={eventRequestsMap}
          acceptedCollabsMap={acceptedCollabsMap}
          eventGroupChatMap={eventGroupChatMap}
          personalChatMap={personalChatMap}
          recentlyMessagedUserIds={recentlyMessagedUserIds}
          favouriteUserIds={favouriteUserIds}
          mutedUserIds={mutedUserIds}
          isSelfOffline={isSelfOffline}
          handleOpenChatWithTransition={handleOpenChatWithTransition}
          limits={limits}
          deviceFamily={deviceFamily}
          localHoveredKalcerian={localHoveredKalcerian}
          setLocalHoveredKalcerian={setLocalHoveredKalcerian}
          hoveredEventIconId={hoveredEventIconId}
          setHoveredEventIconId={setHoveredEventIconId}
          hoveredChatIconId={hoveredChatIconId}
          setHoveredChatIconId={setHoveredChatIconId}
          focusUser={focusUser}
          setFocusedUserId={setFocusedUserId}
          scheduleTimeout={scheduleTimeout}
          handleAvatarClick={handleAvatarClick}
          onPromptCancelRequest={onPromptCancelRequest}
          onOpenRequests={onOpenRequests}
          onOpenItemOnMap={onOpenItemOnMap}
          setDrawerOpen={setDrawerOpen}
          onBlockUser={onBlockUser}
          onUnblockUser={onUnblockUser}
          getFriendshipStatus={getFriendshipStatus}
          isUserFriend={isUserFriend}
          onSendFriendRequest={handleSendFriendRequest}
          onCancelFriendRequest={handleCancelFriendRequest}
          onAcceptFriendRequest={handleAcceptFriendRequest}
          onRejectFriendRequest={handleRejectFriendRequest}
        />
      </motion.aside>
    </>
  );
});
