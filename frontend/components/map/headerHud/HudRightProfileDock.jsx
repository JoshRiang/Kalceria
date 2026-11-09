"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { HudProfileAvatar } from "./HudProfileAvatar";
import { HudTextureDivider } from "./HudTextureDivider";

/**
 * Generic Profile Icon (Silhouette)
 * Light Mode: fill #000000, border #ffffff
 * Dark Mode: fill #ffffff, border #000000
 */
function GenericProfileIcon({ isMapDark, className = "w-4 h-4 sm:w-4.5 sm:h-4.5" }) {
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
 * Docked on the right screen edge (Picture 5 style).
 * Wraps the User Photo Profile in the upper compartment and a Generic Profile Icon
 * in the lower compartment, separated by the cyber crosshatch texture divider.
 */
export const HudRightProfileDock = memo(function HudRightProfileDock({
  isMapDark,
  currentUser,
  avatarUrl,
  presence,
  isStatusBusy,
  onOpenOwnProfile,
}) {
  const boxBg = isMapDark ? "bg-[#0a0e27]" : "bg-[#ffffff]";
  const boxBorder = isMapDark ? "border-[#2a2d42]" : "border-black/20";
  const boxShadow = isMapDark
    ? "shadow-[0_6px_20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)]"
    : "shadow-[0_4px_16px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)]";

  return (
    <motion.aside
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
      aria-label="User Profile Quick Dock"
      className="fixed right-3 sm:right-4 top-20 sm:top-24 z-[1000] pointer-events-auto select-none"
    >
      <div
        className={`flex flex-col items-center rounded-xl ${boxBg} border ${boxBorder} ${boxShadow} overflow-hidden p-1`}
      >
        {/* Upper Compartment: Circular Photo Profile Avatar with Online Dot */}
        <div className="relative group/slot flex items-center justify-center p-1">
          <HudProfileAvatar
            isMapDark={isMapDark}
            currentUser={currentUser}
            avatarUrl={avatarUrl}
            presence={presence}
            isStatusBusy={isStatusBusy}
            onOpenOwnProfile={onOpenOwnProfile}
          />
        </div>

        {/* Textured Divider */}
        <HudTextureDivider isMapDark={isMapDark} vertical={false} className="my-0.5" />

        {/* Lower Compartment: Generic Profile Icon */}
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
            onClick={() => onOpenOwnProfile?.()}
            title="Open Profile Panel"
            aria-label="Open Profile Panel"
            className="relative z-10 p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none cursor-pointer flex items-center justify-center"
          >
            <GenericProfileIcon isMapDark={isMapDark} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
});

