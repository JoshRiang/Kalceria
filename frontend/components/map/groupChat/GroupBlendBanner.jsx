"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchGroupBlend,
  inviteGroupBlend,
  joinGroupBlend,
  leaveGroupBlend,
} from "@/lib/api";

function getLatestCuratedPosition() {
  if (typeof window === "undefined") return null;
  const g = window.__kalceriaCuratedGps;
  if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
    return {
      lat: g.lat,
      lng: g.lng,
      accuracy: g.accuracy,
      heading: g.heading,
      speed: g.speed,
      isStationary: g.isStationary,
    };
  }
  return null;
}

export function GroupBlendBanner({
  eventId,
  isMapDark,
  onCloseChatForFocus,
  externalTriggerCount = 0,
}) {
  const [blend, setBlend] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadBlend = useCallback(async () => {
    if (!eventId) return;
    const data = await fetchGroupBlend(eventId, { routes: false });
    if (data?.ok) setBlend(data);
  }, [eventId]);

  useEffect(() => {
    loadBlend();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadBlend();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadBlend]);

  const notifyMapBlendRefresh = (openFocus = false) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("kalceria:blend-updated", { detail: { eventId } })
    );
    if (openFocus) {
      window.dispatchEvent(
        new CustomEvent("kalceria:blend-focus", { detail: { eventId, focus: true } })
      );
    }
  };

  const handleStartOrJoin = useCallback(async (isInvite = false) => {
    if (!eventId || isBusy) return;
    setIsBusy(true);
    try {
      const pos = getLatestCuratedPosition();
      const res = isInvite
        ? await inviteGroupBlend(eventId, pos || {})
        : await joinGroupBlend(eventId, { ...(pos || {}), transportMode: "foot" });
      if (res?.ok) {
        setBlend(res);
        notifyMapBlendRefresh(false);
      }
    } finally {
      setIsBusy(false);
    }
  }, [eventId, isBusy]);

  useEffect(() => {
    if (externalTriggerCount > 0) {
      handleStartOrJoin(!blend?.hasActiveBlend);
    }
  }, [externalTriggerCount]);

  const handleLeave = async () => {
    if (!eventId || isBusy) return;
    setIsBusy(true);
    try {
      await leaveGroupBlend(eventId);
      setBlend((prev) => (prev ? { ...prev, isJoined: false } : null));
      notifyMapBlendRefresh(false);
    } finally {
      setIsBusy(false);
    }
  };

  if (!blend?.hasActiveBlend) return null;

  return (
    <div
      className={`px-3 py-2 flex items-center justify-between gap-2 text-xs border-b shrink-0 ${
        blend.isJoined
          ? isMapDark
            ? "bg-gradient-to-r from-[#1d4ed8]/35 via-[#0f172a] to-[#ec4899]/35 border-white/15 text-white"
            : "bg-gradient-to-r from-[#dbeafe] via-[#f8fafc] to-[#fce7f3] border-black/15 text-black"
          : isMapDark
          ? "bg-[#1a1f2e] border-white/15 text-white"
          : "bg-[#f0f9ff] border-sky-200 text-slate-900"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[11.5px] leading-tight truncate">
          {blend.isJoined
            ? `Location Blend Aktif (${blend.joinedCount} kawan)`
            : `Undangan Location Blend (${blend.joinedCount} bergabung)`}
        </p>
        <p className="text-[10px] opacity-75 truncate mt-0.5">
          {blend.isJoined
            ? "Rute & ETA live menuju lokasi event aktif di Map"
            : "Gabung untuk melihat POV rute bareng ke event"}
        </p>
      </div>

      {blend.isJoined ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              notifyMapBlendRefresh(true);
              onCloseChatForFocus?.();
            }}
            className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#2563eb] to-[#ec4899] text-white font-bold text-[10.5px] cursor-pointer transition-transform hover:scale-105"
          >
            Fokus Map
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleLeave}
            className={`px-2 py-1 rounded-full text-[10px] font-bold border cursor-pointer disabled:opacity-40 ${
              isMapDark ? "border-white/25 text-white/85" : "border-black/25 text-black/80"
            }`}
          >
            Leave
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => handleStartOrJoin(false)}
          className="px-3 py-1 rounded-full bg-gradient-to-r from-[#2563eb] to-[#ec4899] text-white font-bold text-[11px] shrink-0 cursor-pointer transition-transform hover:scale-105 disabled:opacity-50"
        >
          {isBusy ? "..." : "Join Blend"}
        </button>
      )}
    </div>
  );
}

