"use client";

import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { isSoundMuted } from "@/lib/soundEngine";
import {
  HudFunctionalOuterbox,
  HudRightProfileDock,
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
  hasActiveOwnBroadcast = false,
  onTopDynamicBroadcastClick,
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
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="absolute z-[1000] top-2 sm:top-2.5 left-2 sm:left-3 right-0 flex justify-between items-start pointer-events-none select-none"
      >
        {/* 2D Back Arrow Button on Left - Tight to screen corner */}
        <button
          onClick={() => setShowQuitModal(true)}
          aria-label="Back to home"
          className="pointer-events-auto p-1 sm:p-1.5 transition-transform hover:-translate-x-0.5 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 group cursor-pointer"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            className="w-6.5 h-6.5 sm:w-7 sm:h-7 transition-transform group-hover:scale-105"
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

        {/* Top-Right Controls: Shifted slightly to left so its right edge stops right at the left tip of Profile Sidebar */}
        <div className="relative pointer-events-auto mr-[70px] sm:mr-[74px]">
          <HudFunctionalOuterbox
            isMapDark={isMapDark}
            setIsMapDark={setIsMapDark}
            actionMenuOpen={actionMenuOpen}
            setActionMenuOpen={setActionMenuOpen}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            setShowStatusModal={setShowStatusModal}
            setShowEventModal={setShowEventModal}
            isStatusBusy={isStatusBusy}
            presence={presence}
            handlePresenceChange={handlePresenceChange}
            recenterMap={recenterMap}
            isRecentering={isRecentering}
            topDynamicEvent={topDynamicEvent}
            hasTopDynamicEventNotif={hasTopDynamicEventNotif}
            onTopDynamicEventClick={onTopDynamicEventClick}
            hasActiveOwnEvent={hasActiveOwnEvent}
            onGoToOwnEvent={onGoToOwnEvent}
            hasActiveOwnBroadcast={hasActiveOwnBroadcast}
            onTopDynamicBroadcastClick={onTopDynamicBroadcastClick}
            soundMuted={soundMuted}
            setSoundMuted={setSoundMuted}
            isSelfOffline={isSelfOffline}
          />
        </div>
      </motion.header>

      {/* Right-Side Screen Profile Dock: Tight to top-2 sm:top-2.5 and right-0 */}
      <HudRightProfileDock
        isMapDark={isMapDark}
        currentUser={currentUser}
        avatarUrl={avatarUrl}
        presence={presence}
        isStatusBusy={isStatusBusy}
        onOpenOwnProfile={onOpenOwnProfile}
      />
    </>
  );
});
