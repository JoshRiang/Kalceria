"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { HudProfileAvatar } from "./HudProfileAvatar";

/**
 * Generic Profile Icon (Silhouette)
 * Light Mode: fill #000000, border #ffffff
 * Dark Mode: fill #ffffff, border #000000
 */
function GenericProfileIcon({ isMapDark, className = "w-3.5 h-3.5 sm:w-4 sm:h-4" }) {
  const fg = isMapDark ? "#ffffff" : "#000000";
  const border = isMapDark ? "#000000" : "#ffffff";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21.6h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
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
 * HudRightProfileDock
 * 
 * Docked on the right screen edge.
 * Features a protruding semi-circle tab on the left with the Generic Profile Icon
 * that toggles the sidebar drawer closed/open (slides into right edge with the tab remaining visible).
 * Houses the circular photo profile in a recessed well ("hole in a stack") that opens the full profile card.
 */
export const HudRightProfileDock = memo(function HudRightProfileDock({
  isMapDark,
  currentUser,
  avatarUrl,
  presence,
  isStatusBusy,
  onOpenOwnProfile,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const boxBg = isMapDark ? "bg-[#000000]" : "bg-[#ffffff]";
  const boxBorder = isMapDark ? "border-white" : "border-black";
  const shadow = isMapDark
    ? "shadow-[0_4px_20px_rgba(0,0,0,0.85)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.14)]";

  return (
    <motion.aside
      initial={{ x: 60, opacity: 0 }}
      animate={{
        // When collapsed, slides into the right edge by the width of the avatar box (~62px),
        // leaving the protruding semi-circle tab visible at the right edge
        x: isCollapsed ? 60 : 0,
        opacity: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
        mass: 0.8,
      }}
      aria-label="User Profile Quick Dock"
      className="fixed right-0 top-20 sm:top-24 z-[1000] pointer-events-auto select-none flex items-center"
    >
      {/* Protruding Semi-Circle Tab (Jendolan) on the LEFT: Toggles Sidebar Drawer */}
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        title={isCollapsed ? "Expand Profile Sidebar" : "Collapse Profile Sidebar"}
        aria-label={isCollapsed ? "Expand Profile Sidebar" : "Collapse Profile Sidebar"}
        className={`flex items-center justify-center w-6 sm:w-7 h-11 sm:h-12 rounded-l-full ${boxBg} border-y-[1.5px] border-l-[1.5px] ${boxBorder} ${shadow} cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none group z-20 -mr-[1.5px]`}
      >
        <GenericProfileIcon
          isMapDark={isMapDark}
          className={`transition-transform duration-300 ${
            isCollapsed ? "rotate-180" : "group-hover:scale-110"
          }`}
        />
      </button>

      {/* Main Profile Card: Houses Photo Avatar in a Recessed Well (Hole in a Stack) */}
      <div
        className={`relative flex items-center justify-center rounded-l-xl ${boxBg} border-y-[1.5px] border-l-[1.5px] ${boxBorder} ${shadow} p-2 z-10`}
      >
        {/* Recessed well / hole in a stack for the circular avatar */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full p-[2px] bg-black/[0.06] dark:bg-white/[0.08] border-[1.5px] border-black/25 dark:border-white/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] flex items-center justify-center">
          <HudProfileAvatar
            isMapDark={isMapDark}
            currentUser={currentUser}
            avatarUrl={avatarUrl}
            presence={presence}
            isStatusBusy={isStatusBusy}
            onOpenOwnProfile={onOpenOwnProfile}
          />
        </div>
      </div>
    </motion.aside>
  );
});
