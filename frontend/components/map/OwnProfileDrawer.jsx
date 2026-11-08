"use client";

import { motion, AnimatePresence } from "framer-motion";
import KalcerianProfileCard from "./KalcerianProfileCard";
import { useModalBackClose } from "./modals/modalMotion";

export function OwnProfileDrawer({
  isOpen,
  onClose,
  currentUser,
  isMapDark,
  onEditProfile,
}) {
  useModalBackClose(Boolean(isOpen), onClose);

  const rawUsername = currentUser?.username || currentUser?.nickname || currentUser?.displayName || currentUser?.name || "user";
  const cleanUsername = String(rawUsername).replace(/^@/, "");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[990] bg-black/40 backdrop-blur-[2px] min-[860px]:hidden pointer-events-auto"
          />

          <motion.aside
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className={`absolute z-[1000] right-4 bottom-4 w-[340px] sm:w-[360px] h-[580px] max-h-[calc(100vh-120px)] rounded-2xl flex flex-col transition-colors duration-300 overflow-hidden font-sans select-none backdrop-blur-[28px] max-[860px]:left-0 max-[860px]:right-0 max-[860px]:bottom-0 max-[860px]:w-full max-[860px]:h-[76vh] max-[860px]:max-h-[82vh] max-[860px]:rounded-b-none max-[860px]:rounded-t-2xl shadow-2xl ${
              isMapDark
                ? "bg-[#161b22]/90 border border-[#30363d]/90 text-[#f0f6fc] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.15),0_14px_36px_rgba(0,0,0,0.8)]"
                : "bg-white/85 border border-[#c4cbd4] text-[#1f2328] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.95),0_12px_36px_rgba(0,0,0,0.14)]"
            }`}
          >
            {/* Mobile Grab / Pull Indicator */}
            <div className="min-[860px]:hidden w-full flex justify-center pt-2 pb-0.5">
              <span className={`w-10 h-1 rounded-full ${isMapDark ? "bg-white/20" : "bg-black/15"}`} />
            </div>

            {/* Top Header: "@<username> Profile" (Font identical to "Find other Kalcerians") */}
            <div className={`shrink-0 w-full pt-2 pb-2 flex justify-between items-center px-4 select-none outline-none border-b ${
              isMapDark ? "border-[#30363d]/80" : "border-[#e5e7eb]"
            }`}>
              <h2 className={`font-sans font-bold text-base sm:text-lg tracking-tight select-none ${isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"}`}>
                @{cleanUsername} Profile
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close my profile"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                  isMapDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-black"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Scrollable Card Body - Trim excess padding & double border so cover starts flush with zero gap */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              <KalcerianProfileCard
                user={currentUser}
                isMapDark={isMapDark}
                isOwnProfile={true}
                onEditProfile={onEditProfile}
                showMobileClose={false}
                onClose={onClose}
                inline={true}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
