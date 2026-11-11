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
          const blocked = Array.isArray(res?.blockedUsers) ? res.blockedUsers : (Array.isArray(res) ? res : []);
          const blockedBy = Array.isArray(res?.blockedByUsers) ? res.blockedByUsers : [];
          setBlockedUserIds(blocked);
          setBlockedByUserIds(blockedBy);
          try {
            localStorage.setItem("kalceria_blocked_users", JSON.stringify(blocked));
            localStorage.setItem("kalceria_blocked_by_users", JSON.stringify(blockedBy));
          } catch {}
        })
        .catch(() => {});
    };

    syncBlocked();
    const intervalTimer = setInterval(syncBlocked, 10000);
    return () => {
      alive = false;
      clearInterval(intervalTimer);
    };
  }, []);

  const handleBlockUser = useCallback(async (targetId) => {
    setBlockedUserIds((prev) => {
      const next = Array.from(new Set([...prev, targetId]));
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:user-block-changed", { detail: { targetId, action: "block" } }));
    }
    try {
      await blockKalcerian(targetId);
    } catch {}
  }, []);

  const handleUnblockUser = useCallback(async (targetId) => {
    setBlockedUserIds((prev) => {
      const next = prev.filter((id) => id !== targetId);
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kalceria:user-block-changed", { detail: { targetId, action: "unblock" } }));
    }
    try {
      await unblockKalcerian(targetId);
    } catch {}
  }, []);

  return {
    blockedUserIds,
    blockedByUserIds,
    handleBlockUser,
    handleUnblockUser,
  };
}
