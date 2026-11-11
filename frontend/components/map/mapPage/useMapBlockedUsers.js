"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchBlockedUsers, blockKalcerian, unblockKalcerian } from "@/lib/api";

export function useMapBlockedUsers() {
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

          // Merge server blocked users with locally blocked users so no optimistic local block is lost
          setBlockedUserIds((prev) => {
            const merged = Array.from(new Set([...(prev || []).map(String), ...serverBlocked]));
            try {
              localStorage.setItem("kalceria_blocked_users", JSON.stringify(merged));
            } catch {}
            return merged;
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
    // Passive background reconciliation that merges without wiping local blocks
    const intervalTimer = setInterval(syncBlocked, 30000);
    return () => {
      alive = false;
      clearInterval(intervalTimer);
    };
  }, []);

  const handleBlockUser = useCallback(async (targetId) => {
    if (!targetId) return;
    const strId = String(targetId).trim();
    setBlockedUserIds((prev) => {
      const next = Array.from(new Set([...(prev || []).map(String), strId]));
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:user-block-changed", { detail: { targetId: strId, action: "block" } }));
    }
    try {
      await blockKalcerian(strId);
    } catch {}
  }, []);

  const handleUnblockUser = useCallback(async (targetId) => {
    if (!targetId) return;
    const strId = String(targetId).trim();
    setBlockedUserIds((prev) => {
      const next = (prev || []).filter((id) => String(id).trim().toLowerCase() !== strId.toLowerCase());
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:user-block-changed", { detail: { targetId: strId, action: "unblock" } }));
    }
    try {
      await unblockKalcerian(strId);
    } catch {}
  }, []);

  return {
    blockedUserIds,
    blockedByUserIds,
    handleBlockUser,
    handleUnblockUser,
  };
}
