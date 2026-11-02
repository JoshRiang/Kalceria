"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";

export const MapHeaderHud = memo(function MapHeaderHud({
  isMapDark,
  setIsMapDark,
  mapCenter,
  actionMenuOpen,
  setActionMenuOpen,
  menuOpen,
  setMenuOpen,
  setShowQuitModal,
  setShowStatusModal,
  setShowEventModal,
  isStatusBusy,
  currentUser,
  avatarUrl,
  presence,
  handlePresenceChange,
  recenterMap,
  isRecentering,
}) {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      className="absolute z-[1000] top-4 left-4 right-4 flex justify-between items-center pointer-events-none max-[860px]:top-3 max-[860px]:left-3 max-[860px]:right-3 select-none"
    >
      {/* 2D Back Arrow Button (Picture 2 style) - Outer Box Stripped */}
      <button
        onClick={() => setShowQuitModal(true)}
        aria-label="Back to home"
        className="pointer-events-auto p-1.5 transition-transform hover:-translate-x-1 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 group cursor-pointer"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-105"
        >
          <path
            d="M 3 12 L 9.4 5.6 L 14.8 5.6 L 10.3 10.1 L 21 10.1 L 21 13.9 L 10.3 13.9 L 14.8 18.4 L 9.4 18.4 Z"
            fill={isMapDark ? "#ffffff" : "#000000"}
            stroke={isMapDark ? "#000000" : "#ffffff"}
            strokeWidth="1.2"
            strokeLinejoin="miter"
            style={{
              paintOrder: "stroke fill",
              filter: isMapDark
                ? "drop-shadow(0 1px 3px rgba(255,255,255,0.4))"
                : "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
            }}
          />
        </svg>
      </button>

      {/* Top-Right One-Line Controls: Recenter, Eye, Create Mini Event (+), Moon/Sun, Profile Photo */}
      <div className="relative flex items-center gap-2.5 sm:gap-3.5 md:gap-4 pointer-events-auto">
        {/* 1. Recenter Button (Map Pin Picture 4 style) - 2D, No Outer Box */}
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

        {/* 2. Eye Icon (Online / Offline Toggle) - 2D Flat, No Outer Box */}
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

        {/* 3. Create Mini Event (+) Button - Bolded & Determined 2D Plus */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            aria-label="Quick Actions Menu"
            aria-expanded={actionMenuOpen}
            aria-haspopup="true"
            className="p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setActionMenuOpen((prev) => !prev);
              setMenuOpen(false);
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${
                actionMenuOpen
                  ? "rotate-45 scale-110"
                  : "group-hover:rotate-90 group-hover:scale-110"
              }`}
            >
              <path
                d="M 10 3.5 h 4 v 6.5 h 6.5 v 4 h -6.5 v 6.5 h -4 v -6.5 h -6.5 v -4 h 6.5 z"
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
            </svg>
          </button>

          {/* Quick Actions Dropdown Menu - Modern GitHub style with tactile expansion & mode-aware color shift */}
          <div
            className={`absolute top-[44px] right-0 z-[1001] w-[215px] sm:w-[225px] p-1.5 transition-all duration-200 origin-top-right overflow-hidden rounded-xl font-sans ${
              isMapDark
                ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc] shadow-[0_12px_28px_rgba(0,0,0,0.7)]"
                : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328] shadow-[0_12px_28px_rgba(140,149,159,0.25)]"
            } ${
              actionMenuOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-1.5 pointer-events-none"
            }`}
          >
            {/* Item 1: Broadcast */}
            <button
              type="button"
              className="group relative w-full flex flex-col px-3.5 py-2.5 text-left rounded-lg transition-all duration-200 cursor-pointer overflow-hidden outline-none hover:scale-[1.03] active:scale-[0.98] origin-center"
              onClick={() => {
                setShowStatusModal(true);
                setActionMenuOpen(false);
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

            {/* Subtle Divider */}
            <div
              className={`h-[1px] my-1 mx-2 ${
                isMapDark ? "bg-[#30363d]/80" : "bg-[#d0d7de]/80"
              }`}
            />

            {/* Item 2: Mini event */}
            <button
              type="button"
              className="group relative w-full flex flex-col px-3.5 py-2.5 text-left rounded-lg transition-all duration-200 cursor-pointer overflow-hidden outline-none hover:scale-[1.03] active:scale-[0.98] origin-center"
              onClick={() => {
                setShowEventModal(true);
                setActionMenuOpen(false);
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
                Mini event
              </span>
              <span
                className={`relative z-10 text-[11.5px] leading-tight mt-0.5 transition-colors duration-200 ${
                  isMapDark ? "text-[#8b949e] group-hover:text-[#c9d1d9]" : "text-[#656d76] group-hover:text-[#424a53]"
                }`}
              >
                Start an instant meetup
              </span>
            </button>
          </div>
        </div>

        {/* 3. Moon / Sun Theme Toggle - 2D, No Outer Box */}
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

        {/* 4. Photo Profile - Strip Outer Box, Pure Circle Avatar with Online Dot (Radar visibility box removed) */}
        <div className="relative flex items-center justify-center">
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
        </div>
      </div>
    </motion.header>
  );
});
