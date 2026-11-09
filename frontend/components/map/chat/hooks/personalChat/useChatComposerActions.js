"use client";

import { checkHardwarePermission } from "@/lib/mediaHardware";
import { buildReplyPayload } from "./replyPayload";

/**
 * frontend/components/map/chat/hooks/personalChat/useChatComposerActions.js
 *
 * Non-memo action handlers for message composition (text, media, voice, call).
 * Ledger: Non-memo action handlers (IL-6), zero hooks.
 *
 * Input: State, setters, recorder, file input ref, etc.
 * Output: 7 non-memo handlers
 */
export function useChatComposerActions({
  inputText = "",
  setInputText = () => {},
  setShowEmojiBar = () => {},
  setMediaError = () => {},
  replyingTo = null,
  setReplyingTo = () => {},
  appendAndEncryptMessage = async () => {},
  voiceRecorder = {},
  fileInputRef = { current: null },
  setPermissionModal = () => {},
  setCallState = () => {},
  activeChatUser = null,
  setIsUploadingMedia = () => {},
} = {}) {
  const handleSendText = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const trimmed = (inputText || "").trim();
    if (!trimmed) return;
    setInputText("");
    setShowEmojiBar(false);
    setMediaError("");

    const currentReply = replyingTo;
    setReplyingTo(null);

    const replyPayload = buildReplyPayload(currentReply);

    await appendAndEncryptMessage({
      text: trimmed,
      msgType: "text",
      replyTo: replyPayload,
    });
  };

  // Surface-level Media Validation (Max 10MB, strictly PNG / JPEG / MP4, Consolas Red Error)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError("");

    if (file.size > 10 * 1024 * 1024) {
      setMediaError("Ukuran file melebihi 10 MB. Maksimal ukuran file adalah 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const validExts = ["png", "jpg", "jpeg", "mp4"];
    const declaredMime = (file.type || "").toLowerCase();
    const validMimes = ["image/png", "image/jpeg", "image/pjpeg", "video/mp4"];

    if (!validExts.includes(ext) || (declaredMime && !validMimes.includes(declaredMime))) {
      setMediaError("Hanya file .png, .jpeg, dan .mp4 yang diizinkan.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const captionText = (inputText || "").trim();
    setInputText("");
    const localPreviewUrl = URL.createObjectURL(file);
    const isVideoFile = ext === "mp4" || declaredMime.startsWith("video/");

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploadingMedia(true);
    try {
      await appendAndEncryptMessage({
        text: captionText,
        msgType: isVideoFile ? "video" : "media",
        mediaUrl: localPreviewUrl,
        rawBlob: file,
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleStartVoiceNote = async () => {
    const perm = await checkHardwarePermission("microphone");
    if (perm === "prompt" || perm === "unknown") {
      setPermissionModal({
        isOpen: true,
        type: "mic",
        onGrant: async () => {
          setPermissionModal((p) => ({ ...p, isOpen: false }));
          await voiceRecorder.startRecording();
        },
        onCancel: () => setPermissionModal((p) => ({ ...p, isOpen: false })),
        errorMessage: null,
      });
      return;
    }
    const started = await voiceRecorder.startRecording();
    if (!started && voiceRecorder.recorderError) {
      setMediaError(voiceRecorder.recorderError);
    }
  };

  const handleCancelVoiceNote = () => {
    voiceRecorder.cancelRecording();
  };

  const handleFinishVoiceNote = async () => {
    const result = await voiceRecorder.stopRecording();
    if (!result) return;
    const { blob, url, duration, waveform } = result;
    const localPreviewUrl = url || (blob ? URL.createObjectURL(blob) : null);

    await appendAndEncryptMessage({
      text: "Voice message",
      msgType: "voice",
      mediaUrl: localPreviewUrl,
      rawBlob: blob,
      voiceDuration: duration,
      voiceWaveform: waveform,
    });
  };

  const handleSendCapturedMedia = async ({
    blob,
    url,
    type,
    duration,
    trimFragment = "",
    isViewOnce,
    caption,
  }) => {
    if (type === "video" && duration && duration > 60) {
      setMediaError("Durasi video melebihi batas 1 menit (maksimal 60 detik).");
      return;
    }

    const captionText = (typeof caption === "string" ? caption : (inputText || "")).trim();
    setInputText("");
    const localPreviewUrl = url || (blob ? URL.createObjectURL(blob) : null);

    setIsUploadingMedia(true);
    try {
      await appendAndEncryptMessage({
        text: captionText,
        msgType: type === "video" ? "video" : "media",
        mediaUrl: localPreviewUrl,
        rawBlob: blob,
        trimFragment,
        videoDuration: duration,
        isViewOnce: Boolean(isViewOnce),
      });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleTriggerCall = async (mode = "voice") => {
    const neededType = mode === "video" ? "camera" : "mic";
    const permName = mode === "video" ? "camera" : "microphone";
    const perm = await checkHardwarePermission(permName);

    if (perm === "prompt" || perm === "unknown") {
      setPermissionModal({
        isOpen: true,
        type: neededType,
        onGrant: () => {
          setPermissionModal((p) => ({ ...p, isOpen: false }));
          setCallState({ mode, user: activeChatUser });
        },
        onCancel: () => setPermissionModal((p) => ({ ...p, isOpen: false })),
        errorMessage: null,
      });
      return;
    }

    setCallState({ mode, user: activeChatUser });
  };

  return {
    handleSendText,
    handleFileUpload,
    handleStartVoiceNote,
    handleCancelVoiceNote,
    handleFinishVoiceNote,
    handleSendCapturedMedia,
    handleTriggerCall,
  };
}

