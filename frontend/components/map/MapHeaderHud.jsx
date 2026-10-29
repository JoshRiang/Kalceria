"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";

export const MapHeaderHud = memo(function MapHeaderHud({
  isMapDark,
  setIsMapDark,
  mapCenter,
  actionMenuOpen,
  setActionMenuOpen,
  menuOpen,
  setMenuOpen,
  setShowQuitModal,
  setShowStatusModal,
  setShowEventModal,
  isStatusBusy,
  currentUser,
  avatarUrl,
  presence,
  handlePresenceChange,
}) {
  return (
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
          <div className={`relative flex items-center gap-3 px-4 h-[44px] rounded-[14px] backdrop-blur-xl transition-all duration-500 overflow-hidden ${isMapDark
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
              <div className="flex items-center h-4">
                <div className="flex gap-[2px] items-end h-3">
                  {[4, 6, 8, 10, 12].map((h, i) => (
                    <div
                      key={i}
                      className={`w-[2.5px] rounded-full ${i < 4 ? "bg-emerald-400" : (isMapDark ? "bg-white/15" : "bg-slate-300")}`}
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <button
          type="button"
          aria-label="Quick Actions Menu"
          aria-expanded={actionMenuOpen}
          aria-haspopup="true"
          className={`pointer-events-auto flex items-center justify-center w-[44px] h-[44px] border transition-all duration-300 rounded-[14px] focus-visible:ring-2 focus-visible:ring-white/30 outline-none group active:scale-95 ${actionMenuOpen
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
              className={`relative z-10 transition-transform duration-300 ${actionMenuOpen
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
          className={`absolute top-[54px] right-0 z-[1001] w-[240px] p-2 bg-black/40 backdrop-blur-[32px] border border-white/20 rounded-[20px] shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),_0_12px_48px_rgba(0,0,0,0.7)] transition-all duration-300 origin-top-right overflow-hidden ${actionMenuOpen
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
                <ContentImage
                  src={avatarUrl(currentUser)}
                  alt="Profile"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-[1.5px] border-[#0a0e27] rounded-full ${isStatusBusy ? "bg-amber-400" : (presence === "online" ? "bg-emerald-400" : "bg-slate-500")
                  }`}
              />
            </button>

            <div
              className={`absolute top-[54px] right-0 z-[1001] w-[230px] p-2 bg-black/40 backdrop-blur-[32px] border border-white/20 rounded-[20px] shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),_0_12px_48px_rgba(0,0,0,0.7)] transition-all duration-300 origin-top-right overflow-hidden ${menuOpen
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
                    className={`group relative w-full grid grid-cols-[12px_1fr] gap-3 px-3 py-2.5 text-left transition-all rounded-none border-l-[3px] overflow-hidden ${presence === item
                        ? (item === "online"
                          ? "bg-emerald-500/[0.08] border-emerald-400/80 text-white"
                          : "bg-slate-500/[0.08] border-slate-400/80 text-white")
                        : "border-transparent text-white/40 hover:bg-white/[0.05] hover:border-white/10 hover:text-white"
                      } ${isStatusBusy ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handlePresenceChange(item)}
                  >
                    {/* Dynamic Color Blobs */}
                    {item === "online" && (
                      <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-500 ${presence === item ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}>
                        <div className="absolute top-1/2 left-2 -translate-y-1/2 w-[80px] h-[80px] bg-gradient-to-r from-emerald-400/35 via-teal-300/30 to-transparent rounded-full blur-[20px] animate-pulse" />
                      </div>
                    )}
                    {item === "invisible" && (
                      <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-500 ${presence === item ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}>
                        <div className="absolute top-1/2 left-2 -translate-y-1/2 w-[80px] h-[80px] bg-gradient-to-r from-slate-400/35 via-blue-500/20 to-transparent rounded-full blur-[20px] animate-pulse" />
                      </div>
                    )}

                    <span
                      className={`relative z-10 w-[10px] h-[10px] rounded-full self-center ${item === "online"
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
  );
});
