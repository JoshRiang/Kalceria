import { useCallback } from "react";
import { encryptChatPayload } from "@/lib/chatCrypto";
import { isAhmadDummyUser } from "../usePersonalCallState";
import { uploadMediaWithPersistFallback } from "./chatHelpers";
import { postPersonalChatMessage } from "@/lib/api";
import {
  savePendingMediaBlob,
  deletePendingMediaBlob,
} from "@/lib/chatMediaStore";

/**
 * useChatSender
 * Hook Ledger: appendAndEncryptMessage
 *
 * Outgoing message encryption, optimistic local dispatch, 0ms P2P DataChannel delivery,
 * retry/timeout safety, and mock user reply simulation.
 *
 * Input:
 * - myId: string
 * - targetId: string
 * - setMessages: React.Dispatch<React.SetStateAction<Array>>
 * - setIsPeerTyping: React.Dispatch<React.SetStateAction<boolean>>
 * - persistQuickLocal: Function
 * - persistEncryptedLocal: Function
 * - pendingBlobsRef: React.MutableRefObject
 * - autoReplyTimerRef: React.MutableRefObject
 * - syncWatermarkRef: React.MutableRefObject
 * - sendRealtimePacketRef: React.MutableRefObject
 * - activeChatUserRef: React.MutableRefObject
 * - onOutgoingMessageUpdateRef: React.MutableRefObject
 *
 * Output:
 * - appendAndEncryptMessage: Function
 */
export function useChatSender({
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
}) {
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
            "Siap bro, mesin udah panas nih, ditunggu di titik kumpul ya 🏎️💨",
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
              new CustomEvent("kalceria:personal-chat-read", {
                detail: { targetId },
              })
            );
          }
        }, 1500);
      }
    },
    [myId, targetId, persistQuickLocal, persistEncryptedLocal]
  );

  return { appendAndEncryptMessage };
}
