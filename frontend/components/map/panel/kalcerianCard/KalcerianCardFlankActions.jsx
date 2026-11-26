"use client";

import { memo } from "react";
import {
  AddFriendButtonIcon,
  PendingFriendButtonIcon,
} from "../PanelIcons";

/**
 * Find Other Peeps card flank actions.
 * Event & Broadcast icons have moved to the dedicated Reels Discovery Panel.
 * Global non-friends retain Add Friend (+ / pending / incoming red-dot accept).
 */
export const KalcerianCardFlankActions = memo(function KalcerianCardFlankActions({
  user,
  isFriend = true,
  friendshipStatus = "friend",
  isBlocked,
  isBlockedByTarget = false,
  isMapDark,
  displayName,
  setConfirmingAction,
}) {
  return (
    <div className="relative z-10 shrink-0 flex flex-col items-end justify-center self-stretch py-0.5 pointer-events-auto">
      <div className="flex items-center justify-end w-[54px] h-6">
        {!isFriend && !isBlocked && !isBlockedByTarget ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextType =
                friendshipStatus === "incoming_pending"
                  ? "friend_accept"
                  : friendshipStatus === "outgoing_pending"
                  ? "friend_cancel"
                  : "friend_send";
              setConfirmingAction({ userId: user.id, type: nextType });
            }}
            className="relative w-6 h-6 flex items-center justify-center transition-transform hover:scale-115 active:scale-95 outline-none cursor-pointer"
            title={
              friendshipStatus === "incoming_pending"
                ? `Accept ${displayName} friend request`
                : friendshipStatus === "outgoing_pending"
                ? `Cancel friend request to ${displayName}`
                : `Send friend request to ${displayName}`
            }
          >
            {friendshipStatus === "outgoing_pending" ? (
              <PendingFriendButtonIcon isMapDark={isMapDark} />
            ) : (
              <AddFriendButtonIcon isMapDark={isMapDark} />
            )}
            {friendshipStatus === "incoming_pending" && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ef4444] rounded-full pointer-events-none ring-1 ring-white/25" />
            )}
          </button>
        ) : (
          <div className="w-6 h-6" />
        )}
      </div>
    </div>
  );
});
