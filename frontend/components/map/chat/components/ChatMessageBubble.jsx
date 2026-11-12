"use client";

import { motion } from "framer-motion";
import { formatMessageTime } from "../hooks/usePersonalChatState";
import { ChatMediaCard } from "./ChatMediaCard";
import {
  formatCallDurationTwoUnits,
} from "./messageBubble/bubbleHelpers";
import { getReplyDisplayInfo } from "./messageBubble/replyHelpers";
import { ChatCallLogBubble } from "./messageBubble/ChatCallLogBubble";
import { ChatVoiceNoteBubble } from "./messageBubble/ChatVoiceNoteBubble";
import { ChatStatusIndicator } from "./messageBubble/ChatStatusIndicator";
import { ChatMiniCheckbox } from "./messageBubble/ChatMiniCheckbox";

export { formatCallDurationTwoUnits };

export function ChatMessageBubble({
  item,
  myId,
  isMapDark,
  events = [],
  selectMode,
  selectedMsgIds,
  handleToggleSelectMsg,
  playingVoiceId,
  setPlayingVoiceId,
  onResendMessage,
  replyingTo,
  onOpenContextMenu,
  onJumpToMessage,
  isNudged = false,
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
        isNudged={isNudged}
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
        isNudged={isNudged}
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

        <motion.div
          animate={isNudged ? { x: [0, 16, 0] } : { x: 0 }}
          transition={
            isNudged
              ? { duration: 0.62, ease: [0.33, 1, 0.68, 1] }
              : { duration: 0.25, ease: "easeOut" }
          }
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
        </motion.div>

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

      <motion.div
        animate={isNudged ? { x: [0, 16, 0] } : { x: 0 }}
        transition={
          isNudged
            ? { duration: 0.62, ease: [0.33, 1, 0.68, 1] }
            : { duration: 0.25, ease: "easeOut" }
        }
        className="relative max-w-[80%]"
      >
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenContextMenu?.(e, item);
          }}
          className={`relative rounded-xl px-2.5 py-1.5 text-xs leading-snug shadow-sm border transition-all duration-200 ${
            isSelected ? "scale-[1.035] shadow-lg z-10" : "scale-100"
          } ${
            isMe
              ? isMapDark
                ? "bg-black border-white/20 text-white rounded-tr-xs"
                : "bg-white border-black text-black rounded-tr-xs"
              : isMapDark
              ? "bg-[#161b22] border-white/15 text-white rounded-tl-xs"
              : "bg-[#f4f4f5] border-black text-black rounded-tl-xs"
          } ${isReplyingTarget ? "opacity-50" : "opacity-100"}`}
        >
          {/* Reply Reference Card (standard Line/WA/IG quote) */}
          {item.replyTo && (() => {
            const quoteInfo = getReplyDisplayInfo(item.replyTo);
            const isEventMedia = Boolean(quoteInfo.isEventMedia || item.replyTo?.isEventMedia);
            let isMediaDeleted = false;
            let activeMediaUrl = quoteInfo.mediaUrl || item.replyTo?.mediaUrl;
            let isVideo = Boolean(quoteInfo.isVideo || item.replyTo?.isVideo);
            let targetClipIndex = item.replyTo?.clipIndex !== undefined ? item.replyTo.clipIndex : null;

            if (isEventMedia) {
              const evId = item.replyTo?.eventId || quoteInfo.eventId;
              const clipId = item.replyTo?.clipId || quoteInfo.clipId;
              const targetEvent = (events || []).find(
                (e) => String(e.id) === String(evId) || String(e.id) === String(evId).replace(/^event_/, "")
              );
              if (!targetEvent || !Array.isArray(targetEvent.mediaItems)) {
                isMediaDeleted = true;
              } else {
                const foundClip = targetEvent.mediaItems.find(
                  (c) => (clipId && String(c.id) === String(clipId)) || (activeMediaUrl && String(c.url) === String(activeMediaUrl))
                );
                const clipUploadTs = Number(foundClip?.uploadedAt || item.replyTo?.uploadedAt || item.replyTo?.createdAt || 0);
                const clipExpireTs = Number(foundClip?.expiresAt || 0);
                const is24hExpired = (clipExpireTs > 0 && Date.now() >= clipExpireTs) ||
                                     (clipUploadTs > 0 && Date.now() - clipUploadTs >= 24 * 60 * 60 * 1000);
                if (!foundClip || is24hExpired) {
                  isMediaDeleted = true;
                } else {
                  activeMediaUrl = foundClip.url;
                  isVideo = Boolean(foundClip.isVideo);
                  targetClipIndex = targetEvent.mediaItems.indexOf(foundClip);
                }
              }
            }

            return (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    isEventMedia ||
                    quoteInfo.isEvent ||
                    item.replyTo?.isEvent ||
                    item.replyTo?.msgType === "event"
                  ) {
                    window.dispatchEvent(
                      new CustomEvent("kalceria:open-event-on-map", {
                        detail: {
                          eventId:
                            item.replyTo.eventId ||
                            quoteInfo.eventId ||
                            item.replyTo.id,
                          title:
                            item.replyTo.eventName ||
                            item.replyTo.title ||
                            quoteInfo.caption ||
                            item.replyTo.caption,
                          lat: item.replyTo.lat,
                          lng: item.replyTo.lng,
                          mediaIndex: isMediaDeleted ? null : targetClipIndex,
                        },
                      })
                    );
                    return;
                  }
                  if (
                    quoteInfo.isBroadcast ||
                    item.replyTo?.isBroadcast ||
                    item.replyTo?.msgType === "broadcast"
                  ) {
                    window.dispatchEvent(
                      new CustomEvent("kalceria:open-broadcast-on-map", {
                        detail: {
                          userId:
                            item.replyTo.userId ||
                            item.replyTo.creatorId ||
                            item.replyTo.senderId,
                          lat: item.replyTo.lat,
                          lng: item.replyTo.lng,
                        },
                      })
                    );
                    return;
                  }
                  onJumpToMessage?.(item.replyTo.id);
                }}
                className={`mb-1.5 px-2.5 py-1.5 rounded-md text-[10.5px] leading-tight select-none border-l-2 cursor-pointer transition-opacity hover:opacity-85 ${
                  isMapDark
                    ? "bg-white/10 border-white text-white/90"
                    : "bg-black/5 border-black text-black/90"
                }`}
                title={
                  quoteInfo.isEvent
                    ? "Ketuk untuk membuka event di peta"
                    : quoteInfo.isBroadcast
                    ? "Ketuk untuk membuka broadcast di peta"
                    : "Ketuk untuk menuju pesan asli"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      style={{ fontFamily: "Arial, sans-serif" }}
                      className="font-bold text-[9.5px] opacity-85 leading-tight truncate"
                    >
                      {quoteInfo.senderName}
                    </p>
                    {quoteInfo.isCall ? (
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="text-[10px] opacity-80 leading-tight truncate mt-0.5"
                      >
                        {quoteInfo.callTypePrefix}{" "}
                        <span className="font-bold">{quoteInfo.callLaunchedTime}</span>
                      </p>
                    ) : quoteInfo.isBroadcast ? (
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="text-[10px] opacity-80 leading-tight truncate mt-0.5"
                      >
                        Broadcast <span className="font-bold">{quoteInfo.broadcastDuration || "0m"}</span>
                      </p>
                    ) : quoteInfo.isEvent ? (
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="text-[10px] opacity-80 leading-tight truncate mt-0.5 font-normal not-italic"
                      >
                        Event
                      </p>
                    ) : (
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="text-[10px] opacity-80 leading-tight truncate mt-0.5"
                      >
                        {quoteInfo.typeLabel}
                      </p>
                    )}
                    {quoteInfo.isCall && quoteInfo.callDurationText ? (
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="text-[10px] opacity-85 leading-tight truncate mt-0.5 font-normal not-italic"
                      >
                        {quoteInfo.callDurationText}
                      </p>
                    ) : quoteInfo.isEvent && quoteInfo.caption ? (
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="text-[10px] italic font-bold opacity-85 leading-tight truncate mt-0.5"
                      >
                        &ldquo;{quoteInfo.caption}&rdquo;
                      </p>
                    ) : quoteInfo.caption ? (
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="text-[10px] italic opacity-85 leading-tight truncate mt-0.5 font-normal"
                      >
                        &ldquo;{quoteInfo.caption}&rdquo;
                      </p>
                    ) : null}
                  </div>
                  {isEventMedia && (
                    isMediaDeleted ? (
                      <div
                        className={`w-[36px] h-[36px] rounded-[5px] bg-[#6b7280]/60 backdrop-blur-md flex items-center justify-center shrink-0 select-none shadow-sm ${
                          isMapDark ? "text-black" : "text-white"
                        }`}
                        title="Media telah dihapus"
                      >
                        <span className="font-bold text-sm leading-none">?</span>
                      </div>
                    ) : (
                      <div className="w-[36px] h-[36px] rounded-[5px] overflow-hidden shrink-0 bg-black/40 flex items-center justify-center shadow-sm">
                        {isVideo ? (
                          <video
                            src={activeMediaUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover pointer-events-none"
                            onTimeUpdate={(e) => {
                              if (e.target.currentTime >= 4) {
                                e.target.currentTime = 0;
                              }
                            }}
                          />
                        ) : (
                          <img
                            src={activeMediaUrl}
                            alt=""
                            className="w-full h-full object-cover pointer-events-none select-none"
                            draggable={false}
                          />
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })()}

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
      </motion.div>

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
