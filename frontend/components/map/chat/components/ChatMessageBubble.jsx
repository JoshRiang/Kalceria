"use client";

import { formatMessageTime } from "../hooks/usePersonalChatState";

export function ChatMessageBubble({
  item,
  myId,
  isMapDark,
  selectMode,
  selectedMsgIds,
  handleToggleSelectMsg,
  playingVoiceId,
  setPlayingVoiceId,
}) {
  const isMe = String(item.senderId) === myId;
  const isSelected = selectedMsgIds.includes(item.id);
  const isVideoMedia =
    item.mediaUrl &&
    (/\.(mp4|webm|ogg)($|\?)/i.test(item.mediaUrl) ||
      /^data:video/i.test(item.mediaUrl));

  return (
    <div
      onClick={() => {
        if (selectMode) handleToggleSelectMsg(item.id);
      }}
      className={`flex items-center gap-2 ${
        isMe ? "justify-end" : "justify-start"
      } ${selectMode ? "cursor-pointer" : ""}`}
    >
      {selectMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => handleToggleSelectMsg(item.id)}
          className="w-3.5 h-3.5 accent-black cursor-pointer shrink-0"
        />
      )}

      <div
        className={`relative max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs leading-snug shadow-sm border transition-all ${
          isSelected ? "ring-2 ring-[#ff006e]" : ""
        } ${
          isMe
            ? isMapDark
              ? "bg-[#005c4b] border-emerald-400/25 text-white rounded-tr-xs"
              : "bg-white border-black text-black rounded-tr-xs"
            : isMapDark
            ? "bg-[#202c33] border-white/15 text-white rounded-tl-xs"
            : "bg-[#f4f4f5] border-black text-black rounded-tl-xs"
        }`}
      >
        {/* Media Attachment Preview */}
        {item.mediaUrl && (
          <div className="mb-1.5 rounded-lg overflow-hidden border border-current/15 max-h-[180px]">
            {isVideoMedia ? (
              <video
                src={item.mediaUrl}
                controls
                playsInline
                className="w-full max-h-[180px] object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.mediaUrl}
                alt="Chat attachment"
                className="w-full max-h-[180px] object-cover"
              />
            )}
          </div>
        )}

        {/* Voice Note Bubble */}
        {item.msgType === "voice" ? (
          <div className="flex items-center gap-2 min-w-[165px] py-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPlayingVoiceId((prev) => (prev === item.id ? null : item.id));
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                isMapDark ? "bg-white text-black" : "bg-black text-white"
              }`}
            >
              {playingVoiceId === item.id ? (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current ml-0.5">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              )}
            </button>
            <div className="flex-1 flex items-center gap-0.5 h-4">
              {[4, 10, 7, 13, 6, 12, 8, 5, 11, 7, 9, 5].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}px` }}
                  className={`w-1 rounded-full ${
                    playingVoiceId === item.id
                      ? "bg-emerald-400 animate-pulse"
                      : isMapDark
                      ? "bg-white/70"
                      : "bg-black/75"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono opacity-80">
              0:{String(item.voiceDuration || 4).padStart(2, "0")}
            </span>
          </div>
        ) : (
          item.text && (
            <span className="break-words whitespace-pre-wrap pr-12">{item.text}</span>
          )
        )}

        {/* Timestamp + WhatsApp Double Check Ticks */}
        <span
          className={`inline-flex items-center gap-1 float-right ml-2 mt-1 text-[9.5px] leading-none select-none ${
            isMapDark ? "text-white/70" : "text-black/70"
          }`}
        >
          <span>{formatMessageTime(item.ts)}</span>
          {isMe && (
            <svg
              viewBox="0 0 16 11"
              className={`w-3.5 h-2.5 ${
                isMapDark ? "text-[#53bdeb]" : "text-black"
              }`}
              fill="currentColor"
            >
              <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.405-2.272a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .501.203.697.697 0 0 0 .546-.266l6.646-8.417a.497.497 0 0 0 .108-.299.441.441 0 0 0-.19-.374l-.337-.273zm3.61 0a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.134-.66.813 1.723 1.723a.724.724 0 0 0 .502.203.697.697 0 0 0 .546-.266l6.646-8.417a.497.497 0 0 0 .108-.299.441.441 0 0 0-.19-.374l-.4-.261z" />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
}

