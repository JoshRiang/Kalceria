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
import { hasUserSession } from "@/lib/session";
import {
  resolvePersistentAvatarUrl,
  resolvePersistentCover,
  persistProfileIdentityCache,
} from "@/lib/profileIdentity";
import { toSmartTitleCase } from "@/lib/titleCase";
import { useMapChatAndNotifications } from "@/components/map/hooks/useMapChatAndNotifications";
import api, {
  fetchMe, fetchMapUsers, fetchKalcerians, fetchMiniEvents,
  postBroadcast, putBroadcast, postLocation, patchVisibility,
  postMiniEvent, putMiniEvent, delMiniEvent,
  fetchBlockedUsers, blockKalcerian, unblockKalcerian,
} from "@/lib/api";

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
  const [mapUsersData, setMapUsersData] = useState([]);
  const [kalcerians, setKalcerians] = useState([]);
  const [events, setEvents] = useState(() => INITIAL_MOCK_MINI_EVENTS.map(cleanEventDesc));
  const [presence, setPresence] = useState("online");
  const [, setNotice] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [eventForm, setEventForm] = useState({ title: "", description: "", category: "cafe", mediaUrl: "", location: "", lat: null, lng: null });
  const [editingEventId, setEditingEventId] = useState(null);
  const {
    requestedEventId, setRequestedEventId,
    acceptedCollabsMap, setAcceptedCollabsMap,
    eventRequestsMap, setEventRequestsMap,
    cancelRequestTarget, setCancelRequestTarget,
    showCancelRequestModal, setShowCancelRequestModal,
    showRequestsModal, setShowRequestsModal,
    viewingRequestsEventId, setViewingRequestsEventId,
    handleRequestCollab, handlePromptCancelRequest,
    handleConfirmCancelRequest, handleOpenRequests,
    handleAcceptCollabRequest, handleCollaboratorUpload,
    handleDeclineCollabRequest,
  } = useEventCollab({ events, setEvents, currentUser, setNotice, avatarUrl });
  const [showOwnProfile, setShowOwnProfile] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
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
  const [hoveredKalcerian, setHoveredKalcerian] = useState(null);
  const hasInitialCenteredRef = useRef(false);
  const [isStatusBusy, setIsStatusBusy] = useState(false);
  const [isMapDark, setIsMapDark] = useState(false);
  const [focusedUserId, setFocusedUserId] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [selectedOfflineUser, setSelectedOfflineUser] = useState(null);

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
      })
      .catch(() => setNotLoggedIn(true));
  }, []);

  // Prompt location permission and sync live coordinates with backend on entry
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation || !currentUser) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        postLocation(pos.coords.latitude, pos.coords.longitude)
          .then(() => {
            fetchMapUsers().then((u) => setMapUsersData(u || []));
            fetchKalcerians().then((k) => setKalcerians(k || []));
          })
          .catch(() => {});
      },
      (err) => {
        console.warn("[Map] Location permission skipped or denied:", err.message);
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  }, [currentUser?.id]);

  // fetch map users + kalcerians (poll every 10s)
  useEffect(() => {
    if (notLoggedIn || !currentUser) return;
    let alive = true;
    const load = async () => {
      try {
        const [users, kals, activeEvents] = await Promise.all([
          fetchMapUsers(),
          fetchKalcerians(),
          fetchMiniEvents(),
        ]);
        if (!alive) return;
        setMapUsersData(users || []);
        setKalcerians(kals || []);
        setEvents(mergeEvents(activeEvents));
        setIsDataLoading(false);
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
  }, [notLoggedIn, currentUser]);

  const recenterMap = useCallback(() => {
    if (!mapRef.current) return;
    setIsRecentering(true);
    const me = mapUsersData.find((u) => u.id === currentUser?.id);
    if (me && me.lat && me.lng) {
      mapRef.current.flyTo([me.lat, me.lng], 15);
    } else {
      mapRef.current.flyTo([-6.2735, 106.7150], 14);
    }
  }, [mapUsersData, currentUser]);

  const [mapCenter, setMapCenter] = useState({ lat: -6.2735, lng: 106.7150 });
  const [mapZoom, setMapZoom] = useState(14);

  const isCentered = useMemo(() => {
    const me = mapUsersData.find((u) => u.id === currentUser?.id);
    const target = (me && me.lat && me.lng) ? [me.lat, me.lng] : [-6.2735, 106.7150];
    const dist = Math.sqrt(
      Math.pow(mapCenter.lat - target[0], 2) + Math.pow(mapCenter.lng - target[1], 2),
    );
    return dist < 0.0001;
  }, [mapCenter, mapUsersData, currentUser]);

  const mapRef = useRef(null);

  // Map Event Tracking
  const handleMapReady = useCallback((mapInstance) => {
    // eslint-disable-next-line react-hooks/immutability -- Leaflet calls this external ref callback; the live map must be available synchronously.
    mapRef.current = mapInstance;
    setIsMapEngineReady(true);

    setMapCenter(mapInstance.getCenter());
    setMapZoom(mapInstance.getZoom());

    // Invalidate size immediately so tiles compute & load in background
    mapInstance.invalidateSize();

    mapInstance.on("moveend", () => {
      setMapCenter(mapInstance.getCenter());
      setIsRecentering(false);
    });
    mapInstance.on("zoomend", () => {
      setMapZoom(mapInstance.getZoom());
      setMapCenter(mapInstance.getCenter());
    });
    mapInstance.on("movestart", () => {});
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

  // Blocked users state (synced with localStorage + backend API)
  const [blockedUserIds, setBlockedUserIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kalceria_blocked_users");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    fetchBlockedUsers().then((ids) => {
      if (Array.isArray(ids) && ids.length) {
        setBlockedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
      }
    }).catch(() => {});
  }, []);

  const handleBlockUser = useCallback(async (targetId) => {
    setBlockedUserIds((prev) => {
      const next = Array.from(new Set([...prev, targetId]));
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
    try {
      await blockKalcerian(targetId);
    } catch {}
  }, []);

  const handleUnblockUser = useCallback(async (targetId) => {
    setBlockedUserIds((prev) => {
      const next = prev.filter((id) => id !== targetId);
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
    try {
      await unblockKalcerian(targetId);
    } catch {}
  }, []);

  // derived: users and events for the map (filtering out blocked users)
  const visibleMapUsers = useMemo(() => {
    return (mapUsersData || []).filter((u) => !blockedUserIds.includes(u.id));
  }, [mapUsersData, blockedUserIds]);

  const visibleEvents = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((e) => !blockedUserIds.includes(e.creator?.id))
      .filter((e) => !e.expiresAt || new Date(e.expiresAt).getTime() > now);
  }, [events, blockedUserIds]);

  // Handlers
  const focusUser = useCallback((user) => {
    if (!mapRef.current || !user) return;
    let target = user;
    // if coming from sidebar kalcerians, lat/lng might be missing. Look up in mapUsersData
    if (!target.lat || !target.lng) {
      target = mapUsersData.find((u) => u.id === user.id) || target;
    }
    if (!target.lat || !target.lng) return;
    mapRef.current.flyTo([target.lat, target.lng], 16);
  }, [mapUsersData]);

  const handleOpenItemOnMap = useCallback((item, type = "user") => {
    if (!item) return;
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
  });

  const handlePersonalChatOpen = useCallback((user) => {
    if (!user) return;
    markPersonalChatRead(user.id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kalceria:open-personal-chat", {
          detail: { userId: user.id, user },
        })
      );
    }
  }, [markPersonalChatRead]);

  // derived: kalcerians for the sidebar (only real registered users, strictly omitting dummy mock profiles)
  const sidebarKalcerians = useMemo(() => {
    const map = new Map();

    // 1. Add registered kalcerians (real verified users from database)
    (kalcerians || []).forEach((u) => {
      if (!u.id || String(u.id).startsWith("mock_")) return;
      map.set(u.id, {
        id: u.id,
        name: u.name || u.nickname || "Kalcerian",
        displayName: u.displayName || u.name || u.nickname || "Kalcerian",
        nickname: u.nickname || u.name || "Kalcerian",
        profilePicture: u.profilePicture || null,
        isOnline: u.isOnline,
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

    // 2. Attach any event created by a registered user to their profile
    (events || []).forEach((ev) => {
      if (ev.creator?.id && map.has(ev.creator.id)) {
        const existing = map.get(ev.creator.id);
        existing.event = ev;
      } else if (ev.creator && !String(ev.creator.id).startsWith("mock_")) {
        const creatorId = ev.creator.id;
        map.set(creatorId, {
          id: creatorId,
          name: ev.creator.name || ev.creator.nickname || "Kalcerian",
          displayName: ev.creator.displayName || ev.creator.name || ev.creator.nickname || "Kalcerian",
          nickname: ev.creator.nickname || ev.creator.name || "Kalcerian",
          profilePicture: ev.creator.profilePicture || null,
          isOnline: true,
          broadcast: ev.creator.broadcast || null,
          lat: ev.lat,
          lng: ev.lng,
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

    // 3. Guarantee current logged-in user is online in the sidebar list
    if (currentUser?.id) {
      if (map.has(currentUser.id)) {
        const me = map.get(currentUser.id);
        me.isOnline = presence === "online";
        if (currentUser.broadcast) me.broadcast = currentUser.broadcast;
      } else {
        map.set(currentUser.id, {
          id: currentUser.id,
          name: currentUser.displayName || currentUser.name || currentUser.nickname || "Kalcerian",
          displayName: currentUser.displayName || currentUser.name || currentUser.nickname || "Kalcerian",
          nickname: currentUser.nickname || currentUser.name || "Kalcerian",
          profilePicture: currentUser.profilePicture || null,
          isOnline: presence === "online",
          broadcast: currentUser.broadcast || null,
          lat: currentUser.domicileLat || -6.2735,
          lng: currentUser.domicileLng || 106.7110,
          coverType: currentUser.coverType || null,
          coverImage: currentUser.coverImage || null,
          socialPlatform: currentUser.socialPlatform || null,
          socialLink: currentUser.socialLink || null,
          instagram: currentUser.instagram || null,
          whatsapp: currentUser.whatsapp || null,
          phone: currentUser.phone || null,
          reason: currentUser.reason || null,
          createdAt: currentUser.createdAt || null,
        });
      }
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
    (e) => e.id === "own" || (currentUser?.id && e.creator?.id === currentUser?.id)
  );

  // real broadcast save
  async function saveBroadcast(e) {
    e.preventDefault();
    if (!statusText.trim()) return;
    setBusy(true);
    try {
      // update location first if browser supports it
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            postLocation(pos.coords.latitude, pos.coords.longitude).catch(
              () => {},
            ),
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
    } catch (err) {
      setNotice(err.message || "Failed to update broadcast.");
    }
    setBusy(false);
  }

  // toggle visibility (broadcast status on/off)
  async function handlePresenceChange(mode) {
    const isOnline = mode === "online";
    setIsStatusBusy(true);
    setPresence(mode);
    setMenuOpen(false);
    try {
      await patchVisibility(isOnline);
      if (isOnline && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
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
    if (!eventItem) return;
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
      .trim();

    setEventForm({
      title: eventItem.title || "",
      description: cleanDesc,
      category,
      mediaUrl,
      location,
      lat: eventItem.lat || null,
      lng: eventItem.lng || null,
    });
    setEditingEventId(eventItem.id);
    setShowEventModal(true);
  }, []);

  async function saveMiniEvent(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const me = mapUsersData.find((u) => u.id === currentUser?.id);
      const category = eventForm.category || "cafe";
      const mediaUrl = (eventForm.mediaUrl || "").trim();
      const cleanDesc = (eventForm.description || "")
        .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
        .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
        .replace(/\[LOC:[^\]]+\]\s*/gi, "")
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
        location: locationName,
        lat: currentLat,
        lng: currentLng,
      };

      const eventIdToUpdate = editingEventId || events.find((ev) => ev.creator?.id === currentUser?.id)?.id;

      if (eventIdToUpdate) {
        await putMiniEvent(eventIdToUpdate, payload).catch(() => {});
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventIdToUpdate
              ? {
                  ...ev,
                  ...payload,
                  description: encodedDesc,
                  creator: {
                    ...(ev.creator || {}),
                    id: currentUser?.id || ev.creator?.id,
                    name: currentUser?.displayName || currentUser?.name || ev.creator?.name,
                    displayName: currentUser?.displayName || currentUser?.name || ev.creator?.displayName,
                    nickname: currentUser?.nickname || ev.creator?.nickname,
                  },
                }
              : ev
          )
        );
      } else {
        const createdRes = await postMiniEvent(payload).catch(() => null);
        const createdEvent = createdRes?.data?.event || createdRes?.data || createdRes;
        if (createdEvent && typeof createdEvent === "object") {
          const enriched = {
            ...createdEvent,
            creator: {
              ...(createdEvent.creator || {}),
              id: currentUser?.id || createdEvent.creator?.id,
              name: currentUser?.displayName || currentUser?.name || createdEvent.creator?.name,
              displayName: currentUser?.displayName || currentUser?.name || createdEvent.creator?.displayName,
              nickname: currentUser?.nickname || createdEvent.creator?.nickname,
            },
          };
          setEvents((prev) => [cleanEventDesc(enriched), ...prev]);
        }
      }

      const updatedEvents = await fetchMiniEvents().catch(() => null);
      if (updatedEvents) setEvents(mergeEvents(updatedEvents));
      setNotice(eventIdToUpdate ? "Mini event updated." : "Mini event saved.");
      setEditingEventId(null);
      setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "", location: "", lat: null, lng: null });
      setShowEventModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to save mini event.");
    }
    setBusy(false);
  }

  const handleOpenEventModal = useCallback((open = true) => {
    if (open) {
      if (!editingEventId) {
        const own = events.find((ev) => ev.creator?.id === currentUser?.id || ev.id === "own");
        if (own) {
          handleOpenEditEvent(own);
          return;
        } else {
          setEditingEventId(null);
          setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "", location: "", lat: null, lng: null });
        }
      }
    } else {
      setEditingEventId(null);
    }
    setShowEventModal(open);
  }, [events, currentUser, editingEventId, handleOpenEditEvent]);

  async function deleteMiniEvent(targetId) {
    setBusy(true);
    try {
      const idToDelete = targetId || editingEventId || events.find((ev) => ev.creator?.id === currentUser?.id)?.id;
      if (idToDelete) {
        await delMiniEvent(idToDelete).catch(() => {});
        setEvents((prev) => prev.filter((ev) => ev.id !== idToDelete));
      }
      const updatedEvents = await fetchMiniEvents().catch(() => null);
      if (updatedEvents) setEvents(mergeEvents(updatedEvents));
      setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "" });
      setEditingEventId(null);
      setNotice("Mini event deleted.");
      setShowEventModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to delete mini event.");
    }
    setBusy(false);
  }

  const handleSaveProfile = useCallback(async (updatedData) => {
    persistProfileIdentityCache(currentUser, {
      profilePicture: updatedData.profilePicture,
      coverImage: updatedData.coverImage,
    });
    setCurrentUser((prev) => {
      const merged = { ...(prev || {}), ...updatedData };
      try {
        localStorage.setItem("kalceria_user", JSON.stringify(merged));
        const sess = localStorage.getItem("kalceria_user_session");
        if (sess) {
          const parsed = JSON.parse(sess);
          parsed.user = { ...(parsed.user || {}), ...updatedData };
          localStorage.setItem("kalceria_user_session", JSON.stringify(parsed));
        }
      } catch {}
      return merged;
    });
    setKalcerians((prev) =>
      prev.map((u) =>
        currentUser?.id && String(u.id) === String(currentUser.id)
          ? { ...u, ...updatedData }
          : u
      )
    );
    setMapUsersData((prev) =>
      prev.map((u) =>
        currentUser?.id && String(u.id) === String(currentUser.id)
          ? { ...u, ...updatedData }
          : u
      )
    );
    if (updatedData.displayName || updatedData.name || updatedData.profilePicture || updatedData.coverImage) {
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
              name: updatedData.displayName || updatedData.name || ev.creator?.name,
              displayName: updatedData.displayName || updatedData.name || ev.creator?.displayName,
              profilePicture: updatedData.profilePicture ?? ev.creator?.profilePicture,
              coverImage: updatedData.coverImage ?? ev.creator?.coverImage,
            },
          };
        })
      );
    }
    try {
      const res = await api.put("/users/me", updatedData);
      if (res?.data?.user) {
        setCurrentUser((prev) => ({ ...(prev || {}), ...res.data.user }));
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

  const offlineUserObj = selectedOfflineUser ? sidebarKalcerians.find((k) => k.id === selectedOfflineUser) : null;

  return (
    <main 
      className={`relative h-screen max-h-screen w-full bg-[#0a0e27] overflow-hidden text-white font-sans selection:bg-[#ffd60a] selection:text-black transition-all ${isMapDark ? "dark-theme" : "light-theme"}`}
      style={{
        filter: isExiting ? "blur(30px)" : "none",
        transition: "filter 1.2s ease-in-out"
      }}
    >
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
          currentUser={currentUser} onEditEvent={handleOpenEditEvent} requestedEventId={requestedEventId}
          eventRequestsMap={eventRequestsMap} acceptedCollabsMap={acceptedCollabsMap}
          eventGroupChatMap={eventGroupChatMap}
          onRequestCollab={handleRequestCollab}
          onPromptCancelRequest={handlePromptCancelRequest} onOpenRequests={handleOpenRequests}
          onCollaboratorUpload={handleCollaboratorUpload}
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
            isMapDark={isMapDark} setIsMapDark={setIsMapDark} mapCenter={mapCenter} mapZoom={mapZoom}
            actionMenuOpen={actionMenuOpen} setActionMenuOpen={setActionMenuOpen} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
            setShowQuitModal={setShowQuitModal} setShowStatusModal={setShowStatusModal} setShowEventModal={handleOpenEventModal}
            isStatusBusy={isStatusBusy} currentUser={currentUser} avatarUrl={avatarUrl} presence={presence}
            handlePresenceChange={handlePresenceChange} recenterMap={recenterMap} isRecentering={isRecentering}
            onOpenOwnProfile={() => setShowOwnProfile((prev) => !prev)}
            topDynamicEvent={topDynamicEvent}
            hasTopDynamicEventNotif={hasTopDynamicEventNotif}
            onTopDynamicEventClick={handleTopDynamicEventClick}
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
            isDataLoading={isDataLoading} hoveredKalcerian={hoveredKalcerian} setHoveredKalcerian={setHoveredKalcerian}
            isMapDark={isMapDark} setFocusedUserId={setFocusedUserId} setSelectedOfflineUser={setSelectedOfflineUser}
            sidebarKalcerians={sidebarKalcerians} focusUser={focusUser} blockedUserIds={blockedUserIds}
            onBlockUser={handleBlockUser} onUnblockUser={handleUnblockUser} onOpenItemOnMap={handleOpenItemOnMap}
            currentUser={currentUser} requestedEventId={requestedEventId} eventRequestsMap={eventRequestsMap}
            acceptedCollabsMap={acceptedCollabsMap} eventGroupChatMap={eventGroupChatMap}
            personalChatMap={personalChatMap} recentlyMessagedUserIds={recentlyMessagedUserIds}
            favouriteUserIds={favouriteUserIds} mutedUserIds={mutedUserIds}
            onToggleFavourite={toggleFavouriteUser} onToggleMute={toggleMuteUser}
            onOutgoingMessageUpdate={recordOutgoingPersonalMessage}
            onPersonalChatOpen={handlePersonalChatOpen}
            onPromptCancelRequest={handlePromptCancelRequest} onOpenRequests={handleOpenRequests}
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
        offlineUserObj={offlineUserObj} setSelectedOfflineUser={setSelectedOfflineUser}
        showStatusModal={showStatusModal} setShowStatusModal={setShowStatusModal}
        isMapDark={isMapDark} saveBroadcast={saveBroadcast} statusText={statusText} setStatusText={setStatusText} busy={busy}
        showEventModal={showEventModal} setShowEventModal={handleOpenEventModal}
        saveMiniEvent={saveMiniEvent} eventForm={eventForm} setEventForm={setEventForm}
        activeOwnEvent={activeOwnEvent} deleteMiniEvent={deleteMiniEvent} editingEventId={editingEventId}
        showCancelRequestModal={showCancelRequestModal} setShowCancelRequestModal={setShowCancelRequestModal}
        cancelRequestTarget={cancelRequestTarget} handleConfirmCancelRequest={handleConfirmCancelRequest}
        showRequestsModal={showRequestsModal} setShowRequestsModal={setShowRequestsModal}
        viewingRequestsEvent={events.find((e) => String(e.id) === String(viewingRequestsEventId))}
        currentRequestsList={viewingRequestsEventId ? (eventRequestsMap[viewingRequestsEventId] || (viewingRequestsEventId === activeOwnEvent?.id ? eventRequestsMap["own"] : null) || (viewingRequestsEventId === "mini_spec_3" ? eventRequestsMap["mini_spec_3"] : null) || eventRequestsMap["mini_cafe_1"] || []) : []}
        onAcceptCollabRequest={handleAcceptCollabRequest} onDeclineCollabRequest={handleDeclineCollabRequest}
        showDeleteAccountModal={showDeleteAccountModal} setShowDeleteAccountModal={setShowDeleteAccountModal}
        handleConfirmDeleteAccount={handleConfirmDeleteAccount}
        isExiting={isExiting} showQuitModal={showQuitModal} setShowQuitModal={setShowQuitModal} handleQuitConfirm={handleQuitConfirm}
      />
    </main>
  );
}
