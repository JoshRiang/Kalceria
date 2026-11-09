"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmoothWaveform } from "./composer/SmoothWaveform";
import { getReplyDisplayInfo } from "./messageBubble/replyHelpers";

export function ChatComposerBar({
  isMapDark,
  inputText,
  setInputText,
  placeholderText,
  mediaError,
  setMediaError,
  showEmojiBar,
  setShowEmojiBar,
  selectMode,
  isUploadingMedia,
  isRecordingVoice,
  recordingSeconds,
  liveWaveform = [],
  replyingTo,
  onCancelReply,
  onOpenCameraModal,
  handleStartVoiceNote,
  handleCancelVoiceNote,
  handleFinishVoiceNote,
  handleSendText,
}) {
  const inputRef = useRef(null);
  const iconColor = isMapDark ? "#ffffff" : "#000000";

  return (
    <>
      {/* Surface Media Validation Error (Consolas Red, No Outer Box) */}
      {mediaError && (
        <div
          style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
          className={`px-3 py-1 text-red-500 text-[12px] font-normal tracking-tight select-none border-t ${
            isMapDark ? "bg-[#202c33] border-white/10" : "bg-white border-black"
          }`}
        >
          {mediaError}
        </div>
      )}

      {/* Reply Banner when user is replying to a message */}
      {replyingTo && (() => {
        const replyInfo = getReplyDisplayInfo(replyingTo);
        return (
          <div
            className={`relative flex items-stretch justify-between text-xs select-none border-t border-b transition-all ${
              isMapDark
                ? "bg-[#182229] text-white border-white/10"
                : "bg-[#f4f5f7] text-black border-black/10"
            }`}
          >
            {/* Left: Reply curved arrow icon centered in container, self-stretch */}
            <div className="flex items-center justify-center pl-3 pr-2.5 self-stretch shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 opacity-80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 15L3 9m0 0l6-6M3 9h11a6 6 0 0 1 6 6v3" />
              </svg>
            </div>

            {/* Thin Dashed Vertical Divider: touches top edge & bottom edge completely */}
            <div
              className={`w-0 self-stretch border-r border-dashed shrink-0 my-0 ${
                isMapDark ? "border-white/35" : "border-black/30"
              }`}
            />

            {/* Middle: Reply Info */}
            <div className="min-w-0 flex-1 py-1.5 pl-2.5 pr-2 flex flex-col justify-center">
              <p
                style={{ fontFamily: "Arial, sans-serif" }}
                className="font-bold text-[10.5px] leading-tight truncate"
              >
                {replyInfo.senderName}
              </p>
              {replyInfo.isCall ? (
                <p
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className="text-[10px] opacity-80 truncate leading-tight mt-0.5"
                >
                  {replyInfo.callTypePrefix}{" "}
                  <span className="font-bold">{replyInfo.callLaunchedTime}</span>
                </p>
              ) : replyInfo.isBroadcast ? (
                <p
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className="text-[10px] opacity-80 truncate leading-tight mt-0.5"
                >
                  Broadcast <span className="font-bold">{replyInfo.broadcastDuration || "0m"}</span>
                </p>
              ) : (
                <p
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className="text-[10px] opacity-80 truncate leading-tight mt-0.5"
                >
                  {replyInfo.typeLabel}
                </p>
              )}
              {replyInfo.isCall && replyInfo.callDurationText ? (
                <p
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className="text-[10px] opacity-85 truncate leading-tight mt-0.5 font-normal not-italic"
                >
                  {replyInfo.callDurationText}
                </p>
              ) : replyInfo.caption ? (
                <p
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className="text-[10px] italic opacity-85 truncate leading-tight mt-0.5 font-normal"
                >
                  &ldquo;{replyInfo.caption}&rdquo;
                </p>
              ) : null}
            </div>

            {/* Right: Cancel Button */}
            <div className="flex items-center pr-3 shrink-0 self-stretch">
              <button
                type="button"
                onClick={onCancelReply}
                className="p-1 rounded-full hover:bg-current/10 cursor-pointer text-xs opacity-65 hover:opacity-100 transition-opacity"
                title="Batal balas"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })()}

      {/* Input Form Pill */}
      <form
        onSubmit={handleSendText}
        className={`px-2.5 py-2 shrink-0 flex items-center gap-1.5 ${
          isMapDark ? "bg-[#202c33]" : "bg-white"
        }`}
      >
        {isRecordingVoice ? (
          /* Active Voice Note Recording Bar: Center-aligned, no outer box, slim vertical lines, black X cancel, black triangle send */
          <div className="flex-1 flex items-center justify-between px-2 py-1 select-none min-w-0">
            {/* Recording Time pinned left */}
            <span
              style={{ fontFamily: "Arial, sans-serif" }}
              className={`text-[9.5px] sm:text-[10px] font-bold tracking-tight shrink-0 mr-2.5 ${
                isMapDark ? "text-white/70" : "text-black/70"
              }`}
            >
              0:{String(recordingSeconds).padStart(2, "0")}
            </span>

            {/* Dynamic waveform: continuously scrolling, eased canvas bars CENTERED in the middle */}
            <SmoothWaveform
              samples={liveWaveform}
              isMapDark={isMapDark}
              className="flex-1 h-6 px-1"
            />

            {/* Action Buttons: Cancel is black 'X', Send is black triangle icon */}
            <div className="flex items-center gap-2 shrink-0 pl-2">
              {/* Batal: black X icon */}
              <button
                type="button"
                onClick={handleCancelVoiceNote}
                title="Batal"
                className={`p-1.5 rounded-full transition-transform hover:scale-110 active:scale-90 cursor-pointer ${
                  isMapDark ? "text-white hover:bg-white/10" : "text-black hover:bg-black/5"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Kirim: black triangle send icon */}
              <button
                type="button"
                onClick={handleFinishVoiceNote}
                title="Kirim pesan suara"
                className={`p-1.5 rounded-full transition-transform hover:scale-110 active:scale-90 cursor-pointer ${
                  isMapDark ? "text-white hover:bg-white/10" : "text-black hover:bg-black/5"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.focus()}
            className={`flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-text pointer-events-auto select-auto ${
              isMapDark
                ? "bg-[#202c33] shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.5),inset_0_0_1px_rgba(255,255,255,0.08)] text-white"
                : "bg-[#f0f2f5] shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.12),inset_0_0_1px_rgba(0,0,0,0.12)] text-black"
            }`}
          >
            {/* 1. Camera Icon (Replaces Add File, same black/white border styling) */}
            <button
              type="button"
              disabled={isUploadingMedia}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenCameraModal?.(e);
              }}
              title="Ambil foto atau rekam video (maks 1 menit)"
              className="p-1.5 -m-0.5 transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-[17px] h-[17px]"
                fill="none"
                stroke={iconColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>

            {/* 2. Emoji Sticker Icon */}
            <button
              type="button"
              data-emoji-trigger="true"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiBar((p) => !p);
              }}
              title="Emoji"
              className="p-1.5 -m-0.5 transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-[17px] h-[17px]"
                fill="none"
                stroke={iconColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            {/* 3. Message Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (mediaError) setMediaError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText(e);
                }
              }}
              placeholder={
                isUploadingMedia
                  ? "Mengunggah media..."
                  : placeholderText || "Ketik pesan..."
              }
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={`flex-1 bg-transparent text-xs outline-none min-w-0 select-text cursor-text pointer-events-auto ${
                isMapDark
                  ? "text-white placeholder:text-white/50"
                  : "text-black placeholder:text-black/55"
              }`}
            />

            {/* 4. Send Arrow OR Voice Note Microphone */}
            {inputText.trim().length > 0 ? (
              <button
                type="submit"
                title="Kirim pesan"
                className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={iconColor}>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartVoiceNote}
                title="Rekam Voice Note (Mikrofon)"
                className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={iconColor}>
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </form>
    </>
  );
}
