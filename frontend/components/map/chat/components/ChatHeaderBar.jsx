"use client";

import { motion, AnimatePresence } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";

export function ChatHeaderBar({
  activeChatUser,
  targetId,
  displayName,
  isMapDark,
  avatarUrl,
  isFavourite,
  isMuted,
  isPeerTyping,
  menuOpen,
  setMenuOpen,
  selectMode,
  setSelectMode,
  setSelectedMsgIds,
  setSearchOpen,
  setMessageSearchQuery,
  setShowContactInfo,
  setCallState,
  handleTriggerCall,
  onToggleFavourite,
  onToggleMute,
  onCloseChat,
  menuContainerRef,
}) {
  const iconColor = isMapDark ? "#ffffff" : "#000000";
  const cleanUsername = (
    activeChatUser?.nickname ||
    activeChatUser?.name ||
    activeChatUser?.username ||
    "kalcerian"
  ).replace(/^@+/, "");

  return (
    <>
      {/* 1. Top Pull Handle (Click to Close Chat & Re-open Kalcerians Scroll Bar) */}
      <button
        type="button"
        aria-label="Close chat panel"
        onClick={onCloseChat}
        className={`w-full pt-2 pb-1 flex justify-center cursor-pointer select-none outline-none group shrink-0 ${
          isMapDark ? "bg-[#202c33]" : "bg-white"
        }`}
      >
        <span
          className={`w-11 sm:w-12 h-1 rounded-full transition-colors ${
            isMapDark
              ? "bg-white/25 group-hover:bg-white/50"
              : "bg-black/25 group-hover:bg-black/60"
          }`}
        />
      </button>

      {/* 2. WhatsApp Web Style Header Bar */}
      <div
        className={`relative z-20 px-2.5 py-2 flex items-center justify-between gap-1.5 shrink-0 ${
          isMapDark
            ? "bg-[#202c33] text-white"
            : "bg-white text-black"
        }`}
      >
        {/* Left: Back Button + Avatar + Display Name & Contact Info Subtitle */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onCloseChat}
            title="Back to Kalcerians"
            className="p-1 rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke={iconColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            onClick={() => setShowContactInfo((p) => !p)}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
            title="Click here for contact info"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden border shrink-0 border-current/30">
              <ContentImage
                src={avatarUrl(activeChatUser)}
                alt={displayName}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p
                  className={`text-[13px] font-bold leading-tight truncate ${
                    isMapDark ? "text-white" : "text-black"
                  }`}
                >
                  {displayName}
                </p>
              </div>
              <p
                className={`text-[10.5px] leading-tight truncate mt-0.5 ${
                  isPeerTyping
                    ? "text-emerald-500 font-semibold"
                    : isMapDark
                    ? "text-white/65"
                    : "text-black/65"
                }`}
              >
                {isPeerTyping ? "typing..." : `@${cleanUsername}`}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Video Call, Voice Call, Search, and Three Dots (⋮) Icons */}
        <div className="flex items-center gap-0.5 shrink-0" ref={menuContainerRef}>
          {/* Video Call Icon (Filled Black in Light Mode, Filled White in Dark Mode) */}
          <button
            type="button"
            onClick={() => {
              if (handleTriggerCall) handleTriggerCall("video");
              else setCallState({ mode: "video", user: activeChatUser });
            }}
            title={`Video call ${displayName}`}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={iconColor}>
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </button>

          {/* Voice Call Icon (Filled Black in Light Mode, Filled White in Dark Mode) */}
          <button
            type="button"
            onClick={() => {
              if (handleTriggerCall) handleTriggerCall("voice");
              else setCallState({ mode: "voice", user: activeChatUser });
            }}
            title={`Voice call ${displayName}`}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill={iconColor}>
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </button>

          {/* Search Icon */}
          <button
            type="button"
            onClick={() => {
              setSearchOpen((p) => {
                if (p) setMessageSearchQuery("");
                return !p;
              });
            }}
            title="Search messages"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-[17px] h-[17px]"
              fill="none"
              stroke={iconColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.2" y2="16.2" />
            </svg>
          </button>

          {/* Three Dots (⋮) Icon (Filled Black in Light Mode, Filled White in Dark Mode) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((p) => !p)}
              title="More options"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={iconColor}>
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {/* Three Dots Dropdown Menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className={`absolute right-0 top-full mt-1.5 w-48 rounded-xl border py-1.5 z-50 shadow-2xl ${
                    isMapDark
                      ? "bg-[#233138] border-white/20 text-white"
                      : "bg-white border-black text-black"
                  }`}
                >
                  {/* 1. Select Messages */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectMode((p) => !p);
                      setSelectedMsgIds([]);
                      setMenuOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4 shrink-0"
                      fill="none"
                      stroke={iconColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span>{selectMode ? "Cancel selection" : "Select messages"}</span>
                  </button>

                  {/* 2. Add to Favourites / Remove from Favourites */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleFavourite?.(targetId);
                      setMenuOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                    }`}
                  >
                    {isFavourite ? (
                      /* Remove from Favourites: Single clean cross */
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        stroke={iconColor}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      /* Add to Favourites: Heart in black (light mode) / white (dark mode) */
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill={iconColor}>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    )}
                    <span>{isFavourite ? "Remove from Favourites" : "Add to Favourites"}</span>
                  </button>

                  {/* 3. Mute Notifications / Unmute Notifications */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMute?.(targetId);
                      setMenuOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isMapDark ? "hover:bg-white/10" : "hover:bg-black/5"
                    }`}
                  >
                    {isMuted ? (
                      /* Unmute notifications: Speaker with emitting sound wave arcs matching top-right Map HUD */
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 overflow-visible">
                        <path
                          d="M 3 8.5 h 4 l 5.2 -4.5 v 16 l -5.2 -4.5 h -4 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z"
                          fill={iconColor}
                        />
                        <g stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" fill="none">
                          <path d="M 15 9.2 a 4 4 0 0 1 0 5.6" />
                          <path d="M 17.5 7 a 7.5 7.5 0 0 1 0 10" />
                          <path d="M 20 4.8 a 11 11 0 0 1 0 14.4" />
                        </g>
                      </svg>
                    ) : (
                      /* Mute notifications: Speaker with black/white X */
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 overflow-visible">
                        <path
                          d="M 3 8.5 h 4 l 5.2 -4.5 v 16 l -5.2 -4.5 h -4 a 1 1 0 0 1 -1 -1 v -5 a 1 1 0 0 1 1 -1 z"
                          fill={iconColor}
                        />
                        <line
                          x1="15.5"
                          y1="8.5"
                          x2="21.5"
                          y2="15.5"
                          stroke={iconColor}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="21.5"
                          y1="8.5"
                          x2="15.5"
                          y2="15.5"
                          stroke={iconColor}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                    <span>{isMuted ? "Unmute notifications" : "Mute notifications"}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

