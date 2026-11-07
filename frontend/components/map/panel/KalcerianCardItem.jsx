"use client";

import { motion, AnimatePresence } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import { getEventCategory } from "../EventIcon";
import KalcerianProfileCard from "../KalcerianProfileCard";
import {
  CategoryIcon,
  BroadcastLineIcon,
  ChatButtonIcon,
  BlockButtonIcon,
  RestoreButtonIcon,
} from "./PanelIcons";
import { BlockConfirmModal } from "./BlockConfirmModal";

export function KalcerianCardItem({
  user,
  userEvent,
  isBlocked,
  isExpanded,
  isConfirming,
  confirmingAction,
  setConfirmingAction,
  isRequestedByMe,
  isOwnEvent,
  hasPendingRequests,
  eventPendingRequests,
  unreadGroupChatCount = 0,
  unreadPersonalChatCount = 0,
  isRecentlyMessaged = false,
  isFavourite = false,
  isMuted = false,
  isSelfOffline = false,
  onPersonalChatOpen,
  isOtherEventDisabled,
  displayName,
  cleanUsername,
  activeBroadcastMsg,
  limits,
  deviceFamily,
  isMapDark,
  hoveredKalcerian,
  setHoveredKalcerian,
  hoveredEventIconId,
  setHoveredEventIconId,
  hoveredChatIconId,
  setHoveredChatIconId,
  focusUser,
  setFocusedUserId,
  scheduleTimeout,
  setExpandedUserId,
  handleAvatarClick,
  onPromptCancelRequest,
  onOpenRequests,
  onOpenItemOnMap,
  setDrawerOpen,
  onBlockUser,
  onUnblockUser,
  avatarUrl,
  truncateWithEllipsis,
  cleanDesc,
}) {
  return (
    <motion.div
      layout
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 24,
        mass: 0.8,
      }}
      key={user.id}
      className={`relative shrink-0 min-h-[66px] my-1 sm:my-1.5 rounded-xl border transition-colors duration-200 backdrop-blur-[2px] ${
        isExpanded ? "overflow-hidden" : "overflow-visible"
      } ${
        isBlocked
          ? isMapDark
            ? "bg-[#0f1014]/50 border-[#2a2d37]/40 opacity-40 select-none shadow-none"
            : "bg-white/50 border-[#e5e7eb]/60 opacity-40 select-none shadow-none"
          : isMapDark
          ? "bg-[#0f1014]/75 border-[#2e323d] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.35)] hover:border-[#4d5663] hover:bg-[#0f1014]/88"
          : "bg-white/80 border-[#d1d5db] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)] hover:border-[#b0b8c2] hover:bg-white/92"
      }`}
    >
      <div
        className={`relative w-full grid grid-cols-[52px_1fr_54px] items-center gap-2 px-3 py-2.5 text-left transition-all group outline-none ${
          isBlocked
            ? "cursor-default pointer-events-none"
            : "cursor-pointer active:scale-[0.99]"
        } ${isConfirming ? "blur-[4px] pointer-events-none select-none" : ""}`}
        onMouseEnter={() => !isBlocked && !isConfirming && setHoveredKalcerian(user.id)}
        onMouseLeave={() => !isBlocked && !isConfirming && setHoveredKalcerian(null)}
        onClick={() => {
          if (isBlocked || isConfirming) return;
          if (userEvent) {
            focusUser(userEvent);
          } else if (user.isOnline) {
            setFocusedUserId(user.id);
            focusUser(user);
            scheduleTimeout(() => setFocusedUserId(null), 100);
          } else {
            focusUser(user);
          }
          setExpandedUserId((prev) => (prev === user.id ? null : user.id));
        }}
      >
        {/* Dynamic Color Shift Blobs across hover, click/active, or when rolling to top on incoming personal chat */}
        {!isBlocked && (
          <div
            className={`absolute inset-0 z-0 transition-opacity duration-300 overflow-hidden pointer-events-none rounded-xl ${
              isRecentlyMessaged
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-active:opacity-100"
            }`}
          >
            <div className="absolute top-[15%] -left-[15%] w-[120px] h-[120px] bg-red-500/25 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[3000ms]" />
            <div className="absolute bottom-[15%] -right-[15%] w-[120px] h-[120px] bg-[#ffd60a]/25 rounded-full blur-[20px] mix-blend-screen animate-pulse duration-[4000ms] delay-100" />
            <div className="absolute -top-[35%] left-[25%] w-[130px] h-[100px] bg-[#ff006e]/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[2500ms] delay-200" />
            <div className="absolute -bottom-[35%] right-[25%] w-[130px] h-[100px] bg-pink-500/20 rounded-full blur-[22px] mix-blend-screen animate-pulse duration-[3500ms] delay-300" />
          </div>
        )}

        {/* LEFT 1/3: Photo Profile Circle with Online/Offline Indicator */}
        <div className="relative z-10 flex justify-center items-center">
          <div
            className="relative cursor-pointer group/avatar"
            onClick={(e) => handleAvatarClick(e, user)}
            title={isExpanded ? "Close profile" : `View ${user.name}'s profile`}
          >
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 border overflow-hidden rounded-full transition-all relative ${
                isBlocked
                  ? "grayscale-[80%] border-[#8b949e]/40"
                  : isExpanded
                  ? "border-white ring-2 ring-white/50"
                  : user.isOnline
                  ? isMapDark
                    ? "border-[#3fb950] group-hover/avatar:scale-105"
                    : "border-[#1a7f37] group-hover/avatar:scale-105"
                  : isMapDark
                  ? "border-[#30363d] opacity-50 group-hover/avatar:scale-105"
                  : "border-[#d0d7de] opacity-60 group-hover/avatar:scale-105"
              }`}
            >
              <ContentImage
                className={`w-full h-full object-cover transition-all ${
                  isExpanded ? "blur-[2.5px] brightness-50" : ""
                }`}
                src={avatarUrl(user)}
                alt={user.nickname || user.name}
                width={64}
                height={64}
              />

              {/* When Expanded (Desktop/iPad): profile picture blurs and gets redup with thin white X */}
              {isExpanded && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white stroke-white" fill="none" strokeWidth="1.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            {/* Bottom-right Avatar Badges: Favourite (Love) & Mute (Speaker + Cross) Stacked Horizontally, with Active Green Dot at Lowest Stack Layer (z-[5]) */}
            {!isExpanded && (
              !isBlocked && (isFavourite || isMuted) ? (
                <div className="absolute -bottom-0.5 -right-1.5 z-20 flex items-center pointer-events-none">
                  {isFavourite && (
                    <span
                      className={`relative z-10 w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs ${
                        isMapDark
                          ? "bg-[#161b22] ring-1 ring-[#161b22]"
                          : "bg-white ring-1 ring-white"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-[11px] h-[11px]" fill="#ef4444">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </span>
                  )}
                  {isMuted && (
                    <span
                      className={`relative z-20 w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs ${
                        isFavourite ? "-ml-[6px]" : ""
                      } ${
                        isMapDark
                          ? "bg-[#161b22] ring-1 ring-[#161b22]"
                          : "bg-white ring-1 ring-white"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="w-[11px] h-[11px] overflow-visible">
                        <path
                          d="M 3 8.5 h 4 l 5.2 -4.5 v 16 l -5.2 -4.5 h -4 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z"
                          fill="#ef4444"
                        />
                        <line
                          x1="15.5"
                          y1="8.5"
                          x2="21.5"
                          y2="15.5"
                          stroke="#ef4444"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="21.5"
                          y1="8.5"
                          x2="15.5"
                          y2="15.5"
                          stroke="#ef4444"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  )}
                  {user.isOnline && (
                    <span
                      className={`relative z-[5] -ml-[5px] w-3 h-3 border-2 rounded-full bg-[#3fb950] ${
                        isMapDark ? "border-[#161b22]" : "border-white"
                      }`}
                    />
                  )}
                </div>
              ) : (
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full ${
                    isMapDark ? "border-[#161b22]" : "border-white"
                  } ${isBlocked ? "bg-[#8b949e]/50" : user.isOnline ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
                />
              )
            )}
          </div>
        </div>

        {/* MIDDLE: Display Name, Real Username (@handle), and 24h Broadcast Status */}
        <div className="relative z-10 min-w-0 flex flex-col justify-center pr-1 overflow-hidden">
          {/* Line 1: Display Name */}
          <b
            className={`text-[13px] sm:text-[13.5px] font-bold tracking-tight truncate leading-tight block ${
              isBlocked
                ? isMapDark
                  ? "text-[#8b949e]/70"
                  : "text-[#656d76]/70"
                : isMapDark
                ? "text-[#f0f6fc]"
                : "text-[#1f2328]"
            }`}
            title={displayName}
          >
            {truncateWithEllipsis(displayName, limits.name)}
          </b>

          {/* Line 2: Real Username (@handle in grey tiny font) */}
          <span
            className={`text-[10.5px] sm:text-[11px] font-normal leading-tight block truncate mt-0.5 ${
              isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
            }`}
            title={`@${cleanUsername}`}
          >
            @{truncateWithEllipsis(cleanUsername, limits.username)}
          </span>

          {/* Line 3: 24h Broadcast Status */}
          {!isBlocked && activeBroadcastMsg ? (
            <p
              className={`text-[11px] sm:text-[11.5px] font-normal normal-case leading-snug line-clamp-2 mt-1 break-words ${
                isMapDark ? "text-white" : "text-black"
              }`}
              style={{ fontFamily: "Arial, sans-serif" }}
              title={activeBroadcastMsg}
            >
              &quot;{truncateWithEllipsis(activeBroadcastMsg, limits.broadcast)}&quot;
            </p>
          ) : (
            <div className="h-0.5" />
          )}
        </div>

        {/* RIGHT: Synchronized 2x2 Grid Flank */}
        <div className="relative z-10 shrink-0 flex flex-col items-end justify-between self-stretch py-0.5 pointer-events-auto">
          {/* Top Row: Dynamic Category Event & Broadcast Badges (Stacked with circle texture) */}
          <div className="flex items-center justify-end w-[54px] h-6">
            {!isBlocked && (userEvent || activeBroadcastMsg) ? (
              <div className="flex items-center justify-end">
                {/* Dynamic Slot 1: Category Event Icon */}
                {userEvent && (
                  <div
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${
                      isMapDark
                        ? "bg-[#161b22] border border-white/25 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_1px_4px_rgba(0,0,0,0.7)]"
                        : "bg-[#ffffff] border border-black/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.12)]"
                    }`}
                  >
                    {isRequestedByMe ? (
                      <button
                        type="button"
                        disabled={isSelfOffline}
                        onMouseEnter={() => setHoveredEventIconId(userEvent.id)}
                        onMouseLeave={() => setHoveredEventIconId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelfOffline) return;
                          onPromptCancelRequest?.(userEvent.id, userEvent.title);
                        }}
                        className={`w-full h-full flex items-center justify-center rounded-full outline-none ${
                          isSelfOffline ? "opacity-35 grayscale cursor-not-allowed" : "cursor-pointer"
                        }`}
                        title={isSelfOffline ? "Offline (Stealth Mode)" : `Cancel request: ${userEvent.title}`}
                      >
                        <div className="filter grayscale opacity-45 flex items-center justify-center scale-90">
                          <CategoryIcon category={getEventCategory(userEvent)} isMapDark={isMapDark} />
                        </div>
                        <svg viewBox="0 0 24 24" className="absolute inset-0 w-6 h-6 pointer-events-none overflow-visible">
                          <line x1="4.5" y1="4.5" x2="19.5" y2="19.5" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    ) : hasPendingRequests ? (
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredEventIconId(userEvent.id)}
                        onMouseLeave={() => setHoveredEventIconId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenItemOnMap) {
                            onOpenItemOnMap(userEvent, "event");
                          } else {
                            focusUser(userEvent);
                          }
                          if (typeof window !== "undefined" && window.innerWidth < 860) setDrawerOpen(false);
                        }}
                        className="w-full h-full flex items-center justify-center rounded-full outline-none cursor-pointer"
                        title={
                          eventPendingRequests.length > 0
                            ? `${userEvent.title} (${eventPendingRequests.length} collab request${eventPendingRequests.length > 1 ? "s" : ""})`
                            : `${userEvent.title} (${unreadGroupChatCount} new group message${unreadGroupChatCount > 1 ? "s" : ""})`
                        }
                      >
                        <div className="scale-90 flex items-center justify-center">
                          <CategoryIcon category={getEventCategory(userEvent)} isMapDark={isMapDark} />
                        </div>
                        <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#ef4444] rounded-full pointer-events-none" />
                      </button>
                    ) : isOtherEventDisabled ? (
                      <button
                        type="button"
                        disabled
                        onMouseEnter={() => setHoveredEventIconId(userEvent.id)}
                        onMouseLeave={() => setHoveredEventIconId(null)}
                        className="w-full h-full flex items-center justify-center rounded-full opacity-40 grayscale cursor-not-allowed outline-none"
                        title={`${userEvent.title} (Active request pending on another event)`}
                      >
                        <div className="scale-90 flex items-center justify-center">
                          <CategoryIcon category={getEventCategory(userEvent)} isMapDark={isMapDark} />
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onMouseEnter={() => setHoveredEventIconId(userEvent.id)}
                        onMouseLeave={() => setHoveredEventIconId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenItemOnMap) {
                            onOpenItemOnMap(userEvent, "event");
                          } else {
                            focusUser(userEvent);
                          }
                          if (typeof window !== "undefined" && window.innerWidth < 860) setDrawerOpen(false);
                        }}
                        className="w-full h-full flex items-center justify-center rounded-full outline-none cursor-pointer"
                        title={userEvent.title}
                      >
                        <div className="scale-90 flex items-center justify-center">
                          <CategoryIcon category={getEventCategory(userEvent)} isMapDark={isMapDark} />
                        </div>
                      </button>
                    )}

                    {/* Hover Tooltip Box */}
                    {hoveredEventIconId === userEvent.id && (
                      <div
                        className={`absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-md shadow-2xl text-[11px] leading-tight font-sans font-medium whitespace-nowrap pointer-events-none transition-all ${
                          isMapDark
                            ? "bg-black border border-white text-white shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                            : "bg-white border border-black text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        }`}
                        style={{ fontFamily: "Arial, sans-serif" }}
                      >
                        {isRequestedByMe
                          ? `Cancel Request: ${userEvent.title}`
                          : hasPendingRequests
                          ? eventPendingRequests.length > 0
                            ? `${userEvent.title} (${eventPendingRequests.length} Collab Request${eventPendingRequests.length > 1 ? "s" : ""})`
                            : `${userEvent.title} (${unreadGroupChatCount} Group Message${unreadGroupChatCount > 1 ? "s" : ""})`
                          : isOtherEventDisabled
                          ? `${userEvent.title} (Request active elsewhere)`
                          : userEvent.title}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Slot 2: Broadcast Message Icon (Stacked horizontally on top with textured circle) */}
                {activeBroadcastMsg && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenItemOnMap) {
                        onOpenItemOnMap(user, "user");
                      } else {
                        focusUser(user);
                      }
                      if (typeof window !== "undefined" && window.innerWidth < 860) setDrawerOpen(false);
                    }}
                    className={`relative z-20 w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 outline-none cursor-pointer ${
                      userEvent ? "-ml-2.5" : ""
                    } ${
                      isMapDark
                        ? "bg-[#161b22] border border-white/25 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_1px_4px_rgba(0,0,0,0.7)]"
                        : "bg-[#ffffff] border border-black/25 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.12)]"
                    }`}
                    title="Open broadcast on map"
                  >
                    <div className="scale-85 flex items-center justify-center">
                      <BroadcastLineIcon isMapDark={isMapDark} />
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-6 h-6" />
            )}
          </div>

          {/* Bottom Row: Chat Button + Block/Restore Button */}
          <div className="grid grid-cols-2 gap-1.5 items-center justify-items-center w-[54px] mt-1.5">
            {/* Slot 1: Chat Button (Dimmed & Disabled in Offline / Sniffer Mode) */}
            {!isBlocked ? (
              <div className="relative flex items-center justify-center w-6 h-6">
                <button
                  type="button"
                  disabled={isSelfOffline}
                  onMouseEnter={() => !isSelfOffline && setHoveredChatIconId?.(user.id)}
                  onMouseLeave={() => setHoveredChatIconId?.(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelfOffline) return;
                    onPersonalChatOpen?.(user);
                  }}
                  className={`relative z-20 w-7 h-7 -m-0.5 flex items-center justify-center rounded-md outline-none transition-all ${
                    isSelfOffline
                      ? "opacity-30 grayscale cursor-not-allowed"
                      : "hover:scale-115 active:scale-95 cursor-pointer"
                  }`}
                  title={isSelfOffline ? "Mode Offline (aktifkan mata untuk chat)" : `Chat ${displayName}`}
                >
                  <ChatButtonIcon isMapDark={isMapDark} />
                  {!isSelfOffline && unreadPersonalChatCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ef4444] rounded-full shadow-sm pointer-events-none animate-pulse ring-1 ring-white/20" />
                  )}
                </button>

                {/* Hover Tooltip Box: "Chat <Display Name>" */}
                {!isSelfOffline && hoveredChatIconId === user.id && (
                  <div
                    className={`absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 rounded-md shadow-2xl text-[11px] leading-tight font-sans font-medium whitespace-nowrap pointer-events-none transition-all ${
                      isMapDark
                        ? "bg-black border border-white text-white shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                        : "bg-white border border-black text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                    }`}
                    style={{ fontFamily: "Arial, sans-serif" }}
                  >
                    Chat {displayName}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-6 h-6" />
            )}

            {/* Slot 2: Block Button or Restore Button */}
            {!isBlocked ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingAction({ userId: user.id, type: "block" });
                }}
                className="w-6 h-6 flex items-center justify-center transition-transform hover:scale-115 active:scale-95 outline-none cursor-pointer"
                title={`Block ${user.name}`}
              >
                <BlockButtonIcon isMapDark={isMapDark} />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingAction({ userId: user.id, type: "unblock" });
                }}
                className="w-6 h-6 flex items-center justify-center transition-transform hover:scale-115 active:scale-95 outline-none cursor-pointer"
                title={`Unblock ${user.name}`}
              >
                <RestoreButtonIcon isMapDark={isMapDark} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop & iPad Inline Profile Card Elongation */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key={`profile-${user.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`overflow-hidden border-t ${
              isMapDark ? "border-[#2e323d] bg-[#0f1014]" : "border-[#d1d5db] bg-white"
            } -mt-[1px]`}
          >
            <KalcerianProfileCard
              user={user}
              isMapDark={isMapDark}
              showMobileClose={deviceFamily === "hp" || deviceFamily === "tab"}
              onClose={() => setExpandedUserId(null)}
              inline={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Block / Unblock Confirmation Overlay */}
      <BlockConfirmModal
        show={isConfirming}
        actionType={confirmingAction?.type}
        userName={user.name}
        isMapDark={isMapDark}
        onCancel={() => setConfirmingAction(null)}
        onConfirm={() => {
          if (confirmingAction?.type === "block") {
            onBlockUser?.(user.id);
          } else {
            onUnblockUser?.(user.id);
          }
          setConfirmingAction(null);
        }}
      />

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
    </motion.div>
  );
}
