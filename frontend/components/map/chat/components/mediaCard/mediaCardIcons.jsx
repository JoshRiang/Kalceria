"use client";

import { memo } from "react";

/**
 * Clean SVG Photo Placeholder Icon (matching Picture 2):
 * Rounded rectangle outline with sun circle (top-left) and dual mountain peaks.
 * Theme-reactive: Black in Light Mode, White in Dark Mode.
 */
export const PhotoMediaPlaceholderIcon = memo(function PhotoMediaPlaceholderIcon({
  isMapDark,
  className = "w-9 h-9 sm:w-10 sm:h-10",
}) {
  const color = isMapDark ? "#ffffff" : "#000000";

  return (
    <svg
      viewBox="0 0 28 24"
      className={`${className} overflow-visible pointer-events-none select-none`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Rounded Frame */}
      <rect
        x="1.5"
        y="1.5"
        width="25"
        height="21"
        rx="3.5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Sun / Moon Circle in top-left */}
      <circle cx="8" cy="7.5" r="2.5" fill={color} />
      {/* Mountain Peaks Silhouette */}
      <path
        d="M 3.5 19.5 L 9.5 12 L 14 16.5 L 18 10 L 24.5 19.5 Z"
        fill={color}
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/**
 * Clean SVG Video Clapperboard Placeholder Icon (matching Picture 3):
 * Clapperboard with top diagonal stripes and center play triangle.
 * Theme-reactive: Black in Light Mode, White in Dark Mode.
 */
export const VideoMediaPlaceholderIcon = memo(function VideoMediaPlaceholderIcon({
  isMapDark,
  className = "w-9 h-9 sm:w-10 sm:h-10",
}) {
  const color = isMapDark ? "#ffffff" : "#000000";

  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible pointer-events-none select-none`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Upper Clapperboard with Stripes */}
      <path
        d="M 3.5 3 H 20.5 C 21.6 3 22.5 3.9 22.5 5 V 8 H 1.5 V 5 C 1.5 3.9 2.4 3 3.5 3 Z"
        fill={color}
      />
      {/* Slanted Stripes cutout / overlay */}
      <path
        d="M 6 3 L 3.5 8 M 11.5 3 L 9 8 M 17 3 L 14.5 8 M 22 3.5 L 19.5 8"
        stroke={isMapDark ? "#0d1117" : "#ffffff"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Lower Main Board Body */}
      <path
        d="M 1.5 9.5 H 22.5 V 19 C 22.5 20.1 21.6 21 20.5 21 H 3.5 C 2.4 21 1.5 20.1 1.5 19 Z"
        fill={color}
      />
      {/* Center Play Triangle */}
      <polygon
        points="10,12 16,15.25 10,18.5"
        fill={isMapDark ? "#0d1117" : "#ffffff"}
      />
    </svg>
  );
});

/**
 * Unified Sound / Mute Toggle Icon (CardBack & MediaCardZoomModal):
 * Always rendered in pure white (#ffffff) with high-contrast drop shadow,
 * matching toolbar sound icon / mute notification icon conventions.
 */
export const ChatVideoSoundIcon = memo(function ChatVideoSoundIcon({
  isMuted,
  className = "w-3.5 h-3.5",
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible pointer-events-none`}
      style={{ filter: "drop-shadow(0 1.5px_3px rgba(0,0,0,0.85))" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Speaker Cone and Body */}
      <path
        d="M 3 8.5 h 4 l 5.2 -4.5 v 16 l -5.2 -4.5 h -4 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z"
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="1.2"
        strokeLinejoin="round"
        style={{ paintOrder: "stroke fill" }}
      />

      {/* When Sound is Active: Emitting Sound Waves */}
      {!isMuted ? (
        <g stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d="M 15 9.2 a 4 4 0 0 1 0 5.6" />
          <path d="M 17.5 7 a 7.5 7.5 0 0 1 0 10" />
          <path d="M 20 4.8 a 11 11 0 0 1 0 14.4" />
        </g>
      ) : (
        /* When Muted: Firm Red Cross on Right Side */
        <g>
          {/* Dark outline for extreme visibility on bright video scenes */}
          <line x1="15.5" y1="8.5" x2="21.5" y2="15.5" stroke="#000000" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="21.5" y1="8.5" x2="15.5" y2="15.5" stroke="#000000" strokeWidth="3.6" strokeLinecap="round" />
          {/* Main Red Cross */}
          <line x1="15.5" y1="8.5" x2="21.5" y2="15.5" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="21.5" y1="8.5" x2="15.5" y2="15.5" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
});
