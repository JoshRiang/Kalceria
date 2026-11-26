"use client";

import { motion, AnimatePresence } from "framer-motion";

export function BlockConfirmModal({
  show,
  actionType, // "block" | "unblock" | "friend_send" | "friend_cancel" | "friend_accept"
  userName,
  isMapDark,
  onCancel,
  onConfirm,
}) {
  const renderLabel = () => {
    switch (actionType) {
      case "friend_send":
        return (
          <>
            Send friend request to <span className="font-bold">{userName}</span>
          </>
        );
      case "friend_cancel":
        return (
          <>
            <span className="text-[#ef4444] font-normal">Delete</span> friend request to{" "}
            <span className="font-bold">{userName}</span>
          </>
        );
      case "friend_accept":
        return (
          <>
            Accept <span className="font-bold">{userName}</span> friend request
          </>
        );
      case "block":
        return (
          <>
            Block <span className="font-bold">{userName}</span>?
          </>
        );
      case "unblock":
      default:
        return (
          <>
            Unblock <span className="font-bold">{userName}</span>?
          </>
        );
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={`confirm-${actionType}`}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute inset-0 z-30 flex items-center justify-between px-3.5 sm:px-4 py-2 rounded-xl backdrop-blur-md shadow-xl ${
            isMapDark
              ? "bg-[#161b22]/85 border border-[#38404a]/90 text-[#f0f6fc]"
              : "bg-white/85 border border-[#d1d5db]/90 text-[#1f2328]"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className="font-sans font-normal text-[12.5px] sm:text-[13px] leading-snug tracking-tight line-clamp-2 mr-2"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            {renderLabel()}
          </span>
          <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
            {/* Cancel / Reject ✕ (+50% thickened stroke: 1.8 -> 2.7) */}
            <button
              type="button"
              onClick={onCancel}
              className="p-1 transition-transform hover:scale-125 active:scale-95 outline-none cursor-pointer"
              title={actionType === "friend_accept" ? "Decline" : "Cancel"}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={isMapDark ? "#ff6b6b" : "#cf222e"}
                  strokeWidth="2.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {/* Confirm / Accept ✓ (+50% thickened stroke: 2.0 -> 3.0) */}
            <button
              type="button"
              onClick={onConfirm}
              className="p-1 transition-transform hover:scale-125 active:scale-95 outline-none cursor-pointer"
              title="Confirm"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke={isMapDark ? "#3fb950" : "#1a7f37"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
