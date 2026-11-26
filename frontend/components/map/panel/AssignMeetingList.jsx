"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import { getEventCategory } from "../EventIcon";
import { CategoryIcon } from "./PanelIcons";
import { KalceriansSkeletonList } from "./KalceriansSkeletonList";
import { formatGroupLastMessage } from "../groupChat/groupChatHelpers";
import {
  isEventOwner,
  isEventCollaborator,
  getEventPendingRequests,
} from "../hooks/useMapChatAndNotifications";

export const AssignMeetingList = memo(function AssignMeetingList({
  listContainerRef,
  isDataLoading,
  isMapDark,
  events = [],
  currentUser = null,
  acceptedCollabsMap = {},
  eventRequestsMap = {},
  eventGroupChatMap = {},
  groupSummaryMap = {},
  pinnedMeetingEventIds = [],
  searchQuery = "",
  onOpenGroupChat,
}) {
  const q = String(searchQuery || "").trim().toLowerCase();
  const pinnedSet = new Set((pinnedMeetingEventIds || []).map(String));
  const myId = currentUser?.id ? String(currentUser.id) : "";

  const meetingEvents = (events || []).filter((ev) => {
    const owned = isEventOwner(ev, currentUser);
    const collab = isEventCollaborator(ev, currentUser, acceptedCollabsMap);
    const inGroupMembers =
      Array.isArray(ev.groupMemberIds) && myId && ev.groupMemberIds.map(String).includes(myId);
    const inSummary = Boolean(groupSummaryMap?.[ev.id]);
    const pinned = pinnedSet.has(String(ev.id));
    if (!owned && !collab && !inGroupMembers && !inSummary && !pinned) return false;
    if (!q) return true;
    const title = String(ev.title || "").toLowerCase();
    const creatorName = String(ev.creator?.name || "").toLowerCase();
    return title.includes(q) || creatorName.includes(q);
  });

  return (
    <div
      ref={listContainerRef}
      className="relative z-10 flex-1 flex flex-col min-h-0 overflow-y-auto px-2.5 pt-2 pb-3.5 modern-kalcerian-scrollbar overscroll-contain"
    >
      {isDataLoading ? (
        <KalceriansSkeletonList isMapDark={isMapDark} />
      ) : meetingEvents.length > 0 ? (
        meetingEvents.map((ev) => {
          const summary = groupSummaryMap?.[ev.id] || null;
          const groupEntry = eventGroupChatMap?.[ev.id] || null;
          const unreadCount = Math.max(
            Number(summary?.unreadCount || 0),
            Number(groupEntry?.unreadCount || 0)
          );
          const pendingReqs = isEventOwner(ev, currentUser)
            ? getEventPendingRequests(ev, currentUser, eventRequestsMap).length
            : 0;
          const hasOngoingCall = Boolean(summary?.activeCall?.active);
          const hasNotif = unreadCount > 0 || pendingReqs > 0 || hasOngoingCall;
          const memberCount = Number(
            summary?.memberCount ||
              (Array.isArray(ev.groupMemberIds) ? ev.groupMemberIds.length : 0) ||
              (Array.isArray(ev.collaborators) ? ev.collaborators.length + 1 : 1)
          );
          const preview = hasOngoingCall
            ? `Live ${summary.activeCall.mode === "video" ? "video" : "voice"} call · Tap to join`
            : formatGroupLastMessage(summary?.lastMessage || null, memberCount, 34);

          return (
            <motion.button
              key={ev.id}
              type="button"
              layout="position"
              onClick={() => onOpenGroupChat?.(ev.id)}
              className={`relative shrink-0 w-full min-h-[64px] my-1 sm:my-1.5 rounded-xl border px-3 py-2.5 flex items-center gap-3 text-left transition-all duration-200 cursor-pointer active:scale-[0.99] outline-none ${
                isMapDark
                  ? "bg-[#0f1014]/84 border-[#2e323d] hover:border-[#4d5663] hover:bg-[#0f1014]/95 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.35)]"
                  : "bg-white/88 border-[#d1d5db] hover:border-[#b0b8c2] hover:bg-white/95 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_2px_6px_rgba(0,0,0,0.04)]"
              }`}
            >
              {/* Custom Group Avatar OR Event Category Icon + Red Dot */}
              <div className="relative w-11 h-11 shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center border border-current/20 bg-black/5 dark:bg-white/5">
                  {summary?.avatarUrl ? (
                    <ContentImage
                      src={summary.avatarUrl}
                      alt={ev.title || "Event Group"}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <CategoryIcon
                      category={getEventCategory(ev)}
                      isMapDark={isMapDark}
                      className="w-5 h-5"
                    />
                  )}
                </div>
                {hasNotif && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#ef4444] rounded-full ring-2 ring-white dark:ring-[#0f1014] pointer-events-none" />
                )}
              </div>

              {/* Exact Event Name + Last Group Message / Live Call Indicator */}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span
                  className={`text-[13.5px] font-bold tracking-tight truncate leading-tight ${
                    isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
                  }`}
                >
                  {ev.title || "Mini Event"}
                </span>
                <span
                  className={`truncate leading-snug mt-0.5 ${
                    hasOngoingCall
                      ? "text-[12px] font-bold text-emerald-500"
                      : unreadCount > 0
                      ? isMapDark
                        ? "text-[12.5px] font-bold text-white"
                        : "text-[12.5px] font-bold text-black"
                      : isMapDark
                      ? "text-[11.5px] font-normal text-[#8b949e]"
                      : "text-[11.5px] font-normal text-[#656d76]"
                  }`}
                >
                  {preview}
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
          No active event meetings yet. Join an event or tap the Group Chat icon on your event.
        </div>
      )}
    </div>
  );
});
