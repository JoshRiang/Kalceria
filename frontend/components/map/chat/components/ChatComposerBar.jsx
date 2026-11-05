"use client";

import { motion, AnimatePresence } from "framer-motion";

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
  onOpenCameraModal,
  handleStartVoiceNote,
  handleCancelVoiceNote,
  handleFinishVoiceNote,
  handleSendText,
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

      {/* Input Form Pill */}
      <form
        onSubmit={handleSendText}
        className={`px-2.5 py-2 border-t shrink-0 flex items-center gap-1.5 ${
          isMapDark ? "bg-[#202c33] border-white/15" : "bg-white border-black"
        }`}
      >
        {isRecordingVoice ? (
          /* Active Voice Note Recording Bar with Real-Time Audio Waveform */
          <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-full border border-red-500/60 bg-red-500/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-ping shrink-0" />
              <span className="text-xs font-mono font-semibold text-[#ef4444] shrink-0">
                0:{String(recordingSeconds).padStart(2, "0")}
              </span>

              {/* Dynamic waveform bars sampled from microphone in real time */}
              <div className="flex items-center gap-0.5 h-6 overflow-hidden max-w-[140px] px-1 select-none">
                {(liveWaveform && liveWaveform.length > 0
                  ? liveWaveform.slice(-24)
                  : [8, 8, 8, 8, 8]
                ).map((val, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${Math.max(3.5, (val / 100) * 22)}px` }}
                    className="w-1 bg-[#ef4444] rounded-full transition-all duration-75 shrink-0"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelVoiceNote}
                className="text-xs font-semibold opacity-75 hover:opacity-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFinishVoiceNote}
                className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                  isMapDark ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                Kirim
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
            {/* 1. Camera Icon (Replaces Add File, same black/white border styling) */}
            <button
              type="button"
              disabled={isUploadingMedia}
              onClick={onOpenCameraModal}
              title="Ambil foto atau rekam video (maks 1 menit)"
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
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
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
              placeholder={
                isUploadingMedia
                  ? "Mengunggah media..."
                  : placeholderText || "Ketik pesan..."
              }
              className={`flex-1 bg-transparent text-xs outline-none min-w-0 ${
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
