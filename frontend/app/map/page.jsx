"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { KalceriansPanel } from "@/components/map/KalceriansPanel";
import { StartupSequenceOverlay } from "@/components/map/StartupSequenceOverlay";
import RadialPing from "@/components/map/RadialPing";
import { userPopup } from "@/components/map/UserPopup";
import { createRuntimeSeededRandom, createSeededRandom } from "@/lib/seededRandom";
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
  videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
};

// ☁️ Static Pixel Cloud Definitions for consistent transition


// 🛰 Optimized Tactical Network (Canvas-based Particles & Links)



// ─── Vintage Laser Grid ──────────────────────────────────────────────


// ─── Smooth Domino Chevrons for B&W/Red-Black Dash Transition ─────────


export default function MapPage() {
  const scheduleTimeout = useTimeoutRegistry();
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [mapUsersData, setMapUsersData] = useState([]);
  const [kalcerians, setKalcerians] = useState([]);
  const [events, setEvents] = useState([]);
  const [presence, setPresence] = useState("online");
  const [, setNotice] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showHqModal, setShowHqModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [eventForm, setEventForm] = useState({ title: "", description: "" });
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
  const [hasMounted, setHasMounted] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [hoveredKalcerian, setHoveredKalcerian] = useState(null);
  const [hasInitialCentered, setHasInitialCentered] = useState(false);
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

  const loginGateParticles = useMemo(() => {
    const random = createSeededRandom("map-login-gate-particles-v1");
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${random() * 100}%`,
      top: `${random() * 100}%`,
      size: random() > 0.85 ? 5 : 2,
      color: ['#FF0000', '#FF3C00', '#FF7B00', '#FFA600'][Math.floor(random() * 4)],
      delay: random() * 5,
      duration: 4 + random() * 5,
      xDrift: (random() - 0.5) * 80,
      yDrift: (random() - 0.5) * 80,
    }));
  }, []);

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

  // Handle Hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Login gate + fetch user profile
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setNotLoggedIn(true);
      return;
    }
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
        setEvents(activeEvents || []);
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



  // Auto-center on initial load once user location is known
  useEffect(() => {
    if (!hasInitialCentered && mapRef.current && mapUsersData.length > 0 && currentUser) {
      const me = mapUsersData.find((u) => u.id === currentUser.id);
      if (me && me.lat && me.lng) {
        recenterMap();
        setHasInitialCentered(true);
      }
    }
  }, [hasInitialCentered, mapUsersData, currentUser]);

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
    if (sessionStorage.getItem("mapIntroSeen") === "true") {
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
  }, [scheduleTimeout]);

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

  function recenterMap() {
    if (!mapRef.current) return;
    setIsRecentering(true);
    const me = mapUsersData.find((u) => u.id === currentUser?.id);
    if (me && me.lat && me.lng) {
      mapRef.current.flyTo([me.lat, me.lng], 16);
    } else {
      mapRef.current.flyTo([-6.2715, 106.7135], 14);
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
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
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
      setEvents(updatedEvents || []);
      setNotice("Mini event saved.");
      setShowEventModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to save mini event.");
    }
    setBusy(false);
  }

  async function deleteMiniEvent() {
    setBusy(true);
    try {
      const existingEvent = events.find((ev) => ev.creator?.id === currentUser?.id);
      if (existingEvent) {
        await delMiniEvent(existingEvent.id);
      }
      const updatedEvents = await fetchMiniEvents();
      setEvents(updatedEvents || []);
      setEventForm({ title: "", description: "" });
      setNotice("Mini event deleted.");
      setShowEventModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to delete mini event.");
    }
    setBusy(false);
  }

  // Listen for HQ modal trigger from Leaflet popups
  useEffect(() => {
    const handleOpenHq = () => setShowHqModal(true);
    window.addEventListener("openHq", handleOpenHq);
    return () => window.removeEventListener("openHq", handleOpenHq);
  }, []);

  // Independent Pirate manifestation logic
  useEffect(() => {
    if (pirateStarted.current) return;
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
  }, []);

  // login gate
  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050a14] relative flex items-center justify-center overflow-hidden text-white font-mono z-50">
        {/* Animated Background Blobs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: ["-10%", "10%", "-10%"], y: ["-5%", "5%", "-5%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#00FFFF]/30 pointer-events-none z-0"
        />
        <motion.div
          animate={{ scale: [1.1, 1.3, 1.1], x: ["10%", "-10%", "10%"], y: ["5%", "-5%", "5%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[15%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#ff006e]/40 pointer-events-none z-0"
        />

        {/* Micro Particle Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
          {loginGateParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                left: p.left,
                top: p.top,
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}`,
              }}
              animate={{
                x: [0, p.xDrift, 0],
                y: [0, p.yDrift, 0],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: p.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center flex flex-col items-center gap-8 max-w-lg px-6">
          {/* mapman.webp replacing door box, static */}
          <img 
            src="/mapman.webp"
            alt="Mapman"
            className="w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(0,255,255,0.35)]"
          />

          <div className="space-y-4">
            <h1 
              className="font-sans font-black uppercase tracking-tighter text-4xl md:text-5xl lg:text-6xl text-white"
              style={{
                textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)"
              }}
            >
              Authentication Required
            </h1>
            <p className="font-sans text-white text-sm md:text-base font-semibold tracking-wide max-w-sm mx-auto opacity-90">
              You need to login first to access the Kalcerians Map.
            </p>
          </div>

          {/* Go to Login - Styled 100% same as see event explore button */}
          <Link 
            href="/?auth=true" 
            className="pointer-events-auto mt-2"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("triggerAuth", "true");
              }
            }}
          >
            <button
              className="relative px-12 py-4 font-sans font-extrabold uppercase tracking-widest text-[13px] text-[#050a14] bg-white border border-white transition-all hover:border-[#FF00FF] hover:bg-transparent hover:text-white group cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
            >
              <span className="relative z-10">GO TO LOGIN</span>
              <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const offlineUserObj = selectedOfflineUser ? sidebarKalcerians.find((k) => k.id === selectedOfflineUser) : null;

  return (
    <div 
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

      {/* Header HUD */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="absolute z-[1000] top-4 left-4 right-4 flex justify-between items-start gap-3 pointer-events-none max-[860px]:top-3 max-[860px]:left-3 max-[860px]:right-3"
      >
        <button
          onClick={() => setShowQuitModal(true)}
          aria-label="Back to home"
          className="relative pointer-events-auto inline-flex items-center justify-center w-[44px] h-[44px] bg-[#0c0c0e] border border-[#1f2937] text-white transition-all duration-300 rounded-[14px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),_0_4px_12px_rgba(0,0,0,0.6),_inset_0_-3px_5px_rgba(0,0,0,0.8)] hover:bg-red-600 hover:border-red-400 active:bg-red-700 active:border-red-500 active:scale-95 backdrop-blur-xl outline-none overflow-hidden group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="relative z-10 transition-transform group-hover:-translate-x-0.5"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="relative flex items-start gap-4">
          {/* Telemetry HUD */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="hidden min-[1100px]:flex flex-col items-end gap-1 pointer-events-auto"
          >
            <div className={`relative flex items-center gap-3 px-4 h-[44px] rounded-[14px] backdrop-blur-xl transition-all duration-500 overflow-hidden ${
              isMapDark 
                ? "bg-white/[0.03] border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_8px_32px_rgba(0,0,0,0.4)]" 
                : "bg-white/70 border border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
            }`}>

              <div className="flex flex-col items-start">
                <span 
                  className={`text-[12px] font-bold tracking-wider ${isMapDark ? "text-gray-300" : "text-slate-800"}`}
                  style={{ textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.8)" : "none" }}
                >
                  Telemetry
                </span>
                <div className="flex gap-4 items-baseline">
                  <div className="flex gap-1 items-baseline">
                    <span 
                      className={`text-[10px] font-bold tracking-wider ${isMapDark ? "text-gray-300" : "text-slate-500"}`}
                      style={{ textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.6)" : "none" }}
                    >
                      LAT
                    </span>
                    <span 
                      className={`text-[12px] font-normal font-mono tracking-tight ${isMapDark ? "text-white" : "text-slate-900"}`}
                      style={{ 
                        textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.85), 3px 3px 1px rgba(0,0,0,0.95)" : "none",
                        color: isMapDark ? "#ffffff" : "#0f172a"
                      }}
                    >
                      {mapCenter.lat.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex gap-1 items-baseline">
                    <span 
                      className={`text-[10px] font-bold tracking-wider ${isMapDark ? "text-gray-300" : "text-slate-500"}`}
                      style={{ textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.6)" : "none" }}
                    >
                      LNG
                    </span>
                    <span 
                      className={`text-[12px] font-normal font-mono tracking-tight ${isMapDark ? "text-white" : "text-slate-900"}`}
                      style={{ 
                        textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.85), 3px 3px 1px rgba(0,0,0,0.95)" : "none",
                        color: isMapDark ? "#ffffff" : "#0f172a"
                      }}
                    >
                      {mapCenter.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`w-[1px] h-6 mx-1 ${isMapDark ? "bg-white/10" : "bg-slate-200"}`} />

              <div className="flex flex-col items-start">
                <span 
                  className={`text-[10px] font-bold tracking-wider ${isMapDark ? "text-gray-300" : "text-slate-500"}`}
                  style={{ textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.6)" : "none" }}
                >
                  Ping
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-[2px] items-end h-3">
                    {[4, 6, 8, 10, 12].map((h, i) => (
                      <div
                        key={i}
                        className={`w-[2.5px] rounded-full ${i < 4 ? "bg-emerald-400" : (isMapDark ? "bg-white/15" : "bg-slate-300")}`}
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <span 
                    className={`text-[12px] font-mono tracking-tight ${isMapDark ? "text-white font-extrabold" : "text-slate-900 font-bold"}`}
                    style={{ 
                      textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.85), 3px 3px 1px rgba(0,0,0,0.95)" : "none",
                      color: isMapDark ? "#ffffff" : "#0f172a"
                    }}
                  >
                    Stable
                  </span>
                </div>
              </div>

              <div className={`w-[1px] h-6 mx-1 ${isMapDark ? "bg-white/10" : "bg-slate-200"}`} />

              <div className="flex flex-col items-start">
                <span 
                  className={`text-[10px] font-bold tracking-wider ${isMapDark ? "text-gray-300" : "text-slate-500"}`}
                  style={{ textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.6)" : "none" }}
                >
                  Zoom
                </span>
                <span 
                  className={`text-[12px] font-normal font-mono tracking-tight ${isMapDark ? "text-white" : "text-slate-900"}`}
                  style={{ 
                    textShadow: isMapDark ? "1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.85), 3px 3px 1px rgba(0,0,0,0.95)" : "none",
                    color: isMapDark ? "#ffffff" : "#0f172a"
                  }}
                >
                  x{mapZoom.toFixed(1)}
                </span>
              </div>
            </div>
          </motion.div>

          <button
            type="button"
            aria-label="Quick Actions Menu"
            aria-expanded={actionMenuOpen}
            aria-haspopup="true"
            className={`pointer-events-auto flex items-center justify-center w-[44px] h-[44px] border transition-all duration-300 rounded-[14px] focus-visible:ring-2 focus-visible:ring-white/30 outline-none group active:scale-95 ${
              actionMenuOpen
                ? "bg-black border-white text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),_0_4px_16px_rgba(255,255,255,0.25)]"
                : "bg-[#0c0c0e] border-[#1f2937] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),_0_4px_12px_rgba(0,0,0,0.6),_inset_0_-3px_5px_rgba(0,0,0,0.8)] hover:bg-[#121215] hover:border-slate-500 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuOpen((prev) => !prev);
              setMenuOpen(false);
            }}
          >
            <div className="relative flex items-center justify-center">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className={`relative z-10 transition-transform duration-300 ${
                  actionMenuOpen
                    ? "rotate-45 scale-110"
                    : "group-hover:rotate-90 group-hover:scale-110"
                }`}
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          <div
            className={`absolute top-[54px] right-0 z-[1001] w-[240px] p-2 bg-black/40 backdrop-blur-[32px] border border-white/20 rounded-[20px] shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),_0_12px_48px_rgba(0,0,0,0.7)] transition-all duration-300 origin-top-right overflow-hidden ${
              actionMenuOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            {/* Extremely Subtle High-Gloss Internal Reflections */}
            <div className="absolute inset-0 pointer-events-none z-[-1]">
              <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-white/[0.02] rounded-full blur-[40px]" />
            </div>

            <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-200">
              Quick Actions
            </p>
            <div className="flex flex-col gap-0.5 mt-1 relative z-10">
              <button
                type="button"
                className="w-full flex flex-col px-3 py-2.5 text-left border border-transparent hover:border-white/10 hover:bg-white/[0.05] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] rounded-lg transition-all duration-300 relative overflow-hidden group"
                onClick={() => {
                  setShowStatusModal(true);
                  setActionMenuOpen(false);
                }}
              >
                {/* Magenta Blob on Hover */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-lg">
                  <motion.div
                    className="absolute -top-[50%] -right-[20%] w-[100px] h-[100px] bg-[#ff006e]/25 rounded-full blur-[25px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    animate={{
                      x: [0, -15, 10, -5, 0],
                      y: [0, 10, -15, 5, 0],
                      scale: [1, 1.25, 0.85, 1.15, 1],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
                <div className="relative z-10">
                  <b className="text-[13px] font-bold text-white group-hover:text-white">
                    Update Status
                  </b>
                  <p className="text-[9px] text-white/35 group-hover:text-white/50 transition-colors mt-0.5">
                    Update activity & location
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="w-full flex flex-col px-3 py-2.5 text-left border border-transparent hover:border-white/10 hover:bg-white/[0.05] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] rounded-lg transition-all duration-300 relative overflow-hidden group"
                onClick={() => {
                  setShowEventModal(true);
                  setActionMenuOpen(false);
                }}
              >
                {/* Golden Blob on Hover */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-lg">
                  <motion.div
                    className="absolute -top-[50%] -right-[20%] w-[100px] h-[100px] bg-[#ffd60a]/25 rounded-full blur-[25px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    animate={{
                      x: [0, 15, -10, 5, 0],
                      y: [0, -10, 15, -5, 0],
                      scale: [1, 0.85, 1.25, 0.9, 1],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
                <div className="relative z-10">
                  <b className="text-[13px] font-bold text-white group-hover:text-white">
                    Create Mini Event
                  </b>
                  <p className="text-[9px] text-white/35 group-hover:text-white/50 transition-colors mt-0.5">
                    Start an instant meetup
                  </p>
                </div>
              </button>
              {/* <button
                type="button"
                className="w-full flex flex-col px-3 py-2.5 text-left hover:bg-white/5 rounded-lg transition-colors group"
                onClick={() => {
                  setShowHqModal(true);
                  setActionMenuOpen(false);
                }}
              >
                <b className="text-[13px] font-semibold text-white group-hover:text-white uppercase">
                  View HQ Intel
                </b>
                <small className="text-[9px] text-white/35">
                  Bintaro sector data
                </small>
              </button> */}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <button
              type="button"
              aria-label="User Profile and Radar Status"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="pointer-events-auto w-[44px] h-[44px] flex items-center justify-center bg-white/5 border border-white/10 hover:border-white/20 transition-all rounded-xl shadow-lg backdrop-blur-md relative group focus-visible:ring-2 focus-visible:ring-white/30 outline-none"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
                setActionMenuOpen(false);
              }}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/20 relative">
                {isStatusBusy && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-[2px]">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full"
                    />
                  </div>
                )}
                <img
                  src={avatarUrl(currentUser)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-[1.5px] border-[#0a0e27] rounded-full ${
                  isStatusBusy ? "bg-amber-400" : (presence === "online" ? "bg-emerald-400" : "bg-slate-500")
                }`}
              />
            </button>
 
            <div
              className={`absolute top-[54px] right-0 z-[1001] w-[230px] p-2 bg-black/40 backdrop-blur-[32px] border border-white/20 rounded-[20px] shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),_0_12px_48px_rgba(0,0,0,0.7)] transition-all duration-300 origin-top-right overflow-hidden ${
                menuOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              {/* Extremely Subtle High-Gloss Internal Reflections */}
              <div className="absolute inset-0 pointer-events-none z-[-1]">
                <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-white/[0.02] rounded-full blur-[40px]" />
              </div>
 
              <p className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-200">
                Radar visibility
              </p>
              <div className="flex flex-col gap-0.5 mt-1 relative z-10">
                {["online", "invisible"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={isStatusBusy}
                    className={`group relative w-full grid grid-cols-[12px_1fr] gap-3 px-3 py-2.5 text-left transition-all rounded-none border-l-[3px] overflow-hidden ${
                      presence === item
                        ? (item === "online" 
                            ? "bg-emerald-500/[0.08] border-emerald-400/80 text-white" 
                            : "bg-slate-500/[0.08] border-slate-400/80 text-white")
                        : "border-transparent text-white/40 hover:bg-white/[0.05] hover:border-white/10 hover:text-white"
                    } ${isStatusBusy ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handlePresenceChange(item)}
                  >
                    {/* Dynamic Color Blobs */}
                    {item === "online" && (
                      <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-500 ${
                        presence === item ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                        <div className="absolute top-1/2 left-2 -translate-y-1/2 w-[80px] h-[80px] bg-gradient-to-r from-emerald-400/35 via-teal-300/30 to-transparent rounded-full blur-[20px] animate-pulse" />
                      </div>
                    )}
                    {item === "invisible" && (
                      <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-500 ${
                        presence === item ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                        <div className="absolute top-1/2 left-2 -translate-y-1/2 w-[80px] h-[80px] bg-gradient-to-r from-slate-400/35 via-blue-500/20 to-transparent rounded-full blur-[20px] animate-pulse" />
                      </div>
                    )}
 
                    <span
                      className={`relative z-10 w-[10px] h-[10px] rounded-full self-center ${
                        item === "online" 
                          ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" 
                          : "bg-slate-400 shadow-[0_0_8px_#94a3b8]"
                      }`}
                    />
                    <div className="relative z-10 flex flex-col">
                      <span className="text-[12px] font-bold tracking-wide text-white capitalize">
                        {item}
                      </span>
                      <span className="text-[9px] text-white font-normal leading-tight mt-0.5">
                        {isStatusBusy && presence === item ? "Syncing..." : (item === "online" ? "Visible to public" : "Stealth mode")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

            {/* ── Moon Box ── Tactical Bevelled Toggle ── */}
            <button
              type="button"
              aria-label={isMapDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              onClick={(e) => {
                e.stopPropagation();
                setIsMapDark((prev) => !prev);
              }}
              className={`
                pointer-events-auto relative w-[44px] h-[44px] flex items-center justify-center
                rounded-[14px] border transition-all duration-300 ease-out
                focus-visible:ring-2 outline-none
                active:scale-95 select-none overflow-hidden
                ${isMapDark
                  ? "bg-[#0c0c0e] border-[#1f2937] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),_0_4px_12px_rgba(0,0,0,0.6),_inset_0_-3px_5px_rgba(0,0,0,0.8)] hover:bg-[#121215] hover:border-slate-700"
                  : "bg-white border-[#e5e7eb] text-black shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_4px_12px_rgba(0,0,0,0.1),_inset_0_-2px_4px_rgba(0,0,0,0.15)] hover:bg-[#f3f4f6]"
                }
              `}
            >
              {/* Dynamic Icon */}
              <span className="relative z-10 transition-all duration-300 transform">
                {isMapDark ? (
                  /* White Sun for Dark Mode */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" fill="currentColor" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  /* Black Moon for Light Mode */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>
      </motion.header>

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

      {/* Floating Coki Map Image beside the Kalcerian box */}
      <div 
        className={`absolute z-[999] top-[100px] w-[140px] h-[140px] pointer-events-none transition-all duration-500 max-[860px]:hidden ${
          drawerOpen ? "left-[380px]" : "left-[60px]"
        }`}
      >
        <motion.img
          src="/cokimap.png"
          alt="Coki Map Floating"
          className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          style={{ transformOrigin: "center" }}
          animate={{ 
            y: [0, -8, 0],
            rotate: [13, 17, 13] /* breathes tipis-tipis around 15 degrees */
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>

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
        <img
          src="/kalcermap_bottom.png"
          alt="Kalceria Maps"
          className="h-[256px] w-auto object-contain opacity-95 filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
          draggable={false}
        />
      </motion.div>

      {/* Randomized Pirate Interception Overlay */}
      {showPirate && (
        <div className="fixed bottom-0 right-0 z-[900] w-[15vw] pointer-events-none animate-in fade-in slide-in-from-bottom-20 duration-1000">
          <img
            key={pirateKey}
            src="/map/pirate_overview_looped.gif"
            alt="Pirate Intel"
            className="w-full h-auto opacity-80 mix-blend-screen"
          />
        </div>
      )}

      {/* Modals with enhanced HUD design */}
      
      {/* Offline User Global Popup */}
      {offlineUserObj && !offlineUserObj.isOnline && (
        <div
          className="fixed inset-0 md:inset-auto md:left-[380px] md:top-1/2 md:-translate-y-1/2 z-[3000] flex items-center justify-center md:block pointer-events-auto bg-black/60 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none"
          onClick={() => setSelectedOfflineUser(null)}
        >
          <div 
             onClick={(e) => e.stopPropagation()}
             className="relative [&>.popup-tail]:hidden shadow-2xl rounded-[16px] overflow-hidden bg-[#0a0e27]/40 backdrop-blur-3xl" 
             dangerouslySetInnerHTML={{ __html: userPopup(offlineUserObj) }} 
          />
        </div>
      )}

      {showStatusModal && (
        <div
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/60 backdrop-blur-sm p-5 animate-in fade-in duration-300"
          onClick={() => setShowStatusModal(false)}
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={`relative w-full max-w-[420px] rounded-[24px] shadow-2xl overflow-hidden backdrop-blur-xl transition-colors duration-500 ${
              isMapDark ? "bg-[#0a0f1a]/45 border border-white/[0.15]" : "bg-white/45 border border-slate-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dynamic Distributed Deepblue - Magenta Blobs */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              <motion.div 
                animate={{ scale: [1, 1.15, 0.9, 1], x: [0, 10, -10, 0], y: [0, -10, 10, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -left-[20%] w-[65%] h-[65%] bg-blue-600/[0.22] rounded-full blur-[50px]"
              />
              <motion.div 
                animate={{ scale: [1.1, 0.9, 1.15, 1.1], x: [0, -10, 10, 0], y: [0, 10, -10, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-[25%] -right-[20%] w-[65%] h-[65%] bg-pink-500/[0.18] rounded-full blur-[50px]"
              />
            </div>

            <div className="relative z-10 flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className={`font-sans font-bold text-lg tracking-tight ${isMapDark ? "text-white" : "text-slate-900"}`}>
                Update Status
              </h2>
              <button
                type="button"
                className={`text-2xl leading-none relative z-10 transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isMapDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                }`}
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveBroadcast} className="relative z-10 p-6 flex flex-col gap-5">
              <p className={isMapDark ? "text-white/60 text-sm leading-relaxed tracking-wide" : "text-slate-600 text-sm leading-relaxed tracking-wide"}>
                Share your current activity with other Kalcerians for 24h.
              </p>
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-semibold tracking-wider ${isMapDark ? "text-slate-400" : "text-slate-500"}`}>
                  Broadcast
                </label>
                <textarea
                  className={`w-full border rounded-lg p-4 text-sm focus:border-slate-500 outline-none min-h-[120px] transition-all ${
                    isMapDark ? "bg-white/[0.03] border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="OTW FM..."
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className={`w-full py-3.5 backdrop-blur-md border text-xs font-bold tracking-wider rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-50 disabled:pointer-events-none ${
                    isMapDark 
                      ? "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30" 
                      : "bg-slate-900/10 border-slate-900/20 text-slate-800 hover:bg-slate-900/20 hover:border-slate-900/30"
                  }`}
                  disabled={busy}
                >
                  {busy ? "Processing..." : "Post Status"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEventModal && (
        <div
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/60 backdrop-blur-sm p-5 animate-in fade-in duration-300"
          onClick={() => setShowEventModal(false)}
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={`relative w-full max-w-[440px] rounded-[24px] shadow-2xl overflow-hidden backdrop-blur-xl transition-colors duration-500 ${
              isMapDark ? "bg-[#0a0f1a]/45 border border-white/[0.15]" : "bg-white/45 border border-slate-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dynamic Distributed Deepblue - Gold Blobs */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              <motion.div 
                animate={{ scale: [1, 1.12, 0.92, 1], x: [0, 8, -8, 0], y: [0, -8, 8, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -left-[20%] w-[65%] h-[65%] bg-blue-600/[0.22] rounded-full blur-[50px]"
              />
              <motion.div 
                animate={{ scale: [1.08, 0.92, 1.1, 1.08], x: [0, -8, 8, 0], y: [0, 8, -8, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                className="absolute -bottom-[25%] -right-[20%] w-[65%] h-[65%] bg-[#ffd60a]/[0.16] rounded-full blur-[50px]"
              />
            </div>

            <div className="relative z-10 flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className={`font-sans font-bold text-lg tracking-tight ${isMapDark ? "text-white" : "text-slate-900"}`}>
                Create Your Own Event
              </h2>
              <button
                type="button"
                className={`text-2xl leading-none relative z-10 transition-all duration-200 hover:scale-110 active:scale-95 ${
                  isMapDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                }`}
                onClick={() => setShowEventModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveMiniEvent} className="relative z-10 p-6 flex flex-col gap-5">
              <p className={isMapDark ? "text-white/60 text-sm leading-relaxed tracking-wide" : "text-slate-600 text-sm leading-relaxed tracking-wide"}>
                Share your current activity with other Kalcerians for 24h.
              </p>
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-semibold tracking-wider ${isMapDark ? "text-slate-400" : "text-slate-500"}`}>
                  Event Title
                </label>
                <input
                  className={`w-full border rounded-lg p-3.5 text-sm focus:border-slate-500 outline-none transition-all ${
                    isMapDark ? "bg-white/[0.03] border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Nongs FM Sini"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-semibold tracking-wider ${isMapDark ? "text-slate-400" : "text-slate-500"}`}>
                  Briefing
                </label>
                <textarea
                  className={`w-full border rounded-lg p-3.5 text-sm focus:border-slate-500 outline-none min-h-[100px] transition-all ${
                    isMapDark ? "bg-white/[0.03] border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Agenda details"
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className={`w-full py-3.5 backdrop-blur-md border text-xs font-bold tracking-wider rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-50 disabled:pointer-events-none ${
                    isMapDark 
                      ? "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30" 
                      : "bg-slate-900/10 border-slate-900/20 text-slate-800 hover:bg-slate-900/20 hover:border-slate-900/30"
                  }`}
                  disabled={busy}
                >
                  {busy ? "Deploying..." : (activeOwnEvent ? "Update Signal" : "Deploy Signal")}
                </button>
                {activeOwnEvent && (
                  <button
                    type="button"
                    className="w-full py-3.5 border border-pink-500/30 bg-pink-500/10 backdrop-blur-md text-pink-400 font-semibold text-xs tracking-wider rounded-xl hover:bg-pink-500/20 hover:border-pink-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    onClick={deleteMiniEvent}
                    disabled={busy}
                  >
                    {busy ? "Recalling..." : "Recall Signal"}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* HQ Modal */}
      {showHqModal && (
        <div
          className="fixed inset-0 z-[3000] grid place-items-center bg-black/60 backdrop-blur-2xl p-4 sm:p-8 animate-in zoom-in-95 duration-300"
          onClick={() => setShowHqModal(false)}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-amber-500 rounded-full blur-[140px] opacity-[0.15] animate-[float-wide_30s_infinite_linear]" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] bg-pink-500 rounded-full blur-[120px] opacity-[0.1] animate-[float-wide_35s_infinite_reverse_linear]" />
          </div>

          <div
            className="relative w-full max-w-5xl bg-[#0a0f1a]/50 backdrop-blur-xl border border-white/[0.12] rounded-[24px] shadow-2xl flex flex-col md:flex-row overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-6 z-50 text-white/20 text-4xl hover:text-white transition-colors"
              onClick={() => setShowHqModal(false)}
            >
              ×
            </button>

            <div className="w-full md:w-2/3 bg-black relative aspect-video md:aspect-auto rounded-l-2xl overflow-hidden">
              <video
                className="w-full h-full object-cover opacity-70"
                autoPlay
                loop
                muted
                playsInline
                src={hqPoint.videoUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c1528] via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-8 left-8 flex items-center gap-4">
                <div className="w-0.5 h-8 bg-white/30 rounded-full" />
                <h3 className="font-sans font-bold text-2xl text-white uppercase tracking-tight leading-none">
                  Live Feed
                </h3>
              </div>
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
                  Encrypted Signal
                </span>
              </div>
            </div>

            <div className="w-full md:w-1/3 p-10 flex flex-col justify-center gap-8 bg-transparent border-l border-white/5">
              <div>
                <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-2 block">
                  Main Base
                </label>
                <h4 className="font-sans font-bold text-3xl text-white uppercase leading-none tracking-tight">
                  Fresh Market Bintaro
                </h4>
              </div>
              <div className="w-full h-px bg-white/5" />
              <div>
                <p className="text-white/60 text-sm leading-relaxed italic">
                  &quot;{hqPoint.description}&quot;
                </p>
              </div>
              <button
                className="w-full py-4 border border-white/10 text-white font-semibold text-xs tracking-wider rounded-lg hover:bg-white/5 hover:border-white/20 transition-all"
                onClick={() => setShowHqModal(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
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

      {/* Cinematic Solid White Light Flash Layer */}
      <AnimatePresence>
        {isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="fixed inset-0 bg-white z-[9999] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Quit Modal */}
      {showQuitModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center animate-in fade-in duration-200">
          {/* Backdrop with near-zero dimming to let map colors fully bleed through */}
          <div 
            className="absolute inset-0 bg-black/[0.05]" 
            onClick={() => setShowQuitModal(false)} 
          />
          
          {/* Modal Glass Box */}
          <div 
            className="relative z-[2010] w-[90%] max-w-[400px] p-8 rounded-2xl flex flex-col items-center justify-center backdrop-blur-xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.6),0_0_50px_rgba(0,255,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-white/[0.2] animate-in zoom-in-95 duration-200"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Cyan Blob */}
            <div 
              className="absolute -top-16 -left-16 w-44 h-44 bg-[#00FFFF] rounded-full blur-[40px] opacity-40 z-0 pointer-events-none animate-pulse"
            />
            
            <h3 className="relative z-10 text-xl font-sans font-black text-white mb-8 tracking-tighter text-center uppercase">
              Wanna quit the map?
            </h3>
            
            <div className="relative z-10 w-full flex items-center gap-4">
              <button 
                onClick={handleQuitConfirm} 
                className="flex-1 py-4 bg-red-600 rounded-xl text-white font-black uppercase tracking-tighter hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                Yes
              </button>
              <button 
                onClick={() => setShowQuitModal(false)} 
                className="flex-1 py-4 bg-white/10 rounded-xl text-white font-black uppercase tracking-tighter hover:bg-white/20 transition-all"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
