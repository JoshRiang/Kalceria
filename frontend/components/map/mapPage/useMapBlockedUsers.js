"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchBlockedUsers, blockKalcerian, unblockKalcerian } from "@/lib/api";

export function useMapBlockedUsers() {
  const inFlightActionsRef = useRef(new Map()); // targetId (lowercase) -> "block" | "unblock"

  const [blockedUserIds, setBlockedUserIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kalceria_blocked_users");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  const [blockedByUserIds, setBlockedByUserIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kalceria_blocked_by_users");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    let alive = true;
    const syncBlocked = () => {
      fetchBlockedUsers()
        .then((res) => {
          if (!alive) return;
          const serverBlocked = Array.isArray(res?.blockedUsers) ? res.blockedUsers.map(String) : [];
          const serverBlockedBy = Array.isArray(res?.blockedByUsers) ? res.blockedByUsers.map(String) : [];

          // Authoritative server list reconciled with active in-flight actions (prevents resurrection and flickering)
          setBlockedUserIds((prev) => {
            const nextSet = new Set([
              ...(Array.isArray(prev) ? prev.map((id) => String(id).trim()) : []),
              ...serverBlocked.map((id) => String(id).trim()),
            ]);
            inFlightActionsRef.current.forEach((action, id) => {
              if (action === "block") {
                nextSet.add(id);
              } else if (action === "unblock") {
                nextSet.delete(id);
              }
            });
            const finalized = Array.from(nextSet);
            try {
              localStorage.setItem("kalceria_blocked_users", JSON.stringify(finalized));
            } catch {}
            return finalized;
          });

          setBlockedByUserIds(serverBlockedBy);
          try {
            localStorage.setItem("kalceria_blocked_by_users", JSON.stringify(serverBlockedBy));
          } catch {}
        })
        .catch(() => {
          // On network failure or unauthenticated response, preserve local block state without wiping
        });
    };

    syncBlocked();
    // Passive background reconciliation that preserves in-flight operations
    const intervalTimer = setInterval(syncBlocked, 30000);
    return () => {
      alive = false;
      clearInterval(intervalTimer);
    };
  }, []);

  const handleBlockUser = useCallback(async (targetId) => {
    if (!targetId) return;
    const strId = String(targetId).trim();
    const cleanKey = strId.toLowerCase();
    const blockTs = Date.now();
    inFlightActionsRef.current.set(cleanKey, "block");

    setBlockedUserIds((prev) => {
      const next = Array.from(new Set([...(prev || []).map(String), strId]));
      try {
        localStorage.setItem("kalceria_blocked_users", JSON.stringify(next));
        localStorage.setItem(`kalceria:chat_block_ts:${cleanKey}`, String(blockTs));
        const storedEvts = JSON.parse(localStorage.getItem(`kalceria:chat_block_events:${strId}`) || "[]");
        storedEvts.push({ id: `block_evt_${blockTs}`, type: "block", ts: blockTs });
        localStorage.setItem(`kalceria:chat_block_events:${strId}`, JSON.stringify(storedEvts));
      } catch {}
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:user-block-changed", { detail: { targetId: strId, action: "block", ts: blockTs } }));
    }
    try {
      await blockKalcerian(strId);
    } catch {} finally {
      inFlightActionsRef.current.delete(cleanKey);
    }
  }, []);

  const handleUnblockUser = useCallback(async (targetId) => {
    if (!targetId) return;
    const strId = String(targetId).trim();
    const cleanKey = strId.toLowerCase();
    inFlightActionsRef.current.set(cleanKey, "unblock");

    setBlockedUserIds((prev) => {
      const next = (prev || []).filter((id) => String(id).trim().toLowerCase() !== cleanKey);
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:user-block-changed", { detail: { targetId: strId, action: "unblock" } }));
    }
    try {
      await unblockKalcerian(strId);
    } catch {} finally {
      inFlightActionsRef.current.delete(cleanKey);
    }
  }, []);

  return {
    blockedUserIds,
    blockedByUserIds,
    handleBlockUser,
    handleUnblockUser,
  };
}
