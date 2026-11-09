"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchFavouriteUsers,
  favouriteKalcerian,
  unfavouriteKalcerian,
  fetchMutedUsers,
  muteKalcerian,
  unmuteKalcerian,
} from "@/lib/api";
import {
  FAVOURITES_STORAGE_KEY,
  MUTED_STORAGE_KEY,
} from "./eventChatHelpers";

export function useMapUserPreferences() {
  // Favourites (Love badge + Priority slot) synced with localStorage & backend
  const [favouriteUserIds, setFavouriteUserIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(FAVOURITES_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  // Muted Notifications (Muted Speaker badge + Silences personal chat chime) synced with localStorage & backend
  const [mutedUserIds, setMutedUserIds] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(MUTED_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    fetchFavouriteUsers()
      .then((ids) => {
        if (Array.isArray(ids) && ids.length) {
          setFavouriteUserIds((prev) => {
            const next = Array.from(new Set([...prev, ...ids]));
            try {
              localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      })
      .catch(() => {});

    fetchMutedUsers()
      .then((ids) => {
        if (Array.isArray(ids) && ids.length) {
          setMutedUserIds((prev) => {
            const next = Array.from(new Set([...prev, ...ids]));
            try {
              localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      })
      .catch(() => {});
  }, []);

  const toggleFavouriteUser = useCallback((targetId) => {
    if (!targetId) return;
    const strId = String(targetId);
    setFavouriteUserIds((prev) => {
      const exists = prev.includes(strId);
      const next = exists ? prev.filter((id) => id !== strId) : [...prev, strId];
      try {
        localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      if (exists) {
        unfavouriteKalcerian(strId).catch(() => {});
      } else {
        favouriteKalcerian(strId).catch(() => {});
      }
      return next;
    });
  }, []);

  const toggleMuteUser = useCallback((targetId) => {
    if (!targetId) return;
    const strId = String(targetId);
    setMutedUserIds((prev) => {
      const exists = prev.includes(strId);
      const next = exists ? prev.filter((id) => id !== strId) : [...prev, strId];
      try {
        localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      if (exists) {
        unmuteKalcerian(strId).catch(() => {});
      } else {
        muteKalcerian(strId).catch(() => {});
      }
      return next;
    });
  }, []);

  return {
    favouriteUserIds,
    mutedUserIds,
    toggleFavouriteUser,
    toggleMuteUser,
  };
}
