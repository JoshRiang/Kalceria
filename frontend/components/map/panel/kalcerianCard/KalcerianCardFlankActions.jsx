"use client";

import { memo } from "react";
import { getEventCategory } from "../../EventIcon";
import {
  CategoryIcon,
  BroadcastLineIcon,
  ChatButtonIcon,
  BlockButtonIcon,
  RestoreButtonIcon,
} from "../PanelIcons";

export const KalcerianCardFlankActions = memo(function KalcerianCardFlankActions({
  user,
  userEvent,
  isBlocked,
  isBlockedByTarget = false,
  isMapDark,
  isSelfOffline,
  isRequestedByMe,
  isOwnEvent = false,
  hasPendingRequests,
  eventPendingRequests,
  isOtherEventDisabled,
  unreadGroupChatCount,
  unreadPersonalChatCount,
  activeBroadcastMsg,
  displayName,
  hoveredEventIconId,
  setHoveredEventIconId,
  hoveredChatIconId,
  setHoveredChatIconId,
  onPromptCancelRequest,
  onOpenItemOnMap,
  focusUser,
  setDrawerOpen,
  setExpandedUserId,
  onPersonalChatOpen,
  setConfirmingAction,
}) {
  const effectivePendingCount = isOwnEvent
    ? Math.max(
        Array.isArray(eventPendingRequests) ? eventPendingRequests.length : 0,
        Number(userEvent?.pendingRequestsCount) || 0
      )
    : Array.isArray(eventPendingRequests)
    ? eventPendingRequests.length
    : 0;
  return (
    <div className="relative z-10 shrink-0 flex flex-col items-end justify-between self-stretch py-0.5 pointer-events-auto">
      {/* Top Row: Dynamic Category Event & Broadcast Badges (Stacked with circle texture) */}
      <div className="flex items-center justify-end w-[54px] h-6">
        {!isBlocked && !isBlockedByTarget && (userEvent || activeBroadcastMsg) ? (
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
                      effectivePendingCount > 0
                        ? `${userEvent.title} (${effectivePendingCount} collab request${effectivePendingCount > 1 ? "s" : ""})`
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
                      ? effectivePendingCount > 0
                        ? `${userEvent.title} (${effectivePendingCount} Collab Request${effectivePendingCount > 1 ? "s" : ""})`
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
                  const isUserActivelyOnline = Boolean(user?.isOnline && user?.allowLiveLocation !== false);
                  if (isUserActivelyOnline) {
                    if (onOpenItemOnMap) {
                      onOpenItemOnMap(user, "user");
                    } else {
                      focusUser(user);
                    }
                    if (typeof window !== "undefined" && window.innerWidth < 860) setDrawerOpen(false);
                  } else {
                    setExpandedUserId((prev) => (prev === user.id ? null : user.id));
                  }
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
        {/* Slot 1: Chat Button (Dimmed & Disabled in Offline / Sniffer Mode, Red without glow when Blocked) */}
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
            title={isSelfOffline ? "Mode Offline (aktifkan mata untuk chat)" : isBlocked ? `Chat ${displayName} (Blocked)` : `Chat ${displayName}`}
          >
            <ChatButtonIcon isMapDark={isMapDark} isBlocked={isBlocked} />
            {!isSelfOffline && !isBlocked && unreadPersonalChatCount > 0 && (
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
              Chat {displayName} {isBlocked ? "(Blocked)" : ""}
            </div>
          )}
        </div>

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
  );
});
