"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { KalcerianCardItem } from "./panel/KalcerianCardItem";
import {
  isEventOwner,
  isEventCollaborator,
  getEventPendingRequests,
} from "./hooks/useMapChatAndNotifications";

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

// Device Family Character Limits for Name, Username, and Broadcast Status
const FAMILY_LIMITS = {
  hp: {
    name: 12,        // e.g. "Alwahib Raf..."
    username: 13,    // e.g. "alwahib_raf..."
    broadcast: 36,   // 2 compact lines
  },
  tab: {
    name: 20,
    username: 22,
    broadcast: 65,
  },
  ipad: {
    name: 13,        // fixed width sidebar (340px)
    username: 14,
    broadcast: 38,
  },
  desktop: {
    name: 16,        // fixed width sidebar (360px)
    username: 17,
    broadcast: 48,
  },
};

function truncateWithEllipsis(str, maxLen) {
  if (!str) return "";
  const s = String(str).trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trimEnd() + "...";
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
  onOpenItemOnMap,
  currentUser = null,
  requestedEventId = null,
  eventRequestsMap = {},
  acceptedCollabsMap = {},
  eventGroupChatMap = {},
  personalChatMap = {},
  recentlyMessagedUserIds = {},
  onPersonalChatOpen,
  onPromptCancelRequest,
  onOpenRequests,
}) {
  const [hoveredEventIconId, setHoveredEventIconId] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(null); // { userId, type: "block" | "unblock" }
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [deviceFamily, setDeviceFamily] = useState("desktop");
  const listContainerRef = useRef(null);

  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < 640) setDeviceFamily("hp");
      else if (w < 860) setDeviceFamily("tab");
      else if (w < 1180) setDeviceFamily("ipad");
      else setDeviceFamily("desktop");
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Whenever an incoming personal chat message arrives, smoothly scroll list to top so the rolling card is visible
  useEffect(() => {
    const handleScrollTop = () => {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("kalceria:personal-chat-sorted-top", handleScrollTop);
    return () => window.removeEventListener("kalceria:personal-chat-sorted-top", handleScrollTop);
  }, []);

  const limits = FAMILY_LIMITS[deviceFamily] || FAMILY_LIMITS.desktop;

  function handleAvatarClick(e, user) {
    if (e?.stopPropagation) e.stopPropagation();
    if (blockedUserIds.includes(user.id)) return;
    focusUser(user);
    // On all device families, keep drawer open and smoothly elongate profile card inline
    setExpandedUserId((prev) => (prev === user.id ? null : user.id));
  }

  return (
    <motion.aside
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className={`absolute z-[1000] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col transition-transform duration-300 ease-out overflow-hidden font-sans select-none backdrop-blur-[28px] max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[46vh] max-[860px]:max-h-[385px] max-[860px]:min-h-[340px] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
        drawerOpen ? "translate-y-0" : "translate-y-[calc(100%-66px)]"
      } ${
        isMapDark
          ? "bg-[#161b22]/85 border border-[#30363d]/90 text-[#f0f6fc] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.15),inset_-1px_-1.5px_2px_rgba(0,0,0,0.7),0_14px_36px_rgba(0,0,0,0.8)]"
          : "bg-white/80 border border-[#c4cbd4] text-[#1f2328] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.95),inset_-1px_-1.5px_2px_rgba(160,174,192,0.35),0_12px_36px_rgba(0,0,0,0.12)]"
      }`}
    >
      {/* 1. Top Scroll Bar / Pull Handle */}
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

      {/* 2. Header: "Find other Kalcerians" with left wave-in animation */}
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
            className={`w-full border rounded-xl py-1.5 pl-8 pr-3 text-[12px] font-sans outline-none transition-all ${
              isMapDark
                ? "bg-[#21262d]/45 border-[#38404a] text-[#f0f6fc] placeholder:text-[#8b949e] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12),inset_0_-1px_1px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] focus:border-[#58a6ff]"
                : "bg-white/60 border-[#d1d5db] text-[#1f2328] placeholder:text-[#656d76] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)] focus:border-[#0969da]"
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

      {/* 4. Content List: Unified Kalcerians list */}
      <div
        ref={listContainerRef}
        className="flex-1 flex flex-col min-h-0 overflow-y-auto px-2.5 pt-2 pb-3.5 modern-kalcerian-scrollbar overscroll-contain"
      >
        {isDataLoading ? (
          <div className="flex flex-col">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`shrink-0 min-h-[66px] my-1 rounded-xl border grid grid-cols-[64px_1fr] items-center gap-3 px-3.5 py-3 animate-pulse ${
                  isMapDark ? "border-[#30363d]/60 bg-[#21262d]/30" : "border-[#d0d7de]/70 bg-white/40"
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
            const isConfirming = confirmingAction?.userId === user.id;
            const isExpanded = expandedUserId === user.id;
            const activeBroadcastMsg = getActiveBroadcast(user);
            const displayName = user.displayName || user.name || user.nickname || "Kalcerian";
            const rawUsername = user.nickname || user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, '_') : "kalcerian");
            const cleanUsername = String(rawUsername).replace(/^@/, '');

            const userEvent = events.find(
              (e) =>
                e.creator?.id === user.id ||
                e.creator?.nickname?.toLowerCase() === user.nickname?.toLowerCase() ||
                e.creator?.name?.toLowerCase() === user.name?.toLowerCase()
            );
            const isOwnEvent = Boolean(userEvent && isEventOwner(userEvent, currentUser));
            const isCollaboratorEvent = Boolean(userEvent && isEventCollaborator(userEvent, currentUser, acceptedCollabsMap));
            const eventPendingRequests = userEvent && isOwnEvent ? getEventPendingRequests(userEvent, currentUser, eventRequestsMap) : [];
            const unreadGroupChatCount = userEvent && (isOwnEvent || isCollaboratorEvent) ? (eventGroupChatMap?.[userEvent.id]?.unreadCount || 0) : 0;
            const hasPendingRequests = eventPendingRequests.length > 0 || unreadGroupChatCount > 0;
            const isRequestedByMe = Boolean(userEvent && requestedEventId && String(requestedEventId) === String(userEvent.id));
            const isOtherEventDisabled = Boolean(userEvent && requestedEventId && String(requestedEventId) !== String(userEvent.id) && !isOwnEvent);
            const unreadPersonalChatCount = personalChatMap?.[user.id]?.unreadCount || 0;
            const isRecentlyMessaged = Boolean(recentlyMessagedUserIds?.[user.id]);

            return (
              <KalcerianCardItem
                key={user.id}
                user={user}
                userEvent={userEvent}
                isBlocked={isBlocked}
                isExpanded={isExpanded}
                isConfirming={isConfirming}
                confirmingAction={confirmingAction}
                setConfirmingAction={setConfirmingAction}
                isRequestedByMe={isRequestedByMe}
                isOwnEvent={isOwnEvent}
                hasPendingRequests={hasPendingRequests}
                eventPendingRequests={eventPendingRequests}
                unreadGroupChatCount={unreadGroupChatCount}
                unreadPersonalChatCount={unreadPersonalChatCount}
                isRecentlyMessaged={isRecentlyMessaged}
                onPersonalChatOpen={onPersonalChatOpen}
                isOtherEventDisabled={isOtherEventDisabled}
                displayName={displayName}
                cleanUsername={cleanUsername}
                activeBroadcastMsg={activeBroadcastMsg}
                limits={limits}
                deviceFamily={deviceFamily}
                isMapDark={isMapDark}
                hoveredKalcerian={hoveredKalcerian}
                setHoveredKalcerian={setHoveredKalcerian}
                hoveredEventIconId={hoveredEventIconId}
                setHoveredEventIconId={setHoveredEventIconId}
                focusUser={focusUser}
                setFocusedUserId={setFocusedUserId}
                scheduleTimeout={scheduleTimeout}
                setExpandedUserId={setExpandedUserId}
                handleAvatarClick={handleAvatarClick}
                onPromptCancelRequest={onPromptCancelRequest}
                onOpenRequests={onOpenRequests}
                onOpenItemOnMap={onOpenItemOnMap}
                setDrawerOpen={setDrawerOpen}
                onBlockUser={onBlockUser}
                onUnblockUser={onUnblockUser}
                avatarUrl={avatarUrl}
                truncateWithEllipsis={truncateWithEllipsis}
                cleanDesc={cleanDesc}
              />
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
