"use client";

import { useEffect } from "react";
import { fetchPersonalChatInboxSummary } from "@/lib/api";
import { playNotificationSound } from "@/lib/soundEngine";
import { PERSONAL_CHAT_STORAGE_KEY } from "./eventChatHelpers";

export function useInboxSummarySync({
  currentUser,
  blockedUserIds = [],
  mutedUserIds = [],
  isSelfOfflineRef,
  setPersonalChatMap,
  setRecentlyMessagedUserIds,
  highlightTimersRef,
}) {
  // O(1) Global Unread Inbox Watermark Sync (Scales to 100,000+ users with 1 single Redis key check instead of polling N peers)
  useEffect(() => {
    if (!currentUser?.id || typeof window === "undefined") return;
    let alive = true;
    let timerId = null;
    let lastVer = "";
    let isFirstSync = true;

    const syncInboxSummary = async () => {
      if (!alive) return;
      try {
        const res = await fetchPersonalChatInboxSummary(
          lastVer ? { sinceVer: lastVer } : {}
        );
        if (!alive || !res?.ok) return;

        if (!res.unchanged) {
          lastVer = String(res.ver || "0");
          const serverPeers = res.peers || {};
          const newlyNotifiedPeers = [];

          setPersonalChatMap((prev) => {
            let changed = false;
            const next = { ...prev };

            for (const [peerId, info] of Object.entries(serverPeers)) {
              if (
                !peerId ||
                String(peerId) === String(currentUser.id) ||
                blockedUserIds.includes(String(peerId))
              ) {
                continue;
              }
              const count = Math.max(0, Number(info?.unreadCount) || 0);
              const ts = Number(info?.lastTs) || Date.now();
              const prevEntry = prev[peerId];
              const prevCount = Number(prevEntry?.unreadCount || 0);
              const prevTs = Number(prevEntry?.lastMessageAt || 0);

              if (count > 0) {
                if (prevCount !== count || prevTs < ts) {
                  changed = true;
                  const labelText =
                    info?.msgType === "voice"
                      ? "🎤 Voice note"
                      : info?.msgType === "video" || info?.msgType === "media"
                      ? "📷 Media"
                      : info?.msgType === "call"
                      ? "📞 Panggilan"
                      : prevEntry?.lastMessageText || "Pesan baru";

                  next[peerId] = {
                    ...prevEntry,
                    unreadCount: count,
                    lastMessageText: labelText,
                    lastMessageAt: Math.max(ts, prevTs),
                  };

                  if (!isFirstSync && (count > prevCount || ts > prevTs)) {
                    newlyNotifiedPeers.push({ peerId, ts });
                  }
                }
              } else if (prevCount > 0) {
                changed = true;
                next[peerId] = {
                  ...prevEntry,
                  unreadCount: 0,
                };
              }
            }

            // Clear any stale local unread badges for peers no longer present in server unread hash
            for (const [localPeerId, localEntry] of Object.entries(prev)) {
              if (localEntry?.unreadCount > 0 && !serverPeers[localPeerId]) {
                changed = true;
                next[localPeerId] = {
                  ...localEntry,
                  unreadCount: 0,
                };
              }
            }

            if (changed) {
              try {
                sessionStorage.setItem(PERSONAL_CHAT_STORAGE_KEY, JSON.stringify(next));
              } catch {}
              return next;
            }
            return prev;
          });

          isFirstSync = false;

          // Trigger notification chime & roll-to-top highlight for genuinely new incoming messages (silent when offline)
          for (const item of newlyNotifiedPeers) {
            if (!isSelfOfflineRef?.current && !mutedUserIds.includes(String(item.peerId))) {
              playNotificationSound("personal_chat");
            }
            setRecentlyMessagedUserIds((prev) => ({ ...prev, [item.peerId]: true }));
            if (highlightTimersRef?.current?.[item.peerId]) {
              clearTimeout(highlightTimersRef.current[item.peerId]);
            }
            if (highlightTimersRef?.current) {
              highlightTimersRef.current[item.peerId] = setTimeout(() => {
                setRecentlyMessagedUserIds((prev) => {
                  const copy = { ...prev };
                  delete copy[item.peerId];
                  return copy;
                });
              }, 2800);
            }
          }
        } else {
          isFirstSync = false;
        }
      } catch {}

      if (alive) {
        const isHidden = typeof document !== "undefined" && document.hidden;
        timerId = setTimeout(syncInboxSummary, isHidden ? 8000 : 1800);
      }
    };

    syncInboxSummary();

    const onWake = () => {
      if (alive && typeof document !== "undefined" && !document.hidden) {
        if (timerId) clearTimeout(timerId);
        syncInboxSummary();
      }
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);

    return () => {
      alive = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [currentUser?.id, blockedUserIds, mutedUserIds, isSelfOfflineRef, setPersonalChatMap, setRecentlyMessagedUserIds, highlightTimersRef]);
}
