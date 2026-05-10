"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";

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
  lat: -6.2715,
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
  { id: "e1", title: "Sunday Morning Ride", description: "Meting at HQ", lat: -6.2715, lng: 106.7135, creator: mockMe, expiresAt: new Date(Date.now() + 3600000).toISOString() },
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
  
  const mapRef = useRef(null);

  // Derived
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter((u) => 
      u.name.toLowerCase().includes(q) || 
      (u.district && u.district.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

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

  // Render
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#ffd60a] selection:text-black font-sans overflow-hidden">
      {/* Background Layer: Blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-black" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[35vw] h-[35vw] bg-[#ffd60a] rounded-full blur-[110px] opacity-[0.34] animate-[float_12s_infinite_alternate_ease-in-out]" />
        <div className="absolute right-[-10%] bottom-[-15%] w-[40vw] h-[40vw] bg-[#ff006e] rounded-full blur-[110px] opacity-[0.34] animate-[float_16s_infinite_alternate-reverse_ease-in-out]" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] bg-[#00f2ff] rounded-full blur-[110px] opacity-[0.34] animate-[float_14s_infinite_alternate_ease-in-out]" />
      </div>

      {/* Glass Backdrop */}
      <div className="fixed inset-0 z-[5] pointer-events-none bg-[#050714]/70 backdrop-blur-[58px] brightness-[0.34]" aria-hidden="true" />

      {/* SnapMap Component */}
      <div className="relative z-10 w-full h-screen">
        <SnapMap 
          users={users.filter((u) => (presence === "online" ? true : u.id !== mockMe.id))} 
          events={events} 
          onMapReady={(map) => {
            mapRef.current = map;
          }} 
        />
      </div>

      {/* Tactical Overlay: Vignette & Grid */}
      <div className="fixed inset-0 z-[40] pointer-events-none" aria-hidden="true" 
        style={{
          background: `
            radial-gradient(circle at center, rgba(0, 0, 0, 0.06) 0%, transparent 35%, rgba(10, 14, 39, 0.88) 100%), 
            linear-gradient(rgba(255, 214, 10, 0.05) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(255, 214, 10, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px'
        }}
      />

      {/* Header HUD */}
      <header className="absolute z-[1000] top-4 left-4 right-4 flex justify-between items-start gap-3 pointer-events-none max-[860px]:top-3 max-[860px]:left-3 max-[860px]:right-3">
        <Link 
          href="/" 
          className="pointer-events-auto inline-flex items-center justify-center gap-2 min-h-[48px] px-6 bg-[#0a0e27]/95 border border-white/10 text-[11px] font-black tracking-[0.2em] text-white/60 hover:text-[#ffd60a] hover:border-[#ffd60a] transition-all [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)] shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md"
        >
          <span className="text-lg">←</span>
          BACK
        </Link>

        <div className="relative flex items-start gap-3">
          <div className="relative flex items-start">
            <button
              type="button"
              className={`pointer-events-auto w-[48px] h-[48px] flex items-center justify-center border transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md ${
                actionMenuOpen 
                  ? "bg-[#ffd60a] border-[#ffd60a] text-black" 
                  : "bg-[#0a0e27]/95 border-[#ffd60a]/40 text-[#ffd60a] hover:bg-[#ffd60a]/10"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setActionMenuOpen((prev) => !prev);
                setMenuOpen(false);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
              className="pointer-events-auto w-[48px] h-[48px] flex items-center justify-center bg-[#0a0e27]/95 border border-white/10 hover:border-[#ffd60a]/50 transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)] shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md relative group"
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
      </header>

      {/* Kalcerians Panel */}
      <input type="checkbox" id="panel-toggle" className="hidden peer" defaultChecked={drawerOpen} />
      
      <section className="absolute z-[1000] top-[100px] left-4 bottom-6 w-[340px] bg-[#0a0e27]/20 backdrop-blur-xl border-r-[3px] border-[#ffd60a] shadow-[0_10px_40px_rgba(0,0,0,0.9)] [clip-path:polygon(0_0,calc(100%-20px)_0,100%_20px,100%_100%,20px_100%,0_calc(100%-20px))] flex flex-col transition-all duration-500 -translate-x-[calc(100%-14px)] peer-checked:translate-x-0 max-[860px]:top-auto max-[860px]:bottom-0 max-[860px]:left-0 max-[860px]:w-full max-[860px]:h-[72vh] max-[860px]:border-r-0 max-[860px]:border-t-[3px] max-[860px]:[clip-path:polygon(25px_0,calc(100%-25px)_0,100%_25px,100%_100%,0_100%,0_25px)] max-[860px]:translate-x-0 max-[860px]:translate-y-[calc(100%-104px)] max-[860px]:peer-checked:translate-y-0">
        
        <label htmlFor="panel-toggle" className="absolute top-1/2 -right-[3px] -translate-y-1/2 translate-x-full w-1.5 h-20 bg-[#ffd60a]/30 hover:bg-[#ffd60a] hover:w-2 cursor-pointer transition-all rounded-r-[4px] max-[860px]:relative max-[860px]:top-0 max-[860px]:right-0 max-[860px]:translate-x-0 max-[860px]:translate-y-0 max-[860px]:w-16 max-[860px]:h-1.5 max-[860px]:mx-auto max-[860px]:my-3 max-[860px]:rounded-full" />
        
        <label htmlFor="panel-toggle" className="px-5 py-4 bg-white/5 border-b border-white/10 cursor-pointer group flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase bg-gradient-to-r from-[#d9723d] via-[#edce60] to-[#b762dd] bg-clip-text text-transparent leading-none">KALCERIANS</h1>
            <p className="text-[9px] font-bold text-white/40 tracking-[0.1em] uppercase">Signals detected in proximity</p>
          </div>
          <button 
            type="button" 
            className="px-3 py-1.5 bg-[#0a0e27] border border-[#ffd60a]/20 text-[9px] font-black text-[#ffd60a] uppercase tracking-widest hover:bg-[#ffd60a] hover:text-black transition-all [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
            onClick={(e) => { e.stopPropagation(); recenterMap(); }}
          >
            RECENTER
          </button>
        </label>

        <div className="p-4 mt-4">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="SEARCH RADAR..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-black/40 border border-white/10 p-3 pl-10 text-[10px] font-mono tracking-[0.2em] text-white focus:border-[#ffd60a]/50 outline-none transition-all placeholder:text-white/20 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]" 
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#ffd60a]/50 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>

        {notice && (
          <div className="mx-4 mb-4 p-3 border-l-2 border-[#ff006e] bg-[#ff006e]/10 text-[#ffd7ef] text-[10px] leading-tight font-bold italic animate-in fade-in slide-in-from-left-2 duration-300">
            {notice}
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-[1px] bg-white/5">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button 
                  key={user.id} 
                  type="button" 
                  className="w-full grid grid-cols-[44px_1fr_auto] items-center gap-4 px-5 py-4 bg-transparent hover:bg-white/5 text-left transition-all border-b border-white/[0.03] group"
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
                      <span className="px-1.5 py-0.5 border border-white/10 bg-black/40 text-white/50 text-[9px] font-black uppercase tracking-widest leading-none">
                        {user.district}
                      </span>
                    </div>
                    <small className="block mt-2 text-white/30 text-[10px] italic truncate">
                      {user.broadcast?.message ? `"${user.broadcast.message}"` : ""}
                    </small>
                  </div>
                  <strong className="text-white/60 font-mono font-black text-[10px] tracking-widest">
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
      </section>

      {/* Modals with enhanced HUD design */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-300" onClick={() => setShowStatusModal(false)}>
          <div className="w-full max-w-[440px] bg-[#0a0e27]/95 border border-[#ffd60a]/20 border-t-[3px] border-t-[#ffd60a] shadow-[0_20px_50px_rgba(0,0,0,0.9)] [clip-path:polygon(20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_20px)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className="font-mono font-black text-xl text-[#ffd60a] tracking-[0.1em] uppercase">Update Status</h2>
              <button type="button" className="text-white/20 text-3xl hover:text-[#ff006e] transition-colors leading-none" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <form onSubmit={saveBroadcast} className="p-6 flex flex-col gap-5">
              <p className="text-white/40 text-[11px] leading-relaxed uppercase tracking-wider">Share your current mission or activity with other kalcerians for 24h.</p>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-[#ffd60a] uppercase tracking-[0.2em]">Broadcast Signal</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-[#ffd60a] outline-none min-h-[120px] transition-all" 
                  value={statusText} 
                  onChange={(e) => setStatusText(e.target.value)} 
                  placeholder="E.g. Cruising to Bintaro..." 
                  autoFocus 
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button type="submit" className="w-full py-4 bg-[#ffd60a] text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-[#ffc300] hover:-translate-y-0.5 active:translate-y-0 transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]" disabled={busy}>POST STATUS</button>
                <button type="button" className="w-full py-4 border border-[#ff006e]/30 bg-[#ff006e]/5 text-[#ff006e] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#ff006e]/20 hover:border-[#ff006e] transition-all [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]" onClick={deleteBroadcast} disabled={busy}>ABORT STATUS</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEventModal && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-300" onClick={() => setShowEventModal(false)}>
          <div className="w-full max-w-[440px] bg-[#0a0e27]/95 border border-[#ffd60a]/20 border-t-[3px] border-t-[#ffd60a] shadow-[0_20px_50px_rgba(0,0,0,0.9)] [clip-path:polygon(20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_20px)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.05]">
              <h2 className="font-mono font-black text-xl text-[#ffd60a] tracking-[0.1em] uppercase">Deploy Event</h2>
              <button type="button" className="text-white/20 text-3xl hover:text-[#ff006e] transition-colors leading-none" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            <form onSubmit={saveMiniEvent} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-[#ffd60a] uppercase tracking-[0.2em]">Event Callsign</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-[#ffd60a] outline-none transition-all" 
                  value={eventForm.title} 
                  onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))} 
                  placeholder="Meet up title" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-[#ffd60a] uppercase tracking-[0.2em]">Briefing</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:border-[#ffd60a] outline-none min-h-[100px] transition-all" 
                  value={eventForm.description} 
                  onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))} 
                  placeholder="Location and agenda details..." 
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
        <div className="fixed inset-0 z-[3000] grid place-items-center bg-black/90 backdrop-blur-md p-4 sm:p-8 animate-in zoom-in-95 duration-300" onClick={() => setShowHqModal(false)}>
          <div className="relative w-full max-w-5xl bg-[#0a0e27] border border-[#ffd60a]/30 border-t-4 border-t-[#ffd60a] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" }}>
            <button className="absolute top-4 right-6 z-50 text-white/20 text-5xl hover:text-white transition-colors" onClick={() => setShowHqModal(false)}>×</button>
            
            <div className="w-full md:w-2/3 bg-black relative aspect-video md:aspect-auto">
              <video className="w-full h-full object-cover opacity-70" autoPlay loop muted playsInline src={hqPoint.videoUrl} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e27] via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-10 left-10 flex items-center gap-6">
                <div className="w-3 h-20 bg-[#ffd60a] shadow-[0_0_30px_#ffd60a]" />
                <div className="flex flex-col gap-1">
                  <h3 className="font-mono font-black text-4xl text-white uppercase italic tracking-tighter leading-none">LIVE FEED: HQ</h3>
                  <p className="text-[#ffd60a] text-sm font-mono tracking-[0.5em] opacity-80 underline underline-offset-8 decoration-1">BINTARO SECTOR // 10.0.4.12</p>
                </div>
              </div>
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]" />
                <span className="text-[10px] font-mono text-white/50 tracking-[0.2em] uppercase">Encrypted Signal</span>
              </div>
            </div>

            <div className="w-full md:w-1/3 p-10 flex flex-col justify-center gap-8 bg-[#0a0e27]/50 backdrop-blur-2xl border-l border-white/5">
              <div>
                <label className="text-[#ffd60a] text-[10px] font-black uppercase tracking-[0.3em] mb-2 block opacity-60">Architect</label>
                <h4 className="font-sans font-black text-4xl text-white uppercase leading-none tracking-tight">Reyhan Batara</h4>
                <p className="text-white/40 text-xs uppercase font-mono mt-2 tracking-[0.2em]">Platform Founder</p>
              </div>
              <div className="w-full h-px bg-white/10 shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
              <div>
                <label className="text-[#ffd60a] text-[10px] font-black uppercase tracking-[0.3em] mb-3 block opacity-60">Objective</label>
                <p className="text-white/80 text-sm leading-relaxed italic font-serif">"{hqPoint.description}"</p>
              </div>
              <button 
                className="w-full py-5 border border-white/20 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white/5 hover:border-[#ffd60a] transition-all [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]" 
                onClick={() => setShowHqModal(false)}
              >
                DISMISS HUD
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
      `}</style>
    </div>
  );
}
