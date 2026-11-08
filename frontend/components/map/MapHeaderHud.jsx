"use client";

import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { isSoundMuted } from "@/lib/soundEngine";
import {
  HudQuickActionsMenu,
  HudEyeButton,
  HudSoundButton,
  HudThemeButton,
  HudProfileAvatar,
  HudRecenterButton,
  HudTopDynamicEvent,
} from "./headerHud/index.js";

export const MapHeaderHud = memo(function MapHeaderHud({
  isMapDark,
  setIsMapDark,
  actionMenuOpen,
  setActionMenuOpen,
  menuOpen,
  setMenuOpen,
  setShowQuitModal,
  setShowStatusModal,
  setShowEventModal,
  isStatusBusy,
  currentUser,
  avatarUrl,
  presence,
  handlePresenceChange,
  recenterMap,
  isRecentering,
  onOpenOwnProfile,
  topDynamicEvent = null,
  hasTopDynamicEventNotif = false,
  onTopDynamicEventClick,
  hasActiveOwnEvent = false,
  onGoToOwnEvent,
}) {
  const [soundMuted, setSoundMuted] = useState(false);
  const isSelfOffline = presence !== "online";

  useEffect(() => {
    if (isSelfOffline && actionMenuOpen) {
      setActionMenuOpen(false);
    }
  }, [isSelfOffline, actionMenuOpen, setActionMenuOpen]);

  useEffect(() => {
    setSoundMuted(isSoundMuted());
    const handleMuteChange = (e) => {
      setSoundMuted(Boolean(e.detail?.muted));
    };
    window.addEventListener("kalceria:sound-mute-changed", handleMuteChange);
    return () => window.removeEventListener("kalceria:sound-mute-changed", handleMuteChange);
  }, []);

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      className="absolute z-[1000] top-4 left-4 right-4 flex justify-between items-center pointer-events-none max-[860px]:top-3 max-[860px]:left-3 max-[860px]:right-3 select-none"
    >
      {/* 2D Back Arrow Button (Picture 2 style) - Outer Box Stripped */}
      <button
        onClick={() => setShowQuitModal(true)}
        aria-label="Back to home"
        className="pointer-events-auto p-1.5 transition-transform hover:-translate-x-1 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 group cursor-pointer"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-105"
        >
          <path
            d="M 3 12 L 9.4 5.6 L 14.8 5.6 L 10.3 10.1 L 21 10.1 L 21 13.9 L 10.3 13.9 L 14.8 18.4 L 9.4 18.4 Z"
            fill={isMapDark ? "#ffffff" : "#000000"}
            stroke={isMapDark ? "#000000" : "#ffffff"}
            strokeWidth="1.2"
            strokeLinejoin="miter"
            style={{
              paintOrder: "stroke fill",
              filter: isMapDark
                ? "drop-shadow(0 1px 3px rgba(255,255,255,0.4))"
                : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
            }}
          />
        </svg>
      </button>

      {/* Top-Right One-Line Controls: Dynamic Event Icon (if active), Recenter, Eye, Create Mini Event (+), Moon/Sun, Sound, Profile Photo */}
      <div className="relative flex items-center gap-2.5 sm:gap-3.5 md:gap-4 pointer-events-auto">
        {/* 0. Dynamic Event Icon (Appears next to Recenter Pin when user creates or registers/collaborates in a mini event) */}
        <HudTopDynamicEvent
          topDynamicEvent={topDynamicEvent}
          hasTopDynamicEventNotif={hasTopDynamicEventNotif}
          onTopDynamicEventClick={onTopDynamicEventClick}
          setActionMenuOpen={setActionMenuOpen}
          setMenuOpen={setMenuOpen}
          isMapDark={isMapDark}
        />

        {/* 1. Recenter Button (Map Pin Picture 4 style) - 2D, No Outer Box */}
        <HudRecenterButton
          isMapDark={isMapDark}
          recenterMap={recenterMap}
          isRecentering={isRecentering}
        />

        {/* 2. Eye Icon (Online / Offline Toggle) - 2D Flat, No Outer Box */}
        <HudEyeButton
          isMapDark={isMapDark}
          presence={presence}
          isStatusBusy={isStatusBusy}
          handlePresenceChange={handlePresenceChange}
        />

        {/* 3. Create Mini Event (+) Button - Bolded & Determined 2D Plus (Dimmed & Disabled when Offline) */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            disabled={isSelfOffline}
            aria-label={isSelfOffline ? "Offline - Quick Actions Disabled" : "Quick Actions Menu"}
            title={isSelfOffline ? "Offline (Stealth Mode)" : "Quick Actions"}
            aria-expanded={!isSelfOffline && actionMenuOpen}
            aria-haspopup="true"
            className={`p-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              isSelfOffline
                ? "opacity-35 grayscale cursor-not-allowed"
                : "hover:scale-110 active:scale-95 cursor-pointer group"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (isSelfOffline) return;
              setActionMenuOpen((prev) => !prev);
              setMenuOpen(false);
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${
                !isSelfOffline && actionMenuOpen
                  ? "rotate-45 scale-110"
                  : !isSelfOffline
                  ? "group-hover:rotate-90 group-hover:scale-110"
                  : ""
              }`}
            >
              <path
                d="M 10 3.5 h 4 v 6.5 h 6.5 v 4 h -6.5 v 6.5 h -4 v -6.5 h -6.5 v -4 h 6.5 z"
                fill={isMapDark ? "#ffffff" : "#000000"}
                stroke={isMapDark ? "#000000" : "#ffffff"}
                strokeWidth="1.4"
                strokeLinejoin="round"
                style={{
                  paintOrder: "stroke fill",
                  filter: isMapDark
                    ? "drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
                    : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
            </svg>
          </button>

          {/* Quick Actions Dropdown Menu */}
          <HudQuickActionsMenu
            isMapDark={isMapDark}
            actionMenuOpen={actionMenuOpen}
            setActionMenuOpen={setActionMenuOpen}
            isSelfOffline={isSelfOffline}
            hasActiveOwnEvent={hasActiveOwnEvent}
            onGoToOwnEvent={onGoToOwnEvent}
            onTopDynamicEventClick={onTopDynamicEventClick}
            setShowStatusModal={setShowStatusModal}
            setShowEventModal={setShowEventModal}
          />
        </div>

        {/* 4. Moon / Sun Theme Toggle - 2D, No Outer Box */}
        <HudThemeButton
          isMapDark={isMapDark}
          setIsMapDark={setIsMapDark}
        />

        {/* 5. Sound Notification Toggle - 2D Matching Theme Style with Red Cross when muted */}
        <HudSoundButton
          isMapDark={isMapDark}
          soundMuted={soundMuted}
          setSoundMuted={setSoundMuted}
        />

        {/* 6. Photo Profile - Strip Outer Box, Pure Circle Avatar with Online Dot (Tap to open own profile) */}
        <HudProfileAvatar
          isMapDark={isMapDark}
          currentUser={currentUser}
          avatarUrl={avatarUrl}
          presence={presence}
          isStatusBusy={isStatusBusy}
          onOpenOwnProfile={onOpenOwnProfile}
        />
      </div>
    </motion.header>
  );
});
