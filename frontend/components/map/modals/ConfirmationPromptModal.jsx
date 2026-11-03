"use client";

import { motion } from "framer-motion";

export function ConfirmationPromptModal({
  show,
  onClose,
  title,
  highlightText,
  isMapDark,
  choice,
  onConfirm,
}) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-6 select-none pointer-events-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`absolute inset-0 backdrop-blur-md transition-colors duration-300 ${
          isMapDark ? "bg-black/30" : "bg-black/[0.04]"
        }`}
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -5, 0] }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{
          opacity: { duration: 0.25 },
          scale: { duration: 0.25 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <h3
          className={`relative z-10 text-2xl sm:text-3xl md:text-4xl font-sans font-bold mb-8 sm:mb-10 tracking-tighter ${
            isMapDark ? "text-white" : "text-black"
          }`}
          style={{
            textShadow: isMapDark
              ? "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)"
              : "0 2px 14px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.9)",
          }}
        >
          {title}
          {highlightText && <span className="text-[#ef4444] font-bold">{highlightText}</span>}
          ?
        </h3>
        <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-16">
          <button
            type="button"
            onClick={onConfirm}
            className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-2"
          >
            <motion.span
              animate={choice === "yes" ? { scale: 1.25 } : {}}
              transition={{ duration: 0.2 }}
              className={`block font-sans text-xl sm:text-2xl font-normal transition-all duration-200 group-hover:scale-110 active:scale-95 ${
                isMapDark
                  ? "text-white/80 group-hover:text-white"
                  : "text-black/80 group-hover:text-black"
              }`}
              style={{
                textShadow: isMapDark
                  ? "0 2px 10px rgba(0,0,0,0.8)"
                  : "0 1px 6px rgba(255,255,255,0.9)",
              }}
            >
              Yes
            </motion.span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-2"
          >
            <motion.span
              animate={choice === "no" ? { scale: 1.25 } : {}}
              transition={{ duration: 0.2 }}
              className={`block font-sans text-xl sm:text-2xl font-normal transition-all duration-200 group-hover:scale-110 active:scale-95 ${
                isMapDark
                  ? "text-white/80 group-hover:text-white"
                  : "text-black/80 group-hover:text-black"
              }`}
              style={{
                textShadow: isMapDark
                  ? "0 2px 10px rgba(0,0,0,0.8)"
                  : "0 1px 6px rgba(255,255,255,0.9)",
              }}
            >
              No
            </motion.span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
