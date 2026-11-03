"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { useHasMounted } from "@/hooks/useHasMounted";
import { MapAuthGate } from "@/components/map/MapAuthGate";
import { INITIAL_MOCK_MINI_EVENTS } from "@/components/map/mockMiniEvents";
import { createRuntimeSeededRandom, createSeededRandom } from "@/lib/seededRandom";

import { StartupSequenceOverlay } from "@/components/map/StartupSequenceOverlay";
import { MapWalkthroughTooltip } from "@/components/map/MapWalkthroughTooltip";
const KalceriansPanel = dynamic(() => import("@/components/map/KalceriansPanel").then((m) => m.KalceriansPanel), { ssr: false });
const MapHeaderHud = dynamic(() => import("@/components/map/MapHeaderHud").then((m) => m.MapHeaderHud), { ssr: false });
const MapModals = dynamic(() => import("@/components/map/MapModals").then((m) => m.MapModals), { ssr: false });
import { hasUserSession } from "@/lib/session";
import { playNotificationSound } from "@/lib/soundEngine";
import {
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
const avatarUrl = (user) =>
  user?.profilePicture ||
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nickname || user?.name || "anon")}`;

const cleanEventDesc = (item) => {
  if (!item) return item;
  const raw = item.description || "";
  const catMatch = raw.match(/\[CAT:([a-z_]+)\]/i);
  const mediaMatch = raw.match(/\[MEDIA:([^\]]+)\]/i);
  const cleanDescription = raw
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .trim();
  return {
    ...item,
    category: catMatch ? catMatch[1].toLowerCase() : (item.category || "cafe"),
    mediaUrl: mediaMatch ? mediaMatch[1] : (item.mediaUrl || null),
    description: cleanDescription,
  };
};

const mergeEvents = (activeList) => {
  const normalizedMocks = INITIAL_MOCK_MINI_EVENTS.map(cleanEventDesc);
  if (!activeList || activeList.length === 0) return normalizedMocks;
  const cleanedActive = activeList.map(cleanEventDesc);
  const activeIds = new Set(cleanedActive.map((e) => e.id));
  const missingMocks = normalizedMocks.filter((m) => !activeIds.has(m.id));
  return [...cleanedActive, ...missingMocks];
};

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
  const [eventForm, setEventForm] = useState({ title: "", description: "", category: "cafe", mediaUrl: "" });
  const [editingEventId, setEditingEventId] = useState(null);
  const [requestedEventId, setRequestedEventId] = useState(() => {
    if (typeof window !== "undefined") {
      try { return localStorage.getItem("kalceria_requested_event_id") || null; } catch {}
    }
    return null;
  });
  const [eventRequestsMap, setEventRequestsMap] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kalceria_event_collab_requests");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {
      mini_cafe_1: [
        { id: "req_adit", user: { id: "mock_adit", name: "Adit Bintaro", nickname: "Adit", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Adit", broadcast: "Dyno run booked for Saturday!" }, message: "Ready for highway convoy route!", createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: "req_bonita", user: { id: "mock_bonita", name: "Bonita Bon", nickname: "Bonita", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bonita", broadcast: "Coffee & car chat in Sector 7" }, message: "Joining morning espresso catchup with my Silvia S15.", createdAt: new Date(Date.now() - 7200000).toISOString() }
      ],
      own: [
        { id: "req_dinda", user: { id: "mock_dinda", name: "Dinda Laras", nickname: "Dinda", profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dinda", broadcast: "Trackday tuning prep at FM" }, message: "Count me in for this session! Let's roll together.", createdAt: new Date(Date.now() - 1800000).toISOString() }
      ]
    };
  });
  const [cancelRequestTarget, setCancelRequestTarget] = useState(null);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [viewingRequestsEventId, setViewingRequestsEventId] = useState(null);
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
  const [showStartup, setShowStartup] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        if (!hasUserSession()) return false;
        return true;
      } catch {
        return false;
      }
    }
    return true;
  });
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
        setCurrentUser(user);
        setPresence(user.allowLiveLocation ? "online" : "invisible");
        if (user.broadcast?.message) setStatusText(user.broadcast.message);
      })
      .catch(() => setNotLoggedIn(true));
  }, []);

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
    return (events || []).filter((e) => !blockedUserIds.includes(e.creator?.id));
  }, [events, blockedUserIds]);

  // derived: kalcerians for the sidebar (merging all event creators so every dummy event has its kalcerian entry!)
  const sidebarKalcerians = useMemo(() => {
    const map = new Map();

    // 1. Add all event creators first so all dummy events (Dinda, Melati, Adit, etc.) are prominently listed
    (events || []).forEach((ev) => {
      if (ev.creator) {
        const creatorId = ev.creator.id || `creator_${ev.creator.name || ev.id}`;
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

    // 2. Add or enrich with registered kalcerians
    (kalcerians || []).forEach((u) => {
      const existing = map.get(u.id);
      if (existing) {
        existing.isOnline = u.isOnline;
        existing.broadcast = u.broadcast;
        if (u.profilePicture) existing.profilePicture = u.profilePicture;
        if (u.coverImage) existing.coverImage = u.coverImage;
        if (u.coverType) existing.coverType = u.coverType;
        if (u.socialPlatform) existing.socialPlatform = u.socialPlatform;
        if (u.socialLink) existing.socialLink = u.socialLink;
        if (u.instagram) existing.instagram = u.instagram;
        if (u.whatsapp) existing.whatsapp = u.whatsapp;
        if (u.phone) existing.phone = u.phone;
        if (u.reason) existing.reason = u.reason;
        if (u.createdAt) existing.createdAt = u.createdAt;
      } else {
        map.set(u.id, { ...u });
      }
    });

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
    // sort: event creators & online first, then alphabetical
    return list.sort((a, b) => {
      if (a.event && !b.event) return -1;
      if (!a.event && b.event) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [kalcerians, events, searchQuery]);

  const activeOwnEvent = events.find(
    (e) => e.id === "own" || (currentUser?.id && e.creator?.id === currentUser?.id)
  );

  // Handlers
  function focusUser(user) {
    if (!mapRef.current) return;
    let target = user;
    // if coming from sidebar kalcerians, lat/lng might be missing. Look up in mapUsersData
    if (!target.lat || !target.lng) {
      target = mapUsersData.find((u) => u.id === user.id) || target;
    }
    if (!target.lat || !target.lng) return;
    mapRef.current.flyTo([target.lat, target.lng], 16);
  }

  function handleOpenItemOnMap(item, type = "user") {
    if (!item) return;
    setFocusTarget({
      id: item.id,
      type,
      openPopup: true,
      timestamp: Date.now(),
    });
    let lat = item.lat;
    let lng = item.lng;
    if (!lat || !lng) {
      const found =
        mapUsersData.find((u) => u.id === item.id) ||
        events.find((e) => e.id === item.id);
      if (found) {
        lat = found.lat;
        lng = found.lng;
      }
    }
    if (lat && lng && mapRef.current) {
      mapRef.current.flyTo([lat, lng], 16);
    }
  }

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
      playNotificationSound("chat");
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
    const category = catMatch ? catMatch[1].toLowerCase() : (eventItem.category || "cafe");
    const mediaUrl = eventItem.mediaUrl || (mediaMatch ? mediaMatch[1] : "");
    const cleanDesc = rawDesc
      .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
      .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
      .trim();

    setEventForm({
      title: eventItem.title || "",
      description: cleanDesc,
      category,
      mediaUrl,
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
        .trim();
      let encodedDesc = `[CAT:${category}] ${cleanDesc}`.trim();
      if (mediaUrl) {
        encodedDesc = `[MEDIA:${mediaUrl}] ${encodedDesc}`.trim();
      }
      const payload = {
        title: eventForm.title,
        description: encodedDesc,
        category,
        mediaUrl,
        lat: me?.lat || currentUser?.domicileLat || -6.2715,
        lng: me?.lng || currentUser?.domicileLng || 106.7135,
      };

      const eventIdToUpdate = editingEventId || events.find((ev) => ev.creator?.id === currentUser?.id)?.id;

      if (eventIdToUpdate) {
        await putMiniEvent(eventIdToUpdate, payload).catch(() => {});
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventIdToUpdate ? { ...ev, ...payload, description: encodedDesc } : ev
          )
        );
      } else {
        const created = await postMiniEvent(payload).catch(() => null);
        if (created) {
          setEvents((prev) => [cleanEventDesc(created), ...prev]);
        }
      }

      const updatedEvents = await fetchMiniEvents().catch(() => null);
      if (updatedEvents) setEvents(mergeEvents(updatedEvents));
      setNotice(eventIdToUpdate ? "Mini event updated." : "Mini event saved.");
      playNotificationSound("event");
      setEditingEventId(null);
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
          setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "" });
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

  const handleRequestCollab = useCallback((eventId) => {
    playNotificationSound("event");
    setRequestedEventId(eventId);
    try { localStorage.setItem("kalceria_requested_event_id", eventId); } catch {}
    const ev = events.find((e) => String(e.id) === String(eventId));
    setNotice(`Collab requested for ${ev?.title || "event"}!`);

    if (currentUser) {
      setEventRequestsMap((prev) => {
        const existing = prev[eventId] || [];
        if (existing.some((r) => r.user.id === currentUser.id)) return prev;
        const newReq = {
          id: `req_${Date.now()}`,
          user: {
            id: currentUser.id,
            name: currentUser.name || currentUser.nickname || "You",
            nickname: currentUser.nickname || currentUser.name || "You",
            profilePicture: currentUser.profilePicture || avatarUrl(currentUser),
            broadcast: currentUser.broadcast?.message || "Collab requested",
          },
          message: "Wants to collaborate on this event",
          createdAt: new Date().toISOString(),
        };
        const updated = { ...prev, [eventId]: [newReq, ...existing] };
        try { localStorage.setItem("kalceria_event_collab_requests", JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
  }, [events, currentUser]);

  const handlePromptCancelRequest = useCallback((eventId, title) => {
    const ev = events.find((e) => String(e.id) === String(eventId));
    setCancelRequestTarget({ id: eventId, title: title || ev?.title || "Event" });
    setShowCancelRequestModal(true);
  }, [events]);

  const handleConfirmCancelRequest = useCallback(() => {
    const targetId = cancelRequestTarget?.id || requestedEventId;
    setRequestedEventId(null);
    try { localStorage.removeItem("kalceria_requested_event_id"); } catch {}
    if (targetId && currentUser) {
      setEventRequestsMap((prev) => {
        const existing = prev[targetId] || [];
        const updated = { ...prev, [targetId]: existing.filter((r) => r.user.id !== currentUser.id) };
        try { localStorage.setItem("kalceria_event_collab_requests", JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
    setShowCancelRequestModal(false);
    setCancelRequestTarget(null);
    setNotice("Request removed.");
  }, [cancelRequestTarget, requestedEventId, currentUser]);

  const handleOpenRequests = useCallback((eventId) => {
    setViewingRequestsEventId(eventId);
    setShowRequestsModal(true);
    playNotificationSound("event");
  }, []);

  // login gate
  if (notLoggedIn) {
    return <MapAuthGate />;
  }

  const offlineUserObj = selectedOfflineUser ? sidebarKalcerians.find((k) => k.id === selectedOfflineUser) : null;

  return (
    <main 
      className={`relative min-h-screen bg-[#0a0e27] overflow-hidden text-white font-sans selection:bg-[#ffd60a] selection:text-black transition-all ${isMapDark ? "dark-theme" : "light-theme"}`}
      style={{
        filter: isExiting ? "blur(30px)" : "none",
        transition: "filter 1.2s ease-in-out"
      }}
    >
      {/* 🌌 Atmospheric Tactical Background (Behind Map) */}
      {showStartup && (
        <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
          {/* Animated Blobs */}
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              rotate: [0, 180, 0],
              x: [-150, 150, -150],
              y: [-80, 80, -80],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#ff006e]/25 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1.5, 1, 1.5],
              rotate: [0, -180, 0],
              x: [150, -150, 150],
              y: [80, -80, 80],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#ffd60a]/15 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              opacity: [0.2, 0.7, 0.2],
              scale: [1, 1.3, 1],
              x: [0, 100, 0],
              y: [0, -100, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] left-[30%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[100px]"
          />
        </div>
      )}

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
          users={visibleMapUsers}
          events={visibleEvents}
          onMapReady={handleMapReady}
          focusUserId={focusedUserId}
          focusTarget={focusTarget}
          isMapDark={isMapDark}
          currentUser={currentUser}
          onEditEvent={handleOpenEditEvent}
          requestedEventId={requestedEventId}
          onRequestCollab={handleRequestCollab}
          onPromptCancelRequest={handlePromptCancelRequest}
          onOpenRequests={handleOpenRequests}
        />
      </motion.div>

      {/* Global Map Ambient Micro-Particles (60% sparse) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[30]">
        {!showStartup && mapParticles.map((p) => {
          const activeColor = isMapDark
            ? (p.id % 2 === 0 ? "#ff006e" : "#ffd60a") // Dark Mode: Neon Red/Magenta & Bright Gold
            : (p.id % 2 === 0 ? "#10b981" : "#3b82f6"); // Light Mode: Emerald Green & Dodger Blue

          return (
            <div
              key={p.id}
              className="absolute rounded-full blur-[0.5px] pointer-events-none"
              style={{
                left: p.left,
                bottom: "-20px",
                width: p.size,
                height: p.size,
                backgroundColor: activeColor,
                boxShadow: `0 0 6px ${activeColor}, 0 0 12px ${activeColor}`,
                animation: `floatUp ${p.duration}s linear ${p.delay}s infinite both`,
                opacity: p.opacity,
                transition: "background-color 1.5s ease-in-out, box-shadow 1.5s ease-in-out",
              }}
            />
          );
        })}
      </div>

      {/* Subtle Vignette Overlay */}
      <div
        className="fixed inset-0 z-[40] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, transparent 50%, rgba(10, 14, 39, 0.5) 100%)",
        }}
      />

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

      <MapWalkthroughTooltip show={!showStartup && hasMounted} />

      {!showStartup && hasMounted && (
        <>
          <MapHeaderHud
            isMapDark={isMapDark}
            setIsMapDark={setIsMapDark}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            actionMenuOpen={actionMenuOpen}
            setActionMenuOpen={setActionMenuOpen}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            setShowQuitModal={setShowQuitModal}
            setShowStatusModal={setShowStatusModal}
            setShowEventModal={handleOpenEventModal}
            isStatusBusy={isStatusBusy}
            currentUser={currentUser}
            avatarUrl={avatarUrl}
            presence={presence}
            handlePresenceChange={handlePresenceChange}
            recenterMap={recenterMap}
            isRecentering={isRecentering}
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
            scheduleTimeout={scheduleTimeout}
            mapUsersData={mapUsersData}
            kalcerians={kalcerians}
            events={events}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            isDataLoading={isDataLoading}
            hoveredKalcerian={hoveredKalcerian}
            setHoveredKalcerian={setHoveredKalcerian}
            isMapDark={isMapDark}
            setFocusedUserId={setFocusedUserId}
            setSelectedOfflineUser={setSelectedOfflineUser}
            sidebarKalcerians={sidebarKalcerians}
            focusUser={focusUser}
            blockedUserIds={blockedUserIds}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            onOpenItemOnMap={handleOpenItemOnMap}
          />
        </>
      )}



      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.3); border-radius: 4px; }
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 25% { transform: translate(15vw, 15vh) scale(1.2); } 50% { transform: translate(-10vw, 20vh) scale(0.9); } 75% { transform: translate(20vw, -15vh) scale(1.3); } 100% { transform: translate(-5vw, -10vh) scale(1.1); } }
        @keyframes float-wide { 0% { transform: translate(0, 0) scale(1); opacity: 0.2; } 50% { transform: translate(40vw, 80vh) scale(0.8); opacity: 0.2; } 100% { transform: translate(0, 0) scale(1); opacity: 0.2; } }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes floatUp { 0% { transform: translateY(10px); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(-115vh); opacity: 0; } }
        @keyframes floatUpBox { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(-80vh) scale(1.1); opacity: 0; } }
      `}</style>
      {/* Startup Sequence Overlay :: FORZA HORIZON STYLE */}
      <StartupSequenceOverlay
        showStartup={showStartup}
        isReady={!isDataLoading && hasMounted && !notLoggedIn}
        onComplete={() => setShowStartup(false)}
      />

      <MapModals
        offlineUserObj={offlineUserObj} setSelectedOfflineUser={setSelectedOfflineUser}
        showStatusModal={showStatusModal} setShowStatusModal={setShowStatusModal}
        isMapDark={isMapDark} saveBroadcast={saveBroadcast}
        statusText={statusText} setStatusText={setStatusText} busy={busy}
        showEventModal={showEventModal} setShowEventModal={handleOpenEventModal}
        saveMiniEvent={saveMiniEvent} eventForm={eventForm} setEventForm={setEventForm}
        activeOwnEvent={activeOwnEvent} deleteMiniEvent={deleteMiniEvent}
        editingEventId={editingEventId}
        showCancelRequestModal={showCancelRequestModal}
        setShowCancelRequestModal={setShowCancelRequestModal}
        cancelRequestTarget={cancelRequestTarget}
        handleConfirmCancelRequest={handleConfirmCancelRequest}
        showRequestsModal={showRequestsModal}
        setShowRequestsModal={setShowRequestsModal}
        viewingRequestsEvent={events.find((e) => String(e.id) === String(viewingRequestsEventId))}
        currentRequestsList={
          viewingRequestsEventId
            ? (eventRequestsMap[viewingRequestsEventId] || eventRequestsMap["mini_cafe_1"] || [])
            : []
        }
        isExiting={isExiting} showQuitModal={showQuitModal}
        setShowQuitModal={setShowQuitModal} handleQuitConfirm={handleQuitConfirm}
      />
    </main>
  );
}
