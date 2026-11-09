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
 * Scaled down 25% (10-11px strict SVG size, no flip rotation)
 */
function ToolPerkakasIcon({ isMapDark, className = "w-2.5 h-2.5 sm:w-3 sm:h-3" }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
    >
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill={fg}
        stroke={border}
        strokeWidth="1.4"
        strokeLinejoin="round"
        style={{ paintOrder: "stroke fill" }}
      />
    </svg>
  );
}

/**
 * HudFunctionalOuterbox
 * 
 * Houses top functional icons (Event, Recenter, Eye, Plus, Theme, Sound).
 * Every icon slot sits in a dark-gray 2D beveled sunken crater.
 * When broadcast is published, exactly 1 small square box appears on the far left
 * without any excess rectangle, and the tool tab hangs directly beneath it.
 * The tool icon is scaled down 25% with natural upright orientation (no flipped animation).
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
  isToolbarRetracting = false,
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

  // Base outerbox styling (matching "Find other Kalcerians" solid black #0f1014)
  const boxBg = isMapDark ? "bg-[#0f1014]" : "bg-[#ffffff]";
  const boxBorder = isMapDark ? "border-[#2a2d37]" : "border-black/30";
  const boxShadow = isMapDark
    ? "shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.12),inset_-1px_-1.5px_2px_rgba(0,0,0,0.8),0_14px_36px_rgba(0,0,0,0.85)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.12)]";

  // 2D beveled sunken crater slot styling (clean tactical recess matching panel slot cards #161b22)
  const craterSlotClass = isMapDark
    ? "relative flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-[#161b22] border border-white/15 shadow-[inset_1px_1.5px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_1.5px_rgba(255,255,255,0.1)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
    : "relative flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-[#f1f3f5] border border-black/15 shadow-[inset_1px_1.5px_2.5px_rgba(0,0,0,0.18),inset_-1px_-1px_1.5px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group";

  // Pure Tool Tab collapse offset: With or without broadcast, ONLY the tool tab remains visible flush at top edge
  const collapseOffset = hasActiveOwnBroadcast ? -86 : -42;
  const effectiveCollapsed = Boolean(isCollapsed || isToolbarRetracting);

  return (
    <motion.div
      animate={{
        y: effectiveCollapsed ? collapseOffset : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
        mass: 0.8,
      }}
      className="relative flex flex-col items-start pointer-events-auto select-none"
    >
      {/* Row 1: Beveled Sunken Crater Slots - Docked flush to top screen edge */}
      {/* Dynamic Sizing: 6 slots when topDynamicEvent exists, naturally shorter 5 slots when no event */}
      <div
        className={`relative flex items-center gap-1 sm:gap-1.5 p-1 rounded-b-2xl ${boxBg} border-b-[1.5px] border-x-[1.5px] border-t-0 ${boxBorder} ${boxShadow} overflow-visible`}
      >
        {/* Crater Slot 1: Dynamic Event (if active) */}
        {topDynamicEvent && (
          <div className={craterSlotClass}>
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

        {/* Crater Slot 2: Recenter Button */}
        <div className={craterSlotClass}>
          <HudRecenterButton
            isMapDark={isMapDark}
            recenterMap={recenterMap}
            isRecentering={isRecentering}
          />
        </div>

        {/* Crater Slot 3: Eye Button */}
        <div className={craterSlotClass}>
          <HudEyeButton
            isMapDark={isMapDark}
            presence={presence}
            isStatusBusy={isStatusBusy}
            handlePresenceChange={handlePresenceChange}
          />
        </div>

        {/* Crater Slot 4: Plus (+) Button with Quick Actions Menu */}
        <div className={craterSlotClass}>
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
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-300 ${
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
                strokeWidth="1.2"
                strokeLinejoin="round"
                style={{
                  paintOrder: "stroke fill",
                  filter: isMapDark ? "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" : "none",
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

        {/* Crater Slot 5: Theme Button */}
        <div className={craterSlotClass}>
          <HudThemeButton
            isMapDark={isMapDark}
            setIsMapDark={setIsMapDark}
          />
        </div>

        {/* Crater Slot 6: Sound Button */}
        <div className={craterSlotClass}>
          <HudSoundButton
            isMapDark={isMapDark}
            soundMuted={soundMuted}
            setSoundMuted={setSoundMuted}
          />
        </div>
      </div>

      {/* Row 2 (When Broadcast is Active): Unified Group Shell (Broadcast Slot + Wrench Tab) */}
      {hasActiveOwnBroadcast && (
        <div
          className={`mt-1 flex flex-col items-center ${boxBg} rounded-2xl border-[1.5px] ${boxBorder} ${boxShadow} overflow-hidden self-start transition-all duration-200`}
        >
          {/* Top: Broadcast Crater Slot */}
          <div className="p-1">
            <div className={craterSlotClass}>
              <HudTopDynamicBroadcast
                hasActiveOwnBroadcast={hasActiveOwnBroadcast}
                onTopDynamicBroadcastClick={onTopDynamicBroadcastClick}
                setActionMenuOpen={setActionMenuOpen}
                setMenuOpen={setMenuOpen}
                isMapDark={isMapDark}
              />
            </div>
          </div>

          {/* Bottom: Tool Tab Protrusion - exact same width (w-full), ZERO dividing line */}
          <button
            type="button"
            onClick={toggleCollapse}
            title={effectiveCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
            aria-label={effectiveCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
            className={`flex items-center justify-center w-full h-4 sm:h-4.5 ${boxBg} hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none group pb-0.5 border-none`}
          >
            <ToolPerkakasIcon
              isMapDark={isMapDark}
              className="transition-transform group-hover:scale-110"
            />
          </button>
        </div>
      )}

      {/* Tool Perkakas Tab: Attached to bottom when NO broadcast is active */}
      {!hasActiveOwnBroadcast && (
        <div className="relative self-center -mt-[1.5px]">
          <button
            type="button"
            onClick={toggleCollapse}
            title={effectiveCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
            aria-label={effectiveCollapsed ? "Expand Toolbar" : "Collapse Toolbar"}
            className={`relative flex items-center justify-center w-8 h-4 sm:w-8.5 sm:h-4.5 rounded-b-full ${boxBg} border-b-[1.5px] border-x-[1.5px] border-t-0 ${boxBorder} ${
              isMapDark
                ? "shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_2px_6px_rgba(0,0,0,0.6)]"
                : "shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),0_2px_6px_rgba(0,0,0,0.1)]"
            } cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none group pt-0.5`}
          >
            {/* Seamless bridge mask: precisely eliminates the gray dividing line of the top box border */}
            <span
              className={`absolute -top-[1.5px] left-0 right-0 h-[2.5px] ${boxBg} pointer-events-none z-30`}
            />
            <ToolPerkakasIcon
              isMapDark={isMapDark}
              className="relative z-40 transition-transform group-hover:scale-110"
            />
          </button>
        </div>
      )}
    </motion.div>
  );
});
