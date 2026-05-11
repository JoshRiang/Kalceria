"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import RadialPing from "@/components/map/RadialPing";



const SnapMap = dynamic(() => import("@/components/SnapMap"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-[#050a14] text-white flex items-center justify-center">
      <div className="font-sans text-sm uppercase tracking-[0.25em] text-[#ffd60a]">Loading Snap Map</div>
    </main>
  ),
});

// Helpers
const avatar = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
const esc = (str) => String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

// Mocks (since they seem missing from @/lib/api)
const mockMe = {
  id: "me",
  name: "Reyhan Batara",
  nickname: "Coki",
  avatarSeed: "coki",
  lat: -6.3715,
  lng: 106.7135,
  color: "#ffd60a",
  district: "Bintaro",
};

const mockUsers = [
  mockMe,
  { id: "u1", name: "Joshua Riang", nickname: "Josh", avatarSeed: "josh", lat: -6.2720, lng: 106.7140, color: "#00f2ff", district: "Bintaro", distanceText: "120m" },
  { id: "u2", name: "Kalcerian Alpha", nickname: "Alpha", avatarSeed: "alpha", lat: -6.2730, lng: 106.7120, color: "#ff006e", district: "Pondok Indah", distanceText: "1.2km" },
];

const mockEvents = [
  { id: "e1", title: "Sunday Morning Ride", description: "Meting at HQ", lat: -6.2715, lng: 107.7135, creator: mockMe, expiresAt: new Date(Date.now() + 3600000).toISOString() },
];

const hqPoint = {
  id: "hq_bintaro",
  title: "KALCERIA HEADQUARTER",
  role: "Meet Center",
  description: "Place where people meet",
  lat: -6.2715,
  lng: 106.7135,
  videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
};

export default function MapPage() {
  // State
  const [users, setUsers] = useState(mockUsers);
  const [events, setEvents] = useState(mockEvents);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCentered, setIsCentered] = useState(true);
  const [isGlitching, setIsGlitching] = useState(false);
  const [showPirate, setShowPirate] = useState(false);
  const [showStartup, setShowStartup] = useState(true);
  const [startupStep, setStartupStep] = useState(0);
  const [startupProgress, setStartupProgress] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);





  
  const [mapCenter, setMapCenter] = useState({ lat: -6.234, lng: 106.749 });
  const [mapZoom, setMapZoom] = useState(13);

  const mapRef = useRef(null);
  const pirateHideRef = useRef(null);
  const pirateNextRef = useRef(null);
  const pirateStarted = useRef(false);
  const [pirateKey, setPirateKey] = useState(0);

  // Startup Sequence Logic
  useEffect(() => {
    const steps = [
      "INITIALIZING ENCRYPTED UPLINK...",
      "SYNCING OPERATIVE SIGNALS [BINTARO SECTOR]...",
      "FETCHING KALCERIAN DATA STREAMS...",
      "CALIBRATING RADAR HUD OVERLAY...",
      "ALL SIGNALS STABLE. ACCESS GRANTED."
    ];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 12;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setShowStartup(false);
          setIsDataLoading(false);
        }, 800);
      }
      setStartupProgress(currentProgress);
      
      const stepIdx = Math.min(Math.floor((currentProgress / 100) * steps.length), steps.length - 1);
      setStartupStep(stepIdx);
    }, 200);

    return () => clearInterval(interval);
  }, []);


  // Map Event Tracking
  const handleMapReady = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    
    // Initial State
    setMapCenter(mapInstance.getCenter());
    setMapZoom(mapInstance.getZoom());

    // Listeners
    mapInstance.on('move', () => {
      setMapCenter(mapInstance.getCenter());
      // Re-evaluate centering
      const center = mapInstance.getCenter();
      const hq = [-6.2715, 106.7135];
      const dist = Math.sqrt(Math.pow(center.lat - hq[0], 2) + Math.pow(center.lng - hq[1], 2));
      setIsCentered(dist < 0.0001);
    });
    mapInstance.on('zoomend', () => {
      setMapZoom(mapInstance.getZoom());
    });
  }, []);


  const startupMessages = [
    "INITIALIZING ENCRYPTED UPLINK...",
    "SYNCING OPERATIVE SIGNALS [BINTARO SECTOR]...",
    "FETCHING KALCERIAN DATA STREAMS...",
    "CALIBRATING RADAR HUD OVERLAY...",
    "ALL SIGNALS STABLE. ACCESS GRANTED."
  ];

  // Derived Operative Data

  const mapUsers = useMemo(() => {
    // The map shows all users, only respecting the presence toggle
    if (presence !== "online") {
      return users.filter(u => u.id !== mockMe.id);
    }
    return users;
  }, [users, presence]);

  const sidebarUsers = useMemo(() => {
    // The sidebar respects both presence and search query
    let list = mapUsers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((u) => 
        u.name.toLowerCase().includes(q) || 
        (u.district && u.district.toLowerCase().includes(q))
      );
    }
    return list;
  }, [mapUsers, searchQuery]);



  const activeOwnEvent = events.find(e => e.id === "own");

  // Handlers
  function focusUser(user) {
    if (!mapRef.current) return;
    mapRef.current.flyTo([user.lat, user.lng], 16);
  }

  function recenterMap() {
    if (!mapRef.current) return;
    mapRef.current.flyTo([-6.2715, 106.7135], 14);
  }

  function saveBroadcast(e) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setUsers((prev) => prev.map((u) => (u.id === mockMe.id ? { ...u, broadcast: { message: statusText } } : u)));
      setNotice("Status updated.");
      setBusy(false);
      setShowStatusModal(false);
    }, 300);
  }

  function deleteBroadcast() {
    setBusy(true);
    setTimeout(() => {
      setUsers((prev) => prev.map((u) => (u.id === mockMe.id ? { ...u, broadcast: null } : u)));
      setNotice("Status deleted.");
      setBusy(false);
      setShowStatusModal(false);
    }, 300);
  }

  function saveMiniEvent(e) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setEvents((prev) => [...prev.filter((ev) => ev.id !== "own"), { id: "own", ...eventForm, lat: mockMe.lat, lng: mockMe.lng, creator: mockMe, expiresAt: new Date(Date.now() + 86400000).toISOString() }]);
      setNotice("Mini event created.");
      setBusy(false);
      setShowEventModal(false);
    }, 300);
  }

  function deleteMiniEvent() {
    setBusy(true);
    setTimeout(() => {
      setEvents((prev) => prev.filter((ev) => ev.id !== "own"));
      setEventForm({ title: "", description: "" });
      setNotice("Mini event deleted.");
      setBusy(false);
      setShowEventModal(false);
    }, 300);
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
    window.addEventListener('openHq', handleOpenHq);
    return () => window.removeEventListener('openHq', handleOpenHq);
  }, []);

  // Independent Pirate manifestation logic
  useEffect(() => {
    if (pirateStarted.current) return;
    pirateStarted.current = true;

    const triggerPirate = () => {
      setPirateKey(prev => prev + 1);
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


  return (
    <div className="min-h-screen text-white selection:bg-[#ffd60a] selection:text-black font-sans overflow-hidden bg-[#050a14]">
      
      {/* Background Layer: Animated Glowing Blobs (Behind Map) */}
      <div className="fixed inset-0 z-[5] overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Gold Blobs - Now moving across all screen */}
        <div className="absolute top-[-20%] left-[-20%] w-[70vw] h-[70vw] bg-[#ffd60a] rounded-full blur-[140px] opacity-[0.35] animate-[float-wide_30s_infinite_linear]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#ffc300] rounded-full blur-[120px] opacity-[0.25] animate-[float-wide_40s_infinite_reverse_linear]" />
        
        {/* Purple Blobs */}
        <div className="absolute right-[-5%] top-[0%] w-[65vw] h-[65vw] bg-[#b762dd] rounded-full blur-[130px] opacity-[0.4] animate-[float_18s_infinite_alternate_ease-in-out]" />
        <div className="absolute right-[10%] bottom-[-10%] w-[55vw] h-[55vw] bg-[#742baf] rounded-full blur-[110px] opacity-[0.45] animate-[float_22s_infinite_alternate-reverse_ease-in-out]" />
      </div>


      {/* SnapMap Component */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="fixed inset-0 z-[10] w-full h-full opacity-[0.8]"
      >
        <SnapMap 
          users={mapUsers} 
          events={events} 
          hqPoint={hqPoint}
          onMapReady={handleMapReady} 
        />
      </motion.div>





      {/* Tactical Overlay: Vignette & Grid */}
      <div className="fixed inset-0 z-[40] pointer-events-none" aria-hidden="true" 
        style={{
          background: `
            radial-gradient(circle at center, transparent 0%, transparent 40%, rgba(10, 14, 39, 0.7) 100%), 
            linear-gradient(rgba(255, 214, 10, 0.05) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(255, 214, 10, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px'
        }}
      />

      {/* Header HUD */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="absolute z-[1000] top-4 left-4 right-4 flex justify-between items-start gap-3 pointer-events-none max-[860px]:top-3 max-[860px]:left-3 max-[860px]:right-3"
      >

        <Link 
          href="/" 
          aria-label="Back to home"
          className="pointer-events-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-6 bg-[#0a0e27]/95 border border-white/10 text-[11px] font-black tracking-[0.2em] text-white/60 hover:text-[#ffd60a] hover:border-[#ffd60a] transition-all [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)] shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md hover:bg-[#ffd60a]/10 focus-visible:ring-2 focus-visible:ring-[#ffd60a] outline-none"
        >
          <span className="text-lg">←</span>
          BACK
        </Link>



        <div className="relative flex items-start gap-4">
          {/* Forza-Style Telemetry HUD */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="hidden min-[1100px]:flex flex-col items-end gap-1 pointer-events-auto"
          >
            <div className="flex items-center gap-3 bg-[#0a0e27]/90 px-4 py-2 border border-white/10 skew-x-[-12deg] backdrop-blur-md shadow-2xl">
              <div className="flex flex-col items-start skew-x-[12deg]">
                <span className="text-[9px] font-black text-gray-200 uppercase tracking-widest italic">Live Telemetry</span>
                <div className="flex gap-4 items-baseline">
                  <div className="flex gap-1 items-baseline">
                    <span className="text-[10px] text-white/60 font-mono">LAT</span>
                    <span className="text-[13px] text-white font-black font-mono tracking-tighter">{mapCenter.lat.toFixed(4)}</span>
                  </div>
                  <div className="flex gap-1 items-baseline">
                    <span className="text-[10px] text-white/60 font-mono">LNG</span>
                    <span className="text-[13px] text-white font-black font-mono tracking-tighter">{mapCenter.lng.toFixed(4)}</span>
                  </div>
                </div>
              </div>
              
              <div className="w-[1px] h-8 bg-white/10 mx-1 skew-x-[12deg]" />
              
              <div className="flex flex-col items-start skew-x-[12deg]">
                <span className="text-[9px] font-black text-gray-200 uppercase tracking-widest italic text-center">Ping</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-[2px] items-end h-3">
                    {[4, 6, 8, 10, 12].map((h, i) => (
                      <div 
                        key={i}
                        className={`w-[3px] rounded-t-[1px] ${i < 4 ? 'bg-[#22c55e]' : 'bg-white/20'}`}
                        style={{ height: `${h}px` }}
                      />
                    ))}

                  </div>
                  <span className="text-[11px] text-white font-black font-mono uppercase tracking-tighter">Stable</span>
                </div>
              </div>

              <div className="w-[1px] h-8 bg-white/10 mx-1 skew-x-[12deg]" />

              <div className="flex flex-col items-start skew-x-[12deg]">
                <span className="text-[9px] font-black text-gray-200 uppercase tracking-widest italic">Zoom</span>
                <span className="text-[13px] text-white font-black font-mono tracking-tighter">x{mapZoom.toFixed(1)}</span>
              </div>
            </div>
            
            {/* HUD Footer Signal */}
            {/* <div className="flex items-center gap-2 px-2 opacity-60">
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
              <span className="text-[8px] font-mono text-white uppercase tracking-[0.2em]">Data Uplink: Active</span>
            </div> */}
          </motion.div>

          <div className="relative flex items-start">

            <button
              type="button"
              aria-label="Quick Actions Menu"
              aria-expanded={actionMenuOpen}
              aria-haspopup="true"
              className={`pointer-events-auto w-[48px] h-[48px] flex items-center justify-center border transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] backdrop-blur-md focus-visible:ring-2 focus-visible:ring-[#22c55e] outline-none ${
                actionMenuOpen 
                  ? "bg-[#22c55e] border-[#22c55e] text-black shadow-[0_0_20px_#22c55e]" 
                  : "bg-[#0a0e27]/95 border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setActionMenuOpen((prev) => !prev);
                setMenuOpen(false);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="filter drop-shadow-[0_0_5px_currentColor]">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>



            <div className={`absolute top-[58px] right-0 z-[1001] w-[240px] p-2 bg-[#0a0e27]/98 border border-[#ffd60a]/20 border-t-[#ffd60a] shadow-[0_15px_30px_rgba(0,0,0,0.8)] [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] transition-all duration-300 origin-top-right ${
              actionMenuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}>
              <p className="px-3 py-1 text-[9px] font-black tracking-[0.2em] text-[#ffd60a]/70 uppercase">Quick Actions</p>
              <div className="flex flex-col gap-1 mt-1">
                <button 
                  type="button" 
                  className="w-full flex flex-col px-3 py-2 text-left hover:bg-white/5 rounded transition-colors group"
                  onClick={() => { setShowStatusModal(true); setActionMenuOpen(false); }}
                >
                  <b className="text-[13px] font-black text-white group-hover:text-[#ffd60a] uppercase">Update Status</b>
                  <small className="text-[9px] text-white/40">Update activity & location</small>
                </button>
                <button 
                  type="button" 
                  className="w-full flex flex-col px-3 py-2 text-left hover:bg-white/5 rounded transition-colors group"
                  onClick={() => { setShowEventModal(true); setActionMenuOpen(false); }}
                >
                  <b className="text-[13px] font-black text-white group-hover:text-[#ffd60a] uppercase">Create Mini Event</b>
                  <small className="text-[9px] text-white/40">Start an instant meetup</small>
                </button>
                <button 
                  type="button" 
                  className="w-full flex flex-col px-3 py-2 text-left hover:bg-white/5 rounded transition-colors group"
                  onClick={() => { setShowHqModal(true); setActionMenuOpen(false); }}
                >
                  <b className="text-[13px] font-black text-white group-hover:text-[#ffd60a] uppercase">View HQ Intel</b>
                  <small className="text-[9px] text-white/40">Bintaro sector data</small>
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex items-start gap-3">
            <button
              type="button"
              aria-label="User Profile and Radar Status"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="pointer-events-auto w-[48px] h-[48px] flex items-center justify-center bg-[#0a0e27]/95 border border-white/10 hover:border-[#ffd60a]/50 transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md relative group focus-visible:ring-2 focus-visible:ring-[#ffd60a] outline-none"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
                setActionMenuOpen(false);
              }}
            >
              <div className="w-8 h-8 bg-[#ffd60a] [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] shadow-[0_0_10px_#ffc300] overflow-hidden">
                <img src={avatar(mockMe.avatarSeed)} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <span className={`absolute bottom-2 right-2 w-3 h-3 border-2 border-[#0a0e27] rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)] ${
                presence === "online" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-[#ff006e] shadow-[0_0_8px_#ff006e]"
              }`} />
            </button>


            <div className={`absolute top-[58px] right-0 z-[1001] w-[230px] p-2 bg-[#0a0e27]/98 border border-[#ffd60a]/20 border-t-[#ffd60a] shadow-[0_15px_30px_rgba(0,0,0,0.8)] [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] transition-all duration-300 origin-top-right ${
              menuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}>
              <p className="px-3 py-1 text-[9px] font-black tracking-[0.2em] text-[#ffd60a]/70 uppercase">Radar Visibility</p>
              <div className="flex flex-col gap-1 mt-1">
                {["online", "invisible"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`w-full grid grid-cols-[12px_1fr] gap-3 px-3 py-2 text-left transition-all [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${
                      presence === item ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/70"
                    }`}
                    onClick={() => {
                      setPresence(item);
                      setMenuOpen(false);
                      setNotice(item === "online" ? "Status ONLINE: tampil di radar." : "Status STEALTH: lokasi disembunyikan.");
                    }}
                  >
                    <span className={`w-[10px] h-[10px] rounded-full self-center ${
                      item === "online" ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-[#ff006e] shadow-[0_0_8px_#ff006e]"
                    }`} />
                    <div className="flex flex-col">
                      <b className="text-[12px] font-black uppercase tracking-wider">{item}</b>
                      <small className="text-[8px] text-white/30 uppercase">{item === "online" ? "Visible to public" : "Stealth mode"}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.header>


      {/* Kalcerians Panel */}
      <input type="checkbox" id="panel-toggle" className="hidden peer" defaultChecked={drawerOpen} />
      
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        aria-label="Kalcerians Sidebar Panel"
        className="absolute z-[1000] top-[100px] left-4 bottom-6 w-[340px] bg-[#0a0e27]/10 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,20px_100%,0_calc(100%-20px))] flex flex-col transition-all duration-500 -translate-x-[calc(100%-42px)] peer-checked:translate-x-0 max-[860px]:top-auto max-[860px]:bottom-0 max-[860px]:left-0 max-[860px]:w-full max-[860px]:h-[72vh] max-[860px]:border-r-0 max-[860px]:border-t-[3px] max-[860px]:[clip-path:polygon(25px_0,calc(100%-25px)_0,100%_25px,100%_100%,0_100%,0_25px)] max-[860px]:translate-x-0 max-[860px]:translate-y-[calc(100%-104px)] max-[860px]:peer-checked:translate-y-0"
      >
        {/* Dynamic Gradient Border Line */}
        <div className="absolute top-0 right-0 bottom-0 w-[3px] z-20 bg-gradient-to-b from-[#ffd60a] via-orange-300 via-purple-500 via-[#ff006e] to-[#ffd60a] bg-[length:100%_200%] animate-border-flow max-[860px]:top-0 max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-auto max-[860px]:w-full max-[860px]:h-[3px] max-[860px]:bg-gradient-to-r" />

        
        <label 
          htmlFor="panel-toggle" 
          aria-label="Toggle sidebar panel"
          className="absolute top-1/2 -right-[3px] -translate-y-1/2 translate-x-full w-1.5 h-20 bg-[#ffd60a]/30 hover:bg-[#ffd60a] hover:w-2 cursor-pointer transition-all rounded-r-[4px] max-[860px]:relative max-[860px]:top-0 max-[860px]:right-0 max-[860px]:translate-x-0 max-[860px]:translate-y-0 max-[860px]:w-16 max-[860px]:h-1.5 max-[860px]:mx-auto max-[860px]:my-3 max-[860px]:rounded-full" 
        />

        
        <label htmlFor="panel-toggle" className="px-5 py-4 bg-[#2a2d42]/40 border-b border-white/5 cursor-pointer group flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-b from-[#d9723d] via-[#edce60] to-[#b762dd] bg-clip-text text-transparent leading-none">KALCERIANS</h1>
            <p className="text-[10px] font-bold text-[#8896aa] tracking-[0.1em] uppercase">Find other Kalcerians</p>
          </div>

          <div className="w-10 h-10 flex items-center justify-center">
            {/* arrow pointing left */}
            <svg className="w-6 h-6 text-[#8896aa] group-hover:text-[#ffd60a] transition-all duration-300 rotate-180 toggle-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>

            
          </div>
        </label>

        <div className="p-2">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="SEARCH RADAR..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-[#000000]/60 border border-white/10 p-3 pl-10 text-[10px] font-mono tracking-[0.2em] text-white focus:border-[#ffd60a]/50 outline-none transition-all placeholder:text-[#8896aa]/40 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]" 
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8896aa] group-focus-within:text-[#ffd60a]/50 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
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
              <div className="px-5 py-2 bg-[#2a2d42]/30 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black tracking-[0.2em] text-gray uppercase">Mini Events</span>
                <span className="flex items-center gap-2">
                  <span className="text-[12px] font-mono text-gray-400 uppercase">Total: {events.length}</span>
                </span>
              </div>
              <div className="flex flex-col bg-[#000000]/20">
                {events.map((event) => (
                  <button 
                    key={event.id} 
                    type="button" 
                    aria-label={`View mission: ${event.title}`}
                    className="w-full px-5 py-4 bg-transparent hover:bg-[#ff006e]/10 text-left transition-all border-b border-white/[0.03] group flex flex-col gap-1 focus-visible:bg-[#ff006e]/5 outline-none"
                    onClick={() => focusUser(event)}
                  >

                    <div className="flex justify-between items-center">
                      <b className="text-[14px] font-black text-white group-hover:text-[#ff006e] uppercase italic tracking-tight">{event.title}</b>
                    </div>
                    <p className="text-[10px] text-gray-200 line-clamp-1 italic">"{event.description}"</p>
                    <div className="flex items-center gap-2 mt-1 opacity-60">
                      <div className="w-4 h-4 border border-white/20 rounded-full overflow-hidden">
                        <img className="w-full h-full object-cover" src={avatar(event.creator.avatarSeed)} alt="Host" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-200 uppercase tracking-widest">
                        DEPLOYED BY {event.creator.nickname}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Operatives Section Header */}
          <div className="px-5 py-2 bg-[#2a2d42]/60 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <span className="text-[10px] font-black tracking-[0.2em] text-gray uppercase">Kalcerians</span>
            <span className="text-[12px] font-mono text-gray-400 uppercase">Total: {sidebarUsers.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#050714]/40">
            {isDataLoading ? (
              <div className="flex flex-col gap-[1px]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="px-5 py-5 border-b border-white/[0.03] animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-white/5 rounded-full border border-white/5" />
                      <div className="flex-1 space-y-3">
                        <div className="h-3 bg-white/10 w-[140px] rounded-[2px]" />
                        <div className="h-2 bg-white/5 w-[80px] rounded-[2px]" />
                      </div>
                      <div className="w-12 h-2 bg-white/5 rounded-[2px]" />
                    </div>
                  </div>
                ))}
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-t-[#ffd60a] border-white/5 rounded-full animate-spin" />
                  <p className="text-[#ffd60a]/40 font-mono text-[9px] tracking-[0.4em] uppercase">Scanning signals</p>
                </div>
              </div>
            ) : sidebarUsers.length > 0 ? (
              sidebarUsers.map((user) => (

                <button 
                  key={user.id} 
                  type="button" 
                  aria-label={`Focus radar on operative: ${user.name}`}
                  className="w-full grid grid-cols-[44px_1fr_auto] items-center gap-4 px-5 py-4 bg-transparent hover:bg-white/5 text-left transition-all border-b border-white/[0.03] group focus-visible:bg-white/10 outline-none"
                  onClick={() => focusUser(user)}
                >

                  <div className="w-11 h-11 border-2 overflow-hidden rounded-full transition-transform group-hover:scale-110" style={{ borderColor: user.color }}>
                    <img className="w-full h-full object-cover" src={avatar(user.avatarSeed)} alt={user.nickname} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-[15px] font-black text-white uppercase tracking-tight truncate leading-none group-hover:text-[#ffd60a]">{user.name}</b>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-1 border border-white/10 bg-[#000000]/60 text-gray-400 text-[9px] font-black uppercase tracking-widest leading-none font-sans">
                        {user.district}
                      </span>
                    </div>

                    <small className="block mt-2 text-[#8896aa]/60 text-[10px] italic truncate">
                      {user.broadcast?.message ? `"${user.broadcast.message}"` : ""}
                    </small>
                  </div>
                  <strong className="text-gray-300 font-mono font-black text-[10px] tracking-widest">

                    {user.distanceText}
                  </strong>
                </button>
              ))
            ) : (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center opacity-20">
                  <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <p className="text-white/20 font-mono text-[9px] tracking-[0.3em] uppercase">No signals detected</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>


      {/* Recenter Button Bottom Right */}
      <button 
        type="button" 
        className="fixed p-2 z-[1000] bottom-8 right-8 w-14 h-14 bg-[#0a0e27]/95 border border-[#ffd60a]/40 text-[#ffd60a] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all hover:bg-[#ffd60a] hover:text-black hover:border-[#ffd60a] [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] group active:scale-95 focus-visible:ring-2 focus-visible:ring-[#ffd60a] outline-none"
        onClick={recenterMap}
        aria-label="Recenter Map Radar"
        title="Recenter Map"
      >

        <RadialPing 
          mode={isCentered ? "in" : "out"} 
          color={isCentered ? "#ffd60a" : "#ff006e"} 
          className="scale-150"
        />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="relative z-10">
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      
      {/* Bottom Center Brand */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none select-none">
        <h2 className={`text-xl font-black italic tracking-[0.3em] uppercase bg-gradient-to-b from-[#d9723d] via-[#edce60] to-[#b762dd] bg-clip-text text-transparent leading-none ${isGlitching ? 'glitch-active' : ''}`}>
          Kalcerian Maps
        </h2>
      </div>
      
      {/* Randomized Pirate Interception Overlay */}
      {showPirate && (
        <div className="fixed bottom-0 right-0 z-[900] w-[440px] max-w-[60vw] pointer-events-none animate-in fade-in slide-in-from-bottom-20 duration-1000">
          <img 
            key={pirateKey}
            src="/map/pirate_overview_looped.gif" 
            alt="Pirate Intel" 
            className="w-full h-auto opacity-80 mix-blend-screen"
          />
        </div>
      )}






      {/* Modals with enhanced HUD design */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-300" onClick={() => setShowStatusModal(false)}>
          <div className="w-full max-w-[440px] bg-[#0a0e27]/95 border border-[#ffd60a]/20 border-t-[3px] border-t-[#ffd60a] shadow-[0_20px_50px_rgba(0,0,0,0.9)] [clip-path:polygon(20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_20px)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className="font-mono font-black text-xl text-gray-200 tracking-[0.1em] uppercase">Update Status</h2>
              <button type="button" className="text-white/20 text-3xl hover:text-[#ff006e] transition-colors leading-none" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <form onSubmit={saveBroadcast} className="p-6 flex flex-col gap-5">
              <p className="text-white/90 text-[11px] leading-relaxed uppercase tracking-wider">Share your current mission or activity with other kalcerians for 24h.</p>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Broadcast Signal</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-[#ffd60a] outline-none min-h-[120px] transition-all" 
                  value={statusText} 
                  onChange={(e) => setStatusText(e.target.value)} 
                  placeholder="OTW FM..." 
                  autoFocus 
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button type="submit" className="w-full py-4 bg-[#ffd60a] text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-[#ffc300] hover:-translate-y-0.5 active:translate-y-0 transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]" disabled={busy}>POST STATUS</button>
                {/* <button type="button" className="w-full py-4 border border-[#ff006e]/30 bg-[#ff006e]/5 text-[#ff006e] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#ff006e]/20 hover:border-[#ff006e] transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]" onClick={deleteBroadcast} disabled={busy}>ABORT STATUS</button> */}
              </div>
            </form>
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-300" onClick={() => setShowEventModal(false)}>
          <div className="w-full max-w-[440px] bg-[#0a0e27]/95 border border-[#ffd60a]/20 border-t-[3px] border-t-[#ffd60a] shadow-[0_20px_50px_rgba(0,0,0,0.9)] [clip-path:polygon(20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_20px)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className="font-mono font-black text-xl text-gray-200 tracking-[0.1em] uppercase">Create Your Event</h2>
              <button type="button" className="text-white/20 text-3xl hover:text-[#ff006e] transition-colors leading-none" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            <form onSubmit={saveMiniEvent} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Event Tittle</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-[#ffd60a] outline-none transition-all" 
                  value={eventForm.title} 
                  onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))} 
                  placeholder="Nongs FM Sini" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Briefing</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-[#ffd60a] outline-none min-h-[100px] transition-all" 
                  value={eventForm.description} 
                  onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))} 
                  placeholder="Agenda details" 
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button type="submit" className="w-full py-4 bg-[#ffd60a] text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-[#ffc300] hover:-translate-y-0.5 transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]" disabled={busy}>
                  {activeOwnEvent ? "UPDATE SIGNAL" : "DEPLOY SIGNAL"}
                </button>
                {activeOwnEvent && (
                  <button type="button" className="w-full py-4 border border-[#ff006e]/30 bg-[#ff006e]/5 text-[#ff006e] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#ff006e]/20 hover:border-[#ff006e] transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]" onClick={deleteMiniEvent} disabled={busy}>
                    RECALL SIGNAL
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HQ Modal - Enhanced Immersion */}
      {showHqModal && (
        <div className="fixed inset-0 z-[3000] grid place-items-center bg-[#050714]/20 backdrop-blur-2xl p-4 sm:p-8 animate-in zoom-in-95 duration-300" onClick={() => setShowHqModal(false)}>
          {/* Modal Background Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-[#ffd60a] rounded-full blur-[140px] opacity-[0.2] animate-[float-wide_30s_infinite_linear]" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[50vw] h-[50vw] bg-[#ff006e] rounded-full blur-[120px] opacity-[0.15] animate-[float-wide_35s_infinite_reverse_linear]" />
            <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] bg-[#ffd60a] rounded-full blur-[100px] opacity-[0.1] animate-[float_20s_infinite_alternate]" />
          </div>

          <div className="relative w-full max-w-5xl bg-[#0a0e27]/80 border border-[#ffd60a]/30 border-t-4 border-t-[#ffd60a] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" }}>

            <button className="absolute top-4 right-6 z-50 text-white/20 text-5xl hover:text-white transition-colors" onClick={() => setShowHqModal(false)}>×</button>
            
            <div className="w-full md:w-2/3 bg-black relative aspect-video md:aspect-auto">
              <video className="w-full h-full object-cover opacity-70" autoPlay loop muted playsInline src={hqPoint.videoUrl} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e27] via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-10 left-10 flex items-center gap-6">
                <div className="w-3 h-10 bg-[#ffd60a] shadow-[0_0_30px_#ffd60a]" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-mono font-black text-4xl text-white uppercase italic tracking-tighter leading-none">LIVE feed</h3>
                </div>
              </div>
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]" />
                <span className="text-[10px] font-mono text-white/50 tracking-[0.2em] uppercase">Encrypted Signal</span>
              </div>
            </div>

            <div className="w-full md:w-1/3 p-10 flex flex-col justify-center gap-8 bg-[#0a0e27]/50 backdrop-blur-2xl border-l border-white/5">
              <div>
                <label   className="text-gray-200 text-[10px] font-black uppercase tracking-[0.3em] mb-2 block opacity-60">Main Base</label>
                <h4 className="font-sans font-black text-4xl text-white uppercase leading-none tracking-tight">Fresh Market Bintaro</h4>
                <p className="text-white/40 text-xs uppercase font-mono mt-2 tracking-[0.2em]"></p>
              </div>
              <div className="w-full h-px bg-white/10 shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
              <div>
                {/* <label className="text-[#ffd60a] text-[10px] font-black uppercase tracking-[0.3em] mb-3 block opacity-60"></label> */}
                <p className="text-white/80 text-sm leading-relaxed italic font-serif">"{hqPoint.description}"</p>
              </div>
              <button 
                className="w-full py-5 border border-white/20 text-white font-black text-xs  tracking-[0.3em] hover:bg-white/5 hover:border-[#ffd60a] transition-all [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]" 
                onClick={() => setShowHqModal(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ffd60a; }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(15vw, 15vh) scale(1.2); }
          50% { transform: translate(-10vw, 20vh) scale(0.9); }
          75% { transform: translate(20vw, -15vh) scale(1.3); }
          100% { transform: translate(-5vw, -10vh) scale(1.1); }
        }

        @keyframes float-wide {
          0% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          25% { transform: translate(80vw, 20vh) scale(1.4); opacity: 0.4; }
          50% { transform: translate(40vw, 80vh) scale(0.8); opacity: 0.2; }
          75% { transform: translate(-20vw, 40vh) scale(1.2); opacity: 0.3; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
        }


        #panel-toggle:checked ~ section .toggle-arrow {
          transform: rotate(180deg);
        }

        .glitch-active {
          animation: glitch-burst 0.15s steps(2) infinite;
        }

        @keyframes glitch-burst {
          0% { transform: translate(3px, -2px); text-shadow: 2px 0 #ff006e, -2px 0 #00f2ff; clip-path: inset(10% 0 30% 0); }
          50% { transform: translate(-3px, 2px); text-shadow: -2px 0 #ff006e, 2px 0 #00f2ff; clip-path: inset(40% 0 10% 0); }
          100% { transform: translate(0); }
        }

        .animate-border-flow {
          animation: border-flow 4s linear infinite;
        }

        @keyframes border-flow {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 200%; }
        }

      `}</style>
        {/* Startup Sequence Overlay :: FORZA HORZON STYLE */}
      <AnimatePresence>
        {showStartup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(40px)" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[10000] bg-[#050a14] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Forza Style Atmospheric Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff006e]/20 via-transparent to-[#ffd60a]/20" />
              
              {/* Dynamic Speed Lines */}
              <div className="absolute inset-0 opacity-20">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "200%", opacity: [0, 1, 0] }}
                    transition={{ 
                      duration: Math.random() * 0.5 + 0.3, 
                      repeat: Infinity, 
                      delay: Math.random() * 2,
                      ease: "linear"
                    }}
                    className="absolute h-[1px] bg-white"
                    style={{ 
                      top: `${Math.random() * 100}%`, 
                      width: `${Math.random() * 300 + 100}px`,
                      transform: "rotate(-5deg)"
                    }}
                  />
                ))}
              </div>

              {/* Large Background Brand Label (Faded) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                <h2 className="text-[25vw] font-black italic tracking-tighter uppercase leading-none">KALCERIA</h2>
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
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-[3px] bg-[#ffd60a]" />
                  <span className="text-[12px] font-black text-[#ffd60a] uppercase tracking-[0.6em] italic">Your network onload</span>
                  <div className="w-12 h-[3px] bg-[#ffd60a]" />
                </div>
                <h1 className="text-8xl font-sans font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
                  Kalcerians Map<span className="text-[#ff006e]">.</span>
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
                        className="text-[14px] font-black text-white italic uppercase tracking-widest"
                      >
                        {startupMessages[startupStep]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-sans font-black text-white italic tracking-tighter leading-none">
                      {Math.round(startupProgress)}<span className="text-[20px] ml-1 text-white/40">%</span>
                    </span>
                  </div>
                </div>

                {/* The "Forza Stripe" Progress Bar */}
                <div className="relative h-4 w-full bg-white/5 skew-x-[-12deg] overflow-hidden border border-white/10">
                  <motion.div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff006e] via-[#ffd60a] to-[#ffc300] shadow-[0_0_30px_#ffd60a]" 
                    initial={{ width: "0%" }}
                    animate={{ width: `${startupProgress}%` }}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                  />
                  {/* Subtle stripes over progress */}
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.2)_50%,transparent_100%)] bg-[length:20px_100%] pointer-events-none" />
                </div>

                {/* Technical Footnote */}
                <div className="mt-8 flex justify-between items-start opacity-40">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4 text-[10px] font-black uppercase italic tracking-widest">
                      <span>Syncing Signals</span>
                      <span>//</span>
                      <span>Finding others</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-right space-y-1">
                    <p>KALCER RADAR</p>
                    <p>ENCRYPTED STABLE</p>
                  </div>
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

