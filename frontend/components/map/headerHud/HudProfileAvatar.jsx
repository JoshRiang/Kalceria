"use client";

import { memo } from "react";
import ContentImage from "@/components/ui/ContentImage";

export const HudProfileAvatar = memo(function HudProfileAvatar({
  isMapDark,
  currentUser,
  avatarUrl,
  presence,
  isStatusBusy,
  onOpenOwnProfile,
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenOwnProfile?.()}
      title="My Profile"
      className="relative flex items-center justify-center pointer-events-auto cursor-pointer outline-none transition-transform hover:scale-105 active:scale-95 group"
    >
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden relative select-none ${
          isMapDark
            ? "ring-1.5 ring-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            : "ring-1.5 ring-black/40 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
        }`}
      >
        {isStatusBusy && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="white"
                strokeWidth="12"
                strokeDasharray="70 200"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
        <ContentImage
          src={avatarUrl(currentUser)}
          alt="Profile"
          width={128}
          height={128}
          className="w-full h-full object-cover"
        />
      </div>
      <span
        className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-[1.5px] ${
          isMapDark ? "border-black" : "border-white"
        } rounded-full ${
          isStatusBusy
            ? "bg-amber-400 animate-pulse"
            : presence === "online"
            ? "bg-emerald-400"
            : "bg-slate-500"
        }`}
      />
    </button>
  );
});
