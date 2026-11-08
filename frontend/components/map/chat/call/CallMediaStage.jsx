"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { formatCallDuration } from "../hooks/usePersonalCallState";

// Sparse (~45% reduced) organically distributed mini Coki faces across the stage
// Positioned strictly below the sleek solid top header so zero faces are ever cut in half.
const STATIC_COKI_VOICE_BG = [
  { top: "23%", left: "20%", rotate: -15 },
  { top: "27%", left: "78%", rotate: 14 },
  { top: "41%", left: "52%", rotate: -9 },
  { top: "49%", left: "16%", rotate: 18 },
  { top: "56%", left: "83%", rotate: -16 },
  { top: "69%", left: "34%", rotate: 11 },
  { top: "78%", left: "74%", rotate: -12 },
  { top: "88%", left: "22%", rotate: 16 },
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
  isRemoteCamOff = false,
  hasLocalStream,
  hasRemoteStream = false,
  isBadConnection = false,
  localVideoRef,
  localStreamRef,
  remoteVideoRef,
  remoteAudioRef,
  remoteStreamRef,
}) {
  const displayName =
    targetUser?.displayName || targetUser?.name || targetUser?.nickname || "Kalcerian";
  const showRemoteLiveVideo = status === "connected" && hasRemoteStream && !isRemoteCamOff;

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

      {/* Background Layer: Live Video Feed (or Greyish-Black Blurred Stage when Peer Camera is Off) for Video Call, or Pure Opaque Base for Voice Call */}
      {mode === "video" ? (
        <div
          className={`absolute inset-0 z-0 overflow-hidden flex items-center justify-center transition-colors duration-300 ${
            showRemoteLiveVideo
              ? "bg-black"
              : isMapDark
              ? "bg-[#12151b]"
              : "bg-[#262a33]"
          }`}
        >
          {/* Live Peer WebRTC Video Feed (Muted because remoteAudioRef plays the audio stream cleanly) */}
          <video
            ref={(el) => {
              if (typeof remoteVideoRef === "function") {
                remoteVideoRef(el);
              } else if (remoteVideoRef) {
                remoteVideoRef.current = el;
              }
              if (el && remoteStreamRef?.current && el.srcObject !== remoteStreamRef.current) {
                el.srcObject = remoteStreamRef.current;
                el.play?.().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              showRemoteLiveVideo ? "opacity-100" : "opacity-0 pointer-events-none"
            } ${isBadConnection ? "filter blur-[12px] scale-105" : ""}`}
          />

          {/* Target User Camera-Off / Connecting Stage: Abu Black Greyish Blur adapted to Light/Dark Mode + Centered Avatar */}
          {!showRemoteLiveVideo && (
            <>
              <div
                className={`absolute inset-0 z-1 pointer-events-none transition-colors duration-300 ${
                  isMapDark
                    ? "bg-gradient-to-b from-[#252932]/85 via-[#161920]/92 to-[#0b0d12]/96 backdrop-blur-2xl"
                    : "bg-gradient-to-b from-[#424754]/85 via-[#2e323c]/90 to-[#1e2128]/95 backdrop-blur-2xl"
                }`}
              />
              <div
                className={`absolute w-64 h-64 rounded-full blur-3xl pointer-events-none z-1 ${
                  isMapDark ? "bg-white/[0.06]" : "bg-white/[0.12]"
                }`}
              />
              <div className="absolute inset-0 z-2 flex flex-col items-center justify-center pointer-events-none">
                <div
                  className={`relative w-28 h-28 rounded-full overflow-hidden border-2 shadow-2xl ${
                    isMapDark
                      ? "border-white/75 bg-[#161b22]"
                      : "border-white/85 bg-[#2d313a]"
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
            </>
          )}

          {/* Contrast Gradient Overlay when Live Video is Active */}
          {showRemoteLiveVideo && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/55 via-transparent to-black/70" />
          )}
        </div>
      ) : (
        /* Voice Call: Solid 100% Opaque Base Layer (White in Light Mode, Obsidian Dark in Dark Mode) + Clear Coki Faces Pattern below sleek header */
        <>
          {/* 1. Pure Opaque Base: Absolutely zero leakage from chat/map underneath */}
          <div
            className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-200 ${
              isMapDark ? "bg-[#0f1014]" : "bg-white"
            }`}
          />

          {/* 2. Pattern Layer: Organically distributed Mini Coki faces — natural face preserved in Dark Mode (never inverted!) */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {STATIC_COKI_VOICE_BG.map((pos, idx) => (
              <div
                key={`coki-bg-${idx}`}
                style={{
                  position: "absolute",
                  top: pos.top,
                  left: pos.left,
                  transform: `translate(-50%, -50%) rotate(${pos.rotate}deg)`,
                  filter: isMapDark
                    ? "brightness(1.08) drop-shadow(0 0 1.2px rgba(255,255,255,0.62)) drop-shadow(0 0 9px rgba(255,255,255,0.15))"
                    : "contrast(1.18)",
                }}
                className={`w-10 h-13 pointer-events-none select-none ${
                  isMapDark ? "opacity-[0.36]" : "opacity-[0.42]"
                }`}
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

      {/* TOP BAR: Sleek Solid Header for Voice Call (White in Light Mode, Dark in Dark Mode), Transparent Overlay for Video Call */}
      <div
        className={`relative z-10 w-full pt-5 pb-3.5 px-4 flex flex-col items-center text-center transition-colors duration-200 ${
          mode === "voice"
            ? isMapDark
              ? "bg-[#0f1014]"
              : "bg-white"
            : ""
        }`}
      >
        <h3
          className={`font-sans font-bold text-base sm:text-lg tracking-tight truncate max-w-[260px] ${
            mode === "video"
              ? "text-white drop-shadow"
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
              ? "text-white/90 drop-shadow"
              : isMapDark
              ? "text-white/85"
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
                isMapDark ? "border-white/55" : "border-black/60"
              }`}
            />
            <motion.div
              animate={{
                scale: status === "connected" ? [1, 1.42, 1] : [1, 1.28, 1],
                opacity: status === "connected" ? [0.22, 0.03, 0.22] : [0.15, 0.02, 0.15],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
              className={`absolute w-28 h-28 rounded-full border ${
                isMapDark ? "border-white/35" : "border-black/40"
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
                  isMapDark
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
                className={`w-1 rounded-full ${isMapDark ? "bg-white" : "bg-black"}`}
              />
            ))}
          </div>
        )}

        {/* Picture-in-Picture (PiP) Self Camera Preview for Video Call — Hitam/Greyish when camera is off, adapted to Light/Dark Mode */}
        {mode === "video" && (
          <div
            className={`absolute bottom-3 right-3 w-[84px] h-[116px] rounded-xl overflow-hidden shadow-2xl flex items-center justify-center transition-colors duration-250 border ${
              hasLocalStream && !isCamOff
                ? "bg-[#0d0f14] border-white/25"
                : isMapDark
                ? "bg-[#0b0d11] border-white/20"
                : "bg-[#2a2e36] border-white/35"
            }`}
          >
            {hasLocalStream && !isCamOff ? (
              <video
                ref={(el) => {
                  if (typeof localVideoRef === "function") {
                    localVideoRef(el);
                  } else if (localVideoRef) {
                    localVideoRef.current = el;
                  }
                  if (el && localStreamRef?.current && el.srcObject !== localStreamRef.current) {
                    el.srcObject = localStreamRef.current;
                    el.play?.().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex items-center justify-center p-2 text-center">
                <div
                  className={`w-12 h-12 rounded-full overflow-hidden border shadow-md ${
                    isMapDark ? "border-white/30 bg-[#161b22]" : "border-white/50 bg-[#363b45]"
                  }`}
                >
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
