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
      className={`absolute z-[1000] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col transition-transform duration-300 ease-out overflow-hidden font-sans select-none max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[72vh] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
        drawerOpen ? "translate-y-0" : "translate-y-[calc(100%-66px)]"
      } ${
        isMapDark
          ? "bg-[#161b22] border border-white text-[#f0f6fc] shadow-[0_12px_36px_rgba(0,0,0,0.8)]"
          : "bg-[#ffffff] border border-black text-[#1f2328] shadow-[0_12px_36px_rgba(0,0,0,0.18)]"
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

      {/* 2. Header: Kalcerians Title & Subtitle (No 3D font, GitHub style, No < chevron) */}
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
                ? "bg-[#0d1117] border-[#30363d] text-[#f0f6fc] placeholder:text-[#8b949e] focus:border-[#1f6feb] focus:bg-[#161b22]"
                : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] placeholder:text-[#656d76] focus:border-[#0969da] focus:bg-[#ffffff]"
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

      {/* 4. Content List: Rolls down cleanly with effective scrollbar */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        {/* Mini Events Section */}
        {events.length > 0 && (
          <div className="flex flex-col">
            <div
              className={`px-3.5 py-1.5 border-t border-b flex items-center justify-between ${
                isMapDark
                  ? "bg-[#161b22] border-[#30363d]"
                  : "bg-[#f6f8fa] border-[#d0d7de]"
              }`}
            >
              <span
                className={`text-[11.5px] font-semibold tracking-wide ${
                  isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
                }`}
              >
                Mini Events
              </span>
              <span
                className={`text-[10.5px] ${
                  isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
                }`}
              >
                Total: {events.length}
              </span>
            </div>

            <div className="flex flex-col">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  aria-label={`View event: ${event.title}`}
                  className={`w-full px-3.5 py-2.5 text-left transition-colors border-b flex flex-col gap-0.5 outline-none cursor-pointer ${
                    isMapDark
                      ? "border-[#30363d] hover:bg-[#21262d]"
                      : "border-[#d0d7de] hover:bg-[#f6f8fa]"
                  }`}
                  onClick={() => focusUser(event)}
                >
                  <b
                    className={`text-[13px] font-medium leading-snug ${
                      isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
                    }`}
                  >
                    {event.title}
                  </b>
                  <p
                    className={`text-[11px] line-clamp-1 italic ${
                      isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
                    }`}
                  >
                    &quot;{cleanDesc(event.description)}&quot;
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 opacity-80">
                    <div
                      className={`w-4 h-4 rounded-full overflow-hidden border ${
                        isMapDark ? "border-[#30363d]" : "border-[#d0d7de]"
                      }`}
                    >
                      <ContentImage
                        className="w-full h-full object-cover"
                        src={avatarUrl(event.creator)}
                        alt="Host"
                        width={32}
                        height={32}
                      />
                    </div>
                    <span
                      className={`text-[10.5px] ${
                        isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
                      }`}
                    >
                      by {event.creator?.nickname || event.creator?.name || "Kalcerian"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kalcerians Section Header */}
        <div
          className={`px-3.5 py-1.5 border-t border-b flex items-center justify-between sticky top-0 z-10 ${
            isMapDark
              ? "bg-[#161b22] border-[#30363d]"
              : "bg-[#f6f8fa] border-[#d0d7de]"
          }`}
        >
          <span
            className={`text-[11.5px] font-semibold tracking-wide ${
              isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
            }`}
          >
            Kalcerians
          </span>
          <div className="flex items-center gap-2.5">
            <span
              className={`text-[10.5px] font-medium ${
                isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Online:{" "}
              <span className={isMapDark ? "text-[#3fb950]" : "text-[#1a7f37]"}>
                {kalcerians.filter((k) => k.isOnline).length}
              </span>
            </span>
            <span
              className={`text-[10.5px] ${
                isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
              }`}
            >
              Total: {sidebarKalcerians.length}
            </span>
          </div>
        </div>

        {/* Kalcerians User List */}
        <div className="flex-1 bg-transparent">
          {isDataLoading ? (
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`px-3.5 py-3 border-b animate-pulse flex items-center gap-3 ${
                    isMapDark ? "border-[#30363d]" : "border-[#d0d7de]"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full ${
                      isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
                    }`}
                  />
                  <div className="flex-1 space-y-2">
                    <div
                      className={`h-3 w-[120px] rounded ${
                        isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
                      }`}
                    />
                    <div
                      className={`h-2 w-[70px] rounded ${
                        isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : sidebarKalcerians.length > 0 ? (
            sidebarKalcerians.map((user) => (
              <div
                key={user.id}
                className={`border-b ${
                  isMapDark ? "border-[#30363d]" : "border-[#d0d7de]"
                }`}
              >
                <div
                  className={`relative w-full grid grid-cols-[36px_1fr_auto] items-center gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer group ${
                    isMapDark ? "hover:bg-[#21262d]" : "hover:bg-[#f6f8fa]"
                  }`}
                  onMouseEnter={() => setHoveredKalcerian(user.id)}
                  onMouseLeave={() => setHoveredKalcerian(null)}
                  onClick={() => {
                    if (user.isOnline) {
                      setFocusedUserId(user.id);
                      scheduleTimeout(() => setFocusedUserId(null), 100);
                      if (window.innerWidth < 860) setDrawerOpen(false);
                    } else {
                      setSelectedOfflineUser((prev) => (prev === user.id ? null : user.id));
                    }
                  }}
                >
                  {/* Avatar with Status Dot */}
                  <div className="relative">
                    <div
                      className={`w-9 h-9 border overflow-hidden rounded-full ${
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
                        width={48}
                        height={48}
                      />
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-[1.5px] rounded-full ${
                        isMapDark ? "border-[#161b22]" : "border-white"
                      } ${user.isOnline ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
                    />
                  </div>

                  {/* User details */}
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[13px] font-medium truncate ${
                          user.isOnline
                            ? isMapDark
                              ? "text-[#f0f6fc]"
                              : "text-[#1f2328]"
                            : isMapDark
                            ? "text-[#8b949e]"
                            : "text-[#656d76]"
                        }`}
                      >
                        {user.name}
                      </span>
                      {(() => {
                        const district = mapUsersData.find((u) => u.id === user.id)?.district;
                        if (!district || /^(scanning|unknown)/i.test(district.trim())) return null;
                        return (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-medium border leading-none ${
                              isMapDark
                                ? "bg-[#21262d] border-[#30363d] text-[#8b949e]"
                                : "bg-[#f6f8fa] border-[#d0d7de] text-[#656d76]"
                            }`}
                          >
                            {district}
                          </span>
                        );
                      })()}
                    </div>
                    {user.broadcast?.message && (
                      <p
                        className={`mt-0.5 text-[11px] italic truncate ${
                          isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
                        }`}
                      >
                        &quot;{user.broadcast.message}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Desktop Hover Card */}
                {hoveredKalcerian === user.id && (
                  <div
                    className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-[220px] border rounded-lg shadow-xl p-3 flex flex-col gap-2.5 pointer-events-auto hidden md:flex font-sans ${
                      isMapDark
                        ? "bg-[#161b22] border-[#30363d] text-[#f0f6fc]"
                        : "bg-[#ffffff] border-[#d0d7de] text-[#1f2328]"
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

                    {user.broadcast?.message && (
                      <p
                        className={`text-[11px] italic border-l-2 pl-2 line-clamp-2 ${
                          isMapDark
                            ? "text-[#8b949e] border-[#30363d]"
                            : "text-[#656d76] border-[#d0d7de]"
                        }`}
                      >
                        &quot;{user.broadcast.message}&quot;
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
                      {user.isOnline && (
                        <button
                          type="button"
                          className={`flex-1 py-1.5 text-center text-[10.5px] font-medium border rounded transition-colors cursor-pointer ${
                            isMapDark
                              ? "bg-[#238636] border-[#2ea043] text-white hover:bg-[#2ea043]"
                              : "bg-[#1f883d] border-[#1a7f37] text-white hover:bg-[#1a7f37]"
                          }`}
                          onClick={() => {
                            setFocusedUserId(user.id);
                            scheduleTimeout(() => setFocusedUserId(null), 100);
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
            ))
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
      </div>

      {/* 5. Bottom Bar: Kalcerians stats bar */}
      <div
        className={`px-4 py-2.5 border-t flex items-center justify-between text-[11.5px] select-none ${
          isMapDark
            ? "bg-[#161b22] border-white text-[#f0f6fc]"
            : "bg-[#ffffff] border-black text-[#1f2328]"
        }`}
      >
        <span className="font-semibold">Kalcerians</span>
        <div className="flex items-center gap-3">
          <span className="font-medium">
            Online:{" "}
            <span className={isMapDark ? "text-[#3fb950] font-bold" : "text-[#1a7f37] font-bold"}>
              {kalcerians.filter((k) => k.isOnline).length}
            </span>
          </span>
          <span className={isMapDark ? "text-[#8b949e]" : "text-[#656d76]"}>
            Total: {sidebarKalcerians.length}
          </span>
        </div>
      </div>
    </motion.aside>
  );
}
