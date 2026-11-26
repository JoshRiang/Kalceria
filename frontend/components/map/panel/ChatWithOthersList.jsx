"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import { KalceriansSkeletonList } from "./KalceriansSkeletonList";
import { avatarUrl, truncateWithEllipsis } from "./kalceriansHelpers";
import {
  formatLastMessagePreview,
  readQuickLocalLastMessage,
} from "./chatPreviewHelpers";

export const ChatWithOthersList = memo(function ChatWithOthersList({
  listContainerRef,
  isDataLoading,
  isMapDark,
  activeScope,
  scopedKalcerians,
  currentUser,
  personalChatMap = {},
  blockedUserIds = [],
  blockedByUserIds = [],
  limits,
  isSelfOffline = false,
  onOpenPersonalChat,
}) {
  const sortedUsers = [...(scopedKalcerians || [])].sort((a, b) => {
    const aEntry = personalChatMap?.[a.id];
    const bEntry = personalChatMap?.[b.id];
    const aUnread = Number(aEntry?.unreadCount || 0) > 0 ? 1 : 0;
    const bUnread = Number(bEntry?.unreadCount || 0) > 0 ? 1 : 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    const aTs = Number(aEntry?.lastMessageAt || 0);
    const bTs = Number(bEntry?.lastMessageAt || 0);
    return bTs - aTs;
  });

  return (
    <div
      ref={listContainerRef}
      className="relative z-10 flex-1 flex flex-col min-h-0 overflow-y-auto px-2.5 pt-2 pb-3.5 modern-kalcerian-scrollbar overscroll-contain"
    >
      {isDataLoading ? (
        <KalceriansSkeletonList isMapDark={isMapDark} />
      ) : sortedUsers.length > 0 ? (
        sortedUsers.map((user) => {
          const isBlocked = (blockedUserIds || []).some(
            (id) => String(id).toLowerCase() === String(user.id).toLowerCase()
          );
          const isBlockedByTarget = (blockedByUserIds || []).some(
            (id) => String(id).toLowerCase() === String(user.id).toLowerCase()
          );
          const displayName = user.displayName || user.name || user.nickname || "Kalcerian";
          const entry = personalChatMap?.[user.id] || null;
          const unreadCount = Number(entry?.unreadCount || 0);
          const hasUnread = !isBlocked && !isSelfOffline && unreadCount > 0;
          const localLastMsg = readQuickLocalLastMessage(currentUser?.id, user.id);
          const previewText = isBlocked
            ? "Blocked user"
            : formatLastMessagePreview(entry, localLastMsg, limits?.broadcast ? Math.min(34, limits.broadcast) : 30);

          return (
            <motion.button
              key={user.id}
              type="button"
              layout="position"
              disabled={isSelfOffline}
              onClick={() => !isSelfOffline && onOpenPersonalChat?.(user)}
              className={`relative shrink-0 w-full min-h-[64px] my-1 sm:my-1.5 rounded-xl border px-3 py-2.5 flex items-center gap-3 text-left transition-all duration-200 outline-none ${
                isSelfOffline
                  ? "opacity-45 cursor-not-allowed"
                  : "cursor-pointer active:scale-[0.99]"
              } ${
                isMapDark
                  ? "bg-[#0f1014]/84 border-[#2e323d] hover:border-[#4d5663] hover:bg-[#0f1014]/95 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.35)]"
                  : "bg-white/88 border-[#d1d5db] hover:border-[#b0b8c2] hover:bg-white/95 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_2px_6px_rgba(0,0,0,0.04)]"
              }`}
            >
              {/* Avatar with Instagram-style Red Dot on Unread Incoming Chat */}
              <div className="relative w-11 h-11 shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-current/20">
                  {isBlocked || isBlockedByTarget ? (
                    <div className="w-full h-full bg-[#000000]" />
                  ) : (
                    <ContentImage
                      src={avatarUrl(user)}
                      alt={displayName}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#ef4444] rounded-full ring-2 ring-white dark:ring-[#0f1014] pointer-events-none" />
                )}
              </div>

              {/* Display Name + Last Message Preview (Bigger & Bold when Unread) */}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span
                  className={`text-[13.5px] font-bold tracking-tight truncate leading-tight ${
                    isBlocked
                      ? isMapDark
                        ? "text-[#8b949e]/70"
                        : "text-[#656d76]/70"
                      : isMapDark
                      ? "text-[#f0f6fc]"
                      : "text-[#1f2328]"
                  }`}
                >
                  {truncateWithEllipsis(displayName, limits?.name || 16)}
                </span>
                <span
                  className={`truncate leading-snug mt-0.5 transition-all ${
                    hasUnread
                      ? isMapDark
                        ? "text-[12.5px] font-bold text-white"
                        : "text-[12.5px] font-bold text-black"
                      : isMapDark
                      ? "text-[11.5px] font-normal text-[#8b949e]"
                      : "text-[11.5px] font-normal text-[#656d76]"
                  }`}
                >
                  {previewText}
                </span>
              </div>
            </motion.button>
          );
        })
      ) : (
        <div
          className={`p-6 text-center text-xs ${
            isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
          }`}
        >
          {activeScope === "global" ? "No Global chats yet." : "No Friend chats yet."}
        </div>
      )}
    </div>
  );
});
