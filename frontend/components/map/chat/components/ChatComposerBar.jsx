"use client";

import { motion, AnimatePresence } from "framer-motion";
import { QUICK_EMOJIS } from "../hooks/usePersonalChatState";

export function ChatComposerBar({
  isMapDark,
  inputText,
  setInputText,
  mediaError,
  setMediaError,
  showEmojiBar,
  setShowEmojiBar,
  selectMode,
  fileInputRef,
  isUploadingMedia,
  isRecordingVoice,
  setIsRecordingVoice,
  recordingSeconds,
  handleSendText,
  handleFileUpload,
  handleFinishVoiceNote,
}) {
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

      {/* Quick Emoji Picker Bar */}
      <AnimatePresence>
        {showEmojiBar && !selectMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-2.5 py-1.5 flex items-center justify-between border-t overflow-hidden shrink-0 ${
              isMapDark ? "bg-[#202c33] border-white/10" : "bg-white border-black"
            }`}
          >
            {QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setInputText((prev) => prev + em)}
                className="text-base hover:scale-125 transition-transform cursor-pointer"
              >
                {em}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Web Input Pill */}
      <form
        onSubmit={handleSendText}
        className={`px-2.5 py-2 border-t shrink-0 flex items-center gap-1.5 ${
          isMapDark ? "bg-[#202c33] border-white/15" : "bg-white border-black"
        }`}
      >
        {/* Hidden File Input (PNG, JPEG, MP4 up to 10MB) */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".png,.jpg,.jpeg,.mp4,image/png,image/jpeg,video/mp4"
          className="hidden"
          onChange={handleFileUpload}
        />

        {isRecordingVoice ? (
          /* Active Voice Note Recording Bar */
          <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-full border border-red-500/60 bg-red-500/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-ping" />
              <span className="text-xs font-mono font-semibold text-[#ef4444]">
                Recording 0:{String(recordingSeconds).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRecordingVoice(false)}
                className="text-xs font-semibold opacity-75 hover:opacity-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinishVoiceNote}
                className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                  isMapDark ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
              isMapDark
                ? "bg-[#2a3942] border-white/15 text-white"
                : "bg-white border-black text-black"
            }`}
          >
            {/* 1. File / Attachment Icon (Paperclip) */}
            <button
              type="button"
              disabled={isUploadingMedia}
              onClick={() => fileInputRef.current?.click()}
              title="Attach photo or video (.png, .jpeg, .mp4 max 10MB)"
              className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 disabled:opacity-40"
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
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* 2. Emoji Sticker Icon */}
            <button
              type="button"
              onClick={() => setShowEmojiBar((p) => !p)}
              title="Emoji"
              className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0"
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
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (mediaError) setMediaError("");
              }}
              placeholder={isUploadingMedia ? "Uploading media..." : "Type a message"}
              className={`flex-1 bg-transparent text-xs outline-none min-w-0 ${
                isMapDark
                  ? "text-white placeholder:text-white/50"
                  : "text-black placeholder:text-black/55"
              }`}
            />

            {/* 4. Right Icon: Send Arrow (when text present) OR Voice Note Microphone (Filled Black in Light Mode, Filled White in Dark Mode) */}
            {inputText.trim().length > 0 ? (
              <button
                type="submit"
                title="Send message"
                className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={iconColor}>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                title="Record voice note"
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

