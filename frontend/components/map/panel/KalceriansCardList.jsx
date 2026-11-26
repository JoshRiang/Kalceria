"use client";

import { KalcerianCardItem } from "./KalcerianCardItem";
import { KalceriansSkeletonList } from "./KalceriansSkeletonList";
import {
  avatarUrl,
  cleanDesc,
  truncateWithEllipsis,
  getActiveBroadcast,
} from "./kalceriansHelpers";
import {
  isEventOwner,
  isEventCollaborator,
  doesEventBelongToUser,
  getEventPendingRequests,
} from "../hooks/useMapChatAndNotifications";

export function KalceriansCardList({
  listContainerRef,
  isDataLoading,
  isMapDark,
  activeScope,
  scopedKalcerians,
  events,
  currentUser,
  blockedUserIds,
  blockedByUserIds,
  confirmingAction,
  setConfirmingAction,
  expandedUserId,
  setExpandedUserId,
  requestedEventId,
  eventRequestsMap,
  acceptedCollabsMap,
  eventGroupChatMap,
  personalChatMap,
  recentlyMessagedUserIds,
  favouriteUserIds,
  mutedUserIds,
  isSelfOffline,
  handleOpenChatWithTransition,
  limits,
  deviceFamily,
  localHoveredKalcerian,
  setLocalHoveredKalcerian,
  hoveredEventIconId,
  setHoveredEventIconId,
  hoveredChatIconId,
  setHoveredChatIconId,
  focusUser,
  setFocusedUserId,
  scheduleTimeout,
  handleAvatarClick,
  onPromptCancelRequest,
  onOpenRequests,
  onOpenItemOnMap,
  setDrawerOpen,
  onBlockUser,
  onUnblockUser,
  getFriendshipStatus,
  isUserFriend,
  onSendFriendRequest,
  onCancelFriendRequest,
  onAcceptFriendRequest,
  onRejectFriendRequest,
}) {
  return (
    <div
      ref={listContainerRef}
      className="relative z-10 flex-1 flex flex-col min-h-0 overflow-y-auto px-2.5 pt-2 pb-3.5 modern-kalcerian-scrollbar overscroll-contain"
    >
      {isDataLoading ? (
        <KalceriansSkeletonList isMapDark={isMapDark} />
      ) : scopedKalcerians.length > 0 ? (
        scopedKalcerians.map((user) => {
          const isBlocked = (blockedUserIds || []).some(
            (id) => String(id).toLowerCase() === String(user.id).toLowerCase()
          );
          const isBlockedByTarget =
            Array.isArray(blockedByUserIds) &&
            blockedByUserIds.some(
              (id) => String(id).toLowerCase() === String(user.id).toLowerCase()
            );
          const friendshipStatus = getFriendshipStatus(user);
          const isFriend = isUserFriend(user);
          const isConfirming = confirmingAction?.userId === user.id;
          const isExpanded = expandedUserId === user.id;
          const activeBroadcastMsg = isFriend ? getActiveBroadcast(user) : null;
          const displayName = user.displayName || user.name || user.nickname || "Kalcerian";
          const rawUsername =
            user.nickname ||
            user.username ||
            (user.name ? user.name.toLowerCase().replace(/\s+/g, "_") : "kalcerian");
          const cleanUsername = String(rawUsername).replace(/^@/, "");

          const userEvent = isFriend
            ? user.event && doesEventBelongToUser(user.event, user, currentUser?.id)
              ? user.event
              : events.find((e) => doesEventBelongToUser(e, user, currentUser?.id))
            : null;
          const isOwnEvent = Boolean(userEvent && isEventOwner(userEvent, currentUser));
          const isCollaboratorEvent = Boolean(
            userEvent && isEventCollaborator(userEvent, currentUser, acceptedCollabsMap)
          );
          const eventPendingRequests =
            userEvent && isOwnEvent
              ? getEventPendingRequests(userEvent, currentUser, eventRequestsMap)
              : [];
          const effectivePendingReqCount =
            userEvent && isOwnEvent
              ? Math.max(eventPendingRequests.length, Number(userEvent.pendingRequestsCount) || 0)
              : 0;
          const unreadGroupChatCount =
            userEvent && (isOwnEvent || isCollaboratorEvent)
              ? eventGroupChatMap?.[userEvent.id]?.unreadCount || 0
              : 0;
          const hasPendingRequests = effectivePendingReqCount > 0 || unreadGroupChatCount > 0;
          const isRequestedByMe = Boolean(
            userEvent && requestedEventId && String(requestedEventId) === String(userEvent.id)
          );
          const isOtherEventDisabled = Boolean(
            userEvent &&
              requestedEventId &&
              String(requestedEventId) !== String(userEvent.id) &&
              !isOwnEvent
          );
          const unreadPersonalChatCount = personalChatMap?.[user.id]?.unreadCount || 0;
          const isRecentlyMessaged = Boolean(recentlyMessagedUserIds?.[user.id]);
          const isFavourite = isFriend && favouriteUserIds.includes(String(user.id));
          const isMuted = isFriend && mutedUserIds.includes(String(user.id));

          return (
            <KalcerianCardItem
              key={user.id}
              user={user}
              userEvent={userEvent}
              isFriend={isFriend}
              friendshipStatus={friendshipStatus}
              isBlocked={isBlocked}
              isBlockedByTarget={isBlockedByTarget}
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
              isFavourite={isFavourite}
              isMuted={isMuted}
              isSelfOffline={isSelfOffline}
              onPersonalChatOpen={handleOpenChatWithTransition}
              isOtherEventDisabled={isOtherEventDisabled}
              displayName={displayName}
              cleanUsername={cleanUsername}
              activeBroadcastMsg={activeBroadcastMsg}
              limits={limits}
              deviceFamily={deviceFamily}
              isMapDark={isMapDark}
              isHovered={localHoveredKalcerian === user.id}
              setHoveredKalcerian={setLocalHoveredKalcerian}
              hoveredEventIconId={hoveredEventIconId}
              setHoveredEventIconId={setHoveredEventIconId}
              hoveredChatIconId={hoveredChatIconId}
              setHoveredChatIconId={setHoveredChatIconId}
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
              onSendFriendRequest={onSendFriendRequest}
              onCancelFriendRequest={onCancelFriendRequest}
              onAcceptFriendRequest={onAcceptFriendRequest}
              onRejectFriendRequest={onRejectFriendRequest}
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
          {activeScope === "global" ? "No other Kalcerians found." : "No friends found."}
        </div>
      )}
    </div>
  );
}
