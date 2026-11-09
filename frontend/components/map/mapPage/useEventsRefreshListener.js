"use client";

import { useEffect } from "react";
import { fetchMiniEventsWithMeta } from "@/lib/api";
import { mergeEvents } from "@/components/map/mockMiniEvents";

/**
 * frontend/components/map/mapPage/useEventsRefreshListener.js
 *
 * Listens for window event 'kalceria:refresh-events-request' to instantly
 * reconcile local events and collaboration state.
 * Ledger: M7
 *
 * Input: { setEvents, syncCollabStateFromServer }
 * Output: {}
 */
export function useEventsRefreshListener({
  setEvents = () => {},
  syncCollabStateFromServer = () => {},
} = {}) {
  // Instant Event refresh upon collab request or media upload (M7)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleRefresh = (e) => {
      const { updatedEvent } = e?.detail || {};
      if (updatedEvent?.id) {
        setEvents((prev) =>
          prev.map((ev) => (String(ev.id) === String(updatedEvent.id) ? updatedEvent : ev))
        );
      } else {
        fetchMiniEventsWithMeta()
          .then((res) => {
            if (res?.events) {
              const merged = mergeEvents(res.events);
              setEvents(merged);
              syncCollabStateFromServer(merged, res.requestedEventId ?? null);
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("kalceria:refresh-events-request", handleRefresh);
    return () => window.removeEventListener("kalceria:refresh-events-request", handleRefresh);
  }, [setEvents, syncCollabStateFromServer]);
}

