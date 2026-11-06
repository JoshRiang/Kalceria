"use client";

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

export function PersonalChatPanel({
  activeChatUser,
  currentUser,
  isMapDark,
  avatarUrl,
  isFavourite = false,
  isMuted = false,
  initialCallState = null,
  onToggleFavourite,
  onToggleMute,
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
  });

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

        {/* Full Chat Content: Smoothly blurs (including Header Bar & Thread) when viewing Profile */}
        <div
          className={`flex flex-col flex-1 h-full min-h-0 overflow-hidden transition-all duration-300 ease-out ${
            showContactInfo
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
            isFavourite={isFavourite}
            isMuted={isMuted}
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

        {/* Parked Profile Card: Smooth backdrop blur overlay + slides in and parks over chat */}
        <AnimatePresence>
          {showContactInfo && (
            <motion.div
              key="profile-backdrop-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="absolute inset-0 z-35 backdrop-blur-md bg-black/45 pointer-events-auto"
              onClick={() => setShowContactInfo(false)}
            />
          )}
          {showContactInfo && (
            <motion.div
              key="profile-card-modal"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 28,
                mass: 0.9,
              }}
              className="absolute inset-2 z-40 flex flex-col overflow-y-auto rounded-2xl shadow-2xl modern-kalcerian-scrollbar overflow-x-hidden"
            >
              <KalcerianProfileCard
                user={activeChatUser}
                isMapDark={isMapDark}
                showMobileClose={true}
                onClose={() => setShowContactInfo(false)}
                isMobileCompact={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
