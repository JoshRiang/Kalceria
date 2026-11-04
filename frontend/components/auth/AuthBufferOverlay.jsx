"use client";

import { motion } from "framer-motion";

/**
 * Screen blur + loading buffer with NO words.
 * Inherits the exact SVG arc spinner dimensions and behavior from the Logging Out sequence.
 */
export default function AuthBufferOverlay({ isBuffering = true } = {}) {
  if (!isBuffering) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md select-none pointer-events-auto"
    >
      <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 flex items-center justify-center">
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
    </motion.div>
  );
}

