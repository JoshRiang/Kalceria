"use client";

import { ChatMessageBubble } from "./ChatMessageBubble";

export function ChatMessageThread({
  groupedMessages,
  myId,
  isMapDark,
  selectMode,
  selectedMsgIds,
  handleToggleSelectMsg,
  playingVoiceId,
  setPlayingVoiceId,
  nextCursor,
  isLoadingOlder,
  loadOlderMessages,
  messagesEndRef,
}) {
  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* BG_PersonalChat.jpg Background Layer (~60% opacity / reduced by 40% for soft clarity) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-opacity duration-300"
        style={{
          backgroundImage: "url('/BG_PersonalChat.jpg')",
          opacity: isMapDark ? 0.45 : 0.58,
        }}
      />
      {/* Subtle Theme Contrast Veil so text bubbles remain super clear while keeping the BG pattern soft */}
      <div
        className={`absolute inset-0 z-0 pointer-events-none ${
          isMapDark ? "bg-[#0b141a]/45" : "bg-white/30"
        }`}
      />

      {/* Scrollable Message Thread */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-1.5 modern-kalcerian-scrollbar overscroll-contain">
        {/* E2EE Security Pill */}
        <div className="flex justify-center my-1">
          <div
            className={`px-2.5 py-1 rounded-lg text-[10px] leading-snug text-center max-w-[92%] border shadow-xs flex items-center justify-center gap-1 ${
              isMapDark
                ? "bg-[#182229]/95 border-white/15 text-[#ffd279]"
                : "bg-white/95 border-black text-black"
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current shrink-0">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            <span>Messages and calls are end-to-end encrypted.</span>
          </div>
        </div>

        {/* Cursor Pagination for Cold Archive */}
        {nextCursor && (
          <div className="flex justify-center my-1">
            <button
              type="button"
              disabled={isLoadingOlder}
              onClick={loadOlderMessages}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-opacity cursor-pointer disabled:opacity-50 ${
                isMapDark
                  ? "bg-[#182229]/90 border-white/20 text-white hover:bg-[#202c33]"
                  : "bg-white/95 border-black text-black hover:bg-black/5"
              }`}
            >
              {isLoadingOlder ? "Loading older messages..." : "Load older messages"}
            </button>
          </div>
        )}

        {groupedMessages.map((item) => {
          if (item.type === "date_divider") {
            return (
              <div key={item.id} className="flex justify-center my-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-medium border shadow-xs ${
                    isMapDark
                      ? "bg-[#182229]/95 border-white/15 text-white/85"
                      : "bg-white/95 border-black text-black"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <ChatMessageBubble
              key={item.id}
              item={item}
              myId={myId}
              isMapDark={isMapDark}
              selectMode={selectMode}
              selectedMsgIds={selectedMsgIds}
              handleToggleSelectMsg={handleToggleSelectMsg}
              playingVoiceId={playingVoiceId}
              setPlayingVoiceId={setPlayingVoiceId}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

