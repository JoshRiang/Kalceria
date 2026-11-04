"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PersonalCallView } from "./call/PersonalCallView";
import { usePersonalChatState } from "./hooks/usePersonalChatState";
import { ChatHeaderBar } from "./components/ChatHeaderBar";
import { ChatSearchBar } from "./components/ChatSearchBar";
import { ChatMessageThread } from "./components/ChatMessageThread";
import { ChatComposerBar } from "./components/ChatComposerBar";
import { ChatSelectionBar } from "./components/ChatSelectionBar";

export function PersonalChatPanel({
  activeChatUser,
  currentUser,
  isMapDark,
  avatarUrl,
  isFavourite = false,
  isMuted = false,
  onToggleFavourite,
  onToggleMute,
  onCloseChat,
  onOutgoingMessageUpdate,
}) {
  const {
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
    fileInputRef,
    isUploadingMedia,
    mediaError,
    setMediaError,
    isRecordingVoice,
    setIsRecordingVoice,
    recordingSeconds,
    playingVoiceId,
    setPlayingVoiceId,
    callState,
    setCallState,
    isPeerTyping,
    messagesEndRef,
    menuContainerRef,
    handleSendText,
    handleFileUpload,
    handleFinishVoiceNote,
    handleToggleSelectMsg,
    handleDeleteSelectedMessages,
    handleCopySelectedMessages,
  } = usePersonalChatState({
    activeChatUser,
    currentUser,
    onOutgoingMessageUpdate,
  });

  if (!activeChatUser) return null;

  return (
    <motion.aside
      key={`personal-chat-${targetId}`}
      initial={{ y: "105%", opacity: 0.9 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "105%", opacity: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 310,
        damping: 30,
        mass: 0.9,
      }}
      className={`absolute z-[1005] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col overflow-hidden font-sans select-none max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[54vh] max-[860px]:max-h-[440px] max-[860px]:min-h-[360px] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl ${
        isMapDark
          ? "bg-[#111b21] border border-white/25 text-[#f0f6fc] shadow-[0_14px_38px_rgba(0,0,0,0.85)]"
          : "bg-[#ffffff] border border-[#000000] text-[#000000] shadow-[0_14px_38px_rgba(0,0,0,0.18)]"
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
            onEndCall={() => setCallState(null)}
          />
        )}
      </AnimatePresence>

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
        onToggleFavourite={onToggleFavourite}
        onToggleMute={onToggleMute}
        onCloseChat={onCloseChat}
        menuContainerRef={menuContainerRef}
      />

      <ChatSearchBar
        searchOpen={searchOpen}
        messageSearchQuery={messageSearchQuery}
        setMessageSearchQuery={setMessageSearchQuery}
        showContactInfo={showContactInfo}
        setShowContactInfo={setShowContactInfo}
        activeChatUser={activeChatUser}
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
          mediaError={mediaError}
          setMediaError={setMediaError}
          showEmojiBar={showEmojiBar}
          setShowEmojiBar={setShowEmojiBar}
          selectMode={selectMode}
          fileInputRef={fileInputRef}
          isUploadingMedia={isUploadingMedia}
          isRecordingVoice={isRecordingVoice}
          setIsRecordingVoice={setIsRecordingVoice}
          recordingSeconds={recordingSeconds}
          handleSendText={handleSendText}
          handleFileUpload={handleFileUpload}
          handleFinishVoiceNote={handleFinishVoiceNote}
        />
      )}
    </motion.aside>
  );
}
