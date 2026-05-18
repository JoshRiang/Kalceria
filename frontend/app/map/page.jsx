"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import RadialPing from "@/components/map/RadialPing";
import { userPopup } from "@/components/map/UserPopup";
import {
  fetchMe,
  fetchMapUsers,
  fetchKalcerians,
  fetchMiniEvents,
  postBroadcast,
  putBroadcast,
  delBroadcast,
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
const STATIC_CLOUDS = [
  { w: 400, h: 180, x: 5, y: 10 },
  { w: 350, h: 150, x: 60, y: 5 },
  { w: 280, h: 120, x: 30, y: 40 },
  { w: 420, h: 200, x: 75, y: 45 },
  { w: 320, h: 140, x: 10, y: 70 },
  { w: 500, h: 250, x: 55, y: 80 },
  { w: 250, h: 100, x: 85, y: 25 },
  { w: 380, h: 160, x: -5, y: 50 },
];

// 🛰 Optimized Tactical Network (Canvas-based Particles & Links)

const TacticalNet = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = [];
    const particleCount = 80;
    const maxDist = 150;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        color:
          i % 7 === 0
            ? "#ffd60a"
            : i % 5 === 0
              ? "#ff006e"
              : "rgba(255,255,255,0.6)",
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // 🔗 Distance-based Linking (User Logic)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
};

export default function MapPage() {
  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [mapUsersData, setMapUsersData] = useState([]);
  const [kalcerians, setKalcerians] = useState([]);
  const [events, setEvents] = useState([]);
  const [presence, setPresence] = useState("online");
  const [notice, setNotice] = useState("");
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
  const [isGlitching, setIsGlitching] = useState(false);
  const [showPirate, setShowPirate] = useState(false);
  const [showStartup, setShowStartup] = useState(false);
  const [startupStep, setStartupStep] = useState(0);
  const [startupProgress, setStartupProgress] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [hoveredKalcerian, setHoveredKalcerian] = useState(null);
  const [selectedKalcerian, setSelectedKalcerian] = useState(null);
  const [hasInitialCentered, setHasInitialCentered] = useState(false);
  const [isStatusBusy, setIsStatusBusy] = useState(false);
  const [focusedUserId, setFocusedUserId] = useState(null);
  const [selectedOfflineUser, setSelectedOfflineUser] = useState(null);

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

    const steps = [
      "INITIALIZING ENCRYPTED UPLINK...",
      "SYNCING OPERATIVE SIGNALS [BINTARO SECTOR]...",
      "FETCHING KALCERIAN DATA STREAMS...",
      "CALIBRATING RADAR HUD OVERLAY...",
      "ALL SIGNALS STABLE. ACCESS GRANTED.",
    ];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 12;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setShowStartup(false);
        }, 800);
      }
      setStartupProgress(currentProgress);

      const stepIdx = Math.min(
        Math.floor((currentProgress / 100) * steps.length),
        steps.length - 1,
      );
      setStartupStep(stepIdx);
    }, 200);

    return () => clearInterval(interval);
  }, []);

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

  const startupMessages = [
    "INITIALIZING ENCRYPTED UPLINK...",
    "SYNCING OPERATIVE SIGNALS [BINTARO SECTOR]...",
    "FETCHING KALCERIAN DATA STREAMS...",
    "CALIBRATING RADAR HUD OVERLAY...",
    "ALL SIGNALS STABLE. ACCESS GRANTED.",
  ];

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

  async function handleDeleteBroadcast() {
    setBusy(true);
    try {
      await delBroadcast();
      const user = await fetchMe();
      setCurrentUser(user);
      setStatusText("");
      setNotice("Broadcast deleted.");
      setShowStatusModal(false);
    } catch (err) {
      setNotice(err.message || "Failed to delete broadcast.");
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

  useEffect(() => {
    let glitchTimeout;
    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 150);
      const nextDelay = Math.random() * 4000 + 1000;
      glitchTimeout = setTimeout(triggerGlitch, nextDelay);
    };
    triggerGlitch();

    return () => clearTimeout(glitchTimeout);
  }, []);

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

    const triggerPirate = () => {
      setPirateKey((prev) => prev + 1);
      setShowPirate(true);

      // Set to 12.9s to ensure it cuts off just before a potential second loop
      pirateHideRef.current = setTimeout(() => {
        setShowPirate(false);

        const nextDelay = 30000 + Math.random() * 60000;
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
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center text-white font-sans">
        <div className="text-center flex flex-col items-center gap-6 max-w-md px-6">
          <div className="w-16 h-16 border-2 border-[#ffd60a]/30 rounded-full flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffd60a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">
            Authentication Required
          </h1>
          <p className="text-white/50 text-sm">
            You need to login first to access the Kalcerians Map.
          </p>
          <Link
            href="/"
            className="px-8 py-3 bg-[#ffd60a] text-black font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#ffc300] transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const offlineUserObj = selectedOfflineUser ? sidebarKalcerians.find((k) => k.id === selectedOfflineUser) : null;

  return (
    <div className="relative min-h-screen bg-[#0a0e27] overflow-hidden text-white font-sans selection:bg-[#ffd60a] selection:text-black">
      {/* 🌌 Atmospheric Tactical Background (Behind Map) */}
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

        {/* 🛰 High-Performance Tactical Link System (Canvas-based Neural Net) */}
        <TacticalNet />
      </div>

      {/* SnapMap Component (Semi-Transparent for Glass Effect) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="fixed inset-0 z-[10] w-full h-full"
      >
        <SnapMap
          users={mapUsers}
          events={events}
          hqPoint={hqPoint}
          onMapReady={handleMapReady}
          focusUserId={focusedUserId}
        />
      </motion.div>

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
        <Link
          href="/"
          onClick={() => {
            sessionStorage.setItem("landingScrollTarget", "section-map");
          }}
          aria-label="Back to home"
          className="relative pointer-events-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-5 bg-[#0a0f1a]/50 border border-white/[0.12] text-[11px] font-semibold tracking-wider text-white/60 hover:text-white transition-all rounded-xl shadow-lg backdrop-blur-xl hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30 outline-none overflow-hidden"
        >
          {/* Internal Glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-[20%] -left-[20%] w-[100%] h-[100%] bg-cyan-600/[0.05] rounded-full blur-[20px]" />
            <div className="absolute -bottom-[20%] -right-[20%] w-[100%] h-[100%] bg-purple-900/[0.05] rounded-full blur-[20px]" />
          </div>

          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className="relative z-10 transition-transform group-hover:-translate-x-1"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="relative z-10 uppercase tracking-widest">back</span>
        </Link>

        <div className="relative flex items-center gap-4">
          {/* Telemetry HUD */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="hidden min-[1100px]:flex flex-col items-end gap-1 pointer-events-auto"
          >
            <div className="relative flex items-center gap-3 bg-[#0a0f1a]/50 px-4 h-[44px] border border-white/[0.12] rounded-xl backdrop-blur-xl shadow-lg overflow-hidden">
              {/* Internal Glows */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-[20%] -left-[20%] w-[60%] h-[100%] bg-cyan-600/[0.05] rounded-full blur-[30px]" />
                <div className="absolute -bottom-[20%] -right-[20%] w-[60%] h-[100%] bg-purple-900/[0.05] rounded-full blur-[30px]" />
              </div>

              <div className="flex flex-col items-start">
                <span className="text-[12px] font-medium text-gray-400 tracking-wider ">
                  Telemetry
                </span>
                <div className="flex gap-4 items-baseline">
                  <div className="flex gap-1 items-baseline">
                    <span className="text-[10px] font-medium text-gray-400 tracking-wider ">
                      LAT
                    </span>
                    <span className="text-[12px] text-white font-bold font-mono tracking-tight drop-shadow-[0_0_4px_rgba(255,214,10,0.3)] group-hover:drop-shadow-[0_0_10px_rgba(255,214,10,0.5)] ">
                      {mapCenter.lat.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex gap-1 items-baseline">
                    <span className="text-[10px] font-medium text-gray-400 tracking-wider  ">
                      LNG
                    </span>
                    <span className="text-[12px] text-white font-bold font-mono tracking-tight drop-shadow-[0_0_8px_rgba(255,123,0,0.2)] group-hover:drop-shadow-[0_0_10px_rgba(255,214,10,0.5)] ">
                      {mapCenter.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-[1px] h-6 bg-white/10 mx-1" />

              <div className="flex flex-col items-start">
                <span className="text-[10px] font-medium text-gray-400 tracking-wider ">
                  Ping
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-[2px] items-end h-3">
                    {[4, 6, 8, 10, 12].map((h, i) => (
                      <div
                        key={i}
                        className={`w-[2.5px] rounded-full ${i < 4 ? "bg-emerald-400" : "bg-white/15"}`}
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] text-white font-bold font-mono tracking-tight drop-shadow-[0_0_8px_rgba(255,123,0,0.2)] group-hover:drop-shadow-[0_0_10px_rgba(255,214,10,0.5)] uppercase">
                    Stable
                  </span>
                </div>
              </div>

              <div className="w-[1px] h-6 bg-white/10 mx-1" />

              <div className="flex flex-col items-start">
                <span className="text-[10px] font-medium text-gray-400 tracking-wider ">
                  Zoom
                </span>
                <span className="text-[12px] text-white font-bold font-mono tracking-tight drop-shadow-[0_0_8px_rgba(255,123,0,0.2)] group-hover:drop-shadow-[0_0_10px_rgba(255,214,10,0.5)] ">
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
            className={`pointer-events-auto flex items-center justify-center w-[48px] h-[44px] border transition-all rounded-xl backdrop-blur-md focus-visible:ring-2 focus-visible:ring-white/30 outline-none group ${
              actionMenuOpen
                ? "bg-emerald-500 border-emerald-500 text-black shadow-lg"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10 shadow-lg"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuOpen((prev) => !prev);
              setMenuOpen(false);
            }}
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`absolute -inset-3 rounded-full bg-emerald-500/25 blur-xl ${actionMenuOpen ? "hidden" : ""}`}
              />
              <span
                className={`absolute -inset-1 rounded-full bg-emerald-300/40 blur-md ${actionMenuOpen ? "hidden" : ""}`}
              />
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className={`relative z-10 transition-transform duration-300 ${actionMenuOpen ? "rotate-45" : ""}`}
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          <div
            className={`absolute top-[54px] right-0 z-[1001] w-[240px] p-2 bg-[#0a0f1a]/50 backdrop-blur-xl border border-white/[0.12] rounded-[20px] shadow-2xl transition-all duration-300 origin-top-right overflow-hidden ${
              actionMenuOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            {/* Internal Glows to match Kalcerians panel */}
            <div className="absolute inset-0 pointer-events-none z-[-1]">
              <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[50%] bg-cyan-600/[0.07] rounded-full blur-[60px]" />
              <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[50%] bg-purple-900/[0.07] rounded-full blur-[70px]" />
            </div>

            <p className="px-3 py-1 text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
              Quick Actions
            </p>
            <div className="flex flex-col gap-0.5 mt-1 relative z-10">
              <button
                type="button"
                className="w-full flex flex-col px-3 py-2.5 text-left hover:bg-white/5 rounded-lg transition-colors group"
                onClick={() => {
                  setShowStatusModal(true);
                  setActionMenuOpen(false);
                }}
              >
                <b className="text-[13px] font-semibold text-white group-hover:text-white uppercase">
                  Update Status
                </b>
                <small className="text-[9px] text-white/35">
                  Update activity & location
                </small>
              </button>
              <button
                type="button"
                className="w-full flex flex-col px-3 py-2.5 text-left hover:bg-white/5 rounded-lg transition-colors group"
                onClick={() => {
                  setShowEventModal(true);
                  setActionMenuOpen(false);
                }}
              >
                <b className="text-[13px] font-semibold text-white group-hover:text-white uppercase">
                  Create Mini Event
                </b>
                <small className="text-[9px] text-white/35">
                  Start an instant meetup
                </small>
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

          <div className="relative flex items-center gap-3">
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
              className={`absolute top-[54px] right-0 z-[1001] w-[230px] p-2 bg-[#0a0f1a]/50 backdrop-blur-xl border border-white/[0.12] rounded-[20px] shadow-2xl transition-all duration-300 origin-top-right overflow-hidden ${
                menuOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-2 pointer-events-none"
              }`}
            >
              {/* Internal Glows to match Kalcerians panel */}
              <div className="absolute inset-0 pointer-events-none z-[-1]">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[50%] bg-cyan-600/[0.07] rounded-full blur-[60px]" />
                <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[50%] bg-purple-900/[0.07] rounded-full blur-[70px]" />
              </div>

              <p className="px-3 py-1 text-[9px] font-semibold tracking-wider text-slate-400 uppercase">
                Radar Visibility
              </p>
              <div className="flex flex-col gap-0.5 mt-1 relative z-10">
                {["online", "invisible"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={isStatusBusy}
                    className={`w-full grid grid-cols-[12px_1fr] gap-3 px-3 py-2.5 text-left transition-all rounded-lg ${
                      presence === item
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:bg-white/5 hover:text-white/70"
                    } ${isStatusBusy ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handlePresenceChange(item)}
                  >
                    <span
                      className={`w-[10px] h-[10px] rounded-full self-center ${
                        item === "online" ? "bg-emerald-400" : "bg-slate-500"
                      }`}
                    />
                    <div className="flex flex-col">
                      <b className="text-[12px] font-semibold uppercase tracking-wide">
                        {item}
                      </b>
                      <small className="text-[8px] text-white/30 uppercase">
                        {isStatusBusy && presence === item ? "Syncing..." : (item === "online" ? "Visible to public" : "Stealth mode")}
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            </div>
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

      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        className="absolute z-[1000] top-[100px] left-4 bottom-6 w-[340px] bg-[#0a0f1a]/50 backdrop-blur-xl border border-white/[0.12] rounded-[24px] shadow-2xl flex flex-col transition-all duration-500 -translate-x-[calc(100%-42px)] peer-checked:translate-x-0 max-[860px]:top-auto max-[860px]:bottom-0 max-[860px]:left-0 max-[860px]:w-full max-[860px]:h-[72vh] max-[860px]:border-r-0 max-[860px]:border-t max-[860px]:rounded-none max-[860px]:rounded-t-2xl max-[860px]:translate-x-0 max-[860px]:translate-y-[calc(100%-104px)] max-[860px]:peer-checked:translate-y-0 overflow-hidden"
      >
        {/* Internal Glows to match reference image */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[50%] bg-cyan-600/[0.07] rounded-full blur-[60px]" />
          <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[50%] bg-purple-900/[0.07] rounded-full blur-[70px]" />
        </div>

        <label
          htmlFor="panel-toggle"
          aria-label="Toggle sidebar panel"
          className="absolute top-1/2 -right-[3px] -translate-y-1/2 translate-x-full w-1 h-16 bg-white/20 hover:bg-white/40 hover:w-1.5 cursor-pointer transition-all rounded-r-full max-[860px]:relative max-[860px]:top-0 max-[860px]:right-0 max-[860px]:translate-x-0 max-[860px]:translate-y-0 max-[860px]:w-12 max-[860px]:h-1 max-[860px]:mx-auto max-[860px]:my-3 max-[860px]:rounded-full max-[860px]:bg-white/30"
        />

        <label
          htmlFor="panel-toggle"
          className="relative px-5 py-4 bg-white/[0.02] border-b border-white/[0.05] cursor-pointer group flex justify-between items-center rounded-t-[24px]"
        >
          <div className="flex flex-col">
            <h1
              className="font-mono font-black text-2xl uppercase tracking-tight text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] italic leading-none"
              style={{ textShadow: "2px 2px 0 #bb5318, -2px -2px 0 #992c6c" }}
            >
              Kalcerians
            </h1>
            <p className="text-[12px] mt-1 font-medium text-gray-400 tracking-wider ">
              Find other Kalcerians
            </p>
          </div>

          <div className="w-10 h-10 flex items-center justify-center">
            <svg
              className={`w-5 h-5 text-gray-400 group-hover:text-white transition-all duration-300 toggle-arrow ${drawerOpen ? "rotate-0" : "rotate-180"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
        </label>

        <div className="p-2">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.12] rounded-lg p-3 pl-10 text-[11px] font-sans text-white focus:border-white/25 outline-none transition-all placeholder:text-gray-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-300 transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>

        {/* Debugger Notice, not really needed*/}
        {/* {notice && (
          <div className="mx-4 mb-4 p-3 border-l-2 border-[#ff006e] bg-[#ff006e]/10 text-[#ffd7ef] text-[10px] leading-tight font-bold italic animate-in fade-in slide-in-from-left-2 duration-300">
            {notice}
          </div>
        )} */}

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          {/* Mini Events Section */}
          {events.length > 0 && (
            <div className="flex flex-col">
              <div className="px-5 py-2 bg-gradient-to-r from-white/[0.05] to-transparent border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[12px] font-medium text-gray-400 tracking-wider ">
                  Mini Events
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-400">
                    Total: {events.length}
                  </span>
                </span>
              </div>
              <div className="flex flex-col bg-[#000000]/20">
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    aria-label={`View mission: ${event.title}`}
                    className="w-full px-5 py-3.5 bg-transparent hover:bg-white/[0.03] text-left transition-all border-b border-white/[0.03] group flex flex-col gap-1 rounded-lg focus-visible:bg-white/5 outline-none"
                    onClick={() => focusUser(event)}
                  >
                    <div className="flex justify-between items-center">
                      <b className="text-[15px] font-bold text-white group-hover:text-yellow-400 drop-shadow-[0_0_4px_rgba(255,214,10,0.3)] drop-shadow-[0_0_8px_rgba(255,123,0,0.2)] group-hover:drop-shadow-[0_0_10px_rgba(255,214,10,0.5)] transition-all leading-relaxed">
                        {event.title}
                      </b>
                    </div>
                    <p className="text-[12px] text-gray-400 line-clamp-1 italic">
                      "{event.description}"
                    </p>
                    <div className="flex items-center gap-2 mt-1 opacity-50">
                      <div className="w-5 h-5 border border-white/10 rounded-full overflow-hidden">
                        <img
                          className="w-full h-full object-cover"
                          src={avatarUrl(event.creator)}
                          alt="Host"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-gray-400 tracking-wider">
                        by {event.creator.nickname || event.creator.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Operatives Section Header */}
          <div className="px-5 py-2 bg-gradient-to-r from-white/[0.04] to-transparent border-b border-white/[0.06] flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <span className="text-[12px] font-medium text-gray-400 tracking-wider">
              Kalcerians
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                {kalcerians.filter((k) => k.isOnline).length}
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                Total: {sidebarKalcerians.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
            {isDataLoading ? (
              <div className="flex flex-col gap-[1px]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="px-5 py-5 border-b border-white/[0.03] animate-pulse"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-white/5 rounded-full border border-white/5" />
                      <div className="flex-1 space-y-3">
                        <div className="h-3 bg-white/10 w-[140px] rounded" />
                        <div className="h-2 bg-white/5 w-[80px] rounded" />
                      </div>
                      <div className="w-12 h-2 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-2 border-t-gray-300 border-white/5 rounded-full animate-spin" />
                  <p className="text-gray-400 font-mono text-[9px] tracking-widest uppercase">
                    Scanning signals
                  </p>
                </div>
              </div>
            ) : sidebarKalcerians.length > 0 ? (
              sidebarKalcerians.map((user) => (
                <div key={user.id} className="border-b border-white/[0.03]">
                  <div
                    className="relative w-full grid grid-cols-[44px_1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] text-left transition-all group cursor-pointer"
                    onMouseEnter={() => setHoveredKalcerian(user.id)}
                    onMouseLeave={() => setHoveredKalcerian(null)}
                    onClick={() => {
                      if (user.isOnline) {
                        setFocusedUserId(user.id);
                        // Clear after a moment so it can be re-triggered
                        setTimeout(() => setFocusedUserId(null), 100);
                        if (window.innerWidth < 860) setDrawerOpen(false);
                      } else {
                        setSelectedOfflineUser(prev => prev === user.id ? null : user.id);
                      }
                    }}
                  >
                    <div className="relative">
                      <div
                        className={`w-10 h-10 border overflow-hidden rounded-full transition-transform group-hover:scale-105 ${user.isOnline ? "border-emerald-500/40" : "border-white/10 opacity-50"}`}
                      >
                        <img
                          className="w-full h-full object-cover"
                          src={avatarUrl(user)}
                          alt={user.nickname || user.name}
                        />
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-[1.5px] border-[#0a0f1a] rounded-full ${user.isOnline ? "bg-emerald-400" : "bg-gray-500"}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start flex-col">
                        <b
                          className={`text-sm font-bold tracking-tight truncate leading-relaxed transition-all ${user.isOnline ? "text-gray-300 group-hover:text-yellow-400" : "text-white/40"}`}
                        >
                          {user.name}
                        </b>
                        <span className="mt-1 px-2 py-1 rounded-md border border-white/10 bg-gray-600/5 backdrop-blur-md text-gray-400 text-[10px] font-bold tracking-wider  leading-none shadow-[0_0_10px_rgba(255,255,255,0.02)]">
                          {mapUsersData.find((u) => u.id === user.id)?.district ||
                            (user.isOnline ? "Scanning..." : "Unknown")}
                        </span>
                      </div>
                      <small
                        className={`block mt-1 text-[11px] italic truncate ${user.isOnline ? "text-gray-400" : "text-gray-600"}`}
                      >
                        {user.broadcast?.message
                          ? `"${user.broadcast.message}"`
                          : ""}
                      </small>
                    </div>
                  </div>
                  {/* hover popup card (for desktop hover) */}
                  {hoveredKalcerian === user.id && (
                    <div
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-[220px] bg-[#0a0f1a]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-3 pointer-events-auto hidden md:flex"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15 flex-shrink-0">
                          <img
                            src={avatarUrl(user)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white truncate">
                            {user.name}
                          </p>
                          {user.nickname && (
                            <p className="text-[10px] text-gray-400 truncate">
                              @{user.nickname}
                            </p>
                          )}
                        </div>
                      </div>
                      {user.broadcast?.message && (
                        <p className="text-[11px] text-gray-300 italic border-l-2 border-[#ffd60a]/40 pl-2 line-clamp-2">
                          "{user.broadcast.message}"
                        </p>
                      )}
                      <div className="flex gap-2">
                        <a
                          href={`/user/${user.id}`}
                          className="flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
                        >
                          See Profile
                        </a>
                        {user.isOnline && (
                          <button
                            type="button"
                            className="flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider bg-[#ffd60a]/10 hover:bg-[#ffd60a]/20 border border-[#ffd60a]/20 rounded-lg text-[#ffd60a] transition-all"
                            onClick={() => {
                              setFocusedUserId(user.id);
                              setTimeout(() => setFocusedUserId(null), 100);
                              setHoveredKalcerian(null);
                            }}
                          >
                            See in Map
                          </button>
                        )}
                      </div>
                    </div>
                  )}


                </div>
              ))
            ) : (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center opacity-20">
                  <svg
                    className="w-5 h-5 animate-pulse"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <p className="text-gray-400 font-mono text-[9px] tracking-widest uppercase">
                  No signals detected
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Recenter Button Bottom Right */}
      <button
        type="button"
        className="fixed p-2 z-[1000] bottom-8 right-8 w-12 h-12 bg-white/5 border border-white/10 text-white/70 flex items-center justify-center shadow-lg backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20 rounded-xl group active:scale-95 focus-visible:ring-2 focus-visible:ring-white/30 outline-none"
        onClick={recenterMap}
        aria-label="Recenter Map Radar"
        title="Recenter Map"
      >
        <RadialPing
          mode={isCentered ? "in" : "out"}
          color={isCentered ? "#94a3b8" : "#ec4899"}
          className="scale-150"
        />
        <motion.svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          className="relative z-10"
          animate={{ rotate: isRecentering ? 360 : 0 }}
          transition={{
            duration: 1.5,
            repeat: isRecentering ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <path
            d="M12 2v4M12 18v4M2 12h4M18 12h4M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </button>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none select-none flex flex-col items-center ">
        <img
          src="/logologin.webp"
          alt="Kalceria"
          className="h-[48px] w-auto object-contain opacity-80"
          draggable={false}
        />
        <h2 className="text-[19px] font-bold tracking-[0.45em] uppercase text-white/60 italic -mt-[10px] leading-none translate-x-[0em]">
          Maps
        </h2>
      </div>

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
          <div
            className="relative w-full max-w-[420px] bg-[#0a0f1a]/50 backdrop-blur-xl border border-white/[0.12] rounded-[24px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Internal Glows to match Kalcerians panel */}
            <div className="absolute inset-0 pointer-events-none z-[-1]">
              <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[50%] bg-cyan-600/[0.07] rounded-full blur-[60px]" />
              <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[50%] bg-purple-900/[0.07] rounded-full blur-[70px]" />
            </div>

            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className="font-sans font-bold text-lg text-white tracking-tight ">
                Update Status
              </h2>
              <button
                type="button"
                className="text-white/20 text-2xl hover:text-pink-400 transition-colors leading-none relative z-10"
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveBroadcast} className="p-6 flex flex-col gap-5">
              <p className="text-white/60 text-sm leading-relaxed tracking-wide">
                Share your current activity with other Kalcerians for 24h.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400  tracking-wider">
                  Broadcast
                </label>
                <textarea
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-4 text-sm text-white focus:border-slate-500 outline-none min-h-[120px] transition-all"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="OTW FM..."
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/20 hover:border-white/30 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-50 disabled:pointer-events-none"
                  disabled={busy}
                >
                  {busy ? "Processing..." : "Post Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEventModal && (
        <div
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/60 backdrop-blur-xl p-5 animate-in fade-in duration-300"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="relative w-full max-w-[440px] bg-[#0a0f1a]/50 backdrop-blur-xl border border-white/[0.12] rounded-[24px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Internal Glows to match Kalcerians panel */}
            <div className="absolute inset-0 pointer-events-none z-[-1]">
              <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[50%] bg-cyan-600/[0.07] rounded-full blur-[60px]" />
              <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[50%] bg-purple-900/[0.07] rounded-full blur-[70px]" />
            </div>

            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className="font-sans font-bold text-lg text-white tracking-tight">
                Create Your Own Event
              </h2>
              <button
                type="button"
                className="text-white/20 text-2xl hover:text-pink-400 transition-colors leading-none relative z-10"
                onClick={() => setShowEventModal(false)}
              >
                ×
              </button>
            </div>
            {/* Penjelasan sedikit mengenai mini event */}

            <form onSubmit={saveMiniEvent} className="p-6 flex flex-col gap-5">
              <p className="text-white/60 text-sm leading-relaxed tracking-wide">
                Share your current activity with other Kalcerians for 24h.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400  tracking-wider">
                  Event Title
                </label>
                <input
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-3.5 text-sm text-white focus:border-slate-500 outline-none transition-all"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Nongs FM Sini"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400  tracking-wider">
                  Briefing
                </label>
                <textarea
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg p-3.5 text-sm text-white focus:border-slate-500 outline-none min-h-[100px] transition-all"
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
                  className="w-full py-3.5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/20 hover:border-white/30 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-50 disabled:pointer-events-none"
                  disabled={busy}
                >
                  {busy ? "Deploying..." : (activeOwnEvent ? "Update Signal" : "Deploy Signal")}
                </button>
                {activeOwnEvent && (
                  <button
                    type="button"
                    className="w-full py-3.5 border border-pink-500/30 bg-pink-500/10 backdrop-blur-md text-pink-400 font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-pink-500/20 hover:border-pink-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    onClick={deleteMiniEvent}
                    disabled={busy}
                  >
                    {busy ? "Recalling..." : "Recall Signal"}
                  </button>
                )}
              </div>
            </form>
          </div>
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
                  "{hqPoint.description}"
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

        #panel-toggle:checked ~ section .toggle-arrow {
          transform: rotate(180deg);
        }
      `}</style>
      {/* Startup Sequence Overlay :: FORZA HORZON STYLE */}
      <AnimatePresence>
        {showStartup && (
          <motion.div
            key="startup-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(40px)" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className={`fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden transition-colors duration-[3000ms] ease-in-out ${startupProgress < 50 ? "bg-[#e2e8f0]" : "bg-[#050a14]"}`}
          >


            {/* Adaptive Atmospheric Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <div
                className={`absolute inset-0 transition-colors duration-1000 ${startupProgress < 50 ? "bg-slate-200" : "bg-gradient-to-br from-[#ff006e]/20 via-transparent to-[#ffd60a]/20"}`}
              />

              {/* Dynamic Speed Lines */}
              <div className="absolute inset-0 opacity-20">
                {hasMounted &&
                  [...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: "-100%", opacity: 0 }}
                      animate={{ x: "200%", opacity: [0, 1, 0] }}
                      transition={{
                        duration: Math.random() * 0.5 + 0.3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "linear",
                      }}
                      className={`absolute h-[1px] transition-colors duration-1000 ${startupProgress < 50 ? "bg-slate-400" : "bg-white"}`}
                      style={{
                        top: `${Math.random() * 100}%`,
                        width: `${Math.random() * 300 + 100}px`,
                        transform: "rotate(-5deg)",
                      }}
                    />
                  ))}
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                <h2
                  className={`text-[25vw] font-black italic tracking-tighter uppercase leading-none transition-colors duration-1000 ${startupProgress < 50 ? "text-slate-900" : "text-white"}`}
                >
                  KALCERIA
                </h2>
              </div>
            </div>

            <div className="relative z-10 w-full flex flex-col items-center">
              {/* Main Title Section */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="flex flex-col items-center mb-12"
              >
                <h1
                  className={`text-8xl font-sans font-black italic tracking-tighter uppercase leading-none transition-colors duration-1000 ${startupProgress < 50 ? "text-slate-900" : "text-white"}`}
                >
                  Kalcerians Map
                </h1>
              </motion.div>

              {/* High Impact Progress Section */}
              <div className="w-full max-w-[800px] px-8">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex flex-col gap-1">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={startupStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`text-[14px] font-black italic uppercase tracking-widest transition-colors duration-1000 ${startupProgress < 50 ? "text-slate-700" : "text-white"}`}
                      >
                        {startupMessages[startupStep]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-5xl font-sans font-black italic tracking-tighter leading-none transition-colors duration-1000 ${startupProgress < 50 ? "text-slate-900" : "text-white"}`}
                    >
                      {Math.round(startupProgress)}
                      <span className="text-[20px] ml-1 opacity-40">%</span>
                    </span>
                  </div>
                </div>

                {/* The "Forza Stripe" Progress Bar */}
                <div
                  className={`relative h-4 w-full skew-x-[-12deg] overflow-hidden border transition-colors duration-1000 ${startupProgress < 50 ? "bg-slate-300 border-slate-400" : "bg-white/5 border-white/10"}`}
                >
                  <motion.div
                    className={`absolute top-0 left-0 h-full transition-colors duration-1000 ${startupProgress < 50 ? "bg-slate-600" : "bg-gradient-to-r from-[#ff6f00] via-[#ffd60a] to-[#ffc300] shadow-[0_0_30px_#ffd60a]"}`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${startupProgress}%` }}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                  />
                  {/* Subtle stripes over progress */}
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.1)_50%,transparent_100%)] bg-[length:20px_100%] pointer-events-none" />
                </div>


              </div>
            </div>

            {/* Corner Decorative Elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#ffd60a]/10 to-transparent rounded-br-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-[#ff006e]/10 to-transparent rounded-tl-full blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
