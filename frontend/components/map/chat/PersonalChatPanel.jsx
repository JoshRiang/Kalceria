"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import KalcerianProfileCard from "../KalcerianProfileCard";
import { PersonalCallView } from "./call/PersonalCallView";
import { usePersonalChatState } from "./hooks/usePersonalChatState";
import { ChatHeaderBar } from "./components/ChatHeaderBar";
import { ChatSearchBar } from "./components/ChatSearchBar";
import { ChatMessageThread } from "./components/ChatMessageThread";
import { ChatComposerBar } from "./components/ChatComposerBar";
import { ChatSelectionBar } from "./components/ChatSelectionBar";
import { EmojiPickerPopover } from "./components/EmojiPickerPopover";
import { CameraCaptureModal } from "./components/CameraCaptureModal";
import { HardwarePermissionModal } from "./components/HardwarePermissionModal";
import { ChatDeleteConfirmOverlay } from "./components/ChatDeleteConfirmOverlay";

export function PersonalChatPanel({
  activeChatUser,
  currentUser,
  isMapDark,
  avatarUrl,
  events = [],
  isFriend = true,
  isFavourite = false,
  isMuted = false,
  isBlockedByTarget = false,
  isTargetBlocked = false,
  initialCallState = null,
  onCallEnded,
  onToggleFavourite,
  onToggleMute,
  onBlockUser,
  onUnblockUser,
  onCloseChat,
  onOutgoingMessageUpdate,
}) {
  const {
    starterPlaceholder,
    myId,
    targetId,
    displayName,
    groupedMessages,
    nextCursor,
    isLoadingOlder,
    loadOlderMessages,
    inputText,
    setInputText,
    searchOpen,
    setSearchOpen,
    messageSearchQuery,
    setMessageSearchQuery,
    menuOpen,
    setMenuOpen,
    selectMode,
    setSelectMode,
    selectedMsgIds,
    setSelectedMsgIds,
    showContactInfo,
    setShowContactInfo,
    showEmojiBar,
    setShowEmojiBar,
    isUploadingMedia,
    mediaError,
    setMediaError,
    isCameraModalOpen,
    setIsCameraModalOpen,
    permissionModal,
    setPermissionModal,
    isRecordingVoice,
    recordingSeconds,
    liveWaveform,
    playingVoiceId,
    setPlayingVoiceId,
    callState,
    setCallState,
    handleCallFinished,
    handleResendMessage,
    replyingTo,
    setReplyingTo,
    handleStartReply,
    handleCopySingleMessage,
    isPeerTyping,
    messagesEndRef,
    menuContainerRef,
    handleSendText,
    handleStartVoiceNote,
    handleCancelVoiceNote,
    handleFinishVoiceNote,
    handleSendCapturedMedia,
    handleTriggerCall,
    handleToggleSelectMsg,
    handleDeleteSelectedMessages,
    handleCopySelectedMessages,
  } = usePersonalChatState({
    activeChatUser,
    currentUser,
    onOutgoingMessageUpdate,
    initialCallState,
    onCallEnded,
    isTargetBlocked,
    isBlockedByTarget,
  });

  const [confirmModalMode, setConfirmModalMode] = useState(null); // null | "delete" | "block" | "unblock"
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const handleConfirmOverlayAction = async () => {
    if (isDeletingChat || !confirmModalMode) return;
    setIsDeletingChat(true);
    try {
      if (confirmModalMode === "delete") {
        await handleDeleteSelectedMessages("__CLEAR_ALL__");
      } else if (confirmModalMode === "block") {
        await onBlockUser?.(targetId);
      } else if (confirmModalMode === "unblock") {
        await onUnblockUser?.(targetId);
      }
    } finally {
      setIsDeletingChat(false);
      setConfirmModalMode(null);
    }
  };

  if (!activeChatUser) return null;

  return (
    <>
      <motion.aside
        key={`personal-chat-${targetId}`}
        initial={{ y: "110%", opacity: 1 }}
        animate={{ y: "0%", opacity: 1 }}
        exit={{ y: "110%", opacity: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 290,
          damping: 30,
          mass: 0.9,
        }}
        className={`fixed z-[1005] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col overflow-hidden font-sans max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[70vh] max-[860px]:max-h-[calc(100vh-70px)] max-[860px]:min-h-[380px] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
          isMapDark
            ? "bg-[#111b21] text-[#f0f6fc] shadow-[0_14px_38px_rgba(0,0,0,0.85)]"
            : "bg-[#ffffff] text-[#000000] shadow-[0_14px_38px_rgba(0,0,0,0.18)]"
        }`}
      >
        {/* Active Voice Call or Video Call View (Strictly Inside the Sidebar Panel Column!) */}
        <AnimatePresence>
          {callState && (
            <PersonalCallView
              callState={callState}
              currentUser={currentUser}
              isMapDark={isMapDark}
              avatarUrl={avatarUrl}
              onSwitchMode={(nextMode) =>
                setCallState((prev) => (prev ? { ...prev, mode: nextMode } : null))
              }
              onEndCall={(summary) => handleCallFinished(summary)}
              onPermissionNeeded={(type) =>
                setPermissionModal({
                  isOpen: true,
                  type,
                  onGrant: () => setPermissionModal((p) => ({ ...p, isOpen: false })),
                  onCancel: () => {
                    setPermissionModal((p) => ({ ...p, isOpen: false }));
                    setCallState(null);
                  },
                  errorMessage: null,
                })
              }
            />
          )}
        </AnimatePresence>

        {/* Full Chat Content: Smoothly blurs (including Header Bar & Thread) when viewing Profile or Confirming Action */}
        <div
          className={`flex flex-col flex-1 h-full min-h-0 overflow-hidden transition-all duration-300 ease-out ${
            showContactInfo || Boolean(confirmModalMode)
              ? "filter blur-[8px] opacity-35 pointer-events-none select-none scale-[0.98]"
              : "filter blur-0 opacity-100 scale-100"
          }`}
        >
          <ChatHeaderBar
            activeChatUser={activeChatUser}
            targetId={targetId}
            displayName={displayName}
            isMapDark={isMapDark}
            avatarUrl={avatarUrl}
            isFriend={isFriend}
            isFavourite={isFavourite}
            isMuted={isMuted}
            isBlockedByTarget={isBlockedByTarget}
            isTargetBlocked={isTargetBlocked}
            isPeerTyping={isPeerTyping}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            selectMode={selectMode}
            setSelectMode={setSelectMode}
            setSelectedMsgIds={setSelectedMsgIds}
            setSearchOpen={setSearchOpen}
            setMessageSearchQuery={setMessageSearchQuery}
            setShowContactInfo={setShowContactInfo}
            setCallState={setCallState}
            handleTriggerCall={handleTriggerCall}
            onToggleFavourite={onToggleFavourite}
            onToggleMute={onToggleMute}
            onRequestDeleteChat={() => setConfirmModalMode("delete")}
            onRequestBlockToggle={() =>
              setConfirmModalMode(isTargetBlocked ? "unblock" : "block")
            }
            onCloseChat={onCloseChat}
            menuContainerRef={menuContainerRef}
          />

          <ChatSearchBar
            searchOpen={searchOpen}
            messageSearchQuery={messageSearchQuery}
            setMessageSearchQuery={setMessageSearchQuery}
            isMapDark={isMapDark}
          />

          <ChatMessageThread
            groupedMessages={groupedMessages}
            myId={myId}
            targetId={targetId}
            displayName={displayName}
            events={events}
            isTargetBlocked={isTargetBlocked}
            isBlockedByTarget={isBlockedByTarget}
            isMapDark={isMapDark}
            selectMode={selectMode}
            selectedMsgIds={selectedMsgIds}
            handleToggleSelectMsg={handleToggleSelectMsg}
            playingVoiceId={playingVoiceId}
            setPlayingVoiceId={setPlayingVoiceId}
            nextCursor={nextCursor}
            isLoadingOlder={isLoadingOlder}
            loadOlderMessages={loadOlderMessages}
            messagesEndRef={messagesEndRef}
            onResendMessage={handleResendMessage}
            replyingTo={replyingTo}
            onReplyMessage={handleStartReply}
            onCopyMessage={handleCopySingleMessage}
            onDeleteMessage={handleDeleteSelectedMessages}
          />

          {selectMode ? (
            <ChatSelectionBar
              isMapDark={isMapDark}
              selectedMsgIds={selectedMsgIds}
              handleCopySelectedMessages={handleCopySelectedMessages}
              handleDeleteSelectedMessages={handleDeleteSelectedMessages}
              setSelectMode={setSelectMode}
              setSelectedMsgIds={setSelectedMsgIds}
            />
          ) : (
            <ChatComposerBar
              isMapDark={isMapDark}
              events={events}
              inputText={inputText}
              setInputText={setInputText}
              placeholderText={starterPlaceholder}
              mediaError={mediaError}
              setMediaError={setMediaError}
              showEmojiBar={showEmojiBar}
              setShowEmojiBar={setShowEmojiBar}
              selectMode={selectMode}
              isUploadingMedia={isUploadingMedia}
              isRecordingVoice={isRecordingVoice}
              recordingSeconds={recordingSeconds}
              liveWaveform={liveWaveform}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onOpenCameraModal={() => setIsCameraModalOpen(true)}
              handleStartVoiceNote={handleStartVoiceNote}
              handleCancelVoiceNote={handleCancelVoiceNote}
              handleFinishVoiceNote={handleFinishVoiceNote}
              handleSendText={handleSendText}
            />
          )}
        </div>

        {/* Dedicated Standalone Contact Profile Panel (Zero overlap bleed with chat thread) */}
        <AnimatePresence>
          {showContactInfo && (
            <motion.div
              key="profile-card-standalone-panel"
              initial={{ x: "100%", opacity: 0.95 }}
              animate={{ x: "0%", opacity: 1 }}
              exit={{ x: "100%", opacity: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.9 }}
              className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${
                isMapDark ? "bg-[#161b22] text-[#f0f6fc]" : "bg-white text-[#1f2328]"
              }`}
            >
              <div
                className={`shrink-0 px-3.5 py-2.5 flex items-center justify-between border-b ${
                  isMapDark ? "border-[#30363d]/80 bg-[#161b22]" : "border-[#e5e7eb] bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowContactInfo(false)}
                  className="flex items-center gap-2 text-sm font-bold cursor-pointer min-w-0"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span className="truncate">
                    @{String(activeChatUser?.nickname || activeChatUser?.username || displayName).replace(/^@/, "")} Profile
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactInfo(false)}
                  aria-label="Close contact profile"
                  className="w-7 h-7 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto modern-kalcerian-scrollbar">
                <KalcerianProfileCard
                  user={activeChatUser}
                  isMapDark={isMapDark}
                  isBlocked={isTargetBlocked}
                  isBlockedByTarget={isBlockedByTarget}
                  showMobileClose={false}
                  onClose={() => setShowContactInfo(false)}
                  inline={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Chat & Block/Unblock Semi-Blur Confirmation Overlay */}
        <ChatDeleteConfirmOverlay
          isOpen={Boolean(confirmModalMode)}
          mode={confirmModalMode || "delete"}
          displayName={displayName}
          isMapDark={isMapDark}
          isDeleting={isDeletingChat}
          onCancel={() => setConfirmModalMode(null)}
          onConfirm={handleConfirmOverlayAction}
        />
      </motion.aside>

      {/* Emoji Picker Popover: Placed outside overflow-hidden aside to prevent desktop clipping */}
      <EmojiPickerPopover
        isOpen={showEmojiBar}
        onClose={() => setShowEmojiBar(false)}
        onSelectEmoji={(char) => {
          setInputText((prev) => (prev || "") + char);
        }}
        isMapDark={isMapDark}
      />

      {/* Camera Capture Modal (Hardware Viewfinder & Photo/Video Max 1 Min) */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSendMedia={handleSendCapturedMedia}
        isMapDark={isMapDark}
        onPermissionNeeded={(type) =>
          setPermissionModal({
            isOpen: true,
            type,
            onGrant: () => setPermissionModal((p) => ({ ...p, isOpen: false })),
            onCancel: () => {
              setPermissionModal((p) => ({ ...p, isOpen: false }));
              setIsCameraModalOpen(false);
            },
            errorMessage: null,
          })
        }
      />

      {/* Hardware Permission Prompt Modal */}
      <HardwarePermissionModal
        isOpen={permissionModal.isOpen}
        type={permissionModal.type}
        isMapDark={isMapDark}
        errorMessage={permissionModal.errorMessage}
        onGrant={permissionModal.onGrant}
        onCancel={
          permissionModal.onCancel ||
          (() => setPermissionModal((p) => ({ ...p, isOpen: false })))
        }
      />
    </>
  );
}
