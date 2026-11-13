"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { useHasMounted } from "@/hooks/useHasMounted";
import { MapAuthGate } from "@/components/map/MapAuthGate";
import { INITIAL_MOCK_MINI_EVENTS, cleanEventDesc } from "@/components/map/mockMiniEvents";

import { StartupSequenceOverlay } from "@/components/map/StartupSequenceOverlay";
import { AtmosphericBackground } from "@/components/map/AtmosphericBackground";
import { useEventCollab } from "@/components/map/hooks/useEventCollab";
import { CollaboratorUploadOverlay } from "@/components/map/eventPopup/CollaboratorUploadOverlay";
import { OwnProfileDrawer } from "@/components/map/OwnProfileDrawer";
import { EditProfileModal } from "@/components/map/EditProfileModal";
const KalceriansPanel = dynamic(() => import("@/components/map/KalceriansPanel").then((m) => m.KalceriansPanel), { ssr: false });
const MapHeaderHud = dynamic(() => import("@/components/map/MapHeaderHud").then((m) => m.MapHeaderHud), { ssr: false });
const MapModals = dynamic(() => import("@/components/map/MapModals").then((m) => m.MapModals), { ssr: false });
import { hasUserSession } from "@/lib/session";
import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";
import { prewarmOsmTiles, hasValidCoordinates } from "@/lib/osmTilePrewarmer";
import { useMapBlockedUsers } from "@/components/map/mapPage/useMapBlockedUsers";
import {
  useMapChatAndNotifications,
  doesEventBelongToUser,
} from "@/components/map/hooks/useMapChatAndNotifications";
import { buildVisibleMapUsers, buildVisibleEvents } from "./mapPage/mapEntitiesProjection";
import { buildSidebarKalcerians } from "./mapPage/sidebarKalceriansProjection";
import { useMapStartupGate } from "./mapPage/useMapStartupGate";
import { useEagerGeolocation } from "./mapPage/useEagerGeolocation";
import { useMapSession } from "./mapPage/useMapSession";
import { useLiveLocationSync } from "./mapPage/useLiveLocationSync";
import { useOfflineBeacon } from "./mapPage/useOfflineBeacon";
import { useEventsRefreshListener } from "./mapPage/useEventsRefreshListener";
import { useMapDataPolling } from "./mapPage/useMapDataPolling";
import { useMapViewport } from "./mapPage/useMapViewport";
import { useMapBroadcastActions } from "./mapPage/useMapBroadcastActions";
import { useMapPresenceActions } from "./mapPage/useMapPresenceActions";
import { useMiniEventActions } from "./mapPage/useMiniEventActions";
import { useMapProfileActions } from "./mapPage/useMapProfileActions";
import { ackPersonalChatRead } from "@/lib/api";

import {
  EVENT_CARD_BG_DARK,
  EVENT_CARD_BG_LIGHT,
  preloadAllMapBackgrounds,
} from "@/lib/mapBgCache";

const SnapMap = dynamic(() => import("@/components/SnapMap"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#050a14] z-[10]" />,
});

// Helpers
const avatarUrl = (user) => resolvePersistentAvatarUrl(user);

export default function MapPage() {
  const scheduleTimeout = useTimeoutRegistry();
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [selfLiveCoords, setSelfLiveCoords] = useState(null);
  const [mapUsersData, setMapUsersData] = useState([]);
  const [kalcerians, setKalcerians] = useState([]);
  const [events, setEvents] = useState(() => INITIAL_MOCK_MINI_EVENTS.map(cleanEventDesc));
  const [presence, setPresence] = useState("online");
  const isSelfOffline = presence !== "online";
  const [, setNotice] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [eventForm, setEventForm] = useState({ title: "", description: "", category: "cafe", mediaUrl: "", mediaMetadataByUrl: {}, location: "", lat: null, lng: null });
  const [editingEventId, setEditingEventId] = useState(null);
  const {
    requestedEventId, setRequestedEventId,
    acceptedCollabsMap, setAcceptedCollabsMap,
    eventRequestsMap, setEventRequestsMap,
    cancelRequestTarget, setCancelRequestTarget,
    showCancelRequestModal, setShowCancelRequestModal,
    showRequestsModal, setShowRequestsModal,
    viewingRequestsEventId, setViewingRequestsEventId,
    collaboratorUploadState, setCollaboratorUploadState,
    syncCollabStateFromServer,
    handleRequestCollab, handlePromptCancelRequest,
    handleConfirmCancelRequest, handleOpenRequests,
    handleAcceptCollabRequest, handleCollaboratorUpload,
    handleDeclineCollabRequest,
  } = useEventCollab({ events, setEvents, currentUser, setNotice, avatarUrl });
  const [showOwnProfile, setShowOwnProfile] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isEditingBroadcast, setIsEditingBroadcast] = useState(false);
  const [showDeleteBroadcastConfirm, setShowDeleteBroadcastConfirm] = useState(false);
  const [isToolbarRetracting, setIsToolbarRetracting] = useState(false);

  const triggerToolbarRetractCycle = useCallback(() => {
    setIsToolbarRetracting(true);
    setTimeout(() => {
      setIsToolbarRetracting(false);
    }, 2800);
  }, []);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 860) {
      return false;
    }
    return true;
  });
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [isRecentering, setIsRecentering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMapEngineReady, setIsMapEngineReady] = useState(false);
  const {
    showStartup,
    setShowStartup,
    checkShouldSkipStartup,
    handleStartupComplete,
  } = useMapStartupGate();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const hasMounted = useHasMounted();
  const [notLoggedIn, setNotLoggedIn] = useState(() => (typeof window !== "undefined" ? !hasUserSession() : false));
  const [initialCoordsResolved, setInitialCoordsResolved] = useState(false);
  const hasInitialCenteredRef = useRef(false);
  const mapRef = useRef(null);

  // Hook Ledger Pos 5: M2 (Eager pre-calculation of GPS coordinates on mount)
  useEagerGeolocation({
    mapRef,
    setSelfLiveCoords,
    setInitialCoordsResolved,
    showStartup,
    hasInitialCenteredRef,
  });

  const [isStatusBusy, setIsStatusBusy] = useState(false);
  const [isMapDark, setIsMapDark] = useState(false);
  const [focusedUserId, setFocusedUserId] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleQuitConfirm = () => {
    setIsExiting(true);
    setShowQuitModal(false);
    
    // Set landing scroll target for session anchoring
    sessionStorage.setItem("landingScrollTarget", "section-map");
    // Mark landing intro as played so it bypasses the preloader and lands directly on the anchor
    sessionStorage.setItem("introPlayed", "true");
    try {
      sessionStorage.removeItem("kalceria_map_intro_seen");
    } catch {}
    
    scheduleTimeout(() => {
      window.location.href = "/?anchor=section-map";
    }, 1500); // 1.5s matching the white flash transition
  };

  // Hook Ledger Pos 6: M3 (Eagerly preload all WebP backgrounds)
  useEffect(() => {
    preloadAllMapBackgrounds();
  }, []);

  // Hook Ledger Pos 7: M4 (Login gate + user profile fetching)
  useMapSession({
    setNotLoggedIn,
    setCurrentUser,
    setPresence,
    setStatusText,
  });

  // Hook Ledger Pos 8: M5 (Sync live coordinates with backend when online)
  useLiveLocationSync({
    currentUser,
    presence,
    selfLiveCoords,
    showStartup,
    mapRef,
    setSelfLiveCoords,
    hasInitialCenteredRef,
  });

  // Hook Ledger Pos 9: M6 (Offline beacon on pagehide / beforeunload / unmount)
  useOfflineBeacon({ currentUser });

  // Hook Ledger Pos 10: M7 (Window event listener for refresh-events-request)
  useEventsRefreshListener({ setEvents, syncCollabStateFromServer });

  // Hook Ledger Pos 11: M8 (Poll map users + kalcerians every 10s + video prewarming)
  useMapDataPolling({
    notLoggedIn,
    currentUser,
    selfLiveCoords,
    syncCollabStateFromServer,
    setMapUsersData,
    setKalcerians,
    setEvents,
    setIsDataLoading,
  });

  // Hook Ledger Pos 12: M9, M10 (recenterMap, handleMapReady, initialCenter, viewport sync)
  const {
    recenterMap,
    handleMapReady,
    initialCenter,
  } = useMapViewport({
    mapRef,
    mapUsersData,
    currentUser,
    selfLiveCoords,
    showStartup,
    setIsRecentering,
    setIsMapEngineReady,
    hasInitialCenteredRef,
  });

  // Blocked users state (modularized package hook: synced with localStorage + backend API)
  const { blockedUserIds, blockedByUserIds, handleBlockUser, handleUnblockUser } = useMapBlockedUsers();

  // derived: ONLY online & live-location-enabled users with real finite coordinates render on the map
  const visibleMapUsers = useMemo(() => {
    return buildVisibleMapUsers(
      { mapUsersData, kalcerians, currentUser, selfLiveCoords, presence, blockedUserIds, blockedByUserIds },
      { hasValidCoordinates, resolvePersistentAvatarUrl }
    );
  }, [mapUsersData, kalcerians, currentUser, selfLiveCoords, presence, blockedUserIds, blockedByUserIds]);

  const visibleEvents = useMemo(() => {
    return buildVisibleEvents(events, blockedUserIds, blockedByUserIds);
  }, [events, blockedUserIds, blockedByUserIds]);

  // Handlers
  const focusUser = useCallback((user) => {
    if (!mapRef.current || !user) return;
    const isEventTarget = "title" in user;
    if (!isEventTarget && (!user.isOnline || user.allowLiveLocation === false)) {
      return;
    }
    let target = user;
    // if coming from sidebar kalcerians, lat/lng might be missing. Look up in mapUsersData (online only)
    if (!hasValidCoordinates(target.lat, target.lng) && !isEventTarget) {
      const liveMatch = mapUsersData.find(
        (u) => String(u.id) === String(user.id) && u.isOnline !== false && u.allowLiveLocation !== false
      );
      if (liveMatch) target = liveMatch;
    }
    if (!hasValidCoordinates(target.lat, target.lng)) return;
    const tLat = Number(target.lat);
    const tLng = Number(target.lng);
    prewarmOsmTiles(tLat, tLng, 16);
    mapRef.current.flyTo([tLat, tLng], 16, {
      animate: true,
      duration: 0.48,
      easeLinearity: 0.25,
    });
  }, [mapUsersData]);

  const handleOpenItemOnMap = useCallback((item, type = "user") => {
    if (!item) return;
    if (type === "user" && (!item.isOnline || item.allowLiveLocation === false)) return;
    if (hasValidCoordinates(item.lat, item.lng)) {
      prewarmOsmTiles(Number(item.lat), Number(item.lng), 16);
    }
    setFocusTarget({
      id: item.id || item.name || item.nickname,
      type,
      openPopup: true,
      timestamp: Date.now(),
    });
  }, []);

  const {
    personalChatMap,
    recentlyMessagedUserIds,
    markPersonalChatRead,
    recordOutgoingPersonalMessage,
    favouriteUserIds,
    mutedUserIds,
    toggleFavouriteUser,
    toggleMuteUser,
    eventGroupChatMap,
    topDynamicEvent,
    hasTopDynamicEventNotif,
    handleTopDynamicEventClick,
  } = useMapChatAndNotifications({
    events: visibleEvents,
    kalcerians,
    currentUser,
    blockedUserIds,
    eventRequestsMap,
    setEventRequestsMap,
    acceptedCollabsMap,
    requestedEventId,
    focusUser,
    handleOpenItemOnMap,
    handleOpenRequests,
    isSelfOffline,
  });

  const handlePersonalChatOpen = useCallback((user) => {
    if (!user || isSelfOffline) return;
    markPersonalChatRead(user.id);
    ackPersonalChatRead(user.id, { upToTs: Date.now() }).catch(() => {});
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kalceria:open-personal-chat", {
          detail: { userId: user.id, user },
        })
      );
    }
  }, [markPersonalChatRead, isSelfOffline]);

  // derived: kalcerians for the sidebar (only real registered users, strictly omitting dummy mock profiles)
  const sidebarKalcerians = useMemo(() => {
    return buildSidebarKalcerians(
      { kalcerians, events, searchQuery, personalChatMap, favouriteUserIds, currentUser },
      { doesEventBelongToUser }
    );
  }, [kalcerians, events, searchQuery, personalChatMap, favouriteUserIds, currentUser, presence]);

  const activeOwnEvent = events.find(
    (e) => e.id === "own" || (currentUser?.id && String(e.creator?.id) === String(currentUser?.id))
  );

  // Hook Ledger Pos 16: M11 (Broadcast handlers and remote edit listener)
  const {
    hasActiveOwnBroadcast,
    handleGoToOwnEvent,
    handleTopDynamicBroadcastClick,
    saveBroadcast,
    handleOpenEditBroadcast,
    handleConfirmDeleteBroadcast,
  } = useMapBroadcastActions({
    currentUser,
    mapUsersData,
    statusText,
    isSelfOffline,
    activeOwnEvent,
    setStatusText,
    setIsEditingBroadcast,
    setShowStatusModal,
    setShowDeleteBroadcastConfirm,
    setCurrentUser,
    setMapUsersData,
    setNotice,
    setBusy,
    setSelfLiveCoords,
    triggerToolbarRetractCycle,
    handleOpenItemOnMap,
  });

  // Hook Ledger Pos 17: Presence toggle (non-memo)
  const { handlePresenceChange } = useMapPresenceActions({
    setIsStatusBusy,
    setPresence,
    setMenuOpen,
    setActionMenuOpen,
    setShowStatusModal,
    setShowEventModal,
    setShowRequestsModal,
    setShowCancelRequestModal,
    setSelfLiveCoords,
    setMapUsersData,
    setKalcerians,
    setCurrentUser,
    setNotice,
  });

  // Hook Ledger Pos 18: Mini event actions (CRUD + guarded collab actions)
  const {
    handleOpenEditEvent,
    saveMiniEvent,
    handleOpenEventModal,
    guardedRequestCollab,
    guardedPromptCancelRequest,
    guardedOpenRequests,
    guardedCollaboratorUpload,
    deleteMiniEvent,
  } = useMiniEventActions({
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
  });

  // Hook Ledger Pos 19: Profile actions
  const {
    handleSaveProfile,
    handleRequestChangePassword,
    handleConfirmDeleteAccount,
  } = useMapProfileActions({
    currentUser,
    setCurrentUser,
    setKalcerians,
    setMapUsersData,
    setEvents,
    setNotice,
    setShowEditProfileModal,
    setShowOwnProfile,
    setShowDeleteAccountModal,
  });

  // login gate
  if (notLoggedIn) {
    return <MapAuthGate />;
  }

  return (
    <main 
      className={`relative h-screen max-h-screen w-full bg-[#0a0e27] overflow-hidden text-white font-sans selection:bg-[#ffd60a] selection:text-black transition-colors ${isMapDark ? "dark-theme" : "light-theme"}`}
      style={
        isExiting
          ? {
              filter: "blur(30px)",
              transition: "filter 1.2s ease-in-out",
            }
          : undefined
      }
    >
      {/* Lightweight active-theme Event Card texture pin (rendered only after startup sequence completes) */}
      {!showStartup && (
        <div
          aria-hidden="true"
          className="fixed bottom-0 left-0 w-1 h-1 overflow-hidden opacity-[0.002] pointer-events-none select-none z-0"
        >
          <div
            style={{
              width: 1,
              height: 1,
              backgroundImage: isMapDark
                ? `var(--kalceria-event-bg-dark, url("${EVENT_CARD_BG_DARK}"))`
                : `var(--kalceria-event-bg-light, url("${EVENT_CARD_BG_LIGHT}"))`,
            }}
          />
        </div>
      )}

      {/* 🌌 Atmospheric Tactical Background (Behind Map) */}
      <AtmosphericBackground
        showStartup={showStartup}
      />

      {/* SnapMap Component (Semi-Transparent for Glass Effect) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showStartup || !hasMounted ? 0 : 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed inset-0 z-[10] w-full h-full"
        style={{
          pointerEvents: showStartup || !hasMounted ? "none" : "auto",
        }}
      >
        <SnapMap
          users={visibleMapUsers} events={visibleEvents} onMapReady={handleMapReady}
          focusUserId={focusedUserId} focusTarget={focusTarget} isMapDark={isMapDark}
          initialCenter={initialCenter}
          currentUser={currentUser} onEditEvent={handleOpenEditEvent} onEditBroadcast={handleOpenEditBroadcast} requestedEventId={requestedEventId}
          eventRequestsMap={eventRequestsMap} acceptedCollabsMap={acceptedCollabsMap}
          eventGroupChatMap={eventGroupChatMap}
          onRequestCollab={guardedRequestCollab}
          onPromptCancelRequest={guardedPromptCancelRequest} onOpenRequests={guardedOpenRequests}
          onCollaboratorUpload={guardedCollaboratorUpload}
          isSelfOffline={isSelfOffline}
        />
      </motion.div>



      {/* 📡 Status Syncing Progress Bar */}
      <AnimatePresence>
        {isStatusBusy && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "circOut" }}
            className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 z-[2000] origin-left"
            style={{ 
              boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
              backgroundSize: "200% 100%",
              animation: "gradientMove 2s linear infinite"
            }}
          />
        )}
      </AnimatePresence>


      {!showStartup && hasMounted && (
        <>
          <MapHeaderHud
            isMapDark={isMapDark} setIsMapDark={setIsMapDark}
            actionMenuOpen={actionMenuOpen} setActionMenuOpen={setActionMenuOpen} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
            setShowQuitModal={setShowQuitModal} setShowStatusModal={setShowStatusModal} setShowEventModal={handleOpenEventModal}
            isStatusBusy={isStatusBusy} currentUser={currentUser} avatarUrl={avatarUrl} presence={presence}
            handlePresenceChange={handlePresenceChange} recenterMap={recenterMap} isRecentering={isRecentering}
            onOpenOwnProfile={() => setShowOwnProfile((prev) => !prev)}
            topDynamicEvent={topDynamicEvent}
            hasTopDynamicEventNotif={hasTopDynamicEventNotif}
            onTopDynamicEventClick={handleTopDynamicEventClick}
            hasActiveOwnEvent={Boolean(activeOwnEvent)}
            onGoToOwnEvent={handleGoToOwnEvent}
            hasActiveOwnBroadcast={hasActiveOwnBroadcast}
            onTopDynamicBroadcastClick={handleTopDynamicBroadcastClick}
            isToolbarRetracting={isToolbarRetracting}
          />

          <input
            type="checkbox"
            id="panel-toggle"
            className="hidden peer"
            checked={drawerOpen}
            onChange={(e) => setDrawerOpen(e.target.checked)}
          />

          <KalceriansPanel
            scheduleTimeout={scheduleTimeout} mapUsersData={mapUsersData} kalcerians={kalcerians} events={events}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen}
            isDataLoading={isDataLoading}
            isMapDark={isMapDark} setFocusedUserId={setFocusedUserId}
            sidebarKalcerians={sidebarKalcerians} focusUser={focusUser} blockedUserIds={blockedUserIds} blockedByUserIds={blockedByUserIds}
            onBlockUser={handleBlockUser} onUnblockUser={handleUnblockUser} onOpenItemOnMap={handleOpenItemOnMap}
            currentUser={currentUser} requestedEventId={requestedEventId} eventRequestsMap={eventRequestsMap}
            acceptedCollabsMap={acceptedCollabsMap} eventGroupChatMap={eventGroupChatMap}
            personalChatMap={personalChatMap} recentlyMessagedUserIds={recentlyMessagedUserIds}
            favouriteUserIds={favouriteUserIds} mutedUserIds={mutedUserIds}
            onToggleFavourite={toggleFavouriteUser} onToggleMute={toggleMuteUser}
            onOutgoingMessageUpdate={recordOutgoingPersonalMessage}
            onPersonalChatOpen={handlePersonalChatOpen}
            onPromptCancelRequest={guardedPromptCancelRequest} onOpenRequests={guardedOpenRequests}
            isSelfOffline={isSelfOffline}
          />

          <OwnProfileDrawer
            isOpen={showOwnProfile} onClose={() => setShowOwnProfile(false)}
            currentUser={currentUser} isMapDark={isMapDark}
            onEditProfile={() => { setShowOwnProfile(false); setShowEditProfileModal(true); }}
          />

          <EditProfileModal
            show={showEditProfileModal} onClose={() => setShowEditProfileModal(false)}
            isMapDark={isMapDark} currentUser={currentUser} onSaveProfile={handleSaveProfile}
            onRequestChangePassword={handleRequestChangePassword}
            onRequestDeleteAccount={() => { setShowEditProfileModal(false); setShowDeleteAccountModal(true); }}
          />

          <CollaboratorUploadOverlay
            uploadState={collaboratorUploadState} onDismiss={() => setCollaboratorUploadState(null)}
          />
        </>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.3); border-radius: 4px; }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes floatUp { 0% { transform: translateY(10px); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(-115vh); opacity: 0; } }
      `}</style>

      {/* Startup Sequence Overlay :: FORZA HORIZON STYLE */}
      <StartupSequenceOverlay
        showStartup={hasMounted && showStartup && !checkShouldSkipStartup()}
        authReady={Boolean(currentUser)}
        mapEngineReady={isMapEngineReady}
        isReady={!isDataLoading && hasMounted && !notLoggedIn && (initialCoordsResolved || Boolean(currentUser))}
        onComplete={handleStartupComplete}
      />

      {/* Map Modals Component (Status, Event, Requests, Delete, Quit Modals) */}
      <MapModals
        showStatusModal={showStatusModal} setShowStatusModal={setShowStatusModal}
        isMapDark={isMapDark} saveBroadcast={saveBroadcast} statusText={statusText} setStatusText={setStatusText} busy={busy}
        isEditingBroadcast={isEditingBroadcast} setIsEditingBroadcast={setIsEditingBroadcast}
        showDeleteBroadcastConfirm={showDeleteBroadcastConfirm} setShowDeleteBroadcastConfirm={setShowDeleteBroadcastConfirm}
        handleConfirmDeleteBroadcast={handleConfirmDeleteBroadcast}
        showEventModal={showEventModal} setShowEventModal={handleOpenEventModal}
        saveMiniEvent={saveMiniEvent} eventForm={eventForm} setEventForm={setEventForm}
        activeOwnEvent={activeOwnEvent} deleteMiniEvent={deleteMiniEvent} editingEventId={editingEventId}
        showCancelRequestModal={showCancelRequestModal} setShowCancelRequestModal={setShowCancelRequestModal}
        cancelRequestTarget={cancelRequestTarget} handleConfirmCancelRequest={handleConfirmCancelRequest}
        showRequestsModal={showRequestsModal} setShowRequestsModal={setShowRequestsModal}
        viewingRequestsEvent={events.find((e) => String(e.id) === String(viewingRequestsEventId))}
        currentRequestsList={viewingRequestsEventId ? (eventRequestsMap[viewingRequestsEventId] || []) : []}
        onAcceptCollabRequest={handleAcceptCollabRequest} onDeclineCollabRequest={handleDeclineCollabRequest}
        showDeleteAccountModal={showDeleteAccountModal} setShowDeleteAccountModal={setShowDeleteAccountModal}
        handleConfirmDeleteAccount={handleConfirmDeleteAccount}
        isExiting={isExiting} showQuitModal={showQuitModal} setShowQuitModal={setShowQuitModal} handleQuitConfirm={handleQuitConfirm}
      />

      <style jsx global>{`
        /* Dynamic HUD floating animation */
        @keyframes floatUp {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </main>
  );
}
