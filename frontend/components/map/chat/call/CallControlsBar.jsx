"use client";

export function CallControlsBar({
  mode,
  isMapDark,
  isSpeakerOn,
  setIsSpeakerOn,
  isCamOff,
  setIsCamOff,
  isMicMuted,
  setIsMicMuted,
  onSwitchMode,
  handleHangup,
}) {
  return (
    <div className="relative z-10 px-4 pb-4 pt-2">
      <div
        className={`flex items-center justify-evenly py-2.5 px-3 rounded-2xl border backdrop-blur-md ${
          isMapDark
            ? "bg-[#161b22]/90 border-white/20"
            : "bg-white/95 border-black shadow-sm"
        }`}
      >
        {/* 1. Toggle Speaker */}
        <button
          type="button"
          onClick={() => setIsSpeakerOn((p) => !p)}
          title={isSpeakerOn ? "Mute Speaker" : "Unmute Speaker"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            !isSpeakerOn
              ? isMapDark
                ? "bg-white text-black border-white"
                : "bg-black text-white border-black"
              : isMapDark
              ? "bg-white/10 text-white border-white/15 hover:bg-white/20"
              : "bg-black/5 text-black border-black/15 hover:bg-black/10"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </button>

        {/* 2. Switch Voice <-> Video Call */}
        <button
          type="button"
          onClick={() => {
            if (mode === "video") {
              setIsCamOff((p) => !p);
            } else {
              onSwitchMode?.("video");
            }
          }}
          title={mode === "video" ? (isCamOff ? "Turn Camera On" : "Turn Camera Off") : "Switch to Video Call"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            mode === "video" && isCamOff
              ? isMapDark
                ? "bg-white text-black border-white"
                : "bg-black text-white border-black"
              : isMapDark
              ? "bg-white/10 text-white border-white/15 hover:bg-white/20"
              : "bg-black/5 text-black border-black/15 hover:bg-black/10"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </button>

        {/* 3. Mute Microphone */}
        <button
          type="button"
          onClick={() => setIsMicMuted((p) => !p)}
          title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            isMicMuted
              ? isMapDark
                ? "bg-white text-black border-white"
                : "bg-black text-white border-black"
              : isMapDark
              ? "bg-white/10 text-white border-white/15 hover:bg-white/20"
              : "bg-black/5 text-black border-black/15 hover:bg-black/10"
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            {isMicMuted ? (
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            ) : (
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            )}
          </svg>
        </button>

        {/* 4. End Call Button (Red) */}
        <button
          type="button"
          onClick={handleHangup}
          title="End Call"
          className="w-10 h-10 rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

