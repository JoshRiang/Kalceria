"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { encryptChatPayload, decryptChatEnvelope } from "@/lib/chatCrypto";
import { isAhmadDummyUser } from "./usePersonalCallState";
import {
  fetchPersonalChatPage,
  postPersonalChatMessage,
  deletePersonalChatMessages,
  uploadBlobMedia,
} from "@/lib/api";

const LOCAL_CHAT_CACHE_PREFIX = "kalceria_e2ee_chat_v1_";
export const QUICK_EMOJIS = ["🔥", "🚗", "💨", "🙌", "😎", "❤️", "😂", "👍", "⚡", "🏁"];

export function formatMessageTime(ts) {
  const d = new Date(Number(ts) || Date.now());
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

export function getDateLabel(ts) {
  const msgDate = new Date(Number(ts) || Date.now());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const msgStart = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate()).getTime();

  if (msgStart >= todayStart) return "Today";
  if (msgStart >= yesterdayStart) return "Yesterday";
  return msgDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitialSeedMessages(targetUser, currentUserId) {
  if (!targetUser) return [];
  const now = Date.now();
  const yesterdayEvening = now - 21 * 60 * 60 * 1000;
  const todayAfternoon = now - 45 * 60 * 1000;
  const isAhmad = isAhmadDummyUser(targetUser);

  if (isAhmad) {
    return [
      {
        id: `seed_${targetUser.id}_1`,
        senderId: String(targetUser.id),
        recipientId: String(currentUserId || "me"),
        text: "Bro, malem ini jadi rolling ke Sektor 9?",
        msgType: "text",
        ts: yesterdayEvening - 120000,
        status: "read",
        verifiedE2EE: true,
      },
      {
        id: `seed_${targetUser.id}_2`,
        senderId: String(currentUserId || "me"),
        recipientId: String(targetUser.id),
        text: "Gas bro, jam 9 kumpul di titik biasa ya",
        msgType: "text",
        ts: yesterdayEvening,
        status: "read",
        verifiedE2EE: true,
      },
      {
        id: `seed_${targetUser.id}_3`,
        senderId: String(targetUser.id),
        recipientId: String(currentUserId || "me"),
        text: "Siap mantap! Kabarin kalo udah otw, bisa voice/video call langsung.",
        msgType: "text",
        ts: todayAfternoon,
        status: "read",
        verifiedE2EE: true,
      },
    ];
  }

  return [
    {
      id: `seed_${targetUser.id}_1`,
      senderId: String(targetUser.id),
      recipientId: String(currentUserId || "me"),
      text: targetUser.broadcast?.message
        ? `"${targetUser.broadcast.message}"`
        : `Hey! Let's connect on Kalceria Map.`,
      msgType: "text",
      ts: yesterdayEvening,
      status: "read",
      verifiedE2EE: true,
    },
  ];
}

export function usePersonalChatState({
  activeChatUser,
  currentUser,
  onOutgoingMessageUpdate,
}) {
  const myId = String(currentUser?.id || "me");
  const targetId = String(activeChatUser?.id || "");
  const displayName =
    activeChatUser?.displayName ||
    activeChatUser?.name ||
    activeChatUser?.nickname ||
    "Kalcerian";

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

  // Media Attachment State (Max 10MB, strictly PNG / JPEG / MP4)
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);

  // Active Voice / Video Call State (inside the sidebar panel!)
  const [callState, setCallState] = useState(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const menuContainerRef = useRef(null);
  const autoReplyTimerRef = useRef(null);

  const storageKey = `${LOCAL_CHAT_CACHE_PREFIX}${[myId, targetId].sort().join("_")}`;

  // Load & decrypt conversation history (latest 30 hot messages + local cache)
  useEffect(() => {
    if (!activeChatUser || !targetId) return;
    let alive = true;

    async function loadMessages() {
      let localMsgs = [];
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const decryptedLocal = await Promise.all(
              parsed.map((env) => decryptChatEnvelope(env, myId, targetId))
            );
            localMsgs = decryptedLocal.filter(Boolean);
          }
        }
      } catch {}

      if (!localMsgs.length) {
        localMsgs = getInitialSeedMessages(activeChatUser, myId);
      }

      if (alive) {
        setMessages(localMsgs);
      }

      // Sync encrypted envelopes from backend Hot Ring-Buffer
      try {
        const page = await fetchPersonalChatPage(targetId, { limit: 30 });
        if (!alive) return;
        setNextCursor(page?.nextCursor || null);
        const remoteEnvelopes = page?.messages || [];
        if (!Array.isArray(remoteEnvelopes) || !remoteEnvelopes.length) return;
        const decryptedRemote = (
          await Promise.all(
            remoteEnvelopes.map((env) => decryptChatEnvelope(env, myId, targetId))
          )
        ).filter(Boolean);

        if (decryptedRemote.length > 0 && alive) {
          setMessages((prev) => {
            const mergedMap = new Map();
            prev.forEach((m) => mergedMap.set(m.id, m));
            decryptedRemote.forEach((m) => mergedMap.set(m.id, m));
            return Array.from(mergedMap.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
          });
        }
      } catch {}
    }

    loadMessages();

    return () => {
      alive = false;
      if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
    };
  }, [activeChatUser, targetId, myId, storageKey]);

  // Cursor pagination for older messages from Cold Archive
  const loadOlderMessages = useCallback(async () => {
    if (!nextCursor || isLoadingOlder || !targetId) return;
    setIsLoadingOlder(true);
    try {
      const page = await fetchPersonalChatPage(targetId, { cursor: nextCursor, limit: 30 });
      setNextCursor(page?.nextCursor || null);
      const remoteEnvelopes = page?.messages || [];
      if (Array.isArray(remoteEnvelopes) && remoteEnvelopes.length > 0) {
        const decryptedOlder = (
          await Promise.all(
            remoteEnvelopes.map((env) => decryptChatEnvelope(env, myId, targetId))
          )
        ).filter(Boolean);
        if (decryptedOlder.length > 0) {
          setMessages((prev) => {
            const mergedMap = new Map();
            decryptedOlder.forEach((m) => mergedMap.set(m.id, m));
            prev.forEach((m) => mergedMap.set(m.id, m));
            return Array.from(mergedMap.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
          });
        }
      }
    } catch {} finally {
      setIsLoadingOlder(false);
    }
  }, [nextCursor, isLoadingOlder, targetId, myId]);

  // Auto-scroll message thread container to bottom when messages change (never scroll outer page/main!)
  useEffect(() => {
    const container = messagesEndRef.current;
    if (!container) return;
    const raf = requestAnimationFrame(() => {
      try {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } catch {
        container.scrollTop = container.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length, isPeerTyping]);

  // Close 3-dots dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  // Voice Note recording timer
  useEffect(() => {
    if (!isRecordingVoice) {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  const persistEncryptedLocal = useCallback(
    async (msgList) => {
      try {
        const encryptedList = await Promise.all(
          msgList.slice(-80).map(async (m) => {
            if (m.ciphertext && m.iv) return m;
            const env = await encryptChatPayload(m, m.senderId || myId, m.recipientId || targetId);
            return {
              ...env,
              id: m.id,
              senderId: m.senderId || myId,
              recipientId: m.recipientId || targetId,
              ts: m.ts,
              status: m.status || "read",
            };
          })
        );
        localStorage.setItem(storageKey, JSON.stringify(encryptedList));
      } catch {}
    },
    [myId, targetId, storageKey]
  );

  const appendAndEncryptMessage = useCallback(
    async ({ text = "", msgType = "text", mediaUrl = null, voiceDuration = null }) => {
      const ts = Date.now();
      const envelope = await encryptChatPayload(
        { text, msgType, mediaUrl, voiceDuration },
        myId,
        targetId
      );

      const newMsg = {
        ...envelope,
        senderId: myId,
        recipientId: targetId,
        text,
        msgType,
        mediaUrl,
        voiceDuration,
        ts,
        status: "read",
        verifiedE2EE: true,
      };

      setMessages((prev) => {
        const next = [...prev, newMsg];
        persistEncryptedLocal(next);
        return next;
      });

      onOutgoingMessageUpdate?.(
        targetId,
        text || (msgType === "voice" ? "🎤 Voice note" : "📎 Media"),
        ts
      );

      postPersonalChatMessage(targetId, envelope).catch(() => {});

      // If chatting with dummy user Ahmad Bintaro, simulate realistic E2EE reply
      if (isAhmadDummyUser(activeChatUser)) {
        if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
        setIsPeerTyping(true);
        autoReplyTimerRef.current = setTimeout(async () => {
          setIsPeerTyping(false);
          const replies = [
            "Mantap bro! Gw udah standby di sekitar Bintaro Sektor 9 nih 🔥",
            "Gaskeun bro, langsung voice call atau video call aja kalo mau cek posisi!",
            "Siap bro, mesin udah panas nih, ditunggu di titik kumpul ya 🚗💨",
          ];
          const replyText = replies[Math.floor(Math.random() * replies.length)];
          const replyEnv = await encryptChatPayload(
            { text: replyText, msgType: "text" },
            targetId,
            myId
          );
          const replyMsg = {
            ...replyEnv,
            senderId: targetId,
            recipientId: myId,
            text: replyText,
            msgType: "text",
            ts: Date.now(),
            status: "read",
            verifiedE2EE: true,
          };
          setMessages((prev) => {
            const next = [...prev, replyMsg];
            persistEncryptedLocal(next);
            return next;
          });
        }, 1500);
      }
    },
    [myId, targetId, activeChatUser, persistEncryptedLocal, onOutgoingMessageUpdate]
  );

  const handleSendText = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText("");
    setShowEmojiBar(false);
    setMediaError("");
    await appendAndEncryptMessage({ text: trimmed, msgType: "text" });
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

    setIsUploadingMedia(true);
    try {
      const res = await uploadBlobMedia(file);
      if (res?.url) {
        await appendAndEncryptMessage({
          text: inputText.trim(),
          msgType: "media",
          mediaUrl: res.url,
        });
        setInputText("");
      }
    } catch {
      const localUrl = URL.createObjectURL(file);
      await appendAndEncryptMessage({
        text: inputText.trim(),
        msgType: "media",
        mediaUrl: localUrl,
      });
      setInputText("");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFinishVoiceNote = async () => {
    const dur = Math.max(1, recordingSeconds);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    await appendAndEncryptMessage({
      text: "Voice message",
      msgType: "voice",
      voiceDuration: dur,
    });
  };

  const handleToggleSelectMsg = (msgId) => {
    setSelectedMsgIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const handleDeleteSelectedMessages = async () => {
    if (!selectedMsgIds.length) return;
    const idSet = new Set(selectedMsgIds);
    setMessages((prev) => {
      const next = prev.filter((m) => !idSet.has(m.id));
      persistEncryptedLocal(next);
      return next;
    });
    deletePersonalChatMessages(targetId, { messageIds: selectedMsgIds }).catch(() => {});
    setSelectedMsgIds([]);
    setSelectMode(false);
  };

  const handleCopySelectedMessages = () => {
    const selectedTexts = messages
      .filter((m) => selectedMsgIds.includes(m.id) && m.text)
      .map((m) => m.text)
      .join("\n");
    if (selectedTexts && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(selectedTexts).catch(() => {});
    }
    setSelectedMsgIds([]);
    setSelectMode(false);
  };

  const groupedMessages = useMemo(() => {
    const q = messageSearchQuery.trim().toLowerCase();
    const filtered = q
      ? messages.filter((m) => String(m.text || "").toLowerCase().includes(q))
      : messages;

    const items = [];
    let lastDateLabel = null;
    filtered.forEach((m) => {
      const label = getDateLabel(m.ts);
      if (label !== lastDateLabel) {
        items.push({ type: "date_divider", id: `date_${label}_${m.id}`, label });
        lastDateLabel = label;
      }
      items.push({ type: "message", ...m });
    });
    return items;
  }, [messages, messageSearchQuery]);

  return {
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
  };
}

