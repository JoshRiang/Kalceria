"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { userPopup } from "@/components/map/UserPopup";

const EVENT_CATEGORIES_GRID = [
  // Left top: Coffee Icon (Cafe Meeting)
  {
    id: "cafe",
    label: "Cafe Meeting",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  // Right top: Makanan Icon (Eat Together)
  {
    id: "eat",
    label: "Eat Together",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
        <line x1="15" y1="11" x2="15" y2="22" />
        <path d="M6 2v20" />
        <path d="M6 2c2 0 3 2 3 5s-1 5-3 5" />
      </svg>
    ),
  },
  // Left bottom: Tanda Seru Icon (Something Special)
  {
    id: "special",
    label: "Something Special",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  // Right bottom: People Discuss Icon (Discuss More)
  {
    id: "discuss",
    label: "Discuss More",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export const MapModals = memo(function MapModals({
  offlineUserObj,
  setSelectedOfflineUser,
  showStatusModal,
  setShowStatusModal,
  isMapDark,
  saveBroadcast,
  statusText,
  setStatusText,
  busy,
  showEventModal,
  setShowEventModal,
  saveMiniEvent,
  eventForm,
  setEventForm,
  activeOwnEvent,
  deleteMiniEvent,
  showHqModal,
  setShowHqModal,
  hqPoint,
  isExiting,
  showQuitModal,
  setShowQuitModal,
  handleQuitConfirm,
}) {
  return (
    <>
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

            <form onSubmit={saveMiniEvent} className="relative z-10 p-6 flex flex-col gap-4">
              <p className={isMapDark ? "text-white/60 text-sm leading-relaxed tracking-wide" : "text-slate-600 text-sm leading-relaxed tracking-wide"}>
                Share your current activity with other Kalcerians for 24h.
              </p>

              {/* 2x2 Category Selector */}
              <div className="flex flex-col gap-2">
                <label className={`text-xs font-semibold tracking-wider ${isMapDark ? "text-slate-400" : "text-slate-500"}`}>
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {EVENT_CATEGORIES_GRID.map((cat) => {
                    const isSelected = (eventForm.category || "cafe") === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEventForm((f) => ({ ...f, category: cat.id }))}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 outline-none ${
                          isSelected
                            ? (isMapDark
                                ? "border-white/60 bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.15)] ring-1 ring-white/40"
                                : "border-black/60 bg-black/5 shadow-[0_0_12px_rgba(0,0,0,0.08)] ring-1 ring-black/40")
                            : (isMapDark
                                ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100")
                        }`}
                      >
                        <div
                          className={`transition-colors duration-200 ${
                            isSelected
                              ? (isMapDark ? "text-white" : "text-black")
                              : "text-gray-400"
                          }`}
                        >
                          {cat.icon}
                        </div>
                        <span
                          style={{ fontFamily: "Arial, sans-serif" }}
                          className={`text-[11px] font-medium leading-tight text-center mt-1.5 transition-colors duration-200 ${
                            isMapDark ? "text-white" : "text-black"
                          }`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
    </>
  );
});
