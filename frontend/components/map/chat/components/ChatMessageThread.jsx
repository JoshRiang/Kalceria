"use client";

import { useState } from "react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatMessageContextMenu } from "./ChatMessageContextMenu";

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
  onResendMessage,
  replyingTo,
  onReplyMessage,
  onCopyMessage,
  onDeleteMessage,
}) {
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    message: null,
  });

  const handleOpenContextMenu = (e, message) => {
    // If in select mode, do not open context menu; selection takes precedence
    if (selectMode) return;
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      message,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

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

      {/* Scrollable Message Thread: Optimized with GPU acceleration & low-latency scrolling */}
      <div
        ref={messagesEndRef}
        style={{ WebkitOverflowScrolling: "touch" }}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-1.5 modern-kalcerian-scrollbar overscroll-contain transform-gpu will-change-scroll"
      >
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
              /* Floating Sticky Date/Time Mark */
              <div key={item.id} className="sticky top-2 z-20 flex justify-center my-1.5 pointer-events-none">
                <span
                  className={`px-3 py-0.5 rounded-md text-[10.5px] font-medium border shadow-md backdrop-blur-md pointer-events-auto ${
                    isMapDark
                      ? "bg-[#182229]/95 border-white/15 text-white/85 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      : "bg-white/95 border-black text-black shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
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
              onResendMessage={onResendMessage}
              replyingTo={replyingTo}
              onOpenContextMenu={handleOpenContextMenu}
            />
          );
        })}
      </div>

      {/* Floating Right-Click Context Menu */}
      <ChatMessageContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        targetMessage={contextMenu.message}
        isMapDark={isMapDark}
        onClose={handleCloseContextMenu}
        onReply={(msg) => onReplyMessage?.(msg)}
        onCopy={(msg) => onCopyMessage?.(msg)}
        onDelete={(msg) => onDeleteMessage?.([msg.id])}
      />
    </div>
  );
}
