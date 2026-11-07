"use client";

import { motion } from "framer-motion";

export function IdeaCommentSubmittingOverlay() {
  return (
    <motion.div
      key="blur-submitting-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[1002] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
    >
      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 mb-6 sm:mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeDasharray="70 200"
                strokeLinecap="round"
                className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
              />
            </svg>
          </div>
        </div>
        <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
          SUBMITTING COMMENT
        </p>
      </div>
    </motion.div>
  );
}
