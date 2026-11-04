"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

/**
 * Screen blur + loading buffer with NO words.
 * Portaled directly to document.body with fixed inset-0 and top-level z-index
 * to ensure 100% rock-solid geometric centering across all device families without any top-shift or jump.
 */
export default function AuthBufferOverlay({ isBuffering = true } = {}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isBuffering) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
      }}
      className="flex items-center justify-center bg-black/80 backdrop-blur-xl select-none pointer-events-auto"
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
    </motion.div>,
    document.body
  );
}

