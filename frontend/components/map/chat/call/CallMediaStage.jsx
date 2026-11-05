"use client";

import { motion, AnimatePresence } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";
import { formatCallDuration } from "../hooks/usePersonalCallState";

export function CallMediaStage({
  targetUser,
  currentUser,
  mode,
  status,
  seconds,
  isMapDark,
  avatarUrl,
  isMicMuted,
  isSpeakerOn,
  isCamOff,
  hasLocalStream,
  safetyCode,
  showSafetyTooltip,
  setShowSafetyTooltip,
  localVideoRef,
  remoteVideoRef,
}) {
  const displayName =
    targetUser?.displayName || targetUser?.name || targetUser?.nickname || "Kalcerian";
  const remoteVideoSrc =
    targetUser?.coverType === "video" && targetUser?.coverImage
      ? targetUser.coverImage
      : "/vid_login1.mp4";

  return (
    <>
      {/* Background Layer: Blurred Backdrop for Voice Call, or Remote Video Stream for Video Call */}
      {mode === "video" ? (
        <div className="absolute inset-0 z-0 overflow-hidden bg-black">
          {status === "connected" ? (
            <video
              ref={remoteVideoRef}
              src={remoteVideoSrc}
              autoPlay
              loop
              muted={!isSpeakerOn}
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <ContentImage
                src={avatarUrl(targetUser)}
                alt={displayName}
                width={180}
                height={180}
                className="w-full h-full object-cover blur-[22px] scale-125 opacity-45"
              />
            </div>
          )}
          <div
            className={`absolute inset-0 pointer-events-none ${
              status === "connected"
                ? "bg-gradient-to-b from-black/65 via-transparent to-black/75"
                : isMapDark
                ? "bg-black/65 backdrop-blur-xl"
                : "bg-white/75 backdrop-blur-xl"
            }`}
          />
        </div>
      ) : (
        /* Voice Call: Blurred Atmospheric Surface respecting Light/Dark Theme */
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <ContentImage
            src={avatarUrl(targetUser)}
            alt={displayName}
            width={180}
            height={180}
            className={`w-full h-full object-cover blur-[28px] scale-125 ${
              isMapDark ? "opacity-25" : "opacity-20"
            }`}
          />
          <div
            className={`absolute inset-0 backdrop-blur-2xl ${
              isMapDark
                ? "bg-gradient-to-b from-[#111b21]/85 via-[#0b141a]/80 to-[#111b21]/95"
                : "bg-gradient-to-b from-white/85 via-white/80 to-white/95"
            }`}
          />
        </div>
      )}

      {/* TOP BAR: Call Header */}
      <div className="relative z-10 pt-5 px-4 flex flex-col items-center text-center">
        <h3
          className={`font-sans font-bold text-base sm:text-lg tracking-tight truncate max-w-[260px] ${
            mode === "video" && status === "connected"
              ? "text-white drop-shadow"
              : isMapDark
              ? "text-white"
              : "text-black"
          }`}
        >
          {displayName}
        </h3>

        <p
          className={`text-xs font-medium mt-0.5 ${
            mode === "video" && status === "connected"
              ? "text-white/90 drop-shadow"
              : isMapDark
              ? "text-white/70"
              : "text-black/70"
          }`}
        >
          {status === "calling"
            ? "Calling..."
            : status === "ringing"
            ? "Ringing..."
            : formatCallDuration(seconds)}
        </p>
      </div>

      {/* CENTER: Avatar + Audio Pulse Rings (shown in Voice Call or before Video Call connects) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {(mode === "voice" || status !== "connected") && (
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={{
                scale: status === "connected" ? [1, 1.24, 1] : [1, 1.15, 1],
                opacity: status === "connected" ? [0.35, 0.08, 0.35] : [0.25, 0.05, 0.25],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute w-28 h-28 rounded-full border-2 ${
                isMapDark ? "border-emerald-400" : "border-black"
              }`}
            />
            <motion.div
              animate={{
                scale: status === "connected" ? [1, 1.42, 1] : [1, 1.28, 1],
                opacity: status === "connected" ? [0.22, 0.03, 0.22] : [0.15, 0.02, 0.15],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
              className={`absolute w-28 h-28 rounded-full border ${
                isMapDark ? "border-emerald-400" : "border-black"
              }`}
            />

            <div
              className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 shadow-xl ${
                isMapDark ? "border-white bg-[#161b22]" : "border-black bg-white"
              }`}
            >
              <ContentImage
                src={avatarUrl(targetUser)}
                alt={displayName}
                width={120}
                height={120}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Voice Call Live Waveform Bars when Connected */}
        {mode === "voice" && status === "connected" && (
          <div className="mt-6 flex items-center gap-1 h-6">
            {[0.4, 0.85, 0.6, 1, 0.5, 0.9, 0.7, 0.45, 0.8].map((peak, idx) => (
              <motion.span
                key={idx}
                animate={{
                  height: isMicMuted ? ["4px", "4px"] : ["5px", `${Math.round(peak * 20)}px`, "5px"],
                }}
                transition={{
                  duration: 0.7 + (idx % 3) * 0.18,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`w-1 rounded-full ${
                  isMapDark ? "bg-emerald-400" : "bg-black"
                }`}
              />
            ))}
          </div>
        )}

        {/* Picture-in-Picture (PiP) Self Camera Preview for Video Call (Borderless & Fontless) */}
        {mode === "video" && (
          <div
            className={`absolute bottom-3 right-3 w-[84px] h-[116px] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${
              isMapDark ? "bg-[#161b22]" : "bg-white"
            }`}
          >
            {hasLocalStream && !isCamOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex items-center justify-center p-2 text-center">
                <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm">
                  <ContentImage
                    src={avatarUrl(currentUser || { name: "Me" })}
                    alt="Self"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

