import { useEffect } from "react";
import { isAhmadDummyUser } from "../usePersonalCallState";
import { fetchPersonalChatPage, ackPersonalChatRead } from "@/lib/api";
import { decryptChatEnvelope } from "@/lib/chatCrypto";
import { applyPeerReadReceipt, filterInFlightOrFailed } from "./messageStatusUpdaters";
import { buildMergedRemoteMessages } from "./mergeRemoteMessages";
import { getInitialSeedMessages } from "./chatHelpers";

/**
 * useChatSyncLoop - Hook Ledger Position: E5
 * Adaptive O(1) Delta Sync, conversation history fetch & sync loop
 */
export function useChatSyncLoop({
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
  isTargetBlocked = false,
  isBlockedByTarget = false,
}) {
  if (syncWatermarkRef?.current) {
    syncWatermarkRef.current.isTargetBlocked = isTargetBlocked;
    syncWatermarkRef.current.isBlockedByTarget = isBlockedByTarget;
  }

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
              const { next, changed } = applyPeerReadReceipt(prev, myId, serverPeerReadTs);
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
              const kept = filterInFlightOrFailed(prev);
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

        const effectiveRemote = (syncWatermarkRef.current?.isTargetBlocked || syncWatermarkRef.current?.isBlockedByTarget || isTargetBlocked || isBlockedByTarget)
          ? decryptedRemote.filter((m) => {
              if (String(m.senderId) === String(targetId)) return false;
              if (m.status === 'blocked_drop' || m.isBlockedDrop || m.blockedWhileSent || m.wasBlocked) return false;
              return true;
            })
          : decryptedRemote;

        if (alive) {
          setMessages((prev) => {
            const isFullReconcile = wasInitialized && serverDelRev !== prevDelRev && !page.delta;
            const sorted = buildMergedRemoteMessages({
              prev,
              decryptedRemote: effectiveRemote,
              isFullReconcile,
              isAhmad,
              myId,
              serverPeerReadTs,
            });

            persistQuickLocal(sorted);
            persistEncryptedLocal(sorted);

            const newPeerMsgs = effectiveRemote.filter((m) => String(m.senderId) === String(targetId));
            if (newPeerMsgs.length > 0) {
              const latestPeerTs = Math.max(...newPeerMsgs.map((m) => Number(m.ts) || 0));
              // Acknowledge read to backend (clears Redis chat:unread:${myId} watermark)
              ackPersonalChatRead(targetId, {
                upToTs: latestPeerTs || Date.now(),
              }).catch(() => {});
              // Instantly clear local unread state in personalChatMap
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("kalceria:personal-chat-read", {
                    detail: { targetId },
                  })
                );
              }
            }

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

        const peerMsgs = (localMsgs || []).filter((m) => String(m.senderId) === String(targetId));
        if (peerMsgs.length > 0) {
          const latestPeerTs = Math.max(...peerMsgs.map((m) => Number(m.ts) || 0));
          ackPersonalChatRead(targetId, { upToTs: latestPeerTs || Date.now() }).catch(() => {});
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("kalceria:personal-chat-read", {
                detail: { targetId },
              })
            );
          }
        }
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
}
