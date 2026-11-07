"use client";

import { formatMessageTime } from "../hooks/usePersonalChatState";
import { ChatMediaCard } from "./ChatMediaCard";
import {
  formatCallDurationTwoUnits,
} from "./messageBubble/bubbleHelpers";
import { ChatCallLogBubble } from "./messageBubble/ChatCallLogBubble";
import { ChatVoiceNoteBubble } from "./messageBubble/ChatVoiceNoteBubble";
import { ChatStatusIndicator } from "./messageBubble/ChatStatusIndicator";
import { ChatMiniCheckbox } from "./messageBubble/ChatMiniCheckbox";

export { formatCallDurationTwoUnits };

export function ChatMessageBubble({
  item,
  myId,
  isMapDark,
  selectMode,
  selectedMsgIds,
  handleToggleSelectMsg,
  playingVoiceId,
  setPlayingVoiceId,
  onResendMessage,
  replyingTo,
  onOpenContextMenu,
}) {
  const isMe = String(item.senderId) === myId;
  const isSelected = selectedMsgIds.includes(item.id);
  const isReplyingTarget = replyingTo?.id === item.id;

  // Dedicated Call Log Bubble (Modularized Package Component)
  if (item.msgType === "call") {
    return (
      <ChatCallLogBubble
        item={item}
        isMe={isMe}
        isMapDark={isMapDark}
        selectMode={selectMode}
        isSelected={isSelected}
        isReplyingTarget={isReplyingTarget}
        handleToggleSelectMsg={handleToggleSelectMsg}
        onOpenContextMenu={onOpenContextMenu}
        onResendMessage={onResendMessage}
      />
    );
  }

  // Voice Note Message (Modularized Package Component)
  if (item.msgType === "voice") {
    return (
      <ChatVoiceNoteBubble
        item={item}
        isMe={isMe}
        isMapDark={isMapDark}
        selectMode={selectMode}
        isSelected={isSelected}
        isReplyingTarget={isReplyingTarget}
        playingVoiceId={playingVoiceId}
        setPlayingVoiceId={setPlayingVoiceId}
        handleToggleSelectMsg={handleToggleSelectMsg}
        onOpenContextMenu={onOpenContextMenu}
        onResendMessage={onResendMessage}
      />
    );
  }

  const isMedia =
    item.msgType === "media" || item.msgType === "video" || Boolean(item.mediaUrl);

  // Media Attachment Card (Photo / Video with 3D Flip & Typing Animation)
  if (isMedia) {
    return (
      <div
        onClick={() => {
          if (selectMode) handleToggleSelectMsg(item.id);
        }}
        className={`flex items-center gap-1.5 ${
          isMe ? "justify-end mr-1" : "justify-start ml-0.5"
        } ${selectMode ? "cursor-pointer" : ""} my-1.5`}
      >
        <ChatMiniCheckbox
          selectMode={selectMode}
          isSelected={isSelected}
          isMapDark={isMapDark}
          onToggleSelect={() => handleToggleSelectMsg(item.id)}
        />

        <div
          className={`transition-all duration-200 ${
            isSelected ? "scale-[1.035] shadow-lg z-10" : "scale-100"
          } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
        >
          <ChatMediaCard
            item={item}
            isMapDark={isMapDark}
            isMe={isMe}
            onOpenContextMenu={onOpenContextMenu}
          />

          {/* Sent time mark: bold Arial mini, consistent with voice note and call log */}
          <div className="flex justify-end mt-1 pr-1 select-none">
            <span
              style={{ fontFamily: "Arial, sans-serif" }}
              className={`text-[8.5px] font-black leading-none ${
                isMapDark
                  ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]"
                  : "text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]"
              }`}
            >
              {formatMessageTime(item.ts)}
            </span>
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

  // Standard Text Message Bubble
  return (
    <div
      onClick={() => {
        if (selectMode) handleToggleSelectMsg(item.id);
      }}
      className={`flex items-center gap-1.5 ${
        isMe ? "justify-end mr-1" : "justify-start ml-0.5"
      } ${selectMode ? "cursor-pointer" : ""} my-1`}
    >
      <ChatMiniCheckbox
        selectMode={selectMode}
        isSelected={isSelected}
        isMapDark={isMapDark}
        onToggleSelect={() => handleToggleSelectMsg(item.id)}
      />

      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenContextMenu?.(e, item);
        }}
        className={`relative max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs leading-snug shadow-sm border transition-all duration-200 ${
          isSelected ? "scale-[1.035] shadow-lg z-10" : "scale-100"
        } ${
          isMe
            ? item.status === "failed"
              ? isMapDark
                ? "bg-red-700/85 border-red-500 text-white rounded-tr-xs"
                : "bg-red-600/85 border-red-700 text-black rounded-tr-xs"
              : isMapDark
              ? "bg-black border-white/20 text-white rounded-tr-xs"
              : "bg-white border-black text-black rounded-tr-xs"
            : isMapDark
            ? "bg-[#161b22] border-white/15 text-white rounded-tl-xs"
            : "bg-[#f4f4f5] border-black text-black rounded-tl-xs"
        } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
      >
        {/* Reply Reference Card (standard Line/WA/IG quote) */}
        {item.replyTo && (
          <div
            className={`mb-1.5 px-2 py-1 rounded-md text-[10.5px] leading-tight select-none border-l-2 ${
              isMapDark
                ? "bg-white/10 border-white text-white/90"
                : "bg-black/5 border-black text-black/90"
            }`}
          >
            <p
              style={{ fontFamily: "Arial, sans-serif" }}
              className="font-bold text-[9.5px] opacity-80"
            >
              {item.replyTo.senderName || "Kalcerian"}
            </p>
            <p
              style={{ fontFamily: "Arial, sans-serif" }}
              className="truncate opacity-75 mt-0.5 text-[10px]"
            >
              {item.replyTo.text || "Pesan"}
            </p>
          </div>
        )}

        {/* Message Text */}
        <span className="break-words whitespace-pre-wrap pr-12">{item.text}</span>

        {/* Sent Time Mark (Bottom Right inside bubble) */}
        <span
          style={{ fontFamily: "Arial, sans-serif" }}
          className={`float-right ml-2 mt-1 text-[9.5px] font-bold leading-none select-none ${
            isMapDark ? "text-white/80" : "text-black/80"
          }`}
        >
          {formatMessageTime(item.ts)}
        </span>
      </div>

      {/* Status indicator outside the box, middle point aligned */}
      <ChatStatusIndicator
        isMe={isMe}
        item={item}
        isMapDark={isMapDark}
        onResendMessage={onResendMessage}
      />
    </div>
  );
}
