"use client";

import { formatCallDurationTwoUnits } from "./bubbleHelpers";
import { ChatStatusIndicator } from "./ChatStatusIndicator";
import { ChatMiniCheckbox } from "./ChatMiniCheckbox";

export function ChatCallLogBubble({
  item,
  isMe,
  isMapDark,
  selectMode,
  isSelected,
  isReplyingTarget,
  handleToggleSelectMsg,
  onOpenContextMenu,
  onResendMessage,
}) {
  const isVideo = item.callMode === "video";
  const durationText = formatCallDurationTwoUnits(item.callDuration || 0);

  return (
    <div
      onClick={() => {
        if (selectMode) handleToggleSelectMsg(item.id);
      }}
      className={`flex items-center gap-1.5 ${
        isMe ? "justify-end mr-1" : "justify-start ml-0.5"
      } ${selectMode ? "cursor-pointer" : ""} my-2.5`}
    >
      <ChatMiniCheckbox
        selectMode={selectMode}
        isSelected={isSelected}
        isMapDark={isMapDark}
        onToggleSelect={() => handleToggleSelectMsg(item.id)}
      />

      {/* Timestamp aligned to the LEFT of the Phone / Video Icon */}
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenContextMenu?.(e, item);
        }}
        className={`flex items-center gap-2 select-none pr-1 transition-all duration-200 ${
          isSelected ? "scale-[1.04]" : "scale-100"
        } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
      >
        <span
          style={{ fontFamily: "Arial, sans-serif" }}
          className={`text-[8.5px] sm:text-[9px] font-black tracking-tight select-none leading-none ${
            isMapDark
              ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
              : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
          }`}
        >
          {durationText}
        </span>

        {/* Call Ended Icon: wrapped in a compact textured circle with thin crisp black border, uniform size */}
        <div
          className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center shrink-0 border border-black ${
            isMapDark
              ? "bg-[#21262d] text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.12),inset_0_-1px_1px_rgba(0,0,0,0.5),0_1.5px_4px_rgba(0,0,0,0.3)]"
              : "bg-[#f0f2f5] text-black shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_1.5px_4px_rgba(0,0,0,0.08)]"
          }`}
        >
          {isVideo ? (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.27.36-.66.25-1.01A11.36 11.36 0 0 1 8.56 4.4c0-.55-.45-1-1-1H4.07c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1z" />
            </svg>
          )}
        </div>
      </div>

      <ChatStatusIndicator
        isMe={isMe}
        item={item}
        isMapDark={isMapDark}
        onResendMessage={onResendMessage}
      />
    </div>
  );
}
