import { useCallback } from "react";
import { isAhmadDummyUser } from "../usePersonalCallState";
import { getPendingMediaBlob, deletePendingMediaBlob } from "@/lib/chatMediaStore";
import { uploadMediaWithPersistFallback } from "./chatHelpers";
import { encryptChatPayload } from "@/lib/chatCrypto";
import { postPersonalChatMessage } from "@/lib/api";

/**
 * useChatResend
 * Hook Ledger: handleCallFinished, handleResendMessage
 *
 * Handling call termination summary dispatch and retry/resend pipeline for failed media & text messages.
 *
 * Input:
 * - myId: string
 * - targetId: string
 * - appendAndEncryptMessage: Function
 * - setCallState: React.Dispatch<React.SetStateAction<any>>
 * - onCallEndedRef: React.MutableRefObject
 * - setMessages: React.Dispatch<React.SetStateAction<Array>>
 * - pendingBlobsRef: React.MutableRefObject
 * - syncWatermarkRef: React.MutableRefObject
 * - sendRealtimePacketRef: React.MutableRefObject
 * - activeChatUserRef: React.MutableRefObject
 * - persistQuickLocal: Function
 * - persistEncryptedLocal: Function
 *
 * Output:
 * - handleCallFinished: Function
 * - handleResendMessage: Function
 */
export function useChatResend({
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
}) {
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
    handleCallFinished,
    handleResendMessage,
  };
}
