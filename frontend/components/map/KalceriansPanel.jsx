"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import { getEventCategory } from "./EventIcon";

const avatarUrl = (user) =>
  user?.profilePicture ||
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.nickname || user?.name || "anon")}`;

const FIND_TITLE_LETTERS = "Find other Kalcerians".split("");

const titleWaveContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.022,
      delayChildren: 0.05,
    },
  },
};

const titleLetterVariant = {
  hidden: {
    opacity: 0,
    x: -14,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 160,
    },
  },
};

function cleanDesc(value) {
  return String(value || "")
    .replace(/\[CAT:[a-z_]+\]\s*/gi, "")
    .replace(/\[MEDIA:[^\]]+\]\s*/gi, "")
    .trim();
}

// 24-hour broadcast freshness check
function getActiveBroadcast(user) {
  const b = user?.broadcast;
  if (!b) return null;
  const msg = typeof b === "string" ? b.trim() : (b.message || "").trim();
  if (!msg) return null;
  if (b.createdAt) {
    const age = Date.now() - new Date(b.createdAt).getTime();
    if (age > 24 * 60 * 60 * 1000 || age < 0) return null;
  }
  return msg;
}

// ─── 1. Category Event Icons (2D crisp black/white normalized by mode) ───────────
function CategoryIcon({ category, isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";

  switch (category) {
    case "eat":
      return (
        <svg viewBox="0 0 24 24" className="w-[19px] h-[19px] sm:w-5 sm:h-5 shrink-0" fill={fg} stroke={border} strokeWidth="0.8">
          <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-7v8h2.5V22H21V2c-2.76 0-5 2.24-5 5z" />
        </svg>
      );
    case "special":
      return (
        <svg viewBox="0 0 24 24" className="w-[19px] h-[19px] sm:w-5 sm:h-5 shrink-0" fill={fg} stroke={border} strokeWidth="0.8">
          <path d="M10.8 3h2.4l-.65 11h-1.1L10.8 3zM12 17.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5z" />
        </svg>
      );
    case "discuss":
      return (
        <svg viewBox="0 0 24 24" className="w-[19px] h-[19px] sm:w-5 sm:h-5 shrink-0" fill="none">
          <path d="M9 2.5h6c1.8 0 3.2 1.2 3.2 2.8s-1.4 2.8-3.2 2.8h-1.5l-2.5 2.5v-2.5H9c-1.8 0-3.2-1.2-3.2-2.8S7.2 2.5 9 2.5z" fill={fg} stroke={border} strokeWidth="0.8" />
          <circle cx="10.5" cy="5.3" r="0.7" fill={border} />
          <circle cx="12" cy="5.3" r="0.7" fill={border} />
          <circle cx="13.5" cy="5.3" r="0.7" fill={border} />
          <circle cx="7.5" cy="13" r="2.5" fill={fg} stroke={border} strokeWidth="0.8" />
          <path d="M3 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={fg} stroke={border} strokeWidth="0.8" />
          <circle cx="16.5" cy="13" r="2.5" fill={border} stroke={fg} strokeWidth="1" />
          <path d="M12 21c0-2.6 2-4.8 4.5-4.8s4.5 2.2 4.5 4.8" fill={border} stroke={fg} strokeWidth="1" />
        </svg>
      );
    case "cafe":
    default:
      return (
        <svg viewBox="0 0 24 24" className="w-[19px] h-[19px] sm:w-5 sm:h-5 shrink-0" fill="none">
          <path d="M10 2c-.8 1.5.8 2.6 0 4.2" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M13.5 1.5c-.9 1.6.9 2.8 0 4.5" stroke={fg} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M4 9.5h13c0 5-3 7.8-6.5 7.8S4 14.5 4 9.5z" fill={fg} stroke={border} strokeWidth="0.8" />
          <ellipse cx="10.5" cy="9.5" rx="6" ry="1.6" fill={border} stroke={fg} strokeWidth="0.6" />
          <path d="M5.5 11c-.2 1.8 1.2 4 2.8 4.8" stroke={border} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M17 10.5c2 0 3.5 1.2 3.5 2.8s-1.5 2.8-3.5 2.8" stroke={fg} strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="10.5" cy="19.2" rx="8.5" ry="1.7" fill={fg} stroke={border} strokeWidth="0.8" />
          <ellipse cx="10.5" cy="18.8" rx="6" ry="1" fill={border} />
        </svg>
      );
  }
}

// ─── 2. Broadcast Message Icon ───────────────────────────────────────────────────
function BroadcastLineIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-[17px] sm:h-[17px] shrink-0" fill="none">
      <path
        d="M20 12c0 3.86-3.58 7-8 7a9.3 9.3 0 0 1-3.1-.53L4 20l1.35-3.6A6.67 6.67 0 0 1 4 12c0-3.86 3.58-7 8-7s8 3.14 8 7z"
        fill={fg}
        stroke={border}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── 3. Chat / Message Button Icon ───────────────────────────────────────────────
function ChatButtonIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="none">
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        fill={fg}
        stroke={border}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── 4. Block Button Icon (Picture 4: Prohibited circle with diagonal line) ──────
function BlockButtonIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={border} strokeWidth="3" />
      <circle cx="12" cy="12" r="8.5" stroke={fg} strokeWidth="2" />
      <line x1="6" y1="6" x2="18" y2="18" stroke={border} strokeWidth="3" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke={fg} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── 5. Restore / Unblock Icon (Picture 5: Circle with broken diagonal slash) ────
function RestoreButtonIcon({ isMapDark }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={border} strokeWidth="3" />
      <circle cx="12" cy="12" r="8.5" stroke={fg} strokeWidth="2" />
      <line x1="6.2" y1="6.2" x2="9.8" y2="9.8" stroke={border} strokeWidth="3" strokeLinecap="round" />
      <line x1="6.2" y1="6.2" x2="9.8" y2="9.8" stroke={fg} strokeWidth="2" strokeLinecap="round" />
      <line x1="14.2" y1="14.2" x2="17.8" y2="17.8" stroke={border} strokeWidth="3" strokeLinecap="round" />
      <line x1="14.2" y1="14.2" x2="17.8" y2="17.8" stroke={fg} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
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
  blockedUserIds = [],
  onBlockUser,
  onUnblockUser,
}) {
  const [hoveredEventIconId, setHoveredEventIconId] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(null); // { userId, type: "block" | "unblock" }

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

      {/* 2. Header: "Find other Kalcerians" replacing Kalcerians with left wave-in animation */}
      <div
        onClick={() => setDrawerOpen((prev) => !prev)}
        className={`px-4 pb-2.5 pt-0.5 cursor-pointer flex justify-between items-center transition-colors select-none ${
          isMapDark ? "hover:bg-[#21262d]/40" : "hover:bg-[#f6f8fa]/60"
        }`}
      >
        <motion.h2
          key={drawerOpen ? "drawer-open" : "drawer-closed"}
          variants={titleWaveContainer}
          initial={drawerOpen ? "hidden" : "visible"}
          animate="visible"
          className={`font-sans font-bold text-base sm:text-lg tracking-tight select-none flex flex-wrap items-center ${
            isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
          }`}
        >
          {FIND_TITLE_LETTERS.map((char, index) => (
            <motion.span
              key={index}
              variants={titleLetterVariant}
              className="inline-block will-change-transform"
              style={{ whiteSpace: char === " " ? "pre" : "normal" }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h2>
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
            const isBlocked = blockedUserIds.includes(user.id);
            // Check if this Kalcerian created an event
            const userEvent = events.find(
              (e) =>
                e.creator?.id === user.id ||
                e.creator?.nickname?.toLowerCase() === user.nickname?.toLowerCase() ||
                e.creator?.name?.toLowerCase() === user.name?.toLowerCase()
            );

            return (
              <div
                key={user.id}
                className={`relative border-b transition-all duration-300 ${
                  isMapDark ? "border-[#30363d]/60" : "border-[#d0d7de]/70"
                } ${isBlocked ? "opacity-35 select-none" : ""}`}
              >
                <div
                  className={`relative w-full grid grid-cols-[64px_1fr] items-center gap-3 px-3 py-3 text-left transition-all group outline-none ${
                    isBlocked
                      ? "cursor-default pointer-events-none"
                      : "cursor-pointer active:scale-[0.99] " + (isMapDark ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]")
                  }`}
                  onMouseEnter={() => !isBlocked && setHoveredKalcerian(user.id)}
                  onMouseLeave={() => !isBlocked && setHoveredKalcerian(null)}
                  onClick={() => {
                    if (isBlocked) return;
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
                  {/* Dynamic Color Shift Blobs across hover & click/active on non-blocked cards */}
                  {!isBlocked && (
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
                  )}

                  {/* LEFT 1/3: Photo Profile Circle with Online/Offline Indicator */}
                  <div className="relative z-10 flex justify-center items-center">
                    <div className="relative">
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 border overflow-hidden rounded-full transition-transform ${
                          isBlocked
                            ? "grayscale-[80%] border-[#8b949e]/40"
                            : user.isOnline
                            ? isMapDark
                              ? "border-[#3fb950] group-hover:scale-105"
                              : "border-[#1a7f37] group-hover:scale-105"
                            : isMapDark
                            ? "border-[#30363d] opacity-50 group-hover:scale-105"
                            : "border-[#d0d7de] opacity-60 group-hover:scale-105"
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
                        } ${isBlocked ? "bg-[#8b949e]/50" : user.isOnline ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
                      />
                    </div>
                  </div>

                  {/* RIGHT 2/3: User Information & Clean Content */}
                  <div className="relative z-10 min-w-0 flex flex-col justify-center pr-1">
                    {/* Active 24h Broadcast Message */}
                    {(() => {
                      const activeBroadcastMsg = getActiveBroadcast(user);
                      return (
                        <>
                          {/* Line 1: User Name + Mini Event Category Icon + Broadcast Icon */}
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <b
                              className={`text-[13.5px] sm:text-[14px] font-bold tracking-tight truncate leading-snug ${
                                isBlocked
                                  ? isMapDark
                                    ? "text-[#8b949e]/70"
                                    : "text-[#656d76]/70"
                                  : isMapDark
                                  ? "text-[#f0f6fc]"
                                  : "text-[#1f2328]"
                              }`}
                            >
                              {user.name}
                            </b>

                            {/* Icons: Category Event Icon + Broadcast Icon (Hidden if blocked) */}
                            {!isBlocked && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Mini Event Icon with Hover Box Tooltip */}
                                {userEvent && (
                                  <div className="relative flex items-center">
                                    <button
                                      type="button"
                                      onMouseEnter={() => setHoveredEventIconId(userEvent.id)}
                                      onMouseLeave={() => setHoveredEventIconId(null)}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        focusUser(userEvent);
                                        if (window.innerWidth < 860) setDrawerOpen(false);
                                      }}
                                      className="p-1 rounded transition-transform hover:scale-115 active:scale-95 outline-none cursor-pointer flex items-center justify-center"
                                      title={userEvent.title}
                                    >
                                      <CategoryIcon category={getEventCategory(userEvent)} isMapDark={isMapDark} />
                                    </button>

                                    {/* Hover Box: Floating Arial tooltip with event title */}
                                    {hoveredEventIconId === userEvent.id && (
                                      <div
                                        className={`absolute bottom-full right-0 mb-1.5 z-50 px-2.5 py-1 rounded-md shadow-xl text-[11px] leading-tight font-sans font-medium whitespace-nowrap pointer-events-none transition-all ${
                                          isMapDark
                                            ? "bg-black border border-white text-white"
                                            : "bg-white border border-black text-black"
                                        }`}
                                        style={{ fontFamily: "Arial, sans-serif" }}
                                      >
                                        {userEvent.title}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Broadcast Message Icon (Shown only when broadcast is active within 24h) */}
                                {activeBroadcastMsg && (
                                  <div className="p-1 flex items-center shrink-0" title="Broadcast message">
                                    <BroadcastLineIcon isMapDark={isMapDark} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Line 2: ONLY active broadcast message in quotes (Arial, not bold, not all capital, black/white by mode) */}
                          {!isBlocked && activeBroadcastMsg && (
                            <p
                              className={`text-[12px] sm:text-[12.5px] font-normal normal-case leading-snug truncate mt-0.5 ${
                                isMapDark ? "text-white" : "text-black"
                              }`}
                              style={{ fontFamily: "Arial, sans-serif" }}
                            >
                              &quot;{activeBroadcastMsg}&quot;
                            </p>
                          )}
                        </>
                      );
                    })()}

                    {/* Bottom Right Actions (Chat Icon + Block Button, or Restore Button when blocked) */}
                    {!isBlocked ? (
                      <div className="flex items-center justify-end gap-2.5 mt-1.5 pt-0.5 pointer-events-auto">
                        {/* Chat Icon (message the user) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-1 transition-transform hover:scale-115 active:scale-95 outline-none cursor-pointer flex items-center justify-center"
                          title={`Message ${user.name}`}
                        >
                          <ChatButtonIcon isMapDark={isMapDark} />
                        </button>

                        {/* Block Button (Picture 4) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingAction({ userId: user.id, type: "block" });
                          }}
                          className="p-1 transition-transform hover:scale-115 active:scale-95 outline-none cursor-pointer flex items-center justify-center"
                          title={`Block ${user.name}`}
                        >
                          <BlockButtonIcon isMapDark={isMapDark} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end mt-1.5 pt-0.5 pointer-events-auto">
                        {/* Restore / Unblock Button (Picture 5 - ONLY touchable element on blocked card) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingAction({ userId: user.id, type: "unblock" });
                          }}
                          className="p-1 transition-transform hover:scale-115 active:scale-95 outline-none cursor-pointer flex items-center justify-center"
                          title={`Unblock ${user.name}`}
                        >
                          <RestoreButtonIcon isMapDark={isMapDark} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Block / Unblock Confirmation Overlay */}
                {confirmingAction?.userId === user.id && (
                  <div
                    className={`absolute inset-0 z-30 flex items-center justify-between px-3.5 sm:px-4 py-2 backdrop-blur-md rounded-xl transition-all ${
                      isMapDark
                        ? "bg-[#161b22]/90 border border-white/20 text-white shadow-xl"
                        : "bg-white/90 border border-black/20 text-black shadow-xl"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className="font-sans font-semibold text-[13px] sm:text-[13.5px] tracking-tight truncate mr-2"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      {confirmingAction.type === "block" ? `Block ${user.name}?` : `Unblock ${user.name}?`}
                    </span>
                    <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
                      {/* Cancel ✕ (Thin but determined, red, scales on hover/click) */}
                      <button
                        type="button"
                        onClick={() => setConfirmingAction(null)}
                        className="p-1 transition-transform hover:scale-125 active:scale-95 outline-none cursor-pointer"
                        title="Cancel"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke={isMapDark ? "#ff6b6b" : "#cf222e"} strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                      {/* Confirm ✓ (Thin but determined, green, scales on hover/click) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmingAction.type === "block") {
                            onBlockUser?.(user.id);
                          } else {
                            onUnblockUser?.(user.id);
                          }
                          setConfirmingAction(null);
                        }}
                        className="p-1 transition-transform hover:scale-125 active:scale-95 outline-none cursor-pointer"
                        title="Confirm"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke={isMapDark ? "#3fb950" : "#1a7f37"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Desktop Hover Card (Only for non-blocked users) */}
                {hoveredKalcerian === user.id && !isBlocked && (
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
                        className={`text-[11px] border-l-2 pl-2 line-clamp-2 ${
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
                          }}
                        >
                          Focus
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div
            className={`p-6 text-center text-xs ${
              isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
            }`}
          >
            No Kalcerians found.
          </div>
        )}
      </div>
    </motion.aside>
  );
}
