"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { useHasMounted } from "@/hooks/useHasMounted";
import RadialPing from "@/components/map/RadialPing";
import { MapAuthGate } from "@/components/map/MapAuthGate";
import { INITIAL_MOCK_MINI_EVENTS } from "@/components/map/mockMiniEvents";
import { createRuntimeSeededRandom, createSeededRandom } from "@/lib/seededRandom";

const KalceriansPanel = dynamic(() => import("@/components/map/KalceriansPanel").then((m) => m.KalceriansPanel), { ssr: false });
const StartupSequenceOverlay = dynamic(() => import("@/components/map/StartupSequenceOverlay").then((m) => m.StartupSequenceOverlay), { ssr: false });
const MapHeaderHud = dynamic(() => import("@/components/map/MapHeaderHud").then((m) => m.MapHeaderHud), { ssr: false });
const MapModals = dynamic(() => import("@/components/map/MapModals").then((m) => m.MapModals), { ssr: false });
import { hasUserSession } from "@/lib/session";
import {
  fetchMe,
  fetchMapUsers,
  fetchKalcerians,
  fetchMiniEvents,
  postBroadcast,
  putBroadcast,
  postLocation,
  patchVisibility,
  postMiniEvent,
  putMiniEvent,
  delMiniEvent,
} from "@/lib/api";

const SnapMap = dynamic(() => import("@/components/SnapMap"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-[#050a14] text-white flex items-center justify-center">
      <div className="font-sans text-sm uppercase tracking-[0.25em] text-[#ffd60a]">
        Loading Snap Map
      </div>
    </main>
  ),
});

// Helpers
const avatarUrl = (user) =>
  user?.profilePicture ||
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nickname || user?.name || "anon")}`;

const hqPoint = {
  id: "hq_bintaro",
  title: "KALCERIA HEADQUARTER",
  role: "Meet Center",
  description: "Place where people meet",
  lat: -6.2715,
  lng: 106.7135,
  gifUrl: "/media/gifs/hq-live.gif",
  videoUrl: "/media/gifs/hq-live.gif",
};

// ☁️ Static Pixel Cloud Definitions for consistent transition


// 🛰 Optimized Tactical Network (Canvas-based Particles & Links)



// ─── Vintage Laser Grid ──────────────────────────────────────────────


// ─── Smooth Domino Chevrons for B&W/Red-Black Dash Transition ─────────


const mergeEvents = (activeList) => {
  if (!activeList || activeList.length === 0) return INITIAL_MOCK_MINI_EVENTS;
  const activeIds = new Set(activeList.map((e) => e.id));
  const missingMocks = INITIAL_MOCK_MINI_EVENTS.filter((m) => !activeIds.has(m.id));
  return [...activeList, ...missingMocks];
};

export default function MapPage() {
  const scheduleTimeout = useTimeoutRegistry();
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [mapUsersData, setMapUsersData] = useState([]);
  const [kalcerians, setKalcerians] = useState([]);
  const [events, setEvents] = useState(INITIAL_MOCK_MINI_EVENTS);
  const [presence, setPresence] = useState("online");
  const [, setNotice] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [eventForm, setEventForm] = useState({ title: "", description: "", category: "cafe", mediaUrl: "" });
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [isRecentering, setIsRecentering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPirate, setShowPirate] = useState(false);
  const [showStartup, setShowStartup] = useState(false);
  const [startupProgress, setStartupProgress] = useState(0);
  const [particles, setParticles] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const hasMounted = useHasMounted();
  const [notLoggedIn, setNotLoggedIn] = useState(true);
  const [hoveredKalcerian, setHoveredKalcerian] = useState(null);
  const hasInitialCenteredRef = useRef(false);
  const [isStatusBusy, setIsStatusBusy] = useState(false);
  const [isMapDark, setIsMapDark] = useState(false);
  const [focusedUserId, setFocusedUserId] = useState(null);
  const [selectedOfflineUser, setSelectedOfflineUser] = useState(null);

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Quotes changing at loading bar & 3D tilt tracking states
  const [currentQuote, setCurrentQuote] = useState("Composing  the map...");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleQuitConfirm = () => {
    setIsExiting(true);
    setShowQuitModal(false);
    
    // Set landing scroll target for session anchoring
    sessionStorage.setItem("landingScrollTarget", "section-map");
    // Mark landing intro as played so it bypasses the preloader and lands directly on the anchor
    sessionStorage.setItem("introPlayed", "true");
    // Reset mapIntroSeen to 0 so the intro plays next time
    sessionStorage.setItem("mapIntroSeen", "0");
    
    scheduleTimeout(() => {
      window.location.href = "/?anchor=section-map";
    }, 1500); // 1.5s matching the white flash transition
  };

  const mapParticles = useMemo(() => {
    const random = createSeededRandom("map-atmosphere-particles-v1");
    return Array.from({ length: 22 }).map((_, i) => ({
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
      mapRef.current.flyTo([me.lat, me.lng], 16);
    } else {
      mapRef.current.flyTo([-6.2715, 106.7135], 14);
    }
  }, [mapUsersData, currentUser]);

  // Auto-center on initial load once user location is known
  useEffect(() => {
    if (!hasInitialCenteredRef.current && mapRef.current && mapUsersData.length > 0 && currentUser) {
      const me = mapUsersData.find((u) => u.id === currentUser.id);
      if (me && me.lat && me.lng) {
        recenterMap();
        hasInitialCenteredRef.current = true;
      }
    }
  }, [mapUsersData, currentUser, recenterMap]);

  const [mapCenter, setMapCenter] = useState({ lat: -6.234, lng: 106.749 });
  const [mapZoom, setMapZoom] = useState(13);

  const isCentered = useMemo(() => {
    const me = mapUsersData.find((u) => u.id === currentUser?.id);
    const target = (me && me.lat && me.lng) ? [me.lat, me.lng] : [-6.2715, 106.7135];
    const dist = Math.sqrt(
      Math.pow(mapCenter.lat - target[0], 2) + Math.pow(mapCenter.lng - target[1], 2),
    );
    return dist < 0.0001;
  }, [mapCenter, mapUsersData, currentUser]);

  const mapRef = useRef(null);
  const pirateHideRef = useRef(null);
  const pirateNextRef = useRef(null);
  const pirateStarted = useRef(false);
  const [pirateKey, setPirateKey] = useState(0);

  // Startup Sequence Logic
  useEffect(() => {
    if (notLoggedIn) return;
    if (sessionStorage.getItem("mapIntroSeen") === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the session-based intro visibility on the first client effect.
      setShowStartup(false);
      return;
    }
    
    setShowStartup(true);
    sessionStorage.setItem("mapIntroSeen", "true");

    const random = createRuntimeSeededRandom("map-startup-progress-v1");
    let currentProgress = 0;
    let interval;
    
    // Slower progress increments and cinematic delay for first step to fade in dramatically
    const delayTimer = setTimeout(() => {
      interval = setInterval(() => {
        currentProgress += random() * 8;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          scheduleTimeout(() => {
            setShowStartup(false);
          }, 1000);
        }
        setStartupProgress(currentProgress);

      }, 250);
    }, 1200);

    return () => {
      clearTimeout(delayTimer);
      if (interval) clearInterval(interval);
    };
  }, [notLoggedIn, scheduleTimeout]);

  // Spawns premium magenta & golden microparticles once loading progress is >= 10%
  useEffect(() => {
    if (startupProgress >= 10 && particles.length === 0) {
      const random = createSeededRandom("map-startup-particles-v1");
      const generated = Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        left: `${random() * 100}%`,
        size: `${random() * 5 + 3}px`, // 3px to 8px
        color: random() > 0.5 ? "#ff006e" : (random() > 0.5 ? "#ffd60a" : "#ffc300"), // Neon Magenta, Golden Yellow, Gold
        duration: random() * 5 + 4, // 4s to 9s
        delay: random() * 5, // 0s to 5s
        opacity: random() * 0.4 + 0.4, // 0.4 to 0.8
      }));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- The particle layer must begin at the existing progress threshold.
      setParticles(generated);
    }
  }, [startupProgress, particles.length]);

  // Random Loading Quotes Timeline
  useEffect(() => {
    if (!showStartup) return;
    const random = createRuntimeSeededRandom("map-startup-quotes-v1");
    const quotes = [
      "Composing  the map...",
      "Adjusting the position...",
      "Wahib embut...",
      "Otniel keren banget..."
    ];
    let timeoutId;
    const changeQuote = () => {
      setCurrentQuote((prev) => {
        const available = quotes.filter((q) => q !== prev);
        return available[Math.floor(random() * available.length)];
      });
      const nextDelay = 700 + random() * 1100; // random delay between 700ms and 1800ms
      timeoutId = setTimeout(changeQuote, nextDelay);
    };
    timeoutId = setTimeout(changeQuote, 1000);
    return () => clearTimeout(timeoutId);
  }, [showStartup]);

  // 3D Parallax Mouse Tracking
  useEffect(() => {
    if (!showStartup) return;
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      // Max tilt angle around 12 degrees
      const x = (clientX / innerWidth - 0.5) * 24;
      const y = (clientY / innerHeight - 0.5) * -24;
      setTilt({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [showStartup]);

  // Map Event Tracking
  const handleMapReady = useCallback((mapInstance) => {
    // eslint-disable-next-line react-hooks/immutability -- Leaflet calls this external ref callback; the live map must be available synchronously.
    mapRef.current = mapInstance;

    setMapCenter(mapInstance.getCenter());
    setMapZoom(mapInstance.getZoom());

    mapInstance.on("move", () => {
      setMapCenter(mapInstance.getCenter());
    });
    mapInstance.on("zoomend", () => {
      setMapZoom(mapInstance.getZoom());
    });

    mapInstance.on("movestart", () => {});
    mapInstance.on("moveend", () => {
      setIsRecentering(false);
    });
  }, []);

  // derived: users for the map (only online users with coords)
  const mapUsers = useMemo(() => mapUsersData, [mapUsersData]);

  // derived: kalcerians for the sidebar (search filter)
  const sidebarKalcerians = useMemo(() => {
    let list = kalcerians;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.nickname && u.nickname.toLowerCase().includes(q)),
      );
    }
    // sort: online first, then alphabetical
    return list.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [kalcerians, searchQuery]);

  const activeOwnEvent = events.find((e) => e.id === "own");

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
      
      const existingEvent = events.find((ev) => ev.creator?.id === currentUser?.id);
      
      if (existingEvent) {
        await putMiniEvent(existingEvent.id, payload);
      } else {
        await postMiniEvent(payload);
      }
      
      const updatedEvents = await fetchMiniEvents();
      setEvents(mergeEvents(updatedEvents));
      setNotice("Mini event saved.");
      setShowEventModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to save mini event.");
    }
    setBusy(false);
  }

  const handleOpenEventModal = useCallback((open = true) => {
    if (open) {
      const own = events.find((ev) => ev.creator?.id === currentUser?.id || ev.id === "own");
      if (own) {
        const rawDesc = own.description || "";
        const catMatch = rawDesc.match(/\[CAT:([a-z_]+)\]/i);
        const mediaMatch = rawDesc.match(/\[MEDIA:([^\]]+)\]/i);
        const category = catMatch ? catMatch[1].toLowerCase() : (own.category || "cafe");
        const mediaUrl = own.mediaUrl || (mediaMatch ? mediaMatch[1] : "");
        const cleanDesc = rawDesc
          .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
          .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
          .trim();
        setEventForm({
          title: own.title || "",
          description: cleanDesc,
          category,
          mediaUrl,
        });
      } else {
        setEventForm((f) => ({ ...f, category: f.category || "cafe", mediaUrl: f.mediaUrl || "" }));
      }
    }
    setShowEventModal(open);
  }, [events, currentUser]);

  async function deleteMiniEvent() {
    setBusy(true);
    try {
      const existingEvent = events.find((ev) => ev.creator?.id === currentUser?.id);
      if (existingEvent) {
        await delMiniEvent(existingEvent.id);
      }
      const updatedEvents = await fetchMiniEvents();
      setEvents(mergeEvents(updatedEvents));
      setEventForm({ title: "", description: "", category: "cafe", mediaUrl: "" });
      setNotice("Mini event deleted.");
      setShowEventModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to delete mini event.");
    }
    setBusy(false);
  }

  // Independent Pirate manifestation logic
  useEffect(() => {
    if (notLoggedIn || pirateStarted.current) return;
    pirateStarted.current = true;
    const random = createRuntimeSeededRandom("map-pirate-timer-v1");

    const triggerPirate = () => {
      setPirateKey((prev) => prev + 1);
      setShowPirate(true);

      // Set to 12.9s to ensure it cuts off just before a potential second loop
      pirateHideRef.current = setTimeout(() => {
        setShowPirate(false);

        const nextDelay = 30000 + random() * 60000;
        pirateNextRef.current = setTimeout(triggerPirate, nextDelay);
      }, 12000);
    };

    const initialTimeout = setTimeout(triggerPirate, 15000);

    return () => {
      clearTimeout(initialTimeout);
      if (pirateHideRef.current) clearTimeout(pirateHideRef.current);
      if (pirateNextRef.current) clearTimeout(pirateNextRef.current);
    };
  }, [notLoggedIn]);

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
        animate={{ opacity: showStartup ? 0 : 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="fixed inset-0 z-[10] w-full h-full"
        style={{
          visibility: showStartup ? "hidden" : "visible",
          pointerEvents: showStartup ? "none" : "auto",
        }}
      >
        <SnapMap
          users={mapUsers}
          events={events}
          hqPoint={hqPoint}
          onMapReady={handleMapReady}
          focusUserId={focusedUserId}
          isMapDark={isMapDark}
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
      />

      {/* Recenter Button Bottom Right */}
      <button
        type="button"
        className="fixed p-2 z-[1000] bottom-8 right-2 w-[44px] h-[44px] bg-[#0c0c0e] border border-[#1f2937] text-white flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),_0_4px_12px_rgba(0,0,0,0.6),_inset_0_-3px_5px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all hover:bg-[#121215] hover:border-slate-700 rounded-[14px] group active:scale-95 focus-visible:ring-2 focus-visible:ring-white/30 outline-none"
        onClick={recenterMap}
        aria-label="Recenter Map Radar"
        title="Recenter Map"
      >
        <RadialPing
          mode={isCentered ? "in" : "out"}
          color={isCentered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)"}
          className="scale-150"
        />
        <motion.svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="relative z-10 text-white"
          animate={isRecentering ? { rotate: [0, 1080] } : { rotate: 360 }}
          transition={
            isRecentering
              ? { duration: 1.2, ease: "circOut" }
              : { repeat: Infinity, duration: 25, ease: "linear" }
          }
        >
          {/* Center Target Ring */}
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2.5" fill="none" />
          
          {/* Radiating spokes (Claude / Roda styling) */}
          <line x1="12" y1="2" x2="12" y2="7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="16.5" x2="12" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="2" y1="12" x2="7.5" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="16.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          
          <line x1="4.93" y1="4.93" x2="8.82" y2="8.82" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="15.18" y1="15.18" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="4.93" y1="19.07" x2="8.82" y2="15.18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="15.18" y1="8.82" x2="19.07" y2="4.93" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </motion.svg>
      </button>

      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="fixed bottom-[-20px] left-1/2 -translate-x-1/2 z-[1000] pointer-events-none select-none flex flex-col items-center"
      >
        <Image
          src="/kalcermap_bottom.png"
          alt="Kalceria Maps"
          width={2048}
          height={2048}
          sizes="256px"
          quality={90}
          loading="lazy"
          className="h-[256px] w-auto object-contain opacity-95 filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
          draggable={false}
        />
      </motion.div>

      {/* Randomized Pirate Interception Overlay */}
      {showPirate && (
        <div className="fixed bottom-0 right-0 z-[900] w-[15vw] pointer-events-none animate-in fade-in slide-in-from-bottom-20 duration-1000">
          <ContentImage
            key={pirateKey}
            src="/map/pirate_overview_looped.webp"
            alt="Pirate Intel"
            width={240}
            height={426}
            className="w-full h-auto opacity-80 mix-blend-screen"
          />
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.3);
          border-radius: 4px;
        }

        @keyframes float {
          0% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(15vw, 15vh) scale(1.2);
          }
          50% {
            transform: translate(-10vw, 20vh) scale(0.9);
          }
          75% {
            transform: translate(20vw, -15vh) scale(1.3);
          }
          100% {
            transform: translate(-5vw, -10vh) scale(1.1);
          }
        }

        @keyframes float-wide {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
          25% {
            transform: translate(80vw, 20vh) scale(1.4);
            opacity: 0.4;
          }
          50% {
            transform: translate(40vw, 80vh) scale(0.8);
            opacity: 0.2;
          }
          75% {
            transform: translate(-20vw, 40vh) scale(1.2);
            opacity: 0.3;
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
        }

        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        @keyframes floatUp {
          0% {
            transform: translateY(10px);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-115vh);
            opacity: 0;
          }
        }

        @keyframes floatUpBox {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-80vh) scale(1.1);
            opacity: 0;
          }
        }

        #panel-toggle:checked ~ section .toggle-arrow {
          transform: rotate(180deg);
        }
      `}</style>
      {/* Startup Sequence Overlay :: FORZA HORZON STYLE */}
      <StartupSequenceOverlay
        showStartup={showStartup}
        startupProgress={startupProgress}
        particles={particles}
        hasMounted={hasMounted}
        currentQuote={currentQuote}
        tilt={tilt}
      />

      <MapModals
        offlineUserObj={offlineUserObj}
        setSelectedOfflineUser={setSelectedOfflineUser}
        showStatusModal={showStatusModal}
        setShowStatusModal={setShowStatusModal}
        isMapDark={isMapDark}
        saveBroadcast={saveBroadcast}
        statusText={statusText}
        setStatusText={setStatusText}
        busy={busy}
        showEventModal={showEventModal}
        setShowEventModal={handleOpenEventModal}
        saveMiniEvent={saveMiniEvent}
        eventForm={eventForm}
        setEventForm={setEventForm}
        activeOwnEvent={activeOwnEvent}
        deleteMiniEvent={deleteMiniEvent}
        isExiting={isExiting}
        showQuitModal={showQuitModal}
        setShowQuitModal={setShowQuitModal}
        handleQuitConfirm={handleQuitConfirm}
      />
    </main>
  );
}
