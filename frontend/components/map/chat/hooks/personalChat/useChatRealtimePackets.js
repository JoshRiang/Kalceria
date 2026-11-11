import { useCallback, useEffect } from "react";
import { decryptChatEnvelope } from "@/lib/chatCrypto";
import { useChatRealtimeChannel } from "../useChatRealtimeChannel";
import { ackPersonalChatRead } from "@/lib/api";
import {
  applyPeerReadReceipt,
  filterDeletedMessages,
} from "./messageStatusUpdaters";

/**
 * useChatRealtimePackets
 * Hook Ledger Position: R1, E4 + late-binding bridge ref assignment
 *
 * Direct P2P WebRTC DataChannel packet handler & real-time typing state.
 *
 * Input:
 * - myId: string
 * - targetId: string
 * - isRealPeer: boolean
 * - inputText: string
 * - setMessages: React.Dispatch<React.SetStateAction<Array>>
 * - setIsPeerTyping: React.Dispatch<React.SetStateAction<boolean>>
 * - persistQuickLocal: Function
 * - persistEncryptedLocal: Function
 * - syncWatermarkRef: React.MutableRefObject
 * - syncNowRef: React.MutableRefObject
 * - peerTypingTimerRef: React.MutableRefObject
 * - sendRealtimePacketRef: React.MutableRefObject
 * - isP2PConnectedRef: React.MutableRefObject
 * - ingestPiggybackedRef: React.MutableRefObject
 *
 * Output:
 * - handleRealtimeP2PPacket: Function
 * - isP2PConnected: boolean
 * - sendRealtimePacket: Function
 */
export function useChatRealtimePackets({
  myId,
  targetId,
  isRealPeer,
  isTargetBlocked = false,
  isBlockedByTarget = false,
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
}) {
  const handleRealtimeP2PPacket = useCallback(
    async (packet) => {
      if (!packet || typeof packet !== "object") return;
      if (isTargetBlocked || isBlockedByTarget) return;

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

        // User is actively inside this chat viewing messages: immediately mark read
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("kalceria:personal-chat-read", {
              detail: { targetId },
            })
          );
        }
        return;
      }

      if (packet.type === "read_ack" && packet.upToTs) {
        const ackTs = Number(packet.upToTs) || 0;
        if (ackTs <= 0) return;
        syncWatermarkRef.current.peerReadTs = Math.max(syncWatermarkRef.current.peerReadTs, ackTs);
        setMessages((prev) => {
          const { next, changed } = applyPeerReadReceipt(prev, myId, ackTs);
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
        if (packet.ids.length > 0) {
          setMessages((prev) => {
            const { next, changed } = filterDeletedMessages(prev, packet.ids);
            if (changed) {
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
    enabled: isRealPeer && !isTargetBlocked && !isBlockedByTarget,
    onPacket: handleRealtimeP2PPacket,
  });

  isP2PConnectedRef.current = isP2PConnected;
  sendRealtimePacketRef.current = sendRealtimePacket;
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

  return {
    handleRealtimeP2PPacket,
    isP2PConnected,
    sendRealtimePacket,
  };
}
