"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HudTextureDivider } from "./HudTextureDivider";
import { HudRecenterButton } from "./HudRecenterButton";
import { HudEyeButton } from "./HudEyeButton";
import { HudThemeButton } from "./HudThemeButton";
import { HudSoundButton } from "./HudSoundButton";
import { HudTopDynamicEvent } from "./HudTopDynamicEvent";
import { HudTopDynamicBroadcast } from "./HudTopDynamicBroadcast";
import { HudQuickActionsMenu } from "./HudQuickActionsMenu";

/**
 * Tool Perkakas Icon (Spanner/Wrench)
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
 * inside a crisp outerbox with cyber crosshatch texture dividers, inner expanding square
 * press animations, a protruding semi-circle Tool tab for collapse/expand drawer behavior,
 * and seamless downstairs expansion when an active broadcast is published.
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
        // Genie out / close open action menus and broadcast popovers
        setActionMenuOpen?.(false);
        setMenuOpen?.(false);
      }
      return next;
    });
  }, [setActionMenuOpen, setMenuOpen]);

  // Background and border styling for the outerbox container
  const boxBg = isMapDark ? "bg-[#0a0e27]" : "bg-[#ffffff]";
  const boxBorder = isMapDark ? "border-[#2a2d42]" : "border-black/20";
  const boxShadow = isMapDark
    ? "shadow-[0_6px_20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)]";

  return (
    <div className="relative flex flex-col items-end pointer-events-auto select-none">
      {/* Collapsible Outerbox Container */}
      <motion.div
        animate={{
          y: isCollapsed ? -68 : 0,
          opacity: isCollapsed ? 0 : 1,
          scale: isCollapsed ? 0.94 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 30,
          mass: 0.8,
        }}
        style={{
          pointerEvents: isCollapsed ? "none" : "auto",
        }}
        className={`relative flex flex-col rounded-lg ${boxBg} border ${boxBorder} ${boxShadow} overflow-visible`}
      >
        {/* Main Functional Icons Row */}
        <div className="relative flex items-center h-10 sm:h-11 px-1">
          {/* Slot 0: Dynamic Event (if active) */}
          {topDynamicEvent && (
            <>
              <div className="relative group/slot flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
                <span
                  aria-hidden="true"
                  className="absolute inset-0.5 rounded-sm transition-transform duration-200 pointer-events-none scale-0 opacity-0 group-hover/slot:scale-95 group-hover/slot:opacity-100 group-active/slot:scale-110 group-active/slot:opacity-100"
                  style={{
                    backgroundColor: isMapDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                    border: isMapDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.15)",
                  }}
                />
                <HudTopDynamicEvent
                  topDynamicEvent={topDynamicEvent}
                  hasTopDynamicEventNotif={hasTopDynamicEventNotif}
                  onTopDynamicEventClick={onTopDynamicEventClick}
                  setActionMenuOpen={setActionMenuOpen}
                  setMenuOpen={setMenuOpen}
                  isMapDark={isMapDark}
                />
              </div>
              <HudTextureDivider isMapDark={isMapDark} vertical={true} />
            </>
          )}

          {/* Slot 1: Recenter Button */}
          <div className="relative group/slot flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
            <span
              aria-hidden="true"
              className="absolute inset-0.5 rounded-sm transition-transform duration-200 pointer-events-none scale-0 opacity-0 group-hover/slot:scale-95 group-hover/slot:opacity-100 group-active/slot:scale-110 group-active/slot:opacity-100"
              style={{
                backgroundColor: isMapDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                border: isMapDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.15)",
              }}
            />
            <HudRecenterButton
              isMapDark={isMapDark}
              recenterMap={recenterMap}
              isRecentering={isRecentering}
            />
          </div>

          <HudTextureDivider isMapDark={isMapDark} vertical={true} />

          {/* Slot 2: Eye Button */}
          <div className="relative group/slot flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
            <span
              aria-hidden="true"
              className="absolute inset-0.5 rounded-sm transition-transform duration-200 pointer-events-none scale-0 opacity-0 group-hover/slot:scale-95 group-hover/slot:opacity-100 group-active/slot:scale-110 group-active/slot:opacity-100"
              style={{
                backgroundColor: isMapDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                border: isMapDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.15)",
              }}
            />
            <HudEyeButton
              isMapDark={isMapDark}
              presence={presence}
              isStatusBusy={isStatusBusy}
              handlePresenceChange={handlePresenceChange}
            />
          </div>

          <HudTextureDivider isMapDark={isMapDark} vertical={true} />

          {/* Slot 3: Plus (+) Button with Quick Actions Menu */}
          <div className="relative group/slot flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
            <span
              aria-hidden="true"
              className="absolute inset-0.5 rounded-sm transition-transform duration-200 pointer-events-none scale-0 opacity-0 group-hover/slot:scale-95 group-hover/slot:opacity-100 group-active/slot:scale-110 group-active/slot:opacity-100"
              style={{
                backgroundColor: isMapDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                border: isMapDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.15)",
              }}
            />
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

          <HudTextureDivider isMapDark={isMapDark} vertical={true} />

          {/* Slot 4: Theme Button */}
          <div className="relative group/slot flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
            <span
              aria-hidden="true"
              className="absolute inset-0.5 rounded-sm transition-transform duration-200 pointer-events-none scale-0 opacity-0 group-hover/slot:scale-95 group-hover/slot:opacity-100 group-active/slot:scale-110 group-active/slot:opacity-100"
              style={{
                backgroundColor: isMapDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                border: isMapDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.15)",
              }}
            />
            <HudThemeButton
              isMapDark={isMapDark}
              setIsMapDark={setIsMapDark}
            />
          </div>

          <HudTextureDivider isMapDark={isMapDark} vertical={true} />

          {/* Slot 5: Sound Button */}
          <div className="relative group/slot flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
            <span
              aria-hidden="true"
              className="absolute inset-0.5 rounded-sm transition-transform duration-200 pointer-events-none scale-0 opacity-0 group-hover/slot:scale-95 group-hover/slot:opacity-100 group-active/slot:scale-110 group-active/slot:opacity-100"
              style={{
                backgroundColor: isMapDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                border: isMapDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.15)",
              }}
            />
            <HudSoundButton
              isMapDark={isMapDark}
              soundMuted={soundMuted}
              setSoundMuted={setSoundMuted}
            />
          </div>
        </div>

        {/* Lower Compartment: Active Broadcast Box (Picture 2 bottom sketch & Picture 3) */}
        {hasActiveOwnBroadcast && (
          <div className="relative flex flex-col w-full">
            <HudTextureDivider isMapDark={isMapDark} vertical={false} />
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
      </motion.div>

      {/* Protruding Semi-Circle Tab Housing the Tool Perkakas Icon */}
      <div
        className={`relative z-20 flex justify-center ${
          hasActiveOwnBroadcast ? "w-full" : "w-full"
        }`}
      >
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? "Expand Tools" : "Collapse Tools"}
          aria-label={isCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
          className={`flex items-center justify-center h-5 sm:h-5.5 px-3 -mt-[1px] ${
            hasActiveOwnBroadcast ? "w-28 sm:w-36 rounded-b-lg" : "w-11 sm:w-12 rounded-b-full"
          } ${boxBg} border-b border-x ${boxBorder} ${boxShadow} cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none group`}
        >
          <ToolPerkakasIcon
            isMapDark={isMapDark}
            className={`transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : "group-hover:rotate-45"
            }`}
          />
        </button>
      </div>
    </div>
  );
});

