"use client";

import { memo } from "react";

export const HudQuickActionsMenu = memo(function HudQuickActionsMenu({
  isMapDark,
  actionMenuOpen,
  setActionMenuOpen,
  isSelfOffline,
  hasActiveOwnEvent,
  onGoToOwnEvent,
  onTopDynamicEventClick,
  setShowStatusModal,
  setShowEventModal,
}) {
  return (
    <div
      className={`absolute top-[44px] right-0 z-[1001] w-[220px] sm:w-[232px] p-2.5 transition-all duration-200 origin-top-right overflow-hidden rounded-2xl font-sans ${
        isMapDark
          ? "bg-[#000000] border border-[#30363d]/90 text-[#f0f6fc] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.15),inset_-1px_-1.5px_2px_rgba(0,0,0,0.8),0_14px_36px_rgba(0,0,0,0.85)]"
          : "bg-[#ffffff] border border-[#c4cbd4] text-[#1f2328] shadow-[inset_1px_1.5px_2px_rgba(255,255,255,0.95),inset_-1px_-1.5px_2px_rgba(160,174,192,0.3),0_12px_32px_rgba(0,0,0,0.1)]"
      } ${
        !isSelfOffline && actionMenuOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-1.5 pointer-events-none"
      }`}
    >
      {/* Outer Box Background Layer (No Trim, slightly visible around the inner boxes) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none select-none"
        style={{
          backgroundImage: isMapDark
            ? "url('/BG_IMPROVE_FOR_MAP/BG_BroadscastBoxDark.webp')"
            : "url('/BG_IMPROVE_FOR_MAP/BG_BroadcastBoxLight.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: isMapDark ? 0.45 : 0.58,
        }}
      />

      {/* Item 1: Broadcast - Inner Box */}
      <button
        type="button"
        disabled={isSelfOffline}
        className={`group relative z-10 w-full flex flex-col px-3.5 py-2.5 text-left rounded-xl transition-all duration-200 cursor-pointer overflow-hidden outline-none hover:scale-[1.02] active:scale-[0.98] origin-center my-0.5 backdrop-blur-[2px] ${
          isMapDark
            ? "bg-[#090a0f]/82 border border-[#38404a] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12),inset_0_-1px_1px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.35)]"
            : "bg-white/84 border border-[#d1d5db] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)]"
        }`}
        onClick={() => {
          if (isSelfOffline) return;
          setShowStatusModal(true);
          setActionMenuOpen(false);
        }}
      >
        {/* Dynamic Color Shift Blobs like in Kalcerian */}
        <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none rounded-xl">
          {isMapDark ? (
            <>
              <div className="absolute -top-[20%] -left-[20%] w-[90px] h-[90px] bg-red-500/30 rounded-full blur-[14px] mix-blend-screen animate-pulse duration-[2800ms]" />
              <div className="absolute -bottom-[20%] -right-[20%] w-[90px] h-[90px] bg-[#ffd60a]/30 rounded-full blur-[14px] mix-blend-screen animate-pulse duration-[3600ms] delay-100" />
              <div className="absolute top-[10%] right-[20%] w-[80px] h-[70px] bg-[#ff006e]/25 rounded-full blur-[15px] mix-blend-screen animate-pulse duration-[2200ms] delay-200" />
            </>
          ) : (
            <>
              <div className="absolute -top-[20%] -left-[20%] w-[90px] h-[90px] bg-rose-400/25 rounded-full blur-[14px] mix-blend-multiply animate-pulse duration-[2800ms]" />
              <div className="absolute -bottom-[20%] -right-[20%] w-[90px] h-[90px] bg-amber-300/35 rounded-full blur-[14px] mix-blend-multiply animate-pulse duration-[3600ms] delay-100" />
              <div className="absolute top-[10%] right-[20%] w-[80px] h-[70px] bg-pink-300/25 rounded-full blur-[15px] mix-blend-multiply animate-pulse duration-[2200ms] delay-200" />
            </>
          )}
        </div>

        <span
          className={`relative z-10 text-[13.5px] leading-snug font-semibold transition-colors duration-200 ${
            isMapDark ? "text-[#f0f6fc] group-hover:text-white" : "text-[#1f2328] group-hover:text-black"
          }`}
        >
          Broadcast
        </span>
        <span
          className={`relative z-10 text-[11.5px] leading-tight mt-0.5 transition-colors duration-200 ${
            isMapDark ? "text-[#8b949e] group-hover:text-[#c9d1d9]" : "text-[#656d76] group-hover:text-[#424a53]"
          }`}
        >
          Share message &amp; location
        </span>
      </button>

      {/* Item 2: Mini event OR Go To Event (1-event-per-user rule) */}
      <button
        type="button"
        disabled={isSelfOffline}
        className={`group relative z-10 w-full flex flex-col px-3.5 py-2.5 text-left rounded-xl transition-all duration-200 cursor-pointer overflow-hidden outline-none hover:scale-[1.02] active:scale-[0.98] origin-center my-0.5 backdrop-blur-[2px] ${
          isMapDark
            ? "bg-[#090a0f]/82 border border-[#38404a] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12),inset_0_-1px_1px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.35)]"
            : "bg-white/84 border border-[#d1d5db] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)]"
        }`}
        onClick={() => {
          if (isSelfOffline) return;
          setActionMenuOpen(false);
          if (hasActiveOwnEvent) {
            if (onGoToOwnEvent) {
              onGoToOwnEvent();
            } else {
              onTopDynamicEventClick?.();
            }
            return;
          }
          setShowEventModal(true);
        }}
      >
        {/* Dynamic Color Shift Blobs like in Kalcerian */}
        <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 overflow-hidden pointer-events-none rounded-lg">
          {isMapDark ? (
            <>
              <div className="absolute -top-[20%] -left-[20%] w-[90px] h-[90px] bg-red-500/30 rounded-full blur-[14px] mix-blend-screen animate-pulse duration-[2800ms]" />
              <div className="absolute -bottom-[20%] -right-[20%] w-[90px] h-[90px] bg-[#ffd60a]/30 rounded-full blur-[14px] mix-blend-screen animate-pulse duration-[3600ms] delay-100" />
              <div className="absolute top-[10%] right-[20%] w-[80px] h-[70px] bg-[#ff006e]/25 rounded-full blur-[15px] mix-blend-screen animate-pulse duration-[2200ms] delay-200" />
            </>
          ) : (
            <>
              <div className="absolute -top-[20%] -left-[20%] w-[90px] h-[90px] bg-rose-400/25 rounded-full blur-[14px] mix-blend-multiply animate-pulse duration-[2800ms]" />
              <div className="absolute -bottom-[20%] -right-[20%] w-[90px] h-[90px] bg-amber-300/35 rounded-full blur-[14px] mix-blend-multiply animate-pulse duration-[3600ms] delay-100" />
              <div className="absolute top-[10%] right-[20%] w-[80px] h-[70px] bg-pink-300/25 rounded-full blur-[15px] mix-blend-multiply animate-pulse duration-[2200ms] delay-200" />
            </>
          )}
        </div>

        <span
          className={`relative z-10 text-[13.5px] leading-snug font-semibold transition-colors duration-200 ${
            isMapDark ? "text-[#f0f6fc] group-hover:text-white" : "text-[#1f2328] group-hover:text-black"
          }`}
        >
          {hasActiveOwnEvent ? "Go To Event" : "Mini event"}
        </span>
        <span
          className={`relative z-10 text-[11px] leading-tight mt-0.5 transition-colors duration-200 ${
            hasActiveOwnEvent
              ? "text-[#ef4444] font-medium"
              : isMapDark
              ? "text-[#8b949e] group-hover:text-[#c9d1d9]"
              : "text-[#656d76] group-hover:text-[#424a53]"
          }`}
        >
          {hasActiveOwnEvent ? "You Already Create your event" : "Start an instant meetup"}
        </span>
      </button>
    </div>
  );
});
