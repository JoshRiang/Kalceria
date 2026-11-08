"use client";

import { memo } from "react";

export const HudThemeButton = memo(function HudThemeButton({
  isMapDark,
  setIsMapDark,
}) {
  return (
    <button
      type="button"
      aria-label={isMapDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      onClick={(e) => {
        e.stopPropagation();
        setIsMapDark((prev) => !prev);
      }}
      className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer group"
    >
      {isMapDark ? (
        /* Dark Mode: White Sun with Black Border */
        <svg width="26" height="26" viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7">
          <circle
            cx="12"
            cy="12"
            r="4.5"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="1.4"
            style={{ paintOrder: "stroke fill" }}
          />
          <path
            d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2M4.57 4.57l1.42 1.42M18.01 18.01l1.42 1.42M4.57 19.43l1.42-1.42M18.01 5.99l1.42-1.42"
            stroke="#000000"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2M4.57 4.57l1.42 1.42M18.01 18.01l1.42 1.42M4.57 19.43l1.42-1.42M18.01 5.99l1.42-1.42"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        /* Light Mode: Black Moon with White Border */
        <svg width="26" height="26" viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="#000000"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinejoin="round"
            style={{
              paintOrder: "stroke fill",
              filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
            }}
          />
        </svg>
      )}
    </button>
  );
});
