"use client";

import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";

const avatarUrl = (user) =>
  user?.profilePicture ||
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nickname || user?.name || "anon")}`;

function cleanDesc(value) {
  return String(value || "")
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .trim();
}

export function KalceriansPanel({
  scheduleTimeout,
  mapUsersData,
  kalcerians,
  events,
  searchQuery,
  setSearchQuery,
  drawerOpen,
  setDrawerOpen,
  isDataLoading,
  hoveredKalcerian,
  setHoveredKalcerian,
  isMapDark,
  setFocusedUserId,
  setSelectedOfflineUser,
  sidebarKalcerians,
  focusUser,
}) {
  return (
    <motion.aside
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className={`absolute z-[1000] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col transition-transform duration-300 ease-out overflow-hidden font-sans select-none backdrop-blur-[28px] max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[72vh] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
        drawerOpen ? "translate-y-0" : "translate-y-[calc(100%-66px)]"
      } ${
        isMapDark
          ? "bg-[#161b22]/85 border border-white text-[#f0f6fc] shadow-[0_12px_36px_rgba(0,0,0,0.8)]"
          : "bg-white/85 border border-black text-[#1f2328] shadow-[0_12px_36px_rgba(0,0,0,0.18)]"
      }`}
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      }}
    >
      {/* 1. Top Scroll Bar / Pull Handle (Rolls down to bottom / rolls up across all families) */}
      <button
        type="button"
        aria-label="Toggle panel"
        onClick={() => setDrawerOpen((prev) => !prev)}
        className="w-full pt-2.5 pb-1 flex justify-center cursor-pointer select-none outline-none group"
      >
        <span
          className={`w-11 sm:w-12 h-1 rounded-full transition-colors ${
            isMapDark
              ? "bg-[#30363d] group-hover:bg-[#8b949e]"
              : "bg-[#d0d7de] group-hover:bg-[#656d76]"
          }`}
        />
      </button>

      {/* 2. Header: Kalcerians Title & Subtitle (Clean GitHub style, No 3D font, No < chevron) */}
      <div
        onClick={() => setDrawerOpen((prev) => !prev)}
        className={`px-4 pb-3 pt-0.5 cursor-pointer flex justify-between items-center transition-colors select-none ${
          isMapDark ? "hover:bg-[#21262d]/40" : "hover:bg-[#f6f8fa]/60"
        }`}
      >
        <div className="flex flex-col">
          <h2
            className={`text-[15px] sm:text-[16px] font-semibold leading-tight tracking-tight ${
              isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
            }`}
          >
            Kalcerians
          </h2>
          <p
            className={`text-[11px] sm:text-[11.5px] mt-0.5 leading-snug ${
              isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
            }`}
          >
            Find other Kalcerians
          </p>
        </div>
      </div>

      {/* 3. Search Bar - Modern GitHub Style */}
      <div className="px-3 pb-2.5">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-md py-1.5 pl-8 pr-3 text-[12px] font-sans outline-none transition-colors ${
              isMapDark
                ? "bg-[#0d1117]/80 border-[#30363d] text-[#f0f6fc] placeholder:text-[#8b949e] focus:border-[#1f6feb] focus:bg-[#161b22]"
                : "bg-[#f6f8fa]/80 border-[#d0d7de] text-[#1f2328] placeholder:text-[#656d76] focus:border-[#0969da] focus:bg-[#ffffff]"
            }`}
          />
          <svg
            className={`absolute left-2.5 w-3.5 h-3.5 pointer-events-none ${
              isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
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

      {/* 4. Content List: Unified Kalcerians list without subheaders, photo circle on left 1/3, color shift on hover/click */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        {isDataLoading ? (
          <div className="flex flex-col">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`grid grid-cols-[64px_1fr] items-center gap-3 px-3.5 py-3 border-b animate-pulse ${
                  isMapDark ? "border-[#30363d]/60" : "border-[#d0d7de]/70"
                }`}
              >
                <div className="flex justify-center">
                  <div
                    className={`w-11 h-11 rounded-full ${
                      isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <div
                    className={`h-3.5 w-[130px] rounded ${
                      isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
                    }`}
                  />
                  <div
                    className={`h-2.5 w-[180px] rounded ${
                      isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : sidebarKalcerians.length > 0 ? (
          sidebarKalcerians.map((user) => {
            // Check if this Kalcerian created an event or has a broadcast message
            const userEvent = events.find(
              (e) =>
                e.creator?.id === user.id ||
                e.creator?.nickname?.toLowerCase() === user.nickname?.toLowerCase() ||
                e.creator?.name?.toLowerCase() === user.name?.toLowerCase()
            );
            const district = mapUsersData.find((u) => u.id === user.id)?.district;
            const hasValidDistrict = district && !/^(scanning|unknown)/i.test(district.trim());

            return (
              <div
                key={user.id}
                className={`relative border-b ${
                  isMapDark ? "border-[#30363d]/60" : "border-[#d0d7de]/70"
                }`}
              >
                <div
                  className={`relative w-full grid grid-cols-[64px_1fr] items-center gap-3 px-3 py-3 text-left transition-all cursor-pointer group active:scale-[0.99] outline-none ${
                    isMapDark ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]"
                  }`}
                  onMouseEnter={() => setHoveredKalcerian(user.id)}
                  onMouseLeave={() => setHoveredKalcerian(null)}
                  onClick={() => {
                    if (userEvent) {
                      focusUser(userEvent);
                      if (window.innerWidth < 860) setDrawerOpen(false);
                    } else if (user.isOnline) {
                      setFocusedUserId(user.id);
                      focusUser(user);
                      scheduleTimeout(() => setFocusedUserId(null), 100);
                      if (window.innerWidth < 860) setDrawerOpen(false);
                    } else {
                      setSelectedOfflineUser((prev) => (prev === user.id ? null : user.id));
                    }
                  }}
                >
                  {/* Dynamic Color Shift Blobs (Picture 4) across hover & click/active on all families */}
                  <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none rounded-xl">
                    {/* Blob 1: Left - Soft Coral/Red */}
                    <div className="absolute top-[15%] -left-[15%] w-[120px] h-[120px] bg-red-500/25 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[3000ms]" />
                    {/* Blob 2: Right - Warm Gold/Amber */}
                    <div className="absolute bottom-[15%] -right-[15%] w-[120px] h-[120px] bg-[#ffd60a]/25 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[4000ms] delay-100" />
                    {/* Blob 3: Top - Soft Pink/Magenta */}
                    <div className="absolute -top-[35%] left-[25%] w-[130px] h-[100px] bg-[#ff006e]/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[2500ms] delay-200" />
                    {/* Blob 4: Bottom - Peach/Rose */}
                    <div className="absolute -bottom-[35%] right-[25%] w-[130px] h-[100px] bg-pink-500/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[3500ms] delay-300" />
                  </div>

                  {/* LEFT 1/3: Photo Profile Circle with Online/Offline Indicator */}
                  <div className="relative z-10 flex justify-center items-center">
                    <div className="relative">
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 border overflow-hidden rounded-full transition-transform group-hover:scale-105 ${
                          user.isOnline
                            ? isMapDark
                              ? "border-[#3fb950]"
                              : "border-[#1a7f37]"
                            : isMapDark
                            ? "border-[#30363d] opacity-50"
                            : "border-[#d0d7de] opacity-60"
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
                        className={`absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full ${
                          isMapDark ? "border-[#161b22]" : "border-white"
                        } ${user.isOnline ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
                      />
                    </div>
                  </div>

                  {/* RIGHT 2/3: User Information & Activity with Consistent Typography */}
                  <div className="relative z-10 min-w-0 flex flex-col justify-center pr-1">
                    {/* Line 1: User Name & Category Badge */}
                    <div className="flex items-center justify-between gap-1.5">
                      <b
                        className={`text-[13.5px] sm:text-[14px] font-bold tracking-tight truncate leading-snug transition-all duration-300 ${
                          isMapDark
                            ? "text-white group-hover:text-white group-hover:drop-shadow-[1.5px_1.5px_0px_#ff006e] group-hover:drop-shadow-[-1px_-1px_0px_#ffd60a]"
                            : "text-slate-900 group-hover:text-slate-900 group-hover:drop-shadow-[1.5px_1.5px_0px_rgba(15,23,42,0.15)] group-hover:drop-shadow-[-1.5px_-1.5px_0px_rgba(255,255,255,0.9)]"
                        }`}
                      >
                        {user.name}
                      </b>
                      {userEvent ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0 border ${
                            isMapDark
                              ? "bg-[#ff006e]/15 border-[#ff006e]/30 text-[#ff7597]"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}
                        >
                          {userEvent.category || "Event"}
                        </span>
                      ) : hasValidDistrict ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-medium border leading-none shrink-0 ${
                            isMapDark
                              ? "bg-[#21262d] border-[#30363d] text-[#8b949e]"
                              : "bg-[#f6f8fa] border-[#d0d7de] text-[#656d76]"
                          }`}
                        >
                          {district}
                        </span>
                      ) : null}
                    </div>

                    {/* Line 2: What they are doing (Event Title or Broadcast Motto or Status) */}
                    <p
                      className={`text-[12px] sm:text-[12.5px] font-medium leading-snug truncate mt-0.5 ${
                        userEvent
                          ? isMapDark
                            ? "text-[#ffd60a]"
                            : "text-[#b45309]"
                          : isMapDark
                          ? "text-[#f0f6fc]"
                          : "text-[#1f2328]"
                      }`}
                    >
                      {userEvent
                        ? userEvent.title
                        : user.broadcast?.message
                        ? `"${user.broadcast.message}"`
                        : user.isOnline
                        ? "Active on radar"
                        : "Offline"}
                    </p>

                    {/* Line 3: Description Quote or User Nickname */}
                    <p
                      className={`text-[11px] italic truncate mt-0.5 ${
                        isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
                      }`}
                    >
                      {userEvent?.description
                        ? `"${cleanDesc(userEvent.description)}"`
                        : user.nickname
                        ? `@${user.nickname}`
                        : "Kalcerian"}
                    </p>
                  </div>
                </div>

                {/* Desktop Hover Card */}
                {hoveredKalcerian === user.id && (
                  <div
                    className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-[220px] border rounded-lg shadow-xl p-3 flex flex-col gap-2.5 pointer-events-auto hidden md:flex font-sans backdrop-blur-md ${
                      isMapDark
                        ? "bg-[#161b22]/95 border-[#30363d] text-[#f0f6fc]"
                        : "bg-[#ffffff]/95 border-[#d0d7de] text-[#1f2328]"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full overflow-hidden border flex-shrink-0 ${
                          isMapDark ? "border-[#30363d]" : "border-[#d0d7de]"
                        }`}
                      >
                        <ContentImage
                          src={avatarUrl(user)}
                          alt=""
                          className="w-full h-full object-cover"
                          width={64}
                          height={64}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold truncate leading-tight">
                          {user.name}
                        </p>
                        {user.nickname && (
                          <p
                            className={`text-[10.5px] truncate mt-0.5 ${
                              isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
                            }`}
                          >
                            @{user.nickname}
                          </p>
                        )}
                      </div>
                    </div>

                    {(userEvent?.description || user.broadcast?.message) && (
                      <p
                        className={`text-[11px] italic border-l-2 pl-2 line-clamp-2 ${
                          isMapDark
                            ? "text-[#8b949e] border-[#ffd60a]/40"
                            : "text-[#656d76] border-[#d97706]"
                        }`}
                      >
                        &quot;{cleanDesc(userEvent?.description || user.broadcast?.message)}&quot;
                      </p>
                    )}

                    <div className="flex gap-2 mt-1">
                      <a
                        href={`/user/${user.id}`}
                        className={`flex-1 py-1.5 text-center text-[10.5px] font-medium border rounded transition-colors ${
                          isMapDark
                            ? "bg-[#21262d] border-[#30363d] text-[#f0f6fc] hover:bg-[#30363d]"
                            : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] hover:bg-[#f3f4f6]"
                        }`}
                      >
                        Profile
                      </a>
                      {(user.isOnline || userEvent) && (
                        <button
                          type="button"
                          className={`flex-1 py-1.5 text-center text-[10.5px] font-medium border rounded transition-colors cursor-pointer ${
                            isMapDark
                              ? "bg-[#238636] border-[#2ea043] text-white hover:bg-[#2ea043]"
                              : "bg-[#1f883d] border-[#1a7f37] text-white hover:bg-[#1a7f37]"
                          }`}
                          onClick={() => {
                            if (userEvent) {
                              focusUser(userEvent);
                            } else {
                              setFocusedUserId(user.id);
                              focusUser(user);
                              scheduleTimeout(() => setFocusedUserId(null), 100);
                            }
                            setHoveredKalcerian(null);
                          }}
                        >
                          Locate
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center flex flex-col items-center gap-2">
            <p
              className={`text-xs ${
                isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
              }`}
            >
              No Kalcerians found
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
