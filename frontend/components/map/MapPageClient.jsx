"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { useHasMounted } from "@/hooks/useHasMounted";
import { MapAuthGate } from "@/components/map/MapAuthGate";
import { INITIAL_MOCK_MINI_EVENTS, INITIAL_ACCEPTED_COLLABS, INITIAL_EVENT_REQUESTS, cleanEventDesc, mergeEvents } from "@/components/map/mockMiniEvents";
import { createRuntimeSeededRandom, createSeededRandom } from "@/lib/seededRandom";

import { StartupSequenceOverlay } from "@/components/map/StartupSequenceOverlay";
import { AtmosphericBackground } from "@/components/map/AtmosphericBackground";
import { useEventCollab } from "@/components/map/hooks/useEventCollab";
import { OwnProfileDrawer } from "@/components/map/OwnProfileDrawer";
import { EditProfileModal } from "@/components/map/EditProfileModal";
const KalceriansPanel = dynamic(() => import("@/components/map/KalceriansPanel").then((m) => m.KalceriansPanel), { ssr: false });
const MapHeaderHud = dynamic(() => import("@/components/map/MapHeaderHud").then((m) => m.MapHeaderHud), { ssr: false });
const MapModals = dynamic(() => import("@/components/map/MapModals").then((m) => m.MapModals), { ssr: false });
import { hasUserSession, clearSession } from "@/lib/session";
import {
  resolvePersistentAvatarUrl,
  resolvePersistentCover,
  persistProfileIdentityCache,
} from "@/lib/profileIdentity";
import { toSmartTitleCase } from "@/lib/titleCase";
import { splitMediaUrlListClient } from "@/lib/urlSecurity";
import { prewarmOsmTiles, hasValidCoordinates } from "@/lib/osmTilePrewarmer";
import { getInstantInitialCenter } from "@/components/snapmap/snapMapHelpers";
import { useMapBlockedUsers } from "@/components/map/mapPage/useMapBlockedUsers";
import {
  useMapChatAndNotifications,
  doesEventBelongToUser,
} from "@/components/map/hooks/useMapChatAndNotifications";
import api, {
  fetchMe, fetchMapUsers, fetchKalcerians, fetchMiniEvents, fetchMiniEventsWithMeta,
  postBroadcast, putBroadcast, delBroadcast, postLocation, patchVisibility,
  postMiniEvent, putMiniEvent, delMiniEvent,
} from "@/lib/api";

import {
  EVENT_CARD_BG_DARK,
  EVENT_CARD_BG_LIGHT,
  preloadAllMapBackgrounds,
} from "@/lib/mapBgCache";
import { prewarmVideoBatch, sortItemsByProximity } from "@/lib/videoPrewarmer";

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
  const checkShouldSkipStartup = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      // Fade in gracefully directly to map page is ONLY for change password via map page
      const params = new URLSearchParams(window.location.search);
      const isPasswordResetReturn =
        (params.get("from") === "password_reset" || params.get("skip_intro") === "true") &&
        (sessionStorage.getItem("kalceria_password_reset_from_map") === "true" ||
         localStorage.getItem("kalceria_password_reset_from_map") === "true");

      return Boolean(isPasswordResetReturn);
    } catch {
      return false;
    }
  }, []);

  const [showStartup, setShowStartup] = useState(() => {
    if (typeof window === "undefined") return false;
    return !checkShouldSkipStartup();
  });
  const handleStartupComplete = useCallback(() => {
    setShowStartup(false);
  }, []);

  // Consume password-reset-from-map flag immediately on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (checkShouldSkipStartup()) {
        setShowStartup(false);
        const params = new URLSearchParams(window.location.search);
        if (
          (params.get("skip_intro") === "true" || params.get("from") === "password_reset") &&
          window.history.replaceState
        ) {
          params.delete("skip_intro");
          params.delete("from");
          const cleanSearch = params.toString();
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "")
          );
        }
      } else {
        setShowStartup(true);
      }
      // Immediately clear the one-time bypass and any lingering legacy skip flags
      sessionStorage.removeItem("kalceria_password_reset_from_map");
      localStorage.removeItem("kalceria_password_reset_from_map");
      sessionStorage.removeItem("kalceria_skip_map_intro");
      localStorage.removeItem("kalceria_skip_map_intro");
      localStorage.removeItem("kalceria_skip_map_intro_until");
      localStorage.removeItem("kalceria_auth_return");
    } catch {}
  }, [checkShouldSkipStartup]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const hasMounted = useHasMounted();
  const [notLoggedIn, setNotLoggedIn] = useState(() => (typeof window !== "undefined" ? !hasUserSession() : false));
  const hasInitialCenteredRef = useRef(false);
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
    
    scheduleTimeout(() => {
      window.location.href = "/?anchor=section-map";
    }, 1500); // 1.5s matching the white flash transition
  };

  const mapParticles = useMemo(() => {
    const random = createSeededRandom("map-atmosphere-particles-v1");
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: `${random() * 100}%`,
      size: `${random() * 3.5 + 2}px`, // 2px to 5.5px
      duration: random() * 7 + 6, // 6s to 13s (slower, more elegant rise)
      delay: random() * 8, // 0s to 8s
      opacity: random() * 0.35 + 0.25, // 0.25 to 0.6 (more sparse and subtle)
    }));
  }, []);

  // Eagerly preload & decode all 9 BG_IMPROVE_FOR_MAP WebP backgrounds immediately on map entry
  useEffect(() => {
    preloadAllMapBackgrounds();
  }, []);

  // Login gate + fetch user profile
  useEffect(() => {
    if (!hasUserSession()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- This reads the existing browser session gate after hydration.
      setNotLoggedIn(true);
      return;
    }
    setNotLoggedIn(false);
    fetchMe()
      .then((user) => {
        const enrichedUser = {
          ...user,
          profilePicture: resolvePersistentAvatarUrl(user),
          coverImage: resolvePersistentCover(user),
          coverUrl: resolvePersistentCover(user),
        };
        setCurrentUser(enrichedUser);
        setPresence(user.allowLiveLocation ? "online" : "invisible");
        if (user.broadcast?.message) setStatusText(user.broadcast.message);
        if (hasValidCoordinates(user.domicileLat, user.domicileLng)) {
          try {
            if (!localStorage.getItem("kalceria_last_known_coords")) {
              localStorage.setItem(
                "kalceria_last_known_coords",
                JSON.stringify({
                  lat: Number(user.domicileLat),
                  lng: Number(user.domicileLng),
                })
              );
            }
          } catch (_) {}
          prewarmOsmTiles(Number(user.domicileLat), Number(user.domicileLng), 15);
        }
      })
      .catch(() => {
        clearSession();
        setNotLoggedIn(true);
      });
  }, []);

  // Sync live coordinates with backend ONLY when online (every 5s keepalive to refresh 15s Redis TTL)
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser?.id) return;
    if (presence !== "online") return;

    let isSubscribed = true;

    const performSync = () => {
      if (!isSubscribed) return;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isSubscribed) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setSelfLiveCoords({ lat, lng });
            try {
              localStorage.setItem("kalceria_last_known_coords", JSON.stringify({ lat, lng }));
            } catch (_) {}
            if (showStartup && mapRef.current) {
              mapRef.current.setView([lat, lng], 15, { animate: false });
            }
            prewarmOsmTiles(lat, lng, 15);
            postLocation(lat, lng).catch(() => {});
          },
          (err) => {
            if (!isSubscribed) return;
            // Fallback to active coordinates if GPS refresh has momentary delay
            const fbLat = selfLiveCoords?.lat || Number(currentUser.domicileLat);
            const fbLng = selfLiveCoords?.lng || Number(currentUser.domicileLng);
            if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
              postLocation(fbLat, fbLng).catch(() => {});
            }
          },
          { timeout: 4000, enableHighAccuracy: false, maximumAge: 10000 }
        );
      } else {
        const fbLat = selfLiveCoords?.lat || Number(currentUser.domicileLat);
        const fbLng = selfLiveCoords?.lng || Number(currentUser.domicileLng);
        if (Number.isFinite(fbLat) && Number.isFinite(fbLng)) {
          postLocation(fbLat, fbLng).catch(() => {});
        }
      }
    };

    performSync();
    const keepaliveId = setInterval(performSync, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(keepaliveId);
    };
  }, [currentUser?.id, presence, selfLiveCoords?.lat, selfLiveCoords?.lng, currentUser?.domicileLat, currentUser?.domicileLng]);

  // Immediately mark offline in Redis when leaving map, closing tab, or shutting down laptop
  useEffect(() => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;

    const markOffline = () => {
      try {
        const payload = JSON.stringify({ userId });
        // 1. SendBeacon with Blob application/json
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/location/offline", blob);
        }
        // 2. Fetch with keepalive (standard across desktop Chrome/Edge/Firefox)
        if (typeof fetch === "function") {
          fetch("/api/location/offline", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
            credentials: "include",
          }).catch(() => {});
        }
      } catch {}
    };

    window.addEventListener("pagehide", markOffline);
    window.addEventListener("beforeunload", markOffline);

    return () => {
      window.removeEventListener("pagehide", markOffline);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [currentUser?.id]);

  // fetch map users + kalcerians (poll every 10s)
  useEffect(() => {
    if (notLoggedIn || !currentUser) return;
    let alive = true;
    const load = async () => {
      try {
        const [users, kals, eventMeta] = await Promise.all([
          fetchMapUsers(),
          fetchKalcerians(),
          fetchMiniEventsWithMeta(),
        ]);
        if (!alive) return;
        const activeEvents = eventMeta?.events || [];
        const mergedEvents = mergeEvents(activeEvents);
        setMapUsersData(users || []);
        setKalcerians(kals || []);
        setEvents(mergedEvents);
        syncCollabStateFromServer(mergedEvents, eventMeta?.requestedEventId ?? null);
        setIsDataLoading(false);

        // Pre-warm event clips and profile video covers prioritized by geographic proximity
        const centerCoords =
          selfLiveCoords?.lat && selfLiveCoords?.lng
            ? selfLiveCoords
            : currentUser?.domicileLat && currentUser?.domicileLng
            ? { lat: Number(currentUser.domicileLat), lng: Number(currentUser.domicileLng) }
            : null;

        const videoUrls = [];
        if (currentUser?.coverImage && currentUser?.coverType === "video") {
          videoUrls.push(currentUser.coverImage);
        }

        const sortedEvents = sortItemsByProximity(mergedEvents, centerCoords);
        sortedEvents.forEach((ev) => {
          if (ev.mediaUrl) {
            splitMediaUrlListClient(ev.mediaUrl).forEach((u) => videoUrls.push(u));
          }
        });

        const sortedKals = sortItemsByProximity(kals || [], centerCoords);
        sortedKals.forEach((u) => {
          if (u.coverImage && (u.coverType === "video" || u.coverImage.includes(".mp4") || u.coverImage.includes("/api/blob/raw"))) {
            videoUrls.push(u.coverImage);
          }
        });

        prewarmVideoBatch(videoUrls);
      } catch (err) {
        console.error("[Map] fetch error", err);
        if (alive) setIsDataLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [notLoggedIn, currentUser, syncCollabStateFromServer]);

  const recenterMap = useCallback(() => {
    if (!mapRef.current) return;
    setIsRecentering(true);
    const me = mapUsersData.find((u) => u.id === currentUser?.id);
    if (me && me.isOnline !== false && hasValidCoordinates(me.lat, me.lng)) {
      const mLat = Number(me.lat);
      const mLng = Number(me.lng);
      prewarmOsmTiles(mLat, mLng, 15);
      mapRef.current.flyTo([mLat, mLng], 15, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    } else if (selfLiveCoords && hasValidCoordinates(selfLiveCoords.lat, selfLiveCoords.lng)) {
      prewarmOsmTiles(selfLiveCoords.lat, selfLiveCoords.lng, 15);
      mapRef.current.flyTo([selfLiveCoords.lat, selfLiveCoords.lng], 15, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    } else if (hasValidCoordinates(currentUser?.domicileLat, currentUser?.domicileLng)) {
      const dLat = Number(currentUser.domicileLat);
      const dLng = Number(currentUser.domicileLng);
      prewarmOsmTiles(dLat, dLng, 15);
      mapRef.current.flyTo([dLat, dLng], 15, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    } else {
      prewarmOsmTiles(-6.2735, 106.715, 14);
      mapRef.current.flyTo([-6.2735, 106.7150], 14, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25,
      });
    }
  }, [mapUsersData, currentUser, selfLiveCoords]);

  const mapRef = useRef(null);

  // Map Event Tracking
  const handleMapReady = useCallback((mapInstance) => {
    // eslint-disable-next-line react-hooks/immutability -- Leaflet calls this external ref callback; the live map must be available synchronously.
    mapRef.current = mapInstance;
    setIsMapEngineReady(true);

    // Invalidate size immediately so tiles compute & load in background
    mapInstance.invalidateSize();

    mapInstance.on("moveend", () => {
      setIsRecentering(false);
    });
  }, []);

  // Guarantee tile loading & full viewport invalidation when startup sequence completes
  useEffect(() => {
    if (!showStartup && mapRef.current) {
      mapRef.current.invalidateSize();
      const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 150);
      const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 600);
      const t3 = setTimeout(() => mapRef.current?.invalidateSize(), 1200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [showStartup]);

  // Calculate instant initial map coordinates and set view silently behind startup sequence
  const initialCenter = useMemo(
    () => getInstantInitialCenter(currentUser),
    [currentUser]
  );

  useEffect(() => {
    if (showStartup && mapRef.current) {
      const coords =
        selfLiveCoords ||
        (hasValidCoordinates(currentUser?.domicileLat, currentUser?.domicileLng)
          ? { lat: Number(currentUser.domicileLat), lng: Number(currentUser.domicileLng) }
          : null);
      if (coords && hasValidCoordinates(coords.lat, coords.lng)) {
        mapRef.current.setView([coords.lat, coords.lng], 15, { animate: false });
      }
    }
  }, [showStartup, selfLiveCoords, currentUser]);

  // Blocked users state (modularized package hook: synced with localStorage + backend API)
  const { blockedUserIds, handleBlockUser, handleUnblockUser } = useMapBlockedUsers();

  // derived: ONLY online & live-location-enabled users with real finite coordinates render on the map (zero mock coordinates, zero offline avatars)
  const visibleMapUsers = useMemo(() => {
    const mergedMap = new Map();

    (mapUsersData || []).forEach((u) => {
      if (!u?.id || blockedUserIds.includes(u.id)) return;
      if (u.isOnline === false || u.allowLiveLocation === false) return;
      if (!hasValidCoordinates(u.lat, u.lng)) return;
      const lat = Number(u.lat);
      const lng = Number(u.lng);
      mergedMap.set(String(u.id), {
        ...u,
        displayName: u.displayName || u.name || u.nickname || "Kalcerian",
        nickname: u.nickname || u.name || "Kalcerian",
        profilePicture: resolvePersistentAvatarUrl(u),
        isOnline: true,
        allowLiveLocation: true,
        lat,
        lng,
      });
    });

    (kalcerians || []).forEach((u) => {
      if (!u?.id || blockedUserIds.includes(u.id)) return;
      const key = String(u.id);
      const existing = mergedMap.get(key);
      // Strictly skip offline users from appearing on the map
      if (!u.isOnline || u.allowLiveLocation === false) {
        mergedMap.delete(key);
        return;
      }
      const rawLat = existing ? existing.lat : u.lat;
      const rawLng = existing ? existing.lng : u.lng;
      if (!hasValidCoordinates(rawLat, rawLng)) return;
      const lat = Number(rawLat);
      const lng = Number(rawLng);
      mergedMap.set(key, {
        ...(existing || {}),
        ...u,
        displayName: u.displayName || existing?.displayName || u.name || u.nickname || "Kalcerian",
        nickname: u.nickname || existing?.nickname || u.name || "Kalcerian",
        profilePicture: resolvePersistentAvatarUrl(u),
        isOnline: true,
        allowLiveLocation: true,
        lat,
        lng,
      });
    });

    if (currentUser?.id) {
      const selfKey = String(currentUser.id);
      if (presence === "online") {
        const existingSelf = mergedMap.get(selfKey);
        let selfCoords = null;
        if (existingSelf && hasValidCoordinates(existingSelf.lat, existingSelf.lng)) {
          selfCoords = { lat: existingSelf.lat, lng: existingSelf.lng };
        } else if (selfLiveCoords && hasValidCoordinates(selfLiveCoords.lat, selfLiveCoords.lng)) {
          selfCoords = { lat: selfLiveCoords.lat, lng: selfLiveCoords.lng };
        } else if (hasValidCoordinates(currentUser.domicileLat, currentUser.domicileLng)) {
          selfCoords = {
            lat: Number(currentUser.domicileLat),
            lng: Number(currentUser.domicileLng),
          };
        }

        if (selfCoords) {
          mergedMap.set(selfKey, {
            ...(existingSelf || {}),
            ...currentUser,
            displayName: currentUser.displayName || currentUser.name || currentUser.nickname || "Kalcerian",
            nickname: currentUser.nickname || currentUser.name || "Kalcerian",
            profilePicture: resolvePersistentAvatarUrl(currentUser),
            isOnline: true,
            allowLiveLocation: true,
            lat: selfCoords.lat,
            lng: selfCoords.lng,
          });
        } else {
          mergedMap.delete(selfKey);
        }
      } else {
        mergedMap.delete(selfKey);
      }
    }

    return Array.from(mergedMap.values());
  }, [mapUsersData, kalcerians, currentUser, selfLiveCoords, presence, blockedUserIds]);

  const visibleEvents = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((e) => !blockedUserIds.includes(e.creator?.id))
      .filter((e) => !e.expiresAt || new Date(e.expiresAt).getTime() > now);
  }, [events, blockedUserIds]);

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
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kalceria:open-personal-chat", {
          detail: { userId: user.id, user },
        })
      );
    }
  }, [markPersonalChatRead, isSelfOffline]);

  // derived: kalcerians for the sidebar (only real registered users, strictly omitting dummy mock profiles and admin test credentials)
  const sidebarKalcerians = useMemo(() => {
    const map = new Map();

    const isExcludedUser = (u) => {
      if (!u) return true;
      const idStr = String(u.id || "");
      if (idStr.startsWith("mock_")) return true;
      // Filter out self so current logged-in user never appears in "Find other Kalcerians" scroll bar
      if (currentUser?.id && idStr === String(currentUser.id)) return true;
      const email = String(u.email || "").toLowerCase();
      if (currentUser?.email && email && email === String(currentUser.email).toLowerCase()) return true;
      if (email.startsWith("admin") || email.includes("laptop_tester") || email.endsWith("@kalceria.id")) return true;
      if (u.role === "ADMIN") return true;
      const name = String(u.name || "").trim();
      const nick = String(u.nickname || "").trim();
      if (["Otniel", "Josh"].includes(name) || ["Otniel", "Josh"].includes(nick)) return true;
      if (name.toLowerCase() === "otniel" || name.toLowerCase() === "josh") return true;
      if (name.toLowerCase() === "reinathan" && (!nick || nick.toLowerCase() === "reinathan")) return true;
      return false;
    };

    // 1. Add registered kalcerians (real verified users from database)
    (kalcerians || []).forEach((u) => {
      if (!u.id || isExcludedUser(u)) return;
      map.set(String(u.id), {
        id: u.id,
        name: u.name || u.nickname || "Kalcerian",
        displayName: u.displayName || u.name || u.nickname || "Kalcerian",
        nickname: u.nickname || u.name || "Kalcerian",
        profilePicture: u.profilePicture || null,
        isOnline: Boolean(u.isOnline && u.allowLiveLocation !== false),
        broadcast: u.broadcast || null,
        lat: u.lat,
        lng: u.lng,
        coverType: u.coverType || null,
        coverImage: u.coverImage || null,
        socialPlatform: u.socialPlatform || null,
        socialLink: u.socialLink || null,
        instagram: u.instagram || null,
        whatsapp: u.whatsapp || null,
        phone: u.phone || null,
        reason: u.reason || null,
        createdAt: u.createdAt || null,
      });
    });

    // 2. Attach any event STRICTLY created by that exact user (never by shared name and never self's event)
    (events || []).forEach((ev) => {
      if (!ev || ev.id === "own" || !ev.creator || isExcludedUser(ev.creator)) return;
      const creatorId = ev.creator?.id || ev.creatorId;
      if (!creatorId) return;
      const creatorKey = String(creatorId);
      if (currentUser?.id && creatorKey === String(currentUser.id)) return;

      if (map.has(creatorKey)) {
        const existing = map.get(creatorKey);
        if (doesEventBelongToUser(ev, existing, currentUser?.id)) {
          existing.event = ev;
        }
      } else if (doesEventBelongToUser(ev, ev.creator, currentUser?.id)) {
        map.set(creatorKey, {
          id: creatorId,
          name: ev.creator.name || ev.creator.nickname || "Kalcerian",
          displayName: ev.creator.displayName || ev.creator.name || ev.creator.nickname || "Kalcerian",
          nickname: ev.creator.nickname || ev.creator.name || "Kalcerian",
          profilePicture: ev.creator.profilePicture || null,
          isOnline: Boolean(ev.creator.isOnline && ev.creator.allowLiveLocation !== false),
          broadcast: ev.creator.broadcast || null,
          lat: ev.creator.isOnline ? ev.lat : null,
          lng: ev.creator.isOnline ? ev.lng : null,
          event: ev,
          coverType: ev.creator.coverType || null,
          coverImage: ev.creator.coverImage || null,
          socialPlatform: ev.creator.socialPlatform || null,
          socialLink: ev.creator.socialLink || null,
          instagram: ev.creator.instagram || null,
          whatsapp: ev.creator.whatsapp || null,
          phone: ev.creator.phone || null,
          reason: ev.creator.reason || null,
          createdAt: ev.creator.createdAt || null,
        });
      }
    });

    // 3. Ensure current logged-in user is strictly excluded from "Find other Kalcerians" sidebar list
    if (currentUser?.id) {
      map.delete(String(currentUser.id));
    }

    let list = Array.from(map.values());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.nickname && u.nickname.toLowerCase().includes(q)) ||
          (u.event && u.event.title.toLowerCase().includes(q)),
      );
    }
    // sort:
    // 1. Unread incoming personal chat notifications (positions 1..n, sorted by newest message timestamp)
    // 2. Favourites next (position n + 1 onwards, or top if n === 0)
    // 3. Recent personal chat history
    // 4. Event creators & online first, then alphabetical
    return list.sort((a, b) => {
      const aHasNotif = Boolean((personalChatMap?.[a.id]?.unreadCount || 0) > 0);
      const bHasNotif = Boolean((personalChatMap?.[b.id]?.unreadCount || 0) > 0);
      if (aHasNotif !== bHasNotif) return aHasNotif ? -1 : 1;
      if (aHasNotif && bHasNotif) {
        const aTime = Number(personalChatMap?.[a.id]?.lastMessageAt) || 0;
        const bTime = Number(personalChatMap?.[b.id]?.lastMessageAt) || 0;
        if (aTime !== bTime) return bTime - aTime;
      }

      const aFav = favouriteUserIds.includes(String(a.id));
      const bFav = favouriteUserIds.includes(String(b.id));
      if (aFav !== bFav) return aFav ? -1 : 1;

      const aChatTime = Number(personalChatMap?.[a.id]?.lastMessageAt) || 0;
      const bChatTime = Number(personalChatMap?.[b.id]?.lastMessageAt) || 0;
      if (aChatTime !== bChatTime) return bChatTime - aChatTime;

      if (a.event && !b.event) return -1;
      if (!a.event && b.event) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [kalcerians, events, searchQuery, personalChatMap, favouriteUserIds, currentUser, presence]);

  const activeOwnEvent = events.find(
    (e) => e.id === "own" || (currentUser?.id && String(e.creator?.id) === String(currentUser?.id))
  );

  const handleGoToOwnEvent = useCallback(() => {
    if (!activeOwnEvent) return;
    handleOpenItemOnMap(activeOwnEvent, "event");
  }, [activeOwnEvent, handleOpenItemOnMap]);

  const hasActiveOwnBroadcast = useMemo(() => {
    const rawMsg =
      typeof currentUser?.broadcast === "string"
        ? currentUser.broadcast
        : currentUser?.broadcast?.message;
    return Boolean(rawMsg && rawMsg.trim());
  }, [currentUser?.broadcast]);

  const handleTopDynamicBroadcastClick = useCallback(() => {
    if (!currentUser?.id) return;
    const me = (mapUsersData || []).find((u) => String(u.id) === String(currentUser.id)) || currentUser;
    handleOpenItemOnMap(me, "user");
  }, [currentUser, mapUsersData, handleOpenItemOnMap]);

  // real broadcast save (disabled when self is offline)
  async function saveBroadcast(e) {
    e.preventDefault();
    if (isSelfOffline || !statusText.trim()) return;
    setBusy(true);
    try {
      // update location first if browser supports it
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setSelfLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            postLocation(pos.coords.latitude, pos.coords.longitude).catch(
              () => {},
            );
          },
          () => {},
        );
      }
      // create or update broadcast
      if (currentUser?.broadcast) {
        await putBroadcast(statusText.trim());
      } else {
        await postBroadcast(statusText.trim());
      }
      // refresh user data
      const user = await fetchMe();
      setCurrentUser(user);
      const updatedMapUsers = await fetchMapUsers();
      if (updatedMapUsers) setMapUsersData(updatedMapUsers);
      setNotice("Broadcast updated.");
      setShowStatusModal(false);
      setIsEditingBroadcast(false);
    } catch (err) {
      setNotice(err.message || "Failed to update broadcast.");
    }
    setBusy(false);
  }

  const handleOpenEditBroadcast = useCallback((userId) => {
    if (isSelfOffline) return;
    const currentMsg =
      typeof currentUser?.broadcast === "string"
        ? currentUser.broadcast
        : currentUser?.broadcast?.message || "";
    setStatusText(currentMsg);
    setIsEditingBroadcast(true);
    setShowStatusModal(true);
  }, [isSelfOffline, currentUser, setStatusText]);

  const handleConfirmDeleteBroadcast = useCallback(async () => {
    setBusy(true);
    try {
      await delBroadcast();
      const user = await fetchMe();
      setCurrentUser(user);
      const updatedMapUsers = await fetchMapUsers();
      if (updatedMapUsers) setMapUsersData(updatedMapUsers);
      setNotice("Broadcast deleted.");
      setShowStatusModal(false);
      setIsEditingBroadcast(false);
      setStatusText("");
    } catch (err) {
      setNotice(err.message || "Failed to delete broadcast.");
    } finally {
      setBusy(false);
    }
  }, [fetchMe, fetchMapUsers, setNotice, setStatusText]);

  useEffect(() => {
    const handleRemoteEditBroadcast = (e) => {
      const userId = e.detail?.userId;
      handleOpenEditBroadcast(userId);
    };
    window.addEventListener("kalceria:open-edit-broadcast", handleRemoteEditBroadcast);
    return () => window.removeEventListener("kalceria:open-edit-broadcast", handleRemoteEditBroadcast);
  }, [handleOpenEditBroadcast]);

  // toggle visibility (broadcast status on/off)
  async function handlePresenceChange(mode) {
    const isOnline = mode === "online";
    setIsStatusBusy(true);
    setPresence(mode);
    setMenuOpen(false);
    if (!isOnline) {
      setActionMenuOpen(false);
      setShowStatusModal(false);
      setShowEventModal(false);
      setShowRequestsModal(false);
      setShowCancelRequestModal(false);
    }
    try {
      await patchVisibility(isOnline);
      if (isOnline && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setSelfLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            postLocation(pos.coords.latitude, pos.coords.longitude)
              .then(() => {
                fetchMapUsers().then((u) => setMapUsersData(u || []));
                fetchKalcerians().then((k) => setKalcerians(k || []));
              })
              .catch(() => {});
          },
          () => {
            // Still update the list even if location fails
            fetchMapUsers().then((u) => setMapUsersData(u || []));
            fetchKalcerians().then((k) => setKalcerians(k || []));
          },
        );
      } else {
        fetchMapUsers().then((u) => setMapUsersData(u || []));
        fetchKalcerians().then((k) => setKalcerians(k || []));
      }

      const user = await fetchMe();
      setCurrentUser(user);
      setNotice(
        isOnline
          ? "Status ONLINE: tampil di radar."
          : "Status STEALTH: lokasi disembunyikan.",
      );
    } catch (err) {
      setNotice(err.message || "Failed to update visibility.");
    } finally {
      setIsStatusBusy(false);
    }
  }

  const handleOpenEditEvent = useCallback((eventItem) => {
    if (!eventItem || isSelfOffline) return;
    const rawDesc = eventItem.description || "";
    const catMatch = rawDesc.match(/\[CAT:([a-z_]+)\]/i);
    const mediaMatch = rawDesc.match(/\[MEDIA:([^\]]+)\]/i);
    const locMatch = rawDesc.match(/\[LOC:([^\]]+)\]/i);
    const category = catMatch ? catMatch[1].toLowerCase() : (eventItem.category || "cafe");
    const mediaUrl = eventItem.mediaUrl || (mediaMatch ? mediaMatch[1] : "");
    const location = eventItem.location || (locMatch ? locMatch[1] : "");
    const cleanDesc = rawDesc
      .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
      .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
      .replace(/\[LOC:[^\]]+\]\s*/gi, "")
      .replace(/\[COLLABS:[^\]]+\]\s*/gi, "")
      .trim();

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
      const category = eventForm.category || "cafe";
      const mediaUrl = (eventForm.mediaUrl || "").trim();
      const clipUrls = splitMediaUrlListClient(mediaUrl);
      const mediaItemsPayload = clipUrls.map((url) => {
        const m = eventForm.mediaMetadataByUrl?.[url] || {};
        return {
          url,
          ...(m.width ? { width: m.width } : {}),
          ...(m.height ? { height: m.height } : {}),
          ...(m.duration ? { duration: m.duration } : {}),
        };
      });
      const cleanDesc = (eventForm.description || "")
        .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
        .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
        .replace(/\[LOC:[^\]]+\]\s*/gi, "")
        .replace(/\[COLLABS:[^\]]+\]\s*/gi, "")
        .trim();

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

      let encodedDesc = `[CAT:${category}] ${cleanDesc}`.trim();
      if (locationName) {
        encodedDesc = `[LOC:${locationName}] ${encodedDesc}`.trim();
      }
      if (mediaUrl) {
        encodedDesc = `[MEDIA:${mediaUrl}] ${encodedDesc}`.trim();
      }

      const formattedTitle = toSmartTitleCase(eventForm.title || "");
      const payload = {
        title: formattedTitle,
        description: encodedDesc,
        category,
        mediaUrl,
        mediaItems: mediaItemsPayload,
        ...(eventForm.mediaSyncedAt ? { mediaSyncedAt: eventForm.mediaSyncedAt } : {}),
        location: locationName,
        lat: currentLat,
        lng: currentLng,
      };

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
    setBusy(true);
    try {
      const idToDelete = targetId || editingEventId || events.find((ev) => ev.creator?.id === currentUser?.id)?.id;
      if (idToDelete) {
        await delMiniEvent(idToDelete).catch(() => {});
        setEvents((prev) => prev.filter((ev) => ev.id !== idToDelete));
      }
      const refreshedMeta = await fetchMiniEventsWithMeta().catch(() => null);
      if (refreshedMeta?.events) {
        const merged = mergeEvents(refreshedMeta.events);
        setEvents(merged);
        syncCollabStateFromServer(merged, refreshedMeta.requestedEventId ?? null);
      }
      setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "", mediaMetadataByUrl: {} });
      setEditingEventId(null);
      setNotice("Mini event deleted.");
      setShowEventModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to delete mini event.");
    }
    setBusy(false);
  }

  const handleSaveProfile = useCallback(async (updatedData) => {
    const applyProfilePatch = (patch) => {
      persistProfileIdentityCache(currentUser, {
        profilePicture: patch.profilePicture,
        coverImage: patch.coverImage,
        coverType: patch.coverType,
      });
      setCurrentUser((prev) => {
        const merged = { ...(prev || {}), ...patch };
        try {
          localStorage.setItem("kalceria_user", JSON.stringify(merged));
          const sess = localStorage.getItem("kalceria_user_session");
          if (sess) {
            const parsed = JSON.parse(sess);
            parsed.user = { ...(parsed.user || {}), ...patch };
            localStorage.setItem("kalceria_user_session", JSON.stringify(parsed));
          }
        } catch {}
        return merged;
      });
      setKalcerians((prev) =>
        prev.map((u) =>
          currentUser?.id && String(u.id) === String(currentUser.id)
            ? { ...u, ...patch }
            : u
        )
      );
      setMapUsersData((prev) =>
        prev.map((u) =>
          currentUser?.id && String(u.id) === String(currentUser.id)
            ? { ...u, ...patch }
            : u
        )
      );
      if (patch.displayName || patch.name || patch.profilePicture || patch.coverImage) {
        setEvents((prev) =>
          prev.map((ev) => {
            const isMine =
              ev.id === "own" ||
              (currentUser?.id && String(ev.creator?.id) === String(currentUser.id));
            if (!isMine) return ev;
            return {
              ...ev,
              creator: {
                ...(ev.creator || {}),
                name: patch.displayName || patch.name || ev.creator?.name,
                displayName: patch.displayName || patch.name || ev.creator?.displayName,
                profilePicture: patch.profilePicture ?? ev.creator?.profilePicture,
                coverImage: patch.coverImage ?? ev.creator?.coverImage,
                coverType: patch.coverType ?? ev.creator?.coverType,
              },
            };
          })
        );
      }
    };

    applyProfilePatch(updatedData);
    try {
      const res = await api.put("/users/me", updatedData);
      if (res?.data?.user) {
        const serverUser = res.data.user;
        const syncedPatch = {
          ...updatedData,
          ...serverUser,
          displayName: serverUser.displayName || serverUser.name || updatedData.displayName,
          profilePicture: serverUser.profilePicture || updatedData.profilePicture,
          coverImage: serverUser.coverImage || serverUser.coverUrl || updatedData.coverImage,
          coverUrl: serverUser.coverUrl || serverUser.coverImage || updatedData.coverImage,
        };
        applyProfilePatch(syncedPatch);
      }
    } catch (e) {
      console.warn("Profile update remote sync deferred:", e?.message);
    }
    setNotice("Profile updated successfully!");
  }, [currentUser]);

  const handleRequestChangePassword = useCallback(async () => {
    const markReturnToMapWithoutIntro = () => {
      try {
        localStorage.setItem("kalceria_auth_return", "/map");
        localStorage.setItem("kalceria_password_reset_from_map", "true");
        sessionStorage.setItem("kalceria_password_reset_from_map", "true");
      } catch {}
    };
    try {
      let email = currentUser?.email;
      if (!email) {
        const res = await api.get("/users/me").catch(() => null);
        email = res?.data?.user?.email;
        if (res?.data?.user) {
          setCurrentUser(res.data.user);
        }
      }
      markReturnToMapWithoutIntro();
      setShowEditProfileModal(false);
      setShowOwnProfile(false);

      if (email) {
        // Call reset-request to trigger magic link email dispatch (with fromMap flag for server-side & cross-tab persistence)
        await api.post("/auth/password/reset-request", { email, fromMap: true, returnTo: "/map" }).catch(() => {});
        window.location.href = `/?auth=true&mode=forgot-password&sent=true&from=map&email=${encodeURIComponent(email)}`;
        return;
      }
      window.location.href = "/?auth=true&mode=forgot-password&from=map";
    } catch {
      markReturnToMapWithoutIntro();
      setShowEditProfileModal(false);
      setShowOwnProfile(false);
      window.location.href = "/?auth=true&mode=forgot-password&from=map";
    }
  }, [currentUser]);

  const handleConfirmDeleteAccount = useCallback(async () => {
    setShowDeleteAccountModal(false);
    setShowEditProfileModal(false);
    setShowOwnProfile(false);
    try {
      await api.delete("/users/me");
    } catch (e) {
      console.warn("Delete account remote sync deferred:", e?.message);
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    setNotice("Account deleted. Redirecting...");
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }, []);

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
        isMapDark={isMapDark}
        mapParticles={mapParticles}
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
          />

          {/* Kalcerians Panel */}
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
            sidebarKalcerians={sidebarKalcerians} focusUser={focusUser} blockedUserIds={blockedUserIds}
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
            isOpen={showOwnProfile}
            onClose={() => setShowOwnProfile(false)}
            currentUser={currentUser}
            isMapDark={isMapDark}
            onEditProfile={() => {
              setShowOwnProfile(false);
              setShowEditProfileModal(true);
            }}
          />

          <EditProfileModal
            show={showEditProfileModal}
            onClose={() => setShowEditProfileModal(false)}
            isMapDark={isMapDark}
            currentUser={currentUser}
            onSaveProfile={handleSaveProfile}
            onRequestChangePassword={handleRequestChangePassword}
            onRequestDeleteAccount={() => {
              setShowEditProfileModal(false);
              setShowDeleteAccountModal(true);
            }}
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
        isReady={!isDataLoading && hasMounted && !notLoggedIn}
        onComplete={handleStartupComplete}
      />

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
    </main>
  );
}
