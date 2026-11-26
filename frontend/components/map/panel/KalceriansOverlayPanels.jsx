"use client";

import { AnimatePresence } from "framer-motion";
import { ChatErrorBoundary } from "./ChatErrorBoundary";
import { PersonalChatPanel } from "../chat/PersonalChatPanel";
import { EventGroupChatPanel } from "../groupChat/EventGroupChatPanel";
import { IncomingCallModal } from "../chat/components/IncomingCallModal";
import { PeerProfilePanel } from "./PeerProfilePanel";

/**
 * Modular standalone overlay deck for KalceriansPanel:
 * - PersonalChatPanel (1-on-1 chat & calls)
 * - EventGroupChatPanel (standalone group chat & group profile/settings)
 * - PeerProfilePanel (standalone other-user profile & Event Archive — zero overlap)
 * - IncomingCallModal
 */
export function KalceriansOverlayPanels({
  activeChatUser,
  activeGroupEvent,
  expandedProfileUser,
  currentUser,
  isMapDark,
  events,
  avatarUrl,
  isUserFriend,
  favouriteUserIds,
  mutedUserIds,
  blockedUserIds,
  blockedByUserIds,
  incomingCallInitialState,
  setIncomingCallInitialState,
  onToggleFavourite,
  onToggleMute,
  onBlockUser,
  onUnblockUser,
  handleClosePersonalChat,
  onOutgoingMessageUpdate,
  onCloseGroupChat,
  onClosePeerProfile,
  incomingCall,
  handleAcceptIncomingCall,
  handleDeclineIncomingCall,
}) {
  const isExpandedBlocked = expandedProfileUser
    ? (blockedUserIds || []).some(
        (id) => String(id).toLowerCase() === String(expandedProfileUser.id).toLowerCase()
      )
    : false;
  const isExpandedBlockedBy = expandedProfileUser
    ? (blockedByUserIds || []).some(
        (id) => String(id).toLowerCase() === String(expandedProfileUser.id).toLowerCase()
      )
    : false;

  return (
    <>
      <AnimatePresence>
        {activeChatUser && (
          <ChatErrorBoundary
            key={`chat-boundary-${activeChatUser.id}`}
            isMapDark={isMapDark}
            onCloseChat={() => {
              setIncomingCallInitialState(null);
              handleClosePersonalChat();
            }}
          >
            <PersonalChatPanel
              key={`chat-panel-${activeChatUser.id}`}
              activeChatUser={activeChatUser}
              currentUser={currentUser}
              isMapDark={isMapDark}
              events={events}
              avatarUrl={avatarUrl}
              isFriend={isUserFriend(activeChatUser)}
              isFavourite={favouriteUserIds.includes(String(activeChatUser.id))}
              isMuted={mutedUserIds.includes(String(activeChatUser.id))}
              isBlockedByTarget={(blockedByUserIds || []).some(
                (id) => String(id).toLowerCase() === String(activeChatUser.id).toLowerCase()
              )}
              isTargetBlocked={(blockedUserIds || []).some(
                (id) => String(id).toLowerCase() === String(activeChatUser.id).toLowerCase()
              )}
              initialCallState={incomingCallInitialState}
              onCallEnded={() => setIncomingCallInitialState(null)}
              onToggleFavourite={onToggleFavourite}
              onToggleMute={onToggleMute}
              onBlockUser={onBlockUser}
              onUnblockUser={onUnblockUser}
              onCloseChat={() => {
                setIncomingCallInitialState(null);
                handleClosePersonalChat();
              }}
              onOutgoingMessageUpdate={onOutgoingMessageUpdate}
            />
          </ChatErrorBoundary>
        )}

        {!activeChatUser && activeGroupEvent && (
          <EventGroupChatPanel
            key={`group-chat-panel-${activeGroupEvent.id}`}
            event={activeGroupEvent}
            currentUser={currentUser}
            isMapDark={isMapDark}
            avatarUrl={avatarUrl}
            onClose={onCloseGroupChat}
          />
        )}

        {!activeChatUser && !activeGroupEvent && expandedProfileUser && (
          <PeerProfilePanel
            key={`peer-profile-${expandedProfileUser.id}`}
            user={expandedProfileUser}
            isMapDark={isMapDark}
            isBlocked={isExpandedBlocked}
            isBlockedByTarget={isExpandedBlockedBy}
            onClose={onClosePeerProfile}
          />
        )}
      </AnimatePresence>

      <IncomingCallModal
        incomingCall={incomingCall}
        isMapDark={isMapDark}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />
    </>
  );
}

