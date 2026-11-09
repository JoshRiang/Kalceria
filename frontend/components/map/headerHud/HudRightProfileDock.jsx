"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { HudProfileAvatar } from "./HudProfileAvatar";

/**
 * Generic Profile Icon (Silhouette)
 * Light Mode: fill #000000, border #ffffff
 * Dark Mode: fill #ffffff, border #000000
 * Scaled down 25% (10-11px strict SVG size matching Tool Perkakas Icon, no flip animation)
 */
function GenericProfileIcon({ isMapDark, className = "w-2.5 h-2.5 sm:w-3 sm:h-3" }) {
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
        d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21.6h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
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
 * HudRightProfileDock
 * 
 * Docked at screen right edge, pulled down 25% (top-16 sm:top-20) for zero collision with top toolbar.
 * Features a dark-gray 2D beveled sunken crater circle housing the circular photo avatar,
 * and a 25% scaled-down protruding semi-circle tab on the left with the Generic Profile Icon
 * that toggles the sidebar drawer closed/open (no inverted rotation).
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

  const boxBg = isMapDark ? "bg-[#0a0e27]" : "bg-[#ffffff]";
  const boxBorder = isMapDark ? "border-white/30" : "border-black/30";
  const shadow = isMapDark
    ? "shadow-[0_4px_20px_rgba(0,0,0,0.85)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.12)]";

  return (
    <motion.aside
      initial={{ x: 50, opacity: 0 }}
      animate={{
        // When collapsed, slides into the right edge by the width of the avatar box (~48px),
        // leaving the protruding semi-circle tab neatly accessible at the right edge
        x: isCollapsed ? 48 : 0,
        opacity: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
        mass: 0.8,
      }}
      aria-label="User Profile Quick Dock"
      className="fixed right-0 top-16 sm:top-20 z-[1000] pointer-events-auto select-none flex items-center"
    >
      {/* Protruding Semi-Circle Tab (Jendolan) on the LEFT: 25% Scaled-Down Toggle Drawer */}
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        title={isCollapsed ? "Expand Profile Sidebar" : "Collapse Profile Sidebar"}
        aria-label={isCollapsed ? "Expand Profile Sidebar" : "Collapse Profile Sidebar"}
        className={`flex items-center justify-center w-4.5 sm:w-5 h-7 sm:h-8 rounded-l-full ${boxBg} border-y-[1.5px] border-l-[1.5px] ${boxBorder} ${
          isMapDark
            ? "shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.2),-3px_2px_8px_rgba(0,0,0,0.6)]"
            : "shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.95),-3px_2px_8px_rgba(0,0,0,0.1)]"
        } cursor-pointer transition-transform hover:scale-105 active:scale-95 outline-none group z-20 -mr-[1px]`}
      >
        <GenericProfileIcon
          isMapDark={isMapDark}
          className="transition-transform group-hover:scale-110"
        />
      </button>

      {/* Main Profile Card: Houses 1 Beveled Sunken Crater Circle matching the toolbar slots */}
      <div
        className={`relative flex items-center justify-center rounded-l-xl ${boxBg} border-y-[1.5px] border-l-[1.5px] ${boxBorder} ${shadow} p-1.5 z-10`}
      >
        {/* Dark-gray 2D beveled sunken crater circle plate matching toolbar slots */}
        <div
          className={`relative w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full p-[2px] ${
            isMapDark
              ? "bg-[#141724] border border-white/15 shadow-[inset_1.5px_2px_4px_rgba(0,0,0,0.85),inset_-1px_-1px_1.5px_rgba(255,255,255,0.15)]"
              : "bg-[#2d313c] border border-black/35 shadow-[inset_1.5px_2px_4px_rgba(0,0,0,0.65),inset_-1px_-1px_1.5px_rgba(255,255,255,0.2)]"
          } flex items-center justify-center transition-transform hover:scale-105`}
        >
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
