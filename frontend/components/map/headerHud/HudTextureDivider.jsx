"use client";

import { memo } from "react";

/**
 * HudTextureDivider
 * Renders the cyber-grid crosshatch pattern texture dividers (Picture 4 broadcast edge style)
 * between functional icon compartments in light and dark mode.
 */
export const HudTextureDivider = memo(function HudTextureDivider({
  isMapDark,
  vertical = true,
  className = "",
}) {
  const strokeColor = isMapDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.22)";
  const patternId = isMapDark
    ? vertical ? "hud-grid-pat-dark-v" : "hud-grid-pat-dark-h"
    : vertical ? "hud-grid-pat-light-v" : "hud-grid-pat-light-h";

  if (vertical) {
    return (
      <div
        aria-hidden="true"
        className={`relative w-[6px] sm:w-[7px] self-stretch flex items-center justify-center shrink-0 overflow-hidden select-none pointer-events-none opacity-80 ${className}`}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke={strokeColor} strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`relative h-[6px] sm:h-[7px] w-full flex items-center justify-center shrink-0 overflow-hidden select-none pointer-events-none opacity-80 ${className}`}
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke={strokeColor} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
});

