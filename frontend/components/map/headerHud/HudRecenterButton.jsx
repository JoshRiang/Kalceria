"use client";

import { memo } from "react";
import { motion } from "framer-motion";

export const HudRecenterButton = memo(function HudRecenterButton({
  isMapDark,
  recenterMap,
  isRecentering,
}) {
  return (
    <button
      type="button"
      onClick={recenterMap}
      aria-label="Recenter Map Radar"
      title="Recenter Map"
      className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer group"
    >
      <motion.svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        className="w-6 h-6 sm:w-7 sm:h-7"
        animate={isRecentering ? { y: [-3, 3, -2, 0], scale: [1, 1.2, 0.95, 1] } : {}}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <path
          fillRule="evenodd"
          d="M 12 2 C 8.13 2 5 5.13 5 9 c 0 5.25 7 13 7 13 s 7 -7.75 7 -13 c 0 -3.87 -3.13 -7 -7 -7 z M 12 5.8 a 3.2 3.2 0 1 0 0 6.4 a 3.2 3.2 0 1 0 0 -6.4 z"
          fill={isMapDark ? "#ffffff" : "#000000"}
          stroke={isMapDark ? "#000000" : "#ffffff"}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{
            paintOrder: "stroke fill",
            filter: isMapDark
              ? "drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
              : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        />
      </motion.svg>
    </button>
  );
});
