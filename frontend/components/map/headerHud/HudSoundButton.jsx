"use client";

import { memo } from "react";
import { toggleSoundMuted } from "@/lib/soundEngine";

export const HudSoundButton = memo(function HudSoundButton({
  isMapDark,
  soundMuted,
  setSoundMuted,
}) {
  return (
    <button
      type="button"
      aria-label={soundMuted ? "Unmute Notifications" : "Mute Notifications"}
      title={soundMuted ? "Sound Muted (Click to Unmute)" : "Sound Active (Click to Mute)"}
      onClick={(e) => {
        e.stopPropagation();
        const next = toggleSoundMuted();
        setSoundMuted(next);
      }}
      className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer group relative"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 overflow-visible">
        {/* Speaker Cone and Body */}
        <path
          d="M 3 8.5 h 4 l 5.2 -4.5 v 16 l -5.2 -4.5 h -4 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z"
          fill={isMapDark ? "#ffffff" : "#000000"}
          stroke={isMapDark ? "#000000" : "#ffffff"}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{
            paintOrder: "stroke fill",
            filter: isMapDark
              ? "drop-shadow(0 1px 3px rgba(0,0,0,0.7))"
              : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
          }}
        />

        {/* Emitting Sound Waves (shown when not muted) */}
        {!soundMuted ? (
          <g
            stroke={isMapDark ? "#ffffff" : "#000000"}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            style={{
              filter: isMapDark
                ? "drop-shadow(0 1px 3px rgba(0,0,0,0.7))"
                : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
            }}
          >
            {/* Wave 1: Inner Arc */}
            <path d="M 15 9.2 a 4 4 0 0 1 0 5.6" />
            {/* Wave 2: Middle Arc */}
            <path d="M 17.5 7 a 7.5 7.5 0 0 1 0 10" />
            {/* Wave 3: Outer Arc */}
            <path d="M 20 4.8 a 11 11 0 0 1 0 14.4" />
          </g>
        ) : (
          /* Red Cross on the right side only (volume-x standard) */
          <g style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }}>
            {/* Under-stroke for extreme contrast */}
            <line
              x1="15.5"
              y1="8.5"
              x2="21.5"
              y2="15.5"
              stroke={isMapDark ? "#000000" : "#ffffff"}
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <line
              x1="21.5"
              y1="8.5"
              x2="15.5"
              y2="15.5"
              stroke={isMapDark ? "#000000" : "#ffffff"}
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            {/* Main Firm Red Cross */}
            <line
              x1="15.5"
              y1="8.5"
              x2="21.5"
              y2="15.5"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="21.5"
              y1="8.5"
              x2="15.5"
              y2="15.5"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </button>
  );
});
