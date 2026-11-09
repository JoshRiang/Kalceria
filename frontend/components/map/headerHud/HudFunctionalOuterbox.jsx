"use client";

import { memo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { HudRecenterButton } from "./HudRecenterButton";
import { HudEyeButton } from "./HudEyeButton";
import { HudThemeButton } from "./HudThemeButton";
import { HudSoundButton } from "./HudSoundButton";
import { HudTopDynamicEvent } from "./HudTopDynamicEvent";
import { HudTopDynamicBroadcast } from "./HudTopDynamicBroadcast";
import { HudQuickActionsMenu } from "./HudQuickActionsMenu";

/**
 * Tool Perkakas Icon (Spanner / Wrench)
 * Light Mode: fill #000000, border #ffffff
 * Dark Mode: fill #ffffff, border #000000
 */
function ToolPerkakasIcon({ isMapDark, className = "w-3.5 h-3.5 sm:w-4 sm:h-4" }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill={fg}
        stroke={border}
        strokeWidth="1.2"
        strokeLinejoin="round"
        style={{ paintOrder: "stroke fill" }}
      />
    </svg>
  );
}

/**
 * HudFunctionalOuterbox
 * 
 * Houses top functional icons (Event, Recenter, Eye, Plus, Theme, Sound)
 * inside a solid outerbox (white in light mode, deep black in dark mode)
 * with clean 1px seam dividers, decoupled tactile popping buttons on hover/press,
 * and a protruding semi-circle tab with the Tool Perkakas Icon that toggles rolling up/down.
 */
export const HudFunctionalOuterbox = memo(function HudFunctionalOuterbox({
  isMapDark,
  setIsMapDark,
  actionMenuOpen,
  setActionMenuOpen,
  menuOpen,
  setMenuOpen,
  setShowStatusModal,
  setShowEventModal,
  isStatusBusy,
  presence,
  handlePresenceChange,
  recenterMap,
  isRecentering,
  topDynamicEvent = null,
  hasTopDynamicEventNotif = false,
  onTopDynamicEventClick,
  hasActiveOwnEvent = false,
  onGoToOwnEvent,
  hasActiveOwnBroadcast = false,
  onTopDynamicBroadcastClick,
  soundMuted,
  setSoundMuted,
  isSelfOffline,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (next) {
        setActionMenuOpen?.(false);
        setMenuOpen?.(false);
      }
      return next;
    });
  }, [setActionMenuOpen, setMenuOpen]);

  const boxBg = isMapDark ? "bg-[#000000]" : "bg-[#ffffff]";
  const boxBorder = isMapDark ? "border-white" : "border-black";
  const seamColor = isMapDark ? "bg-white/20" : "bg-black/20";
  const shadow = isMapDark
    ? "shadow-[0_4px_20px_rgba(0,0,0,0.85)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.14)]";

  // When collapsed, the whole toolbar scrolls up out of screen while keeping the tool tab reachable
  const collapseOffset = hasActiveOwnBroadcast ? -108 : -52;

  return (
    <motion.div
      animate={{
        y: isCollapsed ? collapseOffset : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
        mass: 0.8,
      }}
      className="relative flex flex-col items-center pointer-events-auto select-none"
    >
      {/* Main Solid Outerbox */}
      <div
        className={`relative flex flex-col rounded-xl ${boxBg} border-[1.5px] ${boxBorder} ${shadow} overflow-visible`}
      >
        {/* Row of Functional Icons */}
        <div className="relative flex items-center h-10 sm:h-11 px-1.5 gap-1">
          {/* Slot 0: Dynamic Event (if active) */}
          {topDynamicEvent && (
            <>
              <div className="relative flex items-center justify-center group/btn rounded-lg p-0.5 transition-all duration-200 hover:scale-105 active:scale-110 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border hover:border-black/20 dark:hover:border-white/30 hover:shadow-sm">
                <HudTopDynamicEvent
                  topDynamicEvent={topDynamicEvent}
                  hasTopDynamicEventNotif={hasTopDynamicEventNotif}
                  onTopDynamicEventClick={onTopDynamicEventClick}
                  setActionMenuOpen={setActionMenuOpen}
                  setMenuOpen={setMenuOpen}
                  isMapDark={isMapDark}
                />
              </div>
              <span aria-hidden="true" className={`w-[1px] h-5 ${seamColor} self-center shrink-0`} />
            </>
          )}

          {/* Slot 1: Recenter Button */}
          <div className="relative flex items-center justify-center group/btn rounded-lg p-0.5 transition-all duration-200 hover:scale-105 active:scale-110 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border hover:border-black/20 dark:hover:border-white/30 hover:shadow-sm">
            <HudRecenterButton
              isMapDark={isMapDark}
              recenterMap={recenterMap}
              isRecentering={isRecentering}
            />
          </div>

          <span aria-hidden="true" className={`w-[1px] h-5 ${seamColor} self-center shrink-0`} />

          {/* Slot 2: Eye Button */}
          <div className="relative flex items-center justify-center group/btn rounded-lg p-0.5 transition-all duration-200 hover:scale-105 active:scale-110 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border hover:border-black/20 dark:hover:border-white/30 hover:shadow-sm">
            <HudEyeButton
              isMapDark={isMapDark}
              presence={presence}
              isStatusBusy={isStatusBusy}
              handlePresenceChange={handlePresenceChange}
            />
          </div>

          <span aria-hidden="true" className={`w-[1px] h-5 ${seamColor} self-center shrink-0`} />

          {/* Slot 3: Plus (+) Button with Quick Actions Menu */}
          <div className="relative flex items-center justify-center group/btn rounded-lg p-0.5 transition-all duration-200 hover:scale-105 active:scale-110 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border hover:border-black/20 dark:hover:border-white/30 hover:shadow-sm">
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
                  : "cursor-pointer group"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelfOffline) return;
                setActionMenuOpen((prev) => !prev);
                setMenuOpen(false);
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${
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

          <span aria-hidden="true" className={`w-[1px] h-5 ${seamColor} self-center shrink-0`} />

          {/* Slot 4: Theme Button */}
          <div className="relative flex items-center justify-center group/btn rounded-lg p-0.5 transition-all duration-200 hover:scale-105 active:scale-110 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border hover:border-black/20 dark:hover:border-white/30 hover:shadow-sm">
            <HudThemeButton
              isMapDark={isMapDark}
              setIsMapDark={setIsMapDark}
            />
          </div>

          <span aria-hidden="true" className={`w-[1px] h-5 ${seamColor} self-center shrink-0`} />

          {/* Slot 5: Sound Button */}
          <div className="relative flex items-center justify-center group/btn rounded-lg p-0.5 transition-all duration-200 hover:scale-105 active:scale-110 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border hover:border-black/20 dark:hover:border-white/30 hover:shadow-sm">
            <HudSoundButton
              isMapDark={isMapDark}
              soundMuted={soundMuted}
              setSoundMuted={setSoundMuted}
            />
          </div>
        </div>

        {/* Lower Compartment: Active Broadcast Box */}
        {hasActiveOwnBroadcast && (
          <div className="relative flex flex-col w-full">
            <span aria-hidden="true" className={`h-[1px] w-full ${seamColor}`} />
            <div className="relative flex items-center justify-center py-1 px-2">
              <HudTopDynamicBroadcast
                hasActiveOwnBroadcast={hasActiveOwnBroadcast}
                onTopDynamicBroadcastClick={onTopDynamicBroadcastClick}
                setActionMenuOpen={setActionMenuOpen}
                setMenuOpen={setMenuOpen}
                isMapDark={isMapDark}
              />
            </div>
          </div>
        )}
      </div>

      {/* Protruding Semi-Circle Tab Housing the Tool Perkakas Icon */}
      <div className="relative z-20 flex justify-center w-full">
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
          aria-label={isCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
          className={`flex items-center justify-center h-5 sm:h-5.5 px-3 -mt-[1.5px] ${
            hasActiveOwnBroadcast ? "w-28 sm:w-36 rounded-b-lg" : "w-11 sm:w-12 rounded-b-full"
          } ${boxBg} border-b-[1.5px] border-x-[1.5px] ${boxBorder} ${shadow} cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none group`}
        >
          <ToolPerkakasIcon
            isMapDark={isMapDark}
            className={`transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : "group-hover:rotate-45"
            }`}
          />
        </button>
      </div>
    </motion.div>
  );
});
