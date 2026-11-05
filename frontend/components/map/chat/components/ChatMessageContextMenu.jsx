"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ChatMessageContextMenu({
  isOpen,
  position = { x: 0, y: 0 },
  targetMessage,
  isMapDark,
  onClose,
  onReply,
  onCopy,
  onDelete,
}) {
  const menuRef = useRef(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !targetMessage) return null;

  // Clamp position so menu doesn't overflow the viewport
  const menuWidth = 145;
  const menuHeight = 120;
  const safeX = typeof window !== "undefined"
    ? Math.min(position.x, window.innerWidth - menuWidth - 12)
    : position.x;
  const safeY = typeof window !== "undefined"
    ? Math.min(position.y, window.innerHeight - menuHeight - 12)
    : position.y;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        style={{
          position: "fixed",
          left: `${safeX}px`,
          top: `${safeY}px`,
          zIndex: 1100,
        }}
        className={`w-[145px] p-1 rounded-xl shadow-2xl backdrop-blur-md select-none border ${
          isMapDark
            ? "bg-[#182229]/95 text-white border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
            : "bg-white/95 text-black border-black/10 shadow-[0_12px_32px_rgba(0,0,0,0.15)]"
        }`}
      >
        {/* 1. Reply: curved arrow icon from Picture 3 */}
        <button
          type="button"
          onClick={() => {
            onReply(targetMessage);
            onClose();
          }}
          className="w-full px-2.5 py-1.5 text-left text-xs font-medium flex items-center gap-2.5 rounded-lg transition-colors cursor-pointer hover:bg-current/10"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 15L3 9m0 0l6-6M3 9h11a6 6 0 0 1 6 6v3" />
          </svg>
          <span style={{ fontFamily: "Arial, sans-serif" }}>Reply</span>
        </button>

        {/* 2. Copy: two stacked sheets icon */}
        <button
          type="button"
          onClick={() => {
            onCopy(targetMessage);
            onClose();
          }}
          className="w-full px-2.5 py-1.5 text-left text-xs font-medium flex items-center gap-2.5 rounded-lg transition-colors cursor-pointer hover:bg-current/10"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span style={{ fontFamily: "Arial, sans-serif" }}>Copy</span>
        </button>

        {/* 3. Delete: clean filled trashcan icon */}
        <button
          type="button"
          onClick={() => {
            onDelete(targetMessage);
            onClose();
          }}
          className="w-full px-2.5 py-1.5 text-left text-xs font-medium flex items-center gap-2.5 rounded-lg transition-colors cursor-pointer hover:bg-current/10"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 shrink-0"
            fill="currentColor"
          >
            <path d="M6 7H18V19C18 20.1 17.1 21 16 21H8C6.9 21 6 20.1 6 19V7ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" />
          </svg>
          <span style={{ fontFamily: "Arial, sans-serif" }}>Delete</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

