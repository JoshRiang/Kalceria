import { useCallback, useEffect } from "react";
import { encryptChatPayload } from "@/lib/chatCrypto";

/**
 * useChatLocalCache
 * Hook Ledger Position: E3 (Local persistence & debounced encrypted cache)
 *
 * Input:
 * - myId: string
 * - targetId: string
 * - storageKey: string
 * - persistDebounceRef: React.MutableRefObject
 * - pendingPersistListRef: React.MutableRefObject
 * - peerTypingTimerRef: React.MutableRefObject
 *
 * Output:
 * - persistQuickLocal: (msgList: Array) => void
 * - flushEncryptedLocal: (msgList: Array) => Promise<void>
 * - persistEncryptedLocal: (msgList: Array) => void
 */
export function useChatLocalCache({
  myId,
  targetId,
  storageKey,
  persistDebounceRef,
  pendingPersistListRef,
  peerTypingTimerRef,
}) {
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

  return {
    persistQuickLocal,
    flushEncryptedLocal,
    persistEncryptedLocal,
  };
}
