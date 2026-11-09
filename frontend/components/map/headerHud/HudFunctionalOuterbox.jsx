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
 * Scaled down 15% to 12-14px uniform size
 */
function ToolPerkakasIcon({ isMapDark, className = "w-3 h-3 sm:w-3.5 sm:h-3.5" }) {
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
 * inside a tight outerbox. Each icon slot is an inner beveled structured leveled plate
 * (Picture 3 glassmorphic embossed styling), with a protruding 15% scaled-down semi-circle tab
 * containing the Tool Perkakas Icon that toggles rolling up/down.
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

  // Base outerbox styling
  const boxBg = isMapDark ? "bg-[#000000]/95" : "bg-[#ffffff]/95";
  const boxBorder = isMapDark ? "border-white/25" : "border-black/20";
  const boxShadow = isMapDark
    ? "shadow-[0_4px_20px_rgba(0,0,0,0.85)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.12)]";

  // Beveled structured leveled inner tile styling (matching Picture 3)
  const beveledTileClass = isMapDark
    ? "relative flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-transparent border border-white/20 shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.3),inset_-1px_-1px_1.5px_rgba(0,0,0,0.7),0_2px_4px_rgba(0,0,0,0.45)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
    : "relative flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-gradient-to-br from-white/95 via-[#f8fafc] to-[#e2e8f0]/85 border border-black/15 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.95),inset_-1px_-1px_2px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.06)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group";

  const collapseOffset = hasActiveOwnBroadcast ? -104 : -46;

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
      {/* Main Solid Outerbox Container */}
      <div
        className={`relative flex flex-col rounded-xl ${boxBg} backdrop-blur-md border-[1.5px] ${boxBorder} ${boxShadow} p-1 overflow-visible`}
      >
        {/* Row of Beveled Structured Leveled Icon Tiles */}
        <div className="relative flex items-center gap-1 sm:gap-1.5">
          {/* Beveled Tile 1: Dynamic Event (if active) */}
          {topDynamicEvent && (
            <div className={beveledTileClass}>
              <HudTopDynamicEvent
                topDynamicEvent={topDynamicEvent}
                hasTopDynamicEventNotif={hasTopDynamicEventNotif}
                onTopDynamicEventClick={onTopDynamicEventClick}
                setActionMenuOpen={setActionMenuOpen}
                setMenuOpen={setMenuOpen}
                isMapDark={isMapDark}
              />
            </div>
          )}

          {/* Beveled Tile 2: Recenter Button */}
          <div className={beveledTileClass}>
            <HudRecenterButton
              isMapDark={isMapDark}
              recenterMap={recenterMap}
              isRecentering={isRecentering}
            />
          </div>

          {/* Beveled Tile 3: Eye Button */}
          <div className={beveledTileClass}>
            <HudEyeButton
              isMapDark={isMapDark}
              presence={presence}
              isStatusBusy={isStatusBusy}
              handlePresenceChange={handlePresenceChange}
            />
          </div>

          {/* Beveled Tile 4: Plus (+) Button with Quick Actions Menu */}
          <div className={beveledTileClass}>
            <button
              type="button"
              disabled={isSelfOffline}
              aria-label={isSelfOffline ? "Offline - Quick Actions Disabled" : "Quick Actions Menu"}
              title={isSelfOffline ? "Offline (Stealth Mode)" : "Quick Actions"}
              aria-expanded={!isSelfOffline && actionMenuOpen}
              aria-haspopup="true"
              className={`p-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
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
                width="22"
                height="22"
                viewBox="0 0 24 24"
                className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-300 ${
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

          {/* Beveled Tile 5: Theme Button */}
          <div className={beveledTileClass}>
            <HudThemeButton
              isMapDark={isMapDark}
              setIsMapDark={setIsMapDark}
            />
          </div>

          {/* Beveled Tile 6: Sound Button */}
          <div className={beveledTileClass}>
            <HudSoundButton
              isMapDark={isMapDark}
              soundMuted={soundMuted}
              setSoundMuted={setSoundMuted}
            />
          </div>
        </div>

        {/* Beveled Tile +1: Active Broadcast Box (if published) */}
        {hasActiveOwnBroadcast && (
          <div className="relative flex flex-col w-full mt-1.5 pt-1.5 border-t border-black/10 dark:border-white/15">
            <div
              className={`relative flex items-center justify-center py-1 px-2 rounded-lg ${
                isMapDark
                  ? "bg-gradient-to-br from-white/[0.08] to-transparent border border-white/20 shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.25),0_2px_4px_rgba(0,0,0,0.4)]"
                  : "bg-gradient-to-br from-white/95 to-[#f1f5f9] border border-black/15 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.95),0_2px_4px_rgba(0,0,0,0.05)]"
              }`}
            >
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

      {/* Protruding Beveled Semi-Circle Tab Housing the 15% Scaled-Down Tool Perkakas Icon */}
      <div className="relative z-20 flex justify-center w-full">
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
          aria-label={isCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
          className={`flex items-center justify-center h-4 sm:h-4.5 px-2.5 -mt-[1px] ${
            hasActiveOwnBroadcast ? "w-24 sm:w-28 rounded-b-lg" : "w-9 sm:w-10 rounded-b-full"
          } ${boxBg} border-b-[1.5px] border-x-[1.5px] ${boxBorder} ${
            isMapDark
              ? "shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_3px_8px_rgba(0,0,0,0.6)]"
              : "shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_3px_8px_rgba(0,0,0,0.1)]"
          } cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none group`}
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
