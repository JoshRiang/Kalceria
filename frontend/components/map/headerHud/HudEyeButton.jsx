"use client";

import { memo } from "react";

export const HudEyeButton = memo(function HudEyeButton({
  isMapDark,
  presence,
  isStatusBusy,
  handlePresenceChange,
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (isStatusBusy) return;
        const nextMode = presence === "online" ? "invisible" : "online";
        handlePresenceChange(nextMode);
      }}
      aria-label={
        isStatusBusy
          ? "Updating status..."
          : presence === "online"
          ? "Online (Tap to go offline)"
          : "Offline (Tap to go online)"
      }
      title={
        isStatusBusy
          ? "Updating status..."
          : presence === "online"
          ? "Online (Tap to go offline)"
          : "Offline (Tap to go online)"
      }
      className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer group"
    >
      {isStatusBusy ? (
        /* Small buffer inherited from logging out sequence buffer shape and behaviour */
        <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
          <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isMapDark ? "#ffffff" : "#000000"}
              strokeWidth="10"
              strokeDasharray="70 200"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : presence === "online" ? (
        /* Eye Enabled (Online) - Solid eye matching Picture 3 with sclera ring, pupil & reflection */
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          className="w-6 h-6 sm:w-7 sm:h-7"
          style={{
            filter: isMapDark
              ? "drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
              : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        >
          <path
            d="M 2 12 C 5 5 19 5 22 12 C 19 19 5 19 2 12 Z"
            fill={isMapDark ? "#ffffff" : "#000000"}
            stroke={isMapDark ? "#ffffff" : "#000000"}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="5.2"
            fill={isMapDark ? "#000000" : "#ffffff"}
          />
          <circle
            cx="12"
            cy="12"
            r="3.2"
            fill={isMapDark ? "#ffffff" : "#000000"}
          />
          <circle
            cx="10.5"
            cy="10.5"
            r="1.15"
            fill={isMapDark ? "#000000" : "#ffffff"}
          />
        </svg>
      ) : (
        /* Eye Shut (Offline) - Eyelid arc with downward lashes */
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          className="w-6 h-6 sm:w-7 sm:h-7"
          style={{
            filter: isMapDark
              ? "drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
              : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
          }}
        >
          <path
            d="M 3 11.5 C 6.5 17 17.5 17 21 11.5"
            fill="none"
            stroke={isMapDark ? "#ffffff" : "#000000"}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 5.5 14.2 L 4 17.5 M 9.5 15.8 L 9 19.5 M 14.5 15.8 L 15 19.5 M 18.5 14.2 L 20 17.5"
            fill="none"
            stroke={isMapDark ? "#ffffff" : "#000000"}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
});
