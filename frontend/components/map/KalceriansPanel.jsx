"use client";
import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";

const avatarUrl = (user) =>
  user?.profilePicture ||
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nickname || user?.name || "anon")}`;

export function KalceriansPanel({ scheduleTimeout, mapUsersData, kalcerians, events, searchQuery, setSearchQuery, drawerOpen, setDrawerOpen, isDataLoading, hoveredKalcerian, setHoveredKalcerian, isMapDark, setFocusedUserId, setSelectedOfflineUser, sidebarKalcerians, focusUser }) {
  return (
<motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        className={`absolute z-[1000] top-[100px] left-4 bottom-6 w-[340px] bg-black/45 backdrop-blur-[32px] border rounded-[24px] flex flex-col transition-all duration-500 -translate-x-[calc(100%-42px)] peer-checked:translate-x-0 max-[860px]:top-auto max-[860px]:bottom-0 max-[860px]:left-0 max-[860px]:w-full max-[860px]:h-[72vh] max-[860px]:border-r-0 max-[860px]:border-t max-[860px]:rounded-none max-[860px]:rounded-t-2xl max-[860px]:translate-x-0 max-[860px]:translate-y-[calc(100%-104px)] max-[860px]:peer-checked:translate-y-0 overflow-hidden ${
          isMapDark
            ? "border-white/20 shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),_0_20px_50px_rgba(0,0,0,0.8),_0_0_40px_rgba(255,0,110,0.15)]"
            : "bg-white/75 border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1),_inset_0_1px_4px_rgba(255,255,255,0.8)]"
        }`}
      >
        {/* Dynamic Glassmorphism Blobs depending on Mode */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {isMapDark ? (
            <>
              {/* Dark Mode: Gold & Black */}
              <motion.div 
                animate={{ scale: [1, 1.15, 0.9, 1], rotate: [0, 60, -60, 0], x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[15%] -left-[25%] w-[120%] h-[65%] bg-gradient-to-br from-[#ffd60a]/25 via-[#ffc300]/10 to-transparent rounded-full blur-[70px]" 
              />
              <motion.div 
                animate={{ scale: [1.1, 0.95, 1.05, 1.1], x: [0, -20, 15, 0], y: [0, 10, -15, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute -bottom-[20%] -right-[25%] w-[120%] h-[70%] bg-gradient-to-tl from-slate-950/60 via-black/40 to-transparent rounded-full blur-[80px]" 
              />
              <motion.div 
                animate={{ scale: [0.9, 1.1, 0.95, 0.9], x: [0, 15, -15, 0], y: [0, 10, -10, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-[25%] left-[5%] w-[90%] h-[45%] bg-gradient-to-r from-[#ffd60a]/15 to-transparent rounded-full blur-[65px]" 
              />
            </>
          ) : (
            <>
              {/* Light Mode: Balanced White & Green */}
              <motion.div 
                animate={{ scale: [1, 1.12, 0.92, 1], rotate: [0, -45, 45, 0], x: [0, 15, -10, 0], y: [0, -10, 15, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[15%] -left-[25%] w-[120%] h-[65%] bg-gradient-to-br from-emerald-500/25 to-transparent rounded-full blur-[65px]" 
              />
              <motion.div 
                animate={{ scale: [1.05, 0.95, 1.02, 1.05], x: [0, -15, 10, 0], y: [0, 15, -10, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                className="absolute -bottom-[20%] -right-[25%] w-[120%] h-[70%] bg-gradient-to-tl from-white/80 via-white/40 to-transparent rounded-full blur-[75px]" 
              />
              <motion.div 
                animate={{ scale: [0.95, 1.05, 0.95], x: [0, 10, -10, 0], y: [0, 12, -12, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute top-[25%] left-[5%] w-[90%] h-[45%] bg-gradient-to-r from-emerald-400/10 to-white/40 rounded-full blur-[55px]" 
              />
            </>
          )}
        </div>

        <label
          htmlFor="panel-toggle"
          aria-label="Toggle sidebar panel"
          className={`absolute top-1/2 -right-[3px] -translate-y-1/2 translate-x-full w-1 h-16 cursor-pointer transition-all rounded-r-full max-[860px]:relative max-[860px]:top-0 max-[860px]:right-0 max-[860px]:translate-x-0 max-[860px]:translate-y-0 max-[860px]:w-12 max-[860px]:h-1 max-[860px]:mx-auto max-[860px]:my-3 max-[860px]:rounded-full ${
            isMapDark ? "bg-white/20 hover:bg-white/40" : "bg-slate-400/30 hover:bg-slate-500/40"
          } hover:w-1.5 max-[860px]:bg-white/30`}
        />
 
        <label
          htmlFor="panel-toggle"
          className={`relative px-5 py-4 border-b cursor-pointer group flex justify-between items-center rounded-t-[24px] ${
            isMapDark ? "bg-white/[0.02] border-white/[0.05]" : "bg-slate-50/50 border-slate-200"
          }`}
        >
          <div className="flex flex-col">
            <h1
              className="font-sans font-black uppercase tracking-tighter text-xl md:text-[22px] leading-none text-white"
              style={{ textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)" }}
            >
              Kalcerians
            </h1>
            <p className={`text-[12px] mt-1 font-medium tracking-wider ${
              isMapDark ? "text-gray-400" : "text-slate-600"
            }`}>
              Find other Kalcerians
            </p>
          </div>
 
          <div className="w-10 h-10 flex items-center justify-center">
            <svg
              className={`w-5 h-5 transition-all duration-300 toggle-arrow ${
                isMapDark ? "text-gray-400 group-hover:text-white" : "text-slate-500 group-hover:text-slate-900"
              } ${drawerOpen ? "rotate-0" : "rotate-180"}`}
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
              className={`w-full border rounded-lg p-3 pl-10 text-[11px] font-sans outline-none transition-all ${
                isMapDark
                  ? "bg-white/[0.04] border-white/[0.12] text-white focus:border-white/25 placeholder:text-gray-500"
                  : "bg-slate-100/60 border-slate-300 text-slate-900 focus:border-slate-400 placeholder:text-slate-500"
              }`}
            />
            <svg
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                isMapDark ? "text-gray-400 group-focus-within:text-gray-300" : "text-slate-400 group-focus-within:text-slate-600"
              }`}
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
 
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          {/* Mini Events Section */}
          {events.length > 0 && (
            <div className="flex flex-col">
              <div className={`px-5 py-2 border-b flex items-center justify-between ${
                isMapDark
                  ? "bg-gradient-to-r from-white/[0.05] to-transparent border-white/[0.06]"
                  : "bg-gradient-to-r from-slate-100 to-transparent border-slate-200"
              }`}>
                <span className={`text-[12px] font-bold tracking-wider ${
                  isMapDark ? "text-gray-400" : "text-slate-700"
                }`}>
                  Mini Events
                </span>
                <span className="flex items-center gap-2">
                  <span className={`text-[11px] font-['Arial',sans-serif] ${
                    isMapDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                    Total: {events.length}
                  </span>
                </span>
              </div>
              <div className={`flex flex-col ${isMapDark ? "bg-[#000000]/20" : "bg-slate-50/40"}`}>
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    aria-label={`View mission: ${event.title}`}
                    className={`relative overflow-hidden w-full px-5 py-3.5 bg-transparent text-left transition-all border-b group flex flex-col gap-1 rounded-lg outline-none ${
                      isMapDark
                        ? "hover:bg-white/[0.03] border-white/[0.03] focus-visible:bg-white/5"
                        : "hover:bg-slate-100/60 border-slate-100 focus-visible:bg-slate-100"
                    }`}
                    onClick={() => focusUser(event)}
                  >
                    {/* Distributed Red-Magenta Dynamic 4-Point Chaos Blobs */}
                    <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none">
                      {/* Blob 1: Left */}
                      <div className="absolute top-[20%] -left-[20%] w-[120px] h-[120px] bg-red-500/25 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[3000ms]" />
                      {/* Blob 2: Right */}
                      <div className="absolute bottom-[20%] -right-[20%] w-[120px] h-[120px] bg-[#ff006e]/25 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[4000ms] delay-100" />
                      {/* Blob 3: Top */}
                      <div className="absolute -top-[40%] left-[20%] w-[130px] h-[100px] bg-red-500/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[2500ms] delay-200" />
                      {/* Blob 4: Bottom */}
                      <div className="absolute -bottom-[40%] right-[20%] w-[130px] h-[100px] bg-[#ff006e]/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[3500ms] delay-300" />
                    </div>

                    <div className="relative z-10 flex justify-between items-center">
                      <b className={`text-[15px] font-bold transition-all duration-300 leading-relaxed ${
                        isMapDark 
                          ? "text-white group-hover:text-white group-hover:drop-shadow-[1.5px_1.5px_0px_#ff006e] group-hover:drop-shadow-[-1px_-1px_0px_#ffd60a]" 
                          : "text-slate-900 group-hover:text-slate-900 group-hover:drop-shadow-[1.5px_1.5px_0px_rgba(15,23,42,0.15)] group-hover:drop-shadow-[-1.5px_-1.5px_0px_rgba(255,255,255,0.9)]"
                      }`}>
                        {event.title}
                      </b>
                    </div>
                    <p className={`relative z-10 text-[12px] line-clamp-1 italic ${
                      isMapDark ? "text-gray-400" : "text-slate-600"
                    }`}>
                      &quot;{event.description}&quot;
                    </p>
                    <div className="relative z-10 flex items-center gap-2 mt-1 opacity-60">
                      <div className={`w-5 h-5 border rounded-full overflow-hidden ${
                        isMapDark ? "border-white/10" : "border-slate-200"
                      }`}>
                        <ContentImage
                          className="w-full h-full object-cover"
                          src={avatarUrl(event.creator)}
                          alt="Host"
                          width={64}
                          height={64}
                        />
                      </div>
                      <span className={`text-[11px] font-medium tracking-wider ${
                        isMapDark ? "text-gray-400" : "text-slate-600"
                      }`}>
                        by {event.creator.nickname || event.creator.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
 
          {/* Operatives Section Header */}
          <div className={`px-5 py-2 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md ${
            isMapDark
              ? "bg-gradient-to-r from-white/[0.04] to-transparent border-white/[0.06] bg-[#0a0f1a]/40"
              : "bg-gradient-to-r from-slate-100 to-transparent border-slate-200 bg-white/70"
          }`}>
            <span className={`text-[12px] font-bold tracking-wider ${
              isMapDark ? "text-gray-400" : "text-slate-700"
            }`}>
              Kalcerians
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-['Arial',sans-serif] font-bold ${
                isMapDark ? "text-white" : "text-slate-900"
              }`}>
                Online :{" "}
                <span className={isMapDark ? "text-emerald-400" : "text-emerald-600"}>
                  {kalcerians.filter((k) => k.isOnline).length}
                </span>
              </span>
              <span className={`text-[11px] font-['Arial',sans-serif] ${
                isMapDark ? "text-gray-400" : "text-slate-500"
              }`}>
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
                    className={`px-5 py-5 border-b animate-pulse ${
                      isMapDark ? "border-white/[0.03]" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-full border ${
                        isMapDark ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-200"
                      }`} />
                      <div className="flex-1 space-y-3">
                        <div className={`h-3 w-[140px] rounded ${
                          isMapDark ? "bg-white/10" : "bg-slate-200"
                        }`} />
                        <div className={`h-2 w-[80px] rounded ${
                          isMapDark ? "bg-white/5" : "bg-slate-100"
                        }`} />
                      </div>
                      <div className={`w-12 h-2 rounded ${
                        isMapDark ? "bg-white/5" : "bg-slate-100"
                      }`} />
                    </div>
                  </div>
                ))}
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <div className={`w-7 h-7 border-2 rounded-full animate-spin ${
                    isMapDark ? "border-t-gray-300 border-white/5" : "border-t-slate-800 border-slate-200"
                  }`} />
                  <p className={`font-mono text-[9px] tracking-widest uppercase ${
                    isMapDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                    Scanning signals
                  </p>
                </div>
              </div>
            ) : sidebarKalcerians.length > 0 ? (
              sidebarKalcerians.map((user) => (
                <div key={user.id} className={`border-b ${
                  isMapDark ? "border-white/[0.03]" : "border-slate-100"
                }`}>
                  <div
                    className={`relative overflow-hidden w-full grid grid-cols-[44px_1fr_auto] items-center gap-4 px-5 py-3.5 text-left transition-all group cursor-pointer ${
                      isMapDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-100/60"
                    }`}
                    onMouseEnter={() => setHoveredKalcerian(user.id)}
                    onMouseLeave={() => setHoveredKalcerian(null)}
                    onClick={() => {
                      if (user.isOnline) {
                        setFocusedUserId(user.id);
                        // Clear after a moment so it can be re-triggered
                        scheduleTimeout(() => setFocusedUserId(null), 100);
                        if (window.innerWidth < 860) setDrawerOpen(false);
                      } else {
                        setSelectedOfflineUser(prev => prev === user.id ? null : user.id);
                      }
                    }}
                  >
                    {/* Distributed Red-Gold Dynamic 4-Point Chaos Blobs */}
                    <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none">
                      {/* Blob 1: Left */}
                      <div className="absolute top-[20%] -left-[20%] w-[120px] h-[120px] bg-red-500/25 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[3000ms]" />
                      {/* Blob 2: Right */}
                      <div className="absolute bottom-[20%] -right-[20%] w-[120px] h-[120px] bg-[#ffd60a]/20 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[4000ms] delay-100" />
                      {/* Blob 3: Top */}
                      <div className="absolute -top-[40%] left-[20%] w-[130px] h-[100px] bg-red-500/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[2500ms] delay-200" />
                      {/* Blob 4: Bottom */}
                      <div className="absolute -bottom-[40%] right-[20%] w-[130px] h-[100px] bg-[#ffd60a]/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[3500ms] delay-300" />
                    </div>

                    <div className="relative z-10">
                      <div
                        className={`w-10 h-10 border overflow-hidden rounded-full transition-transform group-hover:scale-105 ${
                          user.isOnline 
                            ? (isMapDark ? "border-emerald-500/40" : "border-emerald-500/60") 
                            : (isMapDark ? "border-white/10 opacity-50" : "border-slate-200 opacity-60")
                        }`}
                      >
                        <ContentImage
                          className="w-full h-full object-cover"
                          src={avatarUrl(user)}
                          alt={user.nickname || user.name}
                          width={64}
                          height={64}
                        />
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-[1.5px] rounded-full ${
                          isMapDark ? "border-[#0a0f1a]" : "border-white"
                        } ${user.isOnline ? "bg-emerald-400" : "bg-gray-500"}`}
                      />
                    </div>
                    <div className="relative z-10 min-w-0">
                      <div className="flex items-start flex-col">
                        <b
                          className={`text-sm font-bold tracking-tight truncate leading-relaxed transition-all duration-300 ${
                            user.isOnline 
                              ? (isMapDark 
                                  ? "text-gray-300 group-hover:text-gray-300 group-hover:drop-shadow-[1.5px_1.5px_0px_#ff006e] group-hover:drop-shadow-[-1px_-1px_0px_#ffd60a]" 
                                  : "text-slate-900 group-hover:text-slate-900 group-hover:drop-shadow-[1.5px_1.5px_0px_rgba(15,23,42,0.15)] group-hover:drop-shadow-[-1.5px_-1.5px_0px_rgba(255,255,255,0.9)]") 
                              : (isMapDark ? "text-white/40" : "text-slate-400")
                          }`}
                        >
                          {user.name}
                        </b>
                        <span className={`mt-1 px-2 py-1 rounded-md border text-[10px] font-bold tracking-wider leading-none shadow-[0_0_10px_rgba(255,255,255,0.02)] ${
                          isMapDark
                            ? "border-white/10 bg-gray-600/5 text-gray-400"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}>
                          {mapUsersData.find((u) => u.id === user.id)?.district ||
                            (user.isOnline ? "Scanning..." : "Unknown")}
                        </span>
                      </div>
                      <small
                        className={`block mt-1 text-[11px] italic truncate ${
                          user.isOnline 
                            ? (isMapDark ? "text-gray-400" : "text-slate-600") 
                            : (isMapDark ? "text-gray-600" : "text-slate-400")
                        }`}
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
                      className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-[220px] border rounded-xl shadow-2xl p-4 flex flex-col gap-3 pointer-events-auto hidden md:flex ${
                        isMapDark
                          ? "bg-[#0a0f1a]/95 border-white/10"
                          : "bg-white border-slate-200"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 ${
                          isMapDark ? "border-white/15" : "border-slate-200"
                        }`}>
                          <ContentImage
                            src={avatarUrl(user)}
                            alt=""
                            className="w-full h-full object-cover"
                            width={80}
                            height={80}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-bold truncate ${
                            isMapDark ? "text-white" : "text-slate-900"
                          }`}>
                            {user.name}
                          </p>
                          {user.nickname && (
                            <p className={`text-[10px] truncate ${
                              isMapDark ? "text-gray-400" : "text-slate-500"
                            }`}>
                              @{user.nickname}
                            </p>
                          )}
                        </div>
                      </div>
                      {user.broadcast?.message && (
                        <p className={`text-[11px] italic border-l-2 pl-2 line-clamp-2 ${
                          isMapDark ? "text-gray-300 border-[#ffd60a]/40" : "text-slate-600 border-[#ffc300]"
                        }`}>
                          &quot;{user.broadcast.message}&quot;
                        </p>
                      )}
                      <div className="flex gap-2">
                        <a
                          href={`/user/${user.id}`}
                          className={`flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider border rounded-lg transition-all ${
                            isMapDark
                              ? "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                              : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                          }`}
                        >
                          See Profile
                        </a>
                        {user.isOnline && (
                          <button
                            type="button"
                            className={`flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider border rounded-lg transition-all ${
                              isMapDark
                                ? "bg-[#ffd60a]/10 hover:bg-[#ffd60a]/20 border-[#ffd60a]/20 text-[#ffd60a]"
                                : "bg-[#ffc300]/10 hover:bg-[#ffc300]/20 border-[#ffc300]/30 text-yellow-800"
                            }`}
                            onClick={() => {
                              setFocusedUserId(user.id);
                              scheduleTimeout(() => setFocusedUserId(null), 100);
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
                <div className={`w-12 h-12 border rounded-full flex items-center justify-center opacity-30 ${
                  isMapDark ? "border-white/10" : "border-slate-300"
                }`}>
                  <svg
                    className="w-6 h-6 animate-pulse"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className={`font-['Arial',sans-serif] font-bold text-xs tracking-wide ${
                  isMapDark ? "text-gray-400" : "text-slate-500"
                }`}>
                  No Users Found
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
  );
}
