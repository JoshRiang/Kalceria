"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import KalcerianProfileCard from "../KalcerianProfileCard";
import { BlockConfirmModal } from "./BlockConfirmModal";
import {
  KalcerianCardAvatar,
  KalcerianCardFlankActions,
  KalcerianCardHoverFlyout,
} from "./kalcerianCard/index.js";

export const KalcerianCardItem = memo(function KalcerianCardItem({
  user,
  userEvent,
  isBlocked,
  isBlockedByTarget = false,
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
  isHovered = false,
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
      layout="position"
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 24,
        mass: 0.8,
      }}
      key={user.id}
      className={`relative shrink-0 min-h-[66px] my-1 sm:my-1.5 rounded-xl border transition-colors duration-200 ${
        isExpanded ? "overflow-hidden" : "overflow-visible"
      } ${
        isBlocked
          ? isMapDark
            ? "bg-[#0f1014]/92 border-[#2e323d] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.35)]"
            : "bg-white/95 border-[#d1d5db] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)]"
          : isMapDark
          ? "bg-[#0f1014]/84 border-[#2e323d] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.35)] hover:border-[#4d5663] hover:bg-[#0f1014]/92"
          : "bg-white/88 border-[#d1d5db] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)] hover:border-[#b0b8c2] hover:bg-white/95"
      }`}
    >
      <div
        className={`relative w-full grid grid-cols-[52px_1fr_54px] items-center gap-2 px-3 py-2.5 text-left transition-[filter] duration-200 ease-out group outline-none ${
          isBlocked
            ? "cursor-default"
            : "cursor-pointer active:scale-[0.99]"
        } ${isConfirming ? "blur-[3.5px] pointer-events-none select-none" : "blur-0"}`}
        onMouseEnter={() => !isBlocked && !isConfirming && setHoveredKalcerian(user.id)}
        onMouseLeave={() => !isBlocked && !isConfirming && setHoveredKalcerian(null)}
        onClick={() => {
          if (isBlocked || isConfirming) return;
          const isUserActivelyOnline = Boolean(user?.isOnline && user?.allowLiveLocation !== false);
          if (isUserActivelyOnline) {
            if (userEvent) {
              focusUser(userEvent);
            } else {
              setFocusedUserId(user.id);
              focusUser(user);
              scheduleTimeout(() => setFocusedUserId(null), 100);
            }
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
        <KalcerianCardAvatar
          user={user}
          isBlocked={isBlocked}
          isBlockedByTarget={isBlockedByTarget}
          isExpanded={isExpanded}
          isMapDark={isMapDark}
          isFavourite={isFavourite}
          isMuted={isMuted}
          avatarUrl={avatarUrl}
          handleAvatarClick={handleAvatarClick}
        />

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
        <KalcerianCardFlankActions
          user={user}
          userEvent={userEvent}
          isBlocked={isBlocked}
          isMapDark={isMapDark}
          isSelfOffline={isSelfOffline}
          isRequestedByMe={isRequestedByMe}
          isOwnEvent={isOwnEvent}
          hasPendingRequests={hasPendingRequests}
          eventPendingRequests={eventPendingRequests}
          isOtherEventDisabled={isOtherEventDisabled}
          unreadGroupChatCount={unreadGroupChatCount}
          unreadPersonalChatCount={unreadPersonalChatCount}
          activeBroadcastMsg={activeBroadcastMsg}
          displayName={displayName}
          hoveredEventIconId={hoveredEventIconId}
          setHoveredEventIconId={setHoveredEventIconId}
          hoveredChatIconId={hoveredChatIconId}
          setHoveredChatIconId={setHoveredChatIconId}
          onPromptCancelRequest={onPromptCancelRequest}
          onOpenItemOnMap={onOpenItemOnMap}
          focusUser={focusUser}
          setDrawerOpen={setDrawerOpen}
          setExpandedUserId={setExpandedUserId}
          onPersonalChatOpen={onPersonalChatOpen}
          setConfirmingAction={setConfirmingAction}
        />
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
              isBlockedByTarget={isBlockedByTarget}
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
      {(isHovered || (hoveredKalcerian !== undefined && hoveredKalcerian === user.id)) && !isBlocked && (
        <KalcerianCardHoverFlyout
          user={user}
          userEvent={userEvent}
          isMapDark={isMapDark}
          avatarUrl={avatarUrl}
          cleanDesc={cleanDesc}
          focusUser={focusUser}
          setFocusedUserId={setFocusedUserId}
          scheduleTimeout={scheduleTimeout}
        />
      )}
    </motion.div>
  );
});
