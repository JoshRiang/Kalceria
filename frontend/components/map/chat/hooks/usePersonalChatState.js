"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { isAhmadDummyUser } from "./usePersonalCallState";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { deletePersonalChatMessages } from "@/lib/api";

import {
  LOCAL_CHAT_CACHE_PREFIX,
  blobToDataUrl,
  uploadMediaWithPersistFallback,
  QUICK_EMOJIS,
  formatMessageTime,
  GAUL_JAKSEL_STARTERS,
  getChatTimeLabel,
  getDateLabel,
  getInitialSeedMessages,
} from "./personalChat/chatHelpers";
import {
  formatVoiceDuration,
  inferReplyMediaType,
} from "../components/messageBubble/replyHelpers";
import { useChatLocalCache } from "./personalChat/useChatLocalCache";
import { useChatRealtimePackets } from "./personalChat/useChatRealtimePackets";
import { useChatSyncLoop } from "./personalChat/useChatSyncLoop";
import { useChatThreadUi } from "./personalChat/useChatThreadUi";
import { useChatSender } from "./personalChat/useChatSender";
import { useChatComposerActions } from "./personalChat/useChatComposerActions";
import { useChatSelectionActions } from "./personalChat/useChatSelectionActions";
import { groupMessages } from "./personalChat/groupMessages";
import { useChatResend } from "./personalChat/useChatResend";

export {
  LOCAL_CHAT_CACHE_PREFIX,
  blobToDataUrl,
  uploadMediaWithPersistFallback,
  QUICK_EMOJIS,
  formatMessageTime,
  GAUL_JAKSEL_STARTERS,
  getChatTimeLabel,
  getDateLabel,
  getInitialSeedMessages,
};

export function usePersonalChatState({
  activeChatUser,
  currentUser,
  onOutgoingMessageUpdate,
  initialCallState = null,
  onCallEnded,
  isTargetBlocked = false,
  isBlockedByTarget = false,
}) {
  const myId = String(currentUser?.id || "me");
  const targetId = String(activeChatUser?.id || "");
  const displayName =
    activeChatUser?.displayName ||
    activeChatUser?.name ||
    activeChatUser?.nickname ||
    "Kalcerian";

  const [starterPlaceholder] = useState(() => {
    const idx = Math.floor(Math.random() * GAUL_JAKSEL_STARTERS.length);
    return GAUL_JAKSEL_STARTERS[idx];
  });

  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [inputText, setInputText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState([]);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // E1: Support initial pending reply payload (e.g. from broadcast reply)
  useEffect(() => {
    if (typeof window !== "undefined" && window.__kalceriaPendingReplyPayload) {
      setReplyingTo(window.__kalceriaPendingReplyPayload);
      window.__kalceriaPendingReplyPayload = null;
    }
    const handleSetReply = (e) => {
      if (e.detail) {
        setReplyingTo(e.detail);
      }
    };
    window.addEventListener("kalceria:set-reply-payload", handleSetReply);
    return () => window.removeEventListener("kalceria:set-reply-payload", handleSetReply);
  }, []);

  // Camera Capture Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Hardware Permission Gate Modal State ({ isOpen, type: "mic" | "camera", onGrant, onCancel, errorMessage })
  const [permissionModal, setPermissionModal] = useState({
    isOpen: false,
    type: "mic",
    onGrant: null,
    onCancel: null,
    errorMessage: null,
  });

  // Media Attachment State (Max 10MB, strictly PNG / JPEG / MP4)
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Voice Note Recording Hook (Safe AudioContext + AnalyserNode + MediaRecorder)
  const voiceRecorderRef = useRef(null);

  const handlePermissionNeeded = useCallback((type) => {
    setPermissionModal({
      isOpen: true,
      type,
      onGrant: async () => {
        setPermissionModal((prev) => ({ ...prev, isOpen: false }));
        if (type === "mic" && voiceRecorderRef.current) {
          await voiceRecorderRef.current.startRecording();
        }
      },
      onCancel: () => setPermissionModal((prev) => ({ ...prev, isOpen: false })),
      errorMessage: null,
    });
  }, []);

  // V1
  const voiceRecorder = useVoiceRecorder({
    onPermissionNeeded: handlePermissionNeeded,
  });
  voiceRecorderRef.current = voiceRecorder;

  const [playingVoiceId, setPlayingVoiceId] = useState(null);

  // Active Voice / Video Call State (inside the sidebar panel!)
  const [callState, setCallState] = useState(initialCallState);
  const [isPeerTyping, setIsPeerTyping] = useState(false);

  // E2: Initial call state synchronization
  useEffect(() => {
    if (initialCallState) {
      setCallState(initialCallState);
    }
  }, [initialCallState]);

  const messagesEndRef = useRef(null);
  const menuContainerRef = useRef(null);
  const autoReplyTimerRef = useRef(null);
  const peerTypingTimerRef = useRef(null);
  const persistDebounceRef = useRef(null);
  const pendingPersistListRef = useRef(null);
  const syncWatermarkRef = useRef({
    lastTs: 0,
    peerReadTs: 0,
    deleteRev: 0,
    initialized: false,
  });
  const syncNowRef = useRef(null);
  const isP2PConnectedRef = useRef(false);
  const pendingBlobsRef = useRef(new Map());
  const activeChatUserRef = useRef(activeChatUser);
  const onOutgoingMessageUpdateRef = useRef(onOutgoingMessageUpdate);
  const onCallEndedRef = useRef(onCallEnded);
  const sendRealtimePacketRef = useRef(null);
  const ingestPiggybackedRef = useRef(null);

  activeChatUserRef.current = activeChatUser;
  onOutgoingMessageUpdateRef.current = onOutgoingMessageUpdate;
  onCallEndedRef.current = onCallEnded;

  const isRealPeer = Boolean(
    targetId &&
      myId &&
      targetId !== myId &&
      !isAhmadDummyUser(activeChatUser) &&
      !String(targetId).startsWith("mock_")
  );

  const storageKey = `${LOCAL_CHAT_CACHE_PREFIX}${[myId, targetId].sort().join("_")}`;

  // Hook Ledger Pos 2: E3 (Local cache & debounced persistence)
  const {
    persistQuickLocal,
    persistEncryptedLocal,
  } = useChatLocalCache({
    myId,
    targetId,
    storageKey,
    persistDebounceRef,
    pendingPersistListRef,
    peerTypingTimerRef,
  });

  // Hook Ledger Pos 3: R1, E4 (P2P WebRTC packet handler & typing broadcast)
  const {
    isP2PConnected,
    sendRealtimePacket,
  } = useChatRealtimePackets({
    myId,
    targetId,
    isRealPeer,
    isTargetBlocked,
    isBlockedByTarget,
    inputText,
    setMessages,
    setIsPeerTyping,
    persistQuickLocal,
    persistEncryptedLocal,
    syncWatermarkRef,
    syncNowRef,
    peerTypingTimerRef,
    sendRealtimePacketRef,
    isP2PConnectedRef,
    ingestPiggybackedRef,
  });

  // Hook Ledger Pos 4: E5 (Adaptive O(1) Delta Sync & history load loop)
  useChatSyncLoop({
    targetId,
    myId,
    storageKey,
    activeChatUserRef,
    syncWatermarkRef,
    syncNowRef,
    ingestPiggybackedRef,
    isP2PConnectedRef,
    autoReplyTimerRef,
    setMessages,
    setNextCursor,
    persistQuickLocal,
    persistEncryptedLocal,
  });

  // Hook Ledger Pos 5: E6, E7 (Auto scroll & menu outside click)
  const { loadOlderMessages } = useChatThreadUi({
    nextCursor,
    isLoadingOlder,
    targetId,
    myId,
    messages,
    isPeerTyping,
    menuOpen,
    setMessages,
    setNextCursor,
    setIsLoadingOlder,
    setMenuOpen,
    messagesEndRef,
    menuContainerRef,
  });

  // Hook Ledger Pos 6: appendAndEncryptMessage
  const { appendAndEncryptMessage } = useChatSender({
    myId,
    targetId,
    setMessages,
    setIsPeerTyping,
    persistQuickLocal,
    persistEncryptedLocal,
    pendingBlobsRef,
    autoReplyTimerRef,
    syncWatermarkRef,
    sendRealtimePacketRef,
    activeChatUserRef,
    onOutgoingMessageUpdateRef,
  });

  // Hook Ledger Pos 7: 7 non-memo composer handlers
  const {
    handleSendText,
    handleFileUpload,
    handleStartVoiceNote,
    handleCancelVoiceNote,
    handleFinishVoiceNote,
    handleSendCapturedMedia,
    handleTriggerCall,
  } = useChatComposerActions({
    inputText,
    setInputText,
    setShowEmojiBar,
    setMediaError,
    replyingTo,
    setReplyingTo,
    appendAndEncryptMessage,
    voiceRecorder,
    fileInputRef,
    setPermissionModal,
    setCallState,
    activeChatUser,
    setIsUploadingMedia,
  });

  // Hook Ledger Pos 8: 5 non-memo selection handlers
  const {
    handleToggleSelectMsg,
    handleDeleteSelectedMessages,
    handleCopySingleMessage,
    handleStartReply,
    handleCopySelectedMessages,
  } = useChatSelectionActions({
    messages,
    selectedMsgIds,
    setSelectedMsgIds,
    setSelectMode,
    playingVoiceId,
    setPlayingVoiceId,
    setMessages,
    persistQuickLocal,
    persistEncryptedLocal,
    sendRealtimePacketRef,
    deletePersonalChatMessages,
    targetId,
    myId,
    activeChatUser,
    setReplyingTo,
    formatVoiceDuration,
    inferReplyMediaType,
  });

  // Hook Ledger Pos 9: groupedMessages
  const groupedMessages = useMemo(() => {
    return groupMessages(messages, messageSearchQuery, getChatTimeLabel);
  }, [messages, messageSearchQuery]);

  // Hook Ledger Pos 10: handleCallFinished, handleResendMessage
  const {
    handleCallFinished,
    handleResendMessage,
  } = useChatResend({
    myId,
    targetId,
    appendAndEncryptMessage,
    setCallState,
    onCallEndedRef,
    setMessages,
    pendingBlobsRef,
    syncWatermarkRef,
    sendRealtimePacketRef,
    activeChatUserRef,
    persistQuickLocal,
    persistEncryptedLocal,
  });

  return {
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
    replyingTo,
    setReplyingTo,
    handleStartReply,
    handleCopySingleMessage,
    fileInputRef,
    isUploadingMedia,
    mediaError,
    setMediaError,
    isCameraModalOpen,
    setIsCameraModalOpen,
    permissionModal,
    setPermissionModal,
    isRecordingVoice: voiceRecorder.isRecording,
    recordingSeconds: voiceRecorder.duration,
    liveWaveform: voiceRecorder.liveWaveform,
    playingVoiceId,
    setPlayingVoiceId,
    callState,
    setCallState,
    handleCallFinished,
    handleResendMessage,
    isPeerTyping,
    messagesEndRef,
    menuContainerRef,
    handleSendText,
    handleFileUpload,
    handleStartVoiceNote,
    handleCancelVoiceNote,
    handleFinishVoiceNote,
    handleSendCapturedMedia,
    handleTriggerCall,
    handleToggleSelectMsg,
    handleDeleteSelectedMessages,
    handleCopySelectedMessages,
  };
}
