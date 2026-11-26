"use client";

import { motion } from "framer-motion";
import KalcerianProfileCard from "../KalcerianProfileCard";
import { useModalBackClose } from "../modals/modalMotion";

/**
 * Standalone floating panel for viewing another Kalcerian's Profile + Event Archive.
 * Stands completely on its own (zero inline overlap inside the Kalcerians list panel).
 */
export function PeerProfilePanel({
  user,
  isMapDark,
  isBlocked = false,
  isBlockedByTarget = false,
  onClose,
}) {
  useModalBackClose(Boolean(user), onClose);

  if (!user) return null;

  const rawUsername =
    user?.nickname || user?.username || user?.displayName || user?.name || "kalcerian";
  const cleanUsername = String(rawUsername).replace(/^@/, "");

  return (
    <motion.aside
      key={`peer-profile-panel-${user.id}`}
      initial={{ y: "110%", opacity: 1 }}
      animate={{ y: "0%", opacity: 1 }}
      exit={{ y: "110%", opacity: 0.95 }}
      transition={{ type: "spring", stiffness: 290, damping: 30, mass: 0.9 }}
      className={`fixed z-[1005] left-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col overflow-hidden font-sans select-none backdrop-blur-[28px] max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[76vh] max-[860px]:max-h-[84vh] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl shadow-2xl ${
        isMapDark
          ? "bg-[#161b22]/96 border border-[#30363d]/90 text-[#f0f6fc] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.12),0_14px_38px_rgba(0,0,0,0.85)]"
          : "bg-white/96 border border-[#c4cbd4] text-[#1f2328] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.95),0_14px_38px_rgba(0,0,0,0.16)]"
      }`}
    >
      {/* Mobile Grab Indicator */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close profile panel"
        className="min-[860px]:hidden w-full flex justify-center pt-2 pb-0.5 cursor-pointer outline-none shrink-0"
      >
        <span className={`w-10 h-1 rounded-full ${isMapDark ? "bg-white/25" : "bg-black/20"}`} />
      </button>

      {/* Dedicated Standalone Header */}
      <div
        className={`shrink-0 w-full pt-2 pb-2 flex justify-between items-center px-4 border-b ${
          isMapDark ? "border-[#30363d]/80" : "border-[#e5e7eb]"
        }`}
      >
        <h2
          className={`font-sans font-bold text-base sm:text-lg tracking-tight truncate pr-2 ${
            isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
          }`}
        >
          @{cleanUsername} Profile
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile panel"
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 ${
            isMapDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-black"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Scrollable Standalone Profile & Event Archive Body */}
      <div className="flex-1 min-h-0 overflow-y-auto modern-kalcerian-scrollbar p-0">
        <KalcerianProfileCard
          user={user}
          isMapDark={isMapDark}
          isBlocked={isBlocked}
          isBlockedByTarget={isBlockedByTarget}
          isOwnProfile={false}
          showMobileClose={false}
          onClose={onClose}
          inline={true}
        />
      </div>
    </motion.aside>
  );
}

