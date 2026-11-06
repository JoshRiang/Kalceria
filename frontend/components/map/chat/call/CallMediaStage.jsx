"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { formatCallDuration } from "../hooks/usePersonalCallState";

// Static distributed mini Coki faces with fixed random tilt angles (constant across all calls)
// Notice: The top center area (Name, Calling/Ringing status, and Call Timer) is naturally kept completely clean and trimmed
const STATIC_COKI_VOICE_BG = [
  { top: "7%", left: "12%", rotate: -14 },
  { top: "7%", left: "84%", rotate: -8 },
  { top: "25%", left: "28%", rotate: 22 },
  { top: "27%", left: "72%", rotate: -18 },
  { top: "42%", left: "9%", rotate: 12 },
  { top: "44%", left: "88%", rotate: -15 },
  { top: "58%", left: "22%", rotate: -20 },
  { top: "60%", left: "74%", rotate: 18 },
  { top: "76%", left: "12%", rotate: 10 },
  { top: "78%", left: "48%", rotate: -12 },
  { top: "80%", left: "84%", rotate: 24 },
  { top: "92%", left: "30%", rotate: -6 },
  { top: "93%", left: "68%", rotate: 15 },
];

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
  isBadConnection = false,
  localVideoRef,
  remoteVideoRef,
}) {
  const displayName =
    targetUser?.displayName || targetUser?.name || targetUser?.nickname || "Kalcerian";
  const hasRemoteVideo = Boolean(
    targetUser?.coverType === "video" && targetUser?.coverImage
  );
  const remoteVideoSrc = hasRemoteVideo ? targetUser.coverImage : null;
  const [videoProgress, setVideoProgress] = useState(0);

  const handleVideoTimeUpdate = (e) => {
    const video = e.currentTarget;
    if (video.duration && Number.isFinite(video.duration) && video.duration > 0) {
      setVideoProgress(video.currentTime / video.duration);
    }
  };

  return (
    <>
      {/* Background Layer: White background with static mini-Coki faces for Voice Call, or Video Stream for Video Call */}
      {mode === "video" ? (
        hasRemoteVideo ? (
          <div className="absolute inset-0 z-0 overflow-hidden bg-black">
            {status === "connected" ? (
              <>
                <video
                  ref={remoteVideoRef}
                  src={remoteVideoSrc}
                  autoPlay
                  loop
                  muted={!isSpeakerOn}
                  playsInline
                  onTimeUpdate={handleVideoTimeUpdate}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    isBadConnection ? "filter blur-[12px] scale-105 opacity-80" : ""
                  }`}
                />
                {/* Coherent white progress line matching real video duration */}
                <div className="absolute bottom-16 left-4 right-4 h-[2px] rounded-full bg-white/30 overflow-hidden z-20 pointer-events-none">
                  <div
                    style={{ width: `${Math.min(100, Math.max(0, videoProgress * 100))}%` }}
                    className="h-full bg-white transition-all duration-100 ease-linear"
                  />
                </div>
              </>
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
          /* Fallback Stage when Peer has NO Video uploaded:
             Light mode: Pure black screen
             Dark mode: Pure white screen with profile photo centered. NO propagating line. */
          <div
            className={`absolute inset-0 z-0 flex flex-col items-center justify-center transition-colors duration-300 ${
              isMapDark ? "bg-white" : "bg-black"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 shadow-2xl ${
                  isMapDark ? "border-black bg-white" : "border-white bg-[#161b22]"
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
          </div>
        )
      ) : (
        /* Voice Call: Pure White Background patterned with static mini Coki faces, naturally trimmed around the top header */
        <div
          className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-white"
          style={{
            WebkitMaskImage:
              "radial-gradient(ellipse 170px 90px at 50% 9%, transparent 0%, transparent 65%, black 100%)",
            maskImage:
              "radial-gradient(ellipse 170px 90px at 50% 9%, transparent 0%, transparent 65%, black 100%)",
          }}
        >
          {STATIC_COKI_VOICE_BG.map((pos, idx) => (
            <div
              key={`coki-bg-${idx}`}
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                transform: `translate(-50%, -50%) rotate(${pos.rotate}deg)`,
              }}
              className="w-10 h-13 pointer-events-none opacity-25 select-none"
            >
              <Image
                src="/ForChat/BackgroundVoiceTrimmed.png"
                alt=""
                width={40}
                height={52}
                className="w-full h-full object-contain"
                priority={idx < 4}
              />
            </div>
          ))}
        </div>
      )}

      {/* TOP BAR: Call Header */}
      <div className="relative z-10 pt-5 px-4 flex flex-col items-center text-center">
        <h3
          className={`font-sans font-bold text-base sm:text-lg tracking-tight truncate max-w-[260px] ${
            mode === "video"
              ? hasRemoteVideo
                ? "text-white drop-shadow"
                : isMapDark
                ? "text-black"
                : "text-white"
              : mode === "voice"
              ? "text-black"
              : isMapDark
              ? "text-white"
              : "text-black"
          }`}
        >
          {displayName}
        </h3>

        {/* Live Call Timer & Status: Arial bold, tiny size matching chat timestamp */}
        <p
          style={{ fontFamily: "Arial, sans-serif" }}
          className={`font-bold text-[9.5px] sm:text-[10px] tracking-tight mt-1 ${
            mode === "video"
              ? hasRemoteVideo
                ? "text-white/90 drop-shadow"
                : isMapDark
                ? "text-black/80"
                : "text-white/80"
              : mode === "voice"
              ? "text-black/80"
              : isMapDark
              ? "text-white/70"
              : "text-black/70"
          }`}
        >
          {status === "ended"
            ? "Call Ended"
            : status === "calling"
            ? "Calling..."
            : status === "ringing"
            ? "Ringing..."
            : formatCallDuration(seconds)}
        </p>
      </div>

      {/* CENTER: Avatar + Audio Pulse Rings (Smooth enlargement & movement to center on answer) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {(mode === "voice" || (mode === "video" && hasRemoteVideo && status !== "connected")) && (
          <motion.div
            animate={{
              scale: status === "connected" ? 1.25 : 0.95,
              y: status === "connected" ? 0 : -20,
            }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 24,
            }}
            className="relative flex items-center justify-center"
          >
            <motion.div
              animate={{
                scale: status === "connected" ? [1, 1.24, 1] : [1, 1.15, 1],
                opacity: status === "connected" ? [0.35, 0.08, 0.35] : [0.25, 0.05, 0.25],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute w-28 h-28 rounded-full border-2 ${
                mode === "voice" ? "border-black/60" : isMapDark ? "border-emerald-400" : "border-black"
              }`}
            />
            <motion.div
              animate={{
                scale: status === "connected" ? [1, 1.42, 1] : [1, 1.28, 1],
                opacity: status === "connected" ? [0.22, 0.03, 0.22] : [0.15, 0.02, 0.15],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
              className={`absolute w-28 h-28 rounded-full border ${
                mode === "voice" ? "border-black/40" : isMapDark ? "border-emerald-400" : "border-black"
              }`}
            />

            {/* Avatar or Graceful Warning Sign on Bad Connection */}
            {isBadConnection ? (
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center animate-pulse">
                <svg viewBox="0 0 24 24" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-xl" fill="none">
                  <mask id="warn-mask-voice">
                    <rect width="24" height="24" fill="white" />
                    <rect x="11" y="9" width="2" height="5" rx="1" fill="black" />
                    <circle cx="12" cy="17" r="1.1" fill="black" />
                  </mask>
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    fill="#ffd60a"
                    mask="url(#warn-mask-voice)"
                  />
                </svg>
              </div>
            ) : (
              <div
                className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 shadow-xl ${
                  mode === "voice"
                    ? "border-black bg-white"
                    : isMapDark
                    ? "border-white bg-[#161b22]"
                    : "border-black bg-white"
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
            )}
          </motion.div>
        )}

        {/* Video Call Center Graceful Warning Sign when Connection is Bad */}
        {mode === "video" && isBadConnection && status === "connected" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none animate-pulse">
            <svg viewBox="0 0 24 24" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl" fill="none">
              <mask id="warn-mask-video">
                <rect width="24" height="24" fill="white" />
                <rect x="11" y="9" width="2" height="5" rx="1" fill="black" />
                <circle cx="12" cy="17" r="1.1" fill="black" />
              </mask>
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                fill="#ffd60a"
                mask="url(#warn-mask-video)"
              />
            </svg>
            <p
              style={{ fontFamily: "Arial, sans-serif" }}
              className="text-[11px] font-bold text-white drop-shadow mt-2 tracking-tight"
            >
              Koneksi Buruk
            </p>
          </div>
        )}

        {/* Voice Call Live Waveform Bars when Connected */}
        {mode === "voice" && status === "connected" && (
          <div className="mt-8 flex items-center gap-1 h-6">
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
                className="w-1 rounded-full bg-black"
              />
            ))}
          </div>
        )}

        {/* Picture-in-Picture (PiP) Self Camera Preview for Video Call */}
        {mode === "video" && (
          <div
            className={`absolute bottom-3 right-3 w-[84px] h-[116px] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/20 ${
              isMapDark ? "bg-[#161b22]" : "bg-white"
            }`}
          >
            {hasLocalStream && !isCamOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
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
