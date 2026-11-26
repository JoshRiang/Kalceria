"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

/**
 * HudPanelSwitcherBox
 *
 * Companion floating 3-icon outerbox positioned beside HudFunctionalOuterbox.
 * Identical beveled crater texture & behavior, housing:
 * 1. Chat Icon       -> "Chat with Others"
 * 2. GroupChat Icon  -> "Assign a Meeting"
 * 3. Search Icon     -> "Find Other Peeps"
 *
 * Each icon reflects parent notification red-dot state via `kalceria:panel-notif-state`.
 */
export const HudPanelSwitcherBox = memo(function HudPanelSwitcherBox({
  isMapDark,
  isSelfOffline = false,
  isToolbarRetracting = false,
}) {
  const [activePanel, setActivePanel] = useState("peeps"); // "peeps" | "chat" | "meeting"
  const [notifs, setNotifs] = useState({
    hasChatNotif: false,
    hasMeetingNotif: false,
    hasPeepsNotif: false,
  });

  useEffect(() => {
    const onNotifState = (e) => {
      const detail = e?.detail || {};
      if (detail.activePanel) setActivePanel(detail.activePanel);
      setNotifs({
        hasChatNotif: Boolean(detail.hasChatNotif),
        hasMeetingNotif: Boolean(detail.hasMeetingNotif),
        hasPeepsNotif: Boolean(detail.hasPeepsNotif),
      });
    };
    window.addEventListener("kalceria:panel-notif-state", onNotifState);
    return () => window.removeEventListener("kalceria:panel-notif-state", onNotifState);
  }, []);

  const handleSelectPanel = useCallback((panel) => {
    setActivePanel(panel);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kalceria:switch-bottom-panel", { detail: { panel } })
      );
    }
  }, []);

  const boxBg = isMapDark ? "bg-[#0f1014]" : "bg-[#ffffff]";
  const boxBorder = isMapDark ? "border-[#2a2d37]" : "border-black/30";
  const boxShadow = isMapDark
    ? "shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.12),inset_-1px_-1.5px_2px_rgba(0,0,0,0.8),0_14px_36px_rgba(0,0,0,0.85)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.12)]";

  const slotClass = (isActive, disabled = false) =>
    `relative flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg border transition-all duration-200 outline-none ${
      disabled
        ? "opacity-35 grayscale cursor-not-allowed"
        : "hover:scale-105 active:scale-95 cursor-pointer"
    } ${
      isMapDark
        ? `bg-[#161b22] ${
            isActive ? "border-white/55 ring-1 ring-white/25" : "border-white/15"
          } shadow-[inset_1px_1.5px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_1.5px_rgba(255,255,255,0.1)]`
        : `bg-[#f1f3f5] ${
            isActive ? "border-black/55 ring-1 ring-black/20" : "border-black/15"
          } shadow-[inset_1px_1.5px_2.5px_rgba(0,0,0,0.18),inset_-1px_-1px_1.5px_rgba(255,255,255,0.9)]`
    }`;

  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";

  return (
    <motion.div
      animate={{ y: isToolbarRetracting ? -46 : 0 }}
      transition={
        isToolbarRetracting
          ? { duration: 1.25, ease: [0.16, 1, 0.3, 1] }
          : { type: "spring", stiffness: 380, damping: 30, mass: 0.8 }
      }
      className="relative flex flex-col items-start pointer-events-auto select-none"
    >
      <div
        className={`relative flex items-center gap-1 sm:gap-1.5 p-1 rounded-b-2xl ${boxBg} border-b-[1.5px] border-x-[1.5px] border-t-0 ${boxBorder} ${boxShadow} overflow-visible`}
      >
        {/* 0. Reels Icon -> Discover Reels & Moments */}
        <button
          type="button"
          onClick={() => handleSelectPanel("reels")}
          title="Discover Reels"
          aria-label="Discover Reels"
          className={slotClass(activePanel === "reels", false)}
        >
          <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke={fg} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <line x1="3" y1="8.5" x2="21" y2="8.5" />
            <line x1="8.5" y1="3" x2="10.5" y2="8.5" />
            <line x1="14.5" y1="3" x2="16.5" y2="8.5" />
            <polygon points="10,12 16,15 10,18" fill={fg} stroke="none" />
          </svg>
        </button>

        {/* 1. Chat Icon -> Chat with Others */}
        <button
          type="button"
          disabled={isSelfOffline}
          onClick={() => !isSelfOffline && handleSelectPanel("chat")}
          title={isSelfOffline ? "Offline (Stealth Mode)" : "Chat with Others"}
          aria-label="Chat with Others"
          className={slotClass(activePanel === "chat", isSelfOffline)}
        >
          <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              fill={fg}
              stroke={border}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          {!isSelfOffline && notifs.hasChatNotif && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#ef4444] rounded-full pointer-events-none ring-1 ring-white/30" />
          )}
        </button>

        {/* 2. GroupChat Icon -> Assign a Meeting */}
        <button
          type="button"
          disabled={isSelfOffline}
          onClick={() => !isSelfOffline && handleSelectPanel("meeting")}
          title={isSelfOffline ? "Offline (Stealth Mode)" : "Assign a Meeting"}
          aria-label="Assign a Meeting"
          className={slotClass(activePanel === "meeting", isSelfOffline)}
        >
          <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="none">
            <path
              d="M18.5 8.5a6.5 6.5 0 0 1-.7 3 6.6 6.6 0 0 1-5.9 3.7 6.5 6.5 0 0 1-3-.7L5 16l1.5-4.5a6.5 6.5 0 0 1-.7-3 6.6 6.6 0 0 1 3.7-5.9 6.5 6.5 0 0 1 3-.7h.4a6.6 6.6 0 0 1 6.2 6.2v.4z"
              transform="translate(4.5, 1.8) scale(0.8)"
              fill={fg}
              stroke={border}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M18.5 8.5a6.5 6.5 0 0 1-.7 3 6.6 6.6 0 0 1-5.9 3.7 6.5 6.5 0 0 1-3-.7L5 16l1.5-4.5a6.5 6.5 0 0 1-.7-3 6.6 6.6 0 0 1 3.7-5.9 6.5 6.5 0 0 1 3-.7h.4a6.6 6.6 0 0 1 6.2 6.2v.4z"
              transform="translate(0.2, 7.2) scale(0.8)"
              fill={fg}
              stroke={border}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          {!isSelfOffline && notifs.hasMeetingNotif && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#ef4444] rounded-full pointer-events-none ring-1 ring-white/30" />
          )}
        </button>

        {/* 3. Search Icon -> Find Other Peeps */}
        <button
          type="button"
          onClick={() => handleSelectPanel("peeps")}
          title="Find Other Peeps"
          aria-label="Find Other Peeps"
          className={slotClass(activePanel === "peeps", false)}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[17px] h-[17px]"
            fill="none"
            stroke={fg}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <line x1="20" y1="20" x2="15.3" y2="15.3" />
          </svg>
          {notifs.hasPeepsNotif && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#ef4444] rounded-full pointer-events-none ring-1 ring-white/30" />
          )}
        </button>
      </div>
    </motion.div>
  );
});
