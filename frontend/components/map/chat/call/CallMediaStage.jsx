"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  remoteAudioRef,
}) {
  const displayName =
    targetUser?.displayName || targetUser?.name || targetUser?.nickname || "Kalcerian";

  return (
    <>
      {/* Hidden WebRTC Remote Audio Receiver for Voice and Video Calls */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={!isSpeakerOn}
        className="hidden"
      />

      {/* Background Layer: Live Video Feed for Video Call, or Pure Opaque Base for Voice Call */}
      {mode === "video" ? (
        <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
          {/* Live Peer WebRTC Video Feed (Direct hardware stream, zero spoofing) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={!isSpeakerOn}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              status === "connected" ? "opacity-100" : "opacity-0 pointer-events-none"
            } ${isBadConnection ? "filter blur-[12px] scale-105" : ""}`}
          />

          {/* Calling / Ringing State: Peer Avatar centered while connecting */}
          {status !== "connected" && (
            <div className="absolute inset-0 z-1 flex flex-col items-center justify-center pointer-events-none">
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/80 shadow-2xl bg-[#161b22]">
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

          {/* Contrast Gradient Overlay */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              status === "connected"
                ? "bg-gradient-to-b from-black/55 via-transparent to-black/70"
                : isMapDark
                ? "bg-black/65 backdrop-blur-xl"
                : "bg-white/75 backdrop-blur-xl"
            }`}
          />
        </div>
      ) : (
        /* Voice Call: Solid 100% Opaque White Base Layer + Coki Faces Pattern trimmed naturally around top header */
        <>
          {/* 1. Pure Opaque White Base: Absolutely zero leakage from chat/map underneath */}
          <div className="absolute inset-0 z-0 pointer-events-none bg-white" />

          {/* 2. Pattern Layer: Mini Coki faces masked away cleanly from top header */}
          <div
            className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 180px 100px at 50% 9%, transparent 0%, transparent 65%, black 100%)",
              maskImage:
                "radial-gradient(ellipse 180px 100px at 50% 9%, transparent 0%, transparent 65%, black 100%)",
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
        </>
      )}

      {/* TOP BAR: Call Header */}
      <div className="relative z-10 pt-5 px-4 flex flex-col items-center text-center">
        <h3
          className={`font-sans font-bold text-base sm:text-lg tracking-tight truncate max-w-[260px] ${
            mode === "video"
              ? "text-white drop-shadow"
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
              ? "text-white/90 drop-shadow"
              : "text-black/80"
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

      {/* CENTER: Avatar + Audio Pulse Rings for Voice Call */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {mode === "voice" && (
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
