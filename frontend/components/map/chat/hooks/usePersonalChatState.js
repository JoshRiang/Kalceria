"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { encryptChatPayload, decryptChatEnvelope } from "@/lib/chatCrypto";
import { isAhmadDummyUser } from "./usePersonalCallState";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { useChatRealtimeChannel } from "./useChatRealtimeChannel";
import { checkHardwarePermission } from "@/lib/mediaHardware";
import {
  fetchPersonalChatPage,
  postPersonalChatMessage,
  ackPersonalChatRead,
  deletePersonalChatMessages,
  uploadBlobMedia,
} from "@/lib/api";
import {
  savePendingMediaBlob,
  getPendingMediaBlob,
  deletePendingMediaBlob,
} from "@/lib/chatMediaStore";

const LOCAL_CHAT_CACHE_PREFIX = "kalceria_e2ee_chat_v4_";

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadMediaWithPersistFallback(blobOrFile) {
  if (!blobOrFile) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await uploadBlobMedia(blobOrFile);
      if (res?.url && !String(res.url).startsWith("blob:")) {
        return res.url;
      }
    } catch {}
  }
  if (blobOrFile.size <= 350 * 1024) {
    try {
      return await blobToDataUrl(blobOrFile);
    } catch {}
  }
  return null;
}
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

export const GAUL_JAKSEL_STARTERS = [
  "Nongs mana kita hari ini?",
  "Kuy cabut kuy",
  "Weh gw mau curhat nih...",
  "Gas pol jangan kasih kendor!",
  "Lagi di mana lu bro?",
  "Ngopi santuy dulu gak sih?",
  "Info sunmori besok dong!",
  "Sumpah ini seru parah sih...",
  "Lu udah otw belom nih?",
  "Mampir bengkel bentar kuy!",
  "Mau ikutan rolling bareng gak?",
  "Goks parah vibes-nya!",
  "Ada yang lagi nongkrong di sini?",
  "Gaskeun lah tanpa ragu!",
  "Share lok sekarang juga dong",
  "Jangan lupa kabar-kabari ya",
  "Jujurly gw lagi butuh asupan kopi",
  "Cekidot spot baru ini deh",
  "Which is better nongkrong di mana?",
  "Basically kita butuh healing bentar",
  "Literally serame itu di situ?",
  "Sabi kali join anak-anak nanti malem",
  "Kopdar dadakan sabi nih",
  "Sound check knalpot dulu bos",
  "Meetup di check point biasa ya!",
];

export function getChatTimeLabel(ts) {
  const msgDate = new Date(Number(ts) || Date.now());
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const msgStart = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate()).getTime();

  const hours = msgDate.getHours();
  const minutes = String(msgDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}.${minutes} ${ampm}`;

  if (msgStart >= todayStart) {
    return `Today ${timeStr}`;
  }
  if (msgStart >= yesterdayStart) {
    return `Yesterday ${timeStr}`;
  }
  const dateStr = msgDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${dateStr} ${timeStr}`;
}

export function getDateLabel(ts) {
  return getChatTimeLabel(ts);
}

function getInitialSeedMessages(targetUser, currentUserId) {
  if (!targetUser) return [];
  const isAhmad = isAhmadDummyUser(targetUser);
  if (!isAhmad) return [];

  const now = Date.now();
  const yesterdayEvening = now - 21 * 60 * 60 * 1000;
  const todayAfternoon = now - 45 * 60 * 1000;

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

export function usePersonalChatState({
  activeChatUser,
  currentUser,
  onOutgoingMessageUpdate,
  initialCallState = null,
  onCallEnded,
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

  const voiceRecorder = useVoiceRecorder({
    onPermissionNeeded: handlePermissionNeeded,
  });
  voiceRecorderRef.current = voiceRecorder;

  const [playingVoiceId, setPlayingVoiceId] = useState(null);

  // Active Voice / Video Call State (inside the sidebar panel!)
  const [callState, setCallState] = useState(initialCallState);
  const [isPeerTyping, setIsPeerTyping] = useState(false);

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

  const persistQuickLocal = useCallback(
    (msgList) => {
      try {
        const sanitized = msgList.slice(-80).map((m) =>
          String(m?.mediaUrl || "").startsWith("blob:") ? { ...m, mediaUrl: null } : m
        );
        sessionStorage.setItem(`quick_${storageKey}`, JSON.stringify(sanitized));
      } catch {}
    },
    [storageKey]
  );

  const flushEncryptedLocal = useCallback(
    async (msgList) => {
      try {
        const encryptedList = await Promise.all(
          msgList.slice(-80).map(async (m) => {
            const safeMsg = String(m?.mediaUrl || "").startsWith("blob:")
              ? { ...m, mediaUrl: null }
              : m;
            if (safeMsg.ciphertext && safeMsg.iv && !String(m?.mediaUrl || "").startsWith("blob:")) {
              return safeMsg;
            }
            const env = await encryptChatPayload(
              safeMsg,
              safeMsg.senderId || myId,
              safeMsg.recipientId || targetId
            );
            return {
              ...env,
              id: safeMsg.id,
              senderId: safeMsg.senderId || myId,
              recipientId: safeMsg.recipientId || targetId,
              ts: safeMsg.ts,
              status: safeMsg.status || (String(safeMsg.senderId) === String(myId) ? "sent" : "read"),
            };
          })
        );
        localStorage.setItem(storageKey, JSON.stringify(encryptedList));
      } catch {}
    },
    [myId, targetId, storageKey]
  );

  // Non-blocking debounced persistence so localStorage I/O never stalls critical send/receive hot path
  const persistEncryptedLocal = useCallback(
    (msgList) => {
      pendingPersistListRef.current = msgList;
      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = setTimeout(() => {
        persistDebounceRef.current = null;
        const latest = pendingPersistListRef.current;
        if (latest) {
          flushEncryptedLocal(latest);
        }
      }, 260);
    },
    [flushEncryptedLocal]
  );

  useEffect(() => {
    return () => {
      if (persistDebounceRef.current) {
        clearTimeout(persistDebounceRef.current);
        persistDebounceRef.current = null;
        if (pendingPersistListRef.current) {
          flushEncryptedLocal(pendingPersistListRef.current);
        }
      }
      if (peerTypingTimerRef.current) {
        clearTimeout(peerTypingTimerRef.current);
      }
    };
  }, [flushEncryptedLocal]);

  // Direct P2P WebRTC DataChannel Handler (~5-20ms LAN/Same-ISP E2EE delivery, 0ms server overhead)
  const sendRealtimePacketRef = useRef(null);

  const handleRealtimeP2PPacket = useCallback(
    async (packet) => {
      if (!packet || typeof packet !== "object") return;

      if (packet.type === "e2ee_msg" && packet.envelope) {
        if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
        setIsPeerTyping(false);

        const decrypted = await decryptChatEnvelope(packet.envelope, myId, targetId);
        if (!decrypted) return;

        const readyMsg = {
          ...decrypted,
          status: "read",
        };

        const msgTs = Number(readyMsg.ts) || Date.now();
        syncWatermarkRef.current.lastTs = Math.max(syncWatermarkRef.current.lastTs, msgTs);

        setMessages((prev) => {
          const exists = prev.find((m) => m.id === readyMsg.id);
          if (exists && exists.mediaUrl === readyMsg.mediaUrl && exists.status === "read") {
            return prev;
          }
          const map = new Map();
          prev.forEach((m) => map.set(m.id, m));
          map.set(readyMsg.id, readyMsg);
          const sorted = Array.from(map.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
          persistQuickLocal(sorted);
          persistEncryptedLocal(sorted);
          return sorted;
        });

        // Instant P2P Read Receipt back to sender + durable O(1) Redis/Postgres watermark ack
        sendRealtimePacketRef.current?.({
          type: "read_ack",
          upToTs: msgTs,
        });
        ackPersonalChatRead(targetId, {
          upToTs: msgTs,
          messageIds: [readyMsg.id],
        }).catch(() => {});
        return;
      }

      if (packet.type === "read_ack" && packet.upToTs) {
        const ackTs = Number(packet.upToTs) || 0;
        if (ackTs <= 0) return;
        syncWatermarkRef.current.peerReadTs = Math.max(syncWatermarkRef.current.peerReadTs, ackTs);
        setMessages((prev) => {
          let changed = false;
          const next = prev.map((m) => {
            if (
              String(m.senderId) === String(myId) &&
              m.status === "sent" &&
              Number(m.ts || 0) <= ackTs
            ) {
              changed = true;
              return { ...m, status: "read" };
            }
            return m;
          });
          if (changed) {
            persistQuickLocal(next);
            persistEncryptedLocal(next);
            return next;
          }
          return prev;
        });
        return;
      }

      if (packet.type === "typing") {
        if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
        if (packet.isTyping) {
          setIsPeerTyping(true);
          peerTypingTimerRef.current = setTimeout(() => {
            setIsPeerTyping(false);
          }, 3200);
        } else {
          setIsPeerTyping(false);
        }
        return;
      }

      if (packet.type === "delete_msgs" && Array.isArray(packet.ids)) {
        const delSet = new Set(packet.ids.map(String));
        if (delSet.size > 0) {
          setMessages((prev) => {
            const next = prev.filter((m) => !delSet.has(String(m.id)));
            if (next.length !== prev.length) {
              persistQuickLocal(next);
              persistEncryptedLocal(next);
              return next;
            }
            return prev;
          });
        }
        return;
      }

      if (packet.type === "sync_nudge") {
        syncNowRef.current?.();
      }
    },
    [myId, targetId, persistQuickLocal, persistEncryptedLocal]
  );

  const {
    isP2PConnected,
    sendRealtimePacket,
    sendTypingState,
    ingestPiggybackedSignals,
  } = useChatRealtimeChannel({
    myId,
    targetId,
    enabled: isRealPeer,
    onPacket: handleRealtimeP2PPacket,
  });

  isP2PConnectedRef.current = isP2PConnected;
  sendRealtimePacketRef.current = sendRealtimePacket;
  const ingestPiggybackedRef = useRef(ingestPiggybackedSignals);
  ingestPiggybackedRef.current = ingestPiggybackedSignals;

  // Broadcast real-time P2P typing state with zero HTTP/server load
  useEffect(() => {
    if (!isRealPeer) return;
    if (inputText && inputText.trim().length > 0) {
      sendTypingState(true);
    } else {
      sendTypingState(false);
    }
  }, [inputText, isRealPeer, sendTypingState]);

  // Load & decrypt conversation history + Adaptive O(1) Delta Sync
  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    let syncTimerId = null;
    let inFlight = false;
    const isAhmad = isAhmadDummyUser(activeChatUserRef.current);
    syncWatermarkRef.current = {
      lastTs: 0,
      peerReadTs: 0,
      deleteRev: 0,
      initialized: false,
    };

    // Clean up legacy v1/v2/v3 cache keys that stored stale fake seed messages or dead blob: URLs
    try {
      const legacySuffix = [myId, targetId].sort().join("_");
      localStorage.removeItem(`kalceria_e2ee_chat_v1_${legacySuffix}`);
      localStorage.removeItem(`kalceria_e2ee_chat_v2_${legacySuffix}`);
      localStorage.removeItem(`kalceria_e2ee_chat_v3_${legacySuffix}`);
      sessionStorage.removeItem(`quick_kalceria_e2ee_chat_v1_${legacySuffix}`);
      sessionStorage.removeItem(`quick_kalceria_e2ee_chat_v2_${legacySuffix}`);
      sessionStorage.removeItem(`quick_kalceria_e2ee_chat_v3_${legacySuffix}`);
    } catch {}

    async function syncFromRemote() {
      if (!alive || inFlight) return;
      inFlight = true;
      try {
        const wm = syncWatermarkRef.current;
        const params = wm.initialized
          ? {
              limit: 30,
              sinceTs: wm.lastTs,
              sinceReadTs: wm.peerReadTs,
              sinceDelRev: wm.deleteRev,
              includeRtc: 1,
            }
          : {
              limit: 30,
              includeRtc: 1,
            };

        const page = await fetchPersonalChatPage(targetId, params);
        if (!alive || !page) return;

        if (Array.isArray(page.rtcSignals) && page.rtcSignals.length > 0) {
          ingestPiggybackedRef.current?.(page.rtcSignals);
        }

        if (page.unchanged) {
          return;
        }

        const serverLastTs = Number(page.lastTs || 0);
        const serverPeerReadTs = Number(page.peerReadTs || 0);
        const serverDelRev = Number(page.deleteRev || 0);
        const prevDelRev = wm.deleteRev;
        const wasInitialized = wm.initialized;

        wm.lastTs = Math.max(wm.lastTs, serverLastTs);
        wm.peerReadTs = Math.max(wm.peerReadTs, serverPeerReadTs);
        wm.deleteRev = serverDelRev;
        wm.initialized = true;

        if (!page.delta) {
          setNextCursor((prevCursor) => page?.nextCursor || prevCursor || null);
        }

        const remoteEnvelopes = Array.isArray(page.messages) ? page.messages : [];

        // Even if delta returned 0 new envelopes (e.g. only peerReadTs advanced!), update read statuses in O(1)
        if (remoteEnvelopes.length === 0) {
          if (serverPeerReadTs > 0) {
            setMessages((prev) => {
              let changed = false;
              const next = prev.map((m) => {
                if (
                  String(m.senderId) === String(myId) &&
                  m.status === "sent" &&
                  Number(m.ts || 0) <= serverPeerReadTs
                ) {
                  changed = true;
                  return { ...m, status: "read" };
                }
                return m;
              });
              if (changed) {
                persistQuickLocal(next);
                persistEncryptedLocal(next);
                return next;
              }
              return prev;
            });
          }
          // If clearAll happened on another device (deleteRev advanced and full fetch returned 0 messages)
          if (wasInitialized && serverDelRev !== prevDelRev && !page.delta) {
            setMessages((prev) => {
              const kept = prev.filter((m) => m.status === "sending" || m.status === "failed");
              persistQuickLocal(kept);
              persistEncryptedLocal(kept);
              return kept;
            });
          }
          return;
        }

        const decryptedRemote = (
          await Promise.all(
            remoteEnvelopes.map((env) => decryptChatEnvelope(env, myId, targetId))
          )
        ).filter(Boolean);

        if (alive) {
          setMessages((prev) => {
            const isFullReconcile = wasInitialized && serverDelRev !== prevDelRev && !page.delta;
            const mergedMap = new Map();

            if (!isFullReconcile) {
              prev.forEach((m) => {
                if (!isAhmad && String(m.id).startsWith("seed_")) return;
                if (
                  (isAhmad && String(m.id).startsWith("seed_")) ||
                  m.status === "sending" ||
                  m.status === "failed"
                ) {
                  mergedMap.set(m.id, m);
                } else if (!String(m.mediaUrl || "").startsWith("blob:")) {
                  const updatedStatus =
                    String(m.senderId) === String(myId) &&
                    m.status === "sent" &&
                    serverPeerReadTs > 0 &&
                    Number(m.ts || 0) <= serverPeerReadTs
                      ? "read"
                      : m.status;
                  mergedMap.set(m.id, updatedStatus !== m.status ? { ...m, status: updatedStatus } : m);
                }
              });
            } else {
              // Full reconcile after remote message deletion: keep only local in-flight/failed messages + server truth
              prev.forEach((m) => {
                if (m.status === "sending" || m.status === "failed") {
                  mergedMap.set(m.id, m);
                }
              });
            }

            decryptedRemote.forEach((m) => {
              const existing = mergedMap.get(m.id);
              // Never downgrade a locally confirmed 'read' receipt back to 'sent'
              const bestStatus = existing?.status === "read" ? "read" : m.status;
              mergedMap.set(m.id, bestStatus !== m.status ? { ...m, status: bestStatus } : m);
            });

            const sorted = Array.from(mergedMap.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
            persistQuickLocal(sorted);
            persistEncryptedLocal(sorted);
            return sorted;
          });
        }
      } catch {} finally {
        inFlight = false;
      }
    }

    syncNowRef.current = syncFromRemote;

    async function loadMessages() {
      let localMsgs = [];
      try {
        const quick = sessionStorage.getItem(`quick_${storageKey}`);
        if (quick) {
          const parsedQuick = JSON.parse(quick);
          if (Array.isArray(parsedQuick) && parsedQuick.length > 0) {
            localMsgs = parsedQuick.filter(
              (m) =>
                !String(m?.mediaUrl || "").startsWith("blob:") &&
                (isAhmad || !String(m?.id || "").startsWith("seed_"))
            );
          }
        }
      } catch {}

      if (!localMsgs.length) {
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const decryptedLocal = await Promise.all(
                parsed.map((env) => decryptChatEnvelope(env, myId, targetId))
              );
              localMsgs = decryptedLocal
                .filter(Boolean)
                .filter(
                  (m) =>
                    !String(m?.mediaUrl || "").startsWith("blob:") &&
                    (isAhmad || !String(m?.id || "").startsWith("seed_"))
                );
            }
          }
        } catch {}
      }

      if (!localMsgs.length) {
        localMsgs = getInitialSeedMessages(activeChatUserRef.current, myId);
      }

      if (alive) {
        setMessages((prev) => {
          if (prev && prev.length > 0) {
            const merged = new Map();
            localMsgs.forEach((m) => merged.set(m.id, m));
            prev.forEach((m) => {
              if (isAhmad || !String(m?.id || "").startsWith("seed_")) {
                merged.set(m.id, m);
              }
            });
            return Array.from(merged.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
          }
          return localMsgs;
        });
      }

      await syncFromRemote();
    }

    const scheduleNextSync = () => {
      if (!alive) return;
      if (isAhmadDummyUser(activeChatUserRef.current) || String(targetId).startsWith("mock_")) {
        return;
      }
      const isHidden = typeof document !== "undefined" && document.hidden;
      const delayMs = isHidden
        ? 6000
        : isP2PConnectedRef.current
        ? 2500
        : 850;
      syncTimerId = setTimeout(async () => {
        await syncFromRemote();
        scheduleNextSync();
      }, delayMs);
    };

    loadMessages().then(() => {
      scheduleNextSync();
    });

    const onWakeSync = () => {
      if (alive && typeof document !== "undefined" && !document.hidden) {
        syncFromRemote();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onWakeSync);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onWakeSync);
    }

    return () => {
      alive = false;
      syncNowRef.current = null;
      if (syncTimerId) clearTimeout(syncTimerId);
      if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onWakeSync);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onWakeSync);
      }
    };
  }, [targetId, myId, storageKey, persistQuickLocal, persistEncryptedLocal]);

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
    } catch { } finally {
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

  const appendAndEncryptMessage = useCallback(
    async ({
      text = "",
      msgType = "text",
      mediaUrl = null,
      rawBlob = null,
      trimFragment = "",
      voiceDuration = null,
      voiceWaveform = null,
      videoDuration = null,
      isViewOnce = false,
      callMode = null,
      callDuration = null,
      replyTo = null,
    }) => {
      const ts = Date.now();
      const initialEnvelope = await encryptChatPayload(
        {
          text,
          msgType,
          mediaUrl: String(mediaUrl || "").startsWith("blob:") ? null : mediaUrl,
          voiceDuration,
          voiceWaveform,
          videoDuration,
          isViewOnce,
          callMode,
          callDuration,
          replyTo,
          ts,
        },
        myId,
        targetId
      );

      const msgId = initialEnvelope.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (rawBlob) {
        pendingBlobsRef.current.set(msgId, { blob: rawBlob, trimFragment });
        savePendingMediaBlob(msgId, rawBlob, { trimFragment }).catch(() => {});
      }

      const newMsg = {
        ...initialEnvelope,
        id: msgId,
        senderId: myId,
        recipientId: targetId,
        text,
        msgType,
        mediaUrl,
        voiceDuration,
        voiceWaveform,
        videoDuration,
        isViewOnce,
        callMode,
        callDuration,
        replyTo,
        ts,
        status: msgType === "call" ? "sent" : "sending",
        verifiedE2EE: true,
      };

      setMessages((prev) => {
        const next = [...prev, newMsg];
        persistQuickLocal(next);
        persistEncryptedLocal(next);
        return next;
      });

      onOutgoingMessageUpdateRef.current?.(
        targetId,
        text ||
          (msgType === "call"
            ? callMode === "video"
              ? "📹 Video call"
              : "📞 Voice call"
            : msgType === "voice"
            ? "🎤 Voice note"
            : "📷 Media"),
        ts
      );

      let finalMediaUrl = mediaUrl;
      if (rawBlob) {
        const uploadedUrl = await uploadMediaWithPersistFallback(rawBlob);
        if (!uploadedUrl) {
          setMessages((prev) => {
            const next = prev.map((m) => (m.id === msgId ? { ...m, status: "failed" } : m));
            persistQuickLocal(next);
            persistEncryptedLocal(next);
            return next;
          });
          return;
        }
        finalMediaUrl = trimFragment ? `${uploadedUrl}${trimFragment}` : uploadedUrl;
      }

      const envelope = rawBlob
        ? await encryptChatPayload(
            {
              id: msgId,
              text,
              msgType,
              mediaUrl: finalMediaUrl,
              voiceDuration,
              voiceWaveform,
              videoDuration,
              isViewOnce,
              callMode,
              callDuration,
              replyTo,
              ts,
            },
            myId,
            targetId
          )
        : initialEnvelope;

      if (isAhmadDummyUser(activeChatUserRef.current) || String(targetId).startsWith("mock_")) {
        // Instant local simulation for dummy / Ahmad users
        setTimeout(() => {
          pendingBlobsRef.current.delete(msgId);
          deletePendingMediaBlob(msgId).catch(() => {});
          setMessages((prev) => {
            const next = prev.map((m) =>
              m.id === msgId ? { ...m, ...envelope, mediaUrl: finalMediaUrl, status: "sent" } : m
            );
            persistEncryptedLocal(next);
            return next;
          });
        }, 300);
      } else {
        // Parallel 0ms-server-overhead P2P DataChannel dispatch (delivers E2EE envelope directly to peer in ~5-20ms)
        const p2pResult = sendRealtimePacketRef.current?.({
          type: "e2ee_msg",
          envelope: {
            ...envelope,
            id: msgId,
            senderId: myId,
            recipientId: targetId,
            mediaUrl: finalMediaUrl,
            voiceDuration,
            voiceWaveform,
            videoDuration,
            isViewOnce,
            callMode,
            callDuration,
            ts,
            status: "sent",
          },
        });

        let isTimedOut = false;
        const timeoutTimer = setTimeout(() => {
          isTimedOut = true;
          setMessages((prev) => {
            const next = prev.map((m) =>
              m.id === msgId && m.status === "sending"
                ? { ...m, ...envelope, mediaUrl: finalMediaUrl, status: msgType === "call" ? "sent" : "failed" }
                : m
            );
            persistEncryptedLocal(next);
            return next;
          });
        }, 12000);

        const payloadToSend = {
          ...envelope,
          mediaUrl: finalMediaUrl,
          voiceWaveform,
          videoDuration,
          isViewOnce,
          callMode,
          callDuration,
        };

        postPersonalChatMessage(targetId, payloadToSend)
          .catch(async () => {
            await new Promise((r) => setTimeout(r, 400));
            return postPersonalChatMessage(targetId, payloadToSend);
          })
          .then((resData) => {
            clearTimeout(timeoutTimer);
            pendingBlobsRef.current.delete(msgId);
            deletePendingMediaBlob(msgId).catch(() => {});
            syncWatermarkRef.current.lastTs = Math.max(syncWatermarkRef.current.lastTs, ts);
            if (p2pResult === "oversize") {
              sendRealtimePacketRef.current?.({ type: "sync_nudge", ts });
            }
            const persistedStatus = resData?.envelope?.status || resData?.message?.status || "sent";
            if (!isTimedOut) {
              setMessages((prev) => {
                const next = prev.map((m) =>
                  m.id === msgId
                    ? {
                        ...m,
                        ...envelope,
                        mediaUrl: finalMediaUrl,
                        status: m.status === "read" ? "read" : persistedStatus,
                      }
                    : m
                );
                persistQuickLocal(next);
                persistEncryptedLocal(next);
                return next;
              });
            }
          })
          .catch(() => {
            clearTimeout(timeoutTimer);
            setMessages((prev) => {
              const next = prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      ...envelope,
                      mediaUrl: finalMediaUrl,
                      status: m.status === "read" ? "read" : msgType === "call" ? "sent" : "failed",
                    }
                  : m
              );
              persistQuickLocal(next);
              persistEncryptedLocal(next);
              return next;
            });
          });
      }

      // If chatting with dummy user Ahmad Bintaro, simulate realistic E2EE reply
      if (isAhmadDummyUser(activeChatUserRef.current)) {
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
            persistQuickLocal(next);
            persistEncryptedLocal(next);
            return next;
          });

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("kalceria:incoming-personal-chat", {
                detail: {
                  senderId: targetId,
                  message: replyText,
                  timestamp: Date.now(),
                },
              })
            );
          }
        }, 1500);
      }
    },
    [myId, targetId, persistQuickLocal, persistEncryptedLocal]
  );

  const handleSendText = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setInputText("");
    setShowEmojiBar(false);
    setMediaError("");

    const currentReply = replyingTo;
    setReplyingTo(null);

    await appendAndEncryptMessage({
      text: trimmed,
      msgType: "text",
      replyTo: currentReply
        ? {
            id: currentReply.id,
            text: currentReply.text || (currentReply.msgType === "voice" ? "🎤 Voice note" : "📷 Media"),
            senderId: currentReply.senderId,
            senderName: currentReply.senderName || "Kalcerian",
          }
        : null,
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

    const captionText = inputText.trim();
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

    const captionText = (typeof caption === "string" ? caption : inputText).trim();
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

  const handleToggleSelectMsg = (msgId) => {
    setSelectedMsgIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const handleDeleteSelectedMessages = async (customIds = null) => {
    const ids = Array.isArray(customIds) ? customIds : selectedMsgIds;
    if (!ids.length) return;
    const idSet = new Set(ids);
    setMessages((prev) => {
      const next = prev.filter((m) => !idSet.has(m.id));
      persistQuickLocal(next);
      persistEncryptedLocal(next);
      return next;
    });
    sendRealtimePacketRef.current?.({ type: "delete_msgs", ids });
    deletePersonalChatMessages(targetId, { messageIds: ids }).catch(() => { });
    if (!customIds) {
      setSelectedMsgIds([]);
      setSelectMode(false);
    } else {
      setSelectedMsgIds((prev) => prev.filter((id) => !idSet.has(id)));
    }
  };

  const handleCopySingleMessage = (msg) => {
    const text = typeof msg === "string" ? msg : msg?.text;
    if (text && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => { });
    }
  };

  const handleStartReply = (msg) => {
    if (!msg) return;
    const senderName =
      msg.senderId === myId
        ? "You"
        : activeChatUser?.displayName || activeChatUser?.name || "Kalcerian";
    setReplyingTo({
      id: msg.id,
      text: msg.text,
      msgType: msg.msgType,
      senderId: msg.senderId,
      senderName,
    });
  };

  const handleCopySelectedMessages = () => {
    const selectedTexts = messages
      .filter((m) => selectedMsgIds.includes(m.id) && m.text)
      .map((m) => m.text)
      .join("\n");
    if (selectedTexts && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(selectedTexts).catch(() => { });
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
    let lastDayKey = null;
    filtered.forEach((m) => {
      const msgDate = new Date(Number(m.ts) || Date.now());
      const dayKey = `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}`;
      if (dayKey !== lastDayKey) {
        const label = getChatTimeLabel(m.ts);
        items.push({ type: "date_divider", id: `date_${dayKey}_${m.id}`, label });
        lastDayKey = dayKey;
      }
      items.push({ type: "message", ...m });
    });
    return items;
  }, [messages, messageSearchQuery]);

  const handleCallFinished = useCallback(
    async (summary) => {
      setCallState(null);
      onCallEndedRef.current?.();
      if (summary && summary.mode) {
        await appendAndEncryptMessage({
          text: summary.mode === "video" ? "Video call" : "Voice call",
          msgType: "call",
          callMode: summary.mode,
          callDuration: Number(summary.seconds) || 0,
        });
      }
    },
    [appendAndEncryptMessage]
  );

  const handleResendMessage = useCallback(
    async (failedMsg) => {
      if (!failedMsg?.id) return;
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sending" } : m));
        persistEncryptedLocal(next);
        return next;
      });

      if (isAhmadDummyUser(activeChatUserRef.current) || String(targetId).startsWith("mock_")) {
        setTimeout(() => {
          setMessages((prev) => {
            const next = prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sent" } : m));
            persistEncryptedLocal(next);
            return next;
          });
        }, 300);
        return;
      }

      let mediaUrlToSend = failedMsg.mediaUrl;
      let pendingMedia = pendingBlobsRef.current.get(failedMsg.id);
      if (!pendingMedia?.blob) {
        const stored = await getPendingMediaBlob(failedMsg.id);
        if (stored?.blob) {
          pendingMedia = stored;
          pendingBlobsRef.current.set(failedMsg.id, stored);
        }
      }
      if (pendingMedia?.blob && (!mediaUrlToSend || String(mediaUrlToSend).startsWith("blob:"))) {
        const uploadedUrl = await uploadMediaWithPersistFallback(pendingMedia.blob);
        if (!uploadedUrl) {
          setMessages((prev) => {
            const next = prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "failed" } : m));
            persistEncryptedLocal(next);
            return next;
          });
          return;
        }
        mediaUrlToSend = pendingMedia.trimFragment
          ? `${uploadedUrl}${pendingMedia.trimFragment}`
          : uploadedUrl;
      }

      const resendTs = Date.now();
      const freshEnv = await encryptChatPayload(
        {
          id: failedMsg.id,
          text: failedMsg.text,
          msgType: failedMsg.msgType,
          mediaUrl: mediaUrlToSend,
          voiceDuration: failedMsg.voiceDuration,
          voiceWaveform: failedMsg.voiceWaveform,
          videoDuration: failedMsg.videoDuration,
          isViewOnce: failedMsg.isViewOnce,
          callMode: failedMsg.callMode,
          callDuration: failedMsg.callDuration,
          replyTo: failedMsg.replyTo,
          ts: resendTs,
        },
        myId,
        targetId
      );

      const p2pResult = sendRealtimePacketRef.current?.({
        type: "e2ee_msg",
        envelope: {
          ...freshEnv,
          id: failedMsg.id,
          senderId: myId,
          recipientId: targetId,
          mediaUrl: mediaUrlToSend,
          voiceDuration: failedMsg.voiceDuration,
          voiceWaveform: failedMsg.voiceWaveform,
          videoDuration: failedMsg.videoDuration,
          isViewOnce: failedMsg.isViewOnce,
          callMode: failedMsg.callMode,
          callDuration: failedMsg.callDuration,
          ts: resendTs,
          status: "sent",
        },
      });

      postPersonalChatMessage(targetId, {
        ...freshEnv,
        mediaUrl: mediaUrlToSend,
        voiceWaveform: failedMsg.voiceWaveform,
        videoDuration: failedMsg.videoDuration,
        isViewOnce: failedMsg.isViewOnce,
        callMode: failedMsg.callMode,
        callDuration: failedMsg.callDuration,
      })
        .then((resData) => {
          pendingBlobsRef.current.delete(failedMsg.id);
          deletePendingMediaBlob(failedMsg.id).catch(() => {});
          syncWatermarkRef.current.lastTs = Math.max(syncWatermarkRef.current.lastTs, resendTs);
          if (p2pResult === "oversize") {
            sendRealtimePacketRef.current?.({ type: "sync_nudge", ts: resendTs });
          }
          const persistedStatus = resData?.envelope?.status || resData?.message?.status || "sent";
          setMessages((prev) => {
            const next = prev.map((m) =>
              m.id === failedMsg.id
                ? {
                    ...m,
                    ...freshEnv,
                    mediaUrl: mediaUrlToSend,
                    ts: resendTs,
                    status: m.status === "read" ? "read" : persistedStatus,
                  }
                : m
            );
            persistQuickLocal(next);
            persistEncryptedLocal(next);
            return next;
          });
        })
        .catch(() => {
          setMessages((prev) => {
            const next = prev.map((m) =>
              m.id === failedMsg.id
                ? {
                    ...m,
                    ...freshEnv,
                    mediaUrl: mediaUrlToSend,
                    ts: resendTs,
                    status: m.status === "read" ? "read" : "failed",
                  }
                : m
            );
            persistQuickLocal(next);
            persistEncryptedLocal(next);
            return next;
          });
        });
    },
    [myId, targetId, persistQuickLocal, persistEncryptedLocal]
  );

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

