"use client";

import { memo } from "react";
import ContentImage from "@/components/ui/ContentImage";

export const KalcerianCardAvatar = memo(function KalcerianCardAvatar({
  user,
  isBlocked,
  isBlockedByTarget = false,
  isExpanded,
  isMapDark,
  isFavourite,
  isMuted,
  avatarUrl,
  handleAvatarClick,
}) {
  return (
    <div className="relative z-10 flex justify-center items-center">
      <div
        className="relative cursor-pointer group/avatar"
        onClick={(e) => handleAvatarClick(e, user)}
        title={isExpanded ? "Close profile" : `View ${user.name}'s profile`}
      >
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 border overflow-hidden rounded-full transition-all relative ${
            isBlocked
              ? "grayscale-[80%] border-[#8b949e]/40"
              : isExpanded
              ? "border-white ring-2 ring-white/50"
              : user.isOnline
              ? isMapDark
                ? "border-[#3fb950] group-hover/avatar:scale-105"
                : "border-[#1a7f37] group-hover/avatar:scale-105"
              : isMapDark
              ? "border-[#30363d] opacity-50 group-hover/avatar:scale-105"
              : "border-[#d0d7de] opacity-60 group-hover/avatar:scale-105"
          }`}
        >
          {isBlockedByTarget ? (
            <div className="w-full h-full bg-[#000000]" />
          ) : (
            <ContentImage
              className={`w-full h-full object-cover transition-all ${
                isExpanded ? "blur-[2.5px] brightness-50" : ""
              }`}
              src={avatarUrl(user)}
              alt={user.nickname || user.name}
              width={64}
              height={64}
            />
          )}

          {/* When Expanded (Desktop/iPad): profile picture blurs and gets redup with thin white X */}
          {isExpanded && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white stroke-white" fill="none" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Bottom-right Avatar Badges: Favourite (Love) & Mute (Speaker + Cross) Stacked Horizontally, with Active Green Dot at Lowest Stack Layer (z-[5]) */}
        {!isExpanded && (
          !isBlocked && (isFavourite || isMuted) ? (
            <div className="absolute -bottom-0.5 -right-1.5 z-20 flex items-center pointer-events-none">
              {isFavourite && (
                <span
                  className={`relative z-10 w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs ${
                    isMapDark
                      ? "bg-[#161b22] ring-1 ring-[#161b22]"
                      : "bg-white ring-1 ring-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-[11px] h-[11px]" fill="#ef4444">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </span>
              )}
              {isMuted && (
                <span
                  className={`relative z-20 w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs ${
                    isFavourite ? "-ml-[6px]" : ""
                  } ${
                    isMapDark
                      ? "bg-[#161b22] ring-1 ring-[#161b22]"
                      : "bg-white ring-1 ring-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-[11px] h-[11px] overflow-visible">
                    <path
                      d="M 3 8.5 h 4 l 5.2 -4.5 v 16 l -5.2 -4.5 h -4 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z"
                      fill="#ef4444"
                    />
                    <line
                      x1="15.5"
                      y1="8.5"
                      x2="21.5"
                      y2="15.5"
                      stroke="#ef4444"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="21.5"
                      y1="8.5"
                      x2="15.5"
                      y2="15.5"
                      stroke="#ef4444"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              )}
              {user.isOnline && (
                <span
                  className={`relative z-[5] -ml-[5px] w-3 h-3 border-2 rounded-full bg-[#3fb950] ${
                    isMapDark ? "border-[#161b22]" : "border-white"
                  }`}
                />
              )}
            </div>
          ) : (
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 border-2 rounded-full ${
                isMapDark ? "border-[#161b22]" : "border-white"
              } ${isBlocked ? "bg-[#8b949e]/50" : user.isOnline ? "bg-[#3fb950]" : "bg-[#8b949e]"}`}
            />
          )
        )}
      </div>
    </div>
  );
});
