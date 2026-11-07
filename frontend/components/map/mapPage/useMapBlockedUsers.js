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

  useEffect(() => {
    fetchBlockedUsers().then((ids) => {
      if (Array.isArray(ids) && ids.length) {
        setBlockedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
      }
    }).catch(() => {});
  }, []);

  const handleBlockUser = useCallback(async (targetId) => {
    setBlockedUserIds((prev) => {
      const next = Array.from(new Set([...prev, targetId]));
      try { localStorage.setItem("kalceria_blocked_users", JSON.stringify(next)); } catch {}
      return next;
    });
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
    try {
      await unblockKalcerian(targetId);
    } catch {}
  }, []);

  return {
    blockedUserIds,
    handleBlockUser,
    handleUnblockUser,
  };
}
