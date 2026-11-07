"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import { resolvePersistentAvatarUrl } from "@/lib/profileIdentity";
import { HardwarePermissionModal } from "./HardwarePermissionModal";

// Static distributed mini Coki faces with fixed random tilt angles (constant across all calls)
// Notice: The top center area (Name, Calling/Ringing status) is naturally kept completely clean and trimmed
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

export function IncomingCallModal({
  incomingCall,
  isMapDark = true,
  onAccept,
  onDecline,
}) {
  const [showPermissionGate, setShowPermissionGate] = useState(null); // null | "camera" | "mic"
  const [isDeclinePressed, setIsDeclinePressed] = useState(false);

  if (!incomingCall) return null;

  const caller = incomingCall.callerUser || {
    id: incomingCall.fromUserId,
    name: "Kalcerian",
    displayName: "Kalcerian",
  };
  const displayName = caller.displayName || caller.name || "Kalcerian";
  const avatarUrl = resolvePersistentAvatarUrl(caller);
  const isVideo = incomingCall.callMode === "video";

  // Non-blocking permission check when tapping Accept (✓)
  const handleAcceptClick = async () => {
    let hasPermission = false;
    try {
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        const permName = isVideo ? "camera" : "microphone";
        const status = await navigator.permissions.query({ name: permName });
        if (status.state === "granted") {
          hasPermission = true;
        }
      }
    } catch {
      // If query throws or is unsupported in browser, we check via prompt
      hasPermission = false;
    }

    if (hasPermission) {
      onAccept?.(incomingCall);
    } else {
      // Do NOT block, drop, or stop ringtone: display non-blocking permission modal
      setShowPermissionGate(isVideo ? "camera" : "mic");
    }
  };

  const handleGrantFromModal = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia(
          isVideo ? { video: true, audio: true } : { audio: true }
        );
        // Stop temporary stream probe tracks immediately
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {}
    setShowPermissionGate(null);
    onAccept?.(incomingCall);
  };

  const handleCancelFromModal = () => {
    // Non-blocking: Ringtone keeps playing, dismiss permission overlay
    setShowPermissionGate(null);
  };

  return (
    <AnimatePresence>
      {/* Backdrop Dim Blur behind incoming call stage */}
      <motion.div
        key="incoming-call-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[1140] bg-black/35 backdrop-blur-[2px] pointer-events-none"
      />

      {/* Main Incoming Call Container: Slides up from bottom into same position as chat */}
      <motion.div
        key={`incoming-call-stage-${incomingCall.callId}`}
        initial={{ y: "110%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        exit={{ y: "110%", opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 30,
          mass: 0.8,
        }}
        className={`fixed z-[1150] overflow-hidden shadow-2xl flex flex-col justify-between select-none
          /* Desktop / Laptop: Anchored cleanly to bottom-left matching chat panel */
          min-[861px]:bottom-4 min-[861px]:left-4 min-[861px]:w-[340px] sm:min-[861px]:w-[360px] min-[861px]:h-[580px] min-[861px]:max-h-[calc(100vh-2rem)] min-[861px]:rounded-3xl
          /* Mobile Layout: Full bottom-drawer card */
          max-[860px]:inset-x-2 max-[860px]:bottom-2 max-[860px]:top-14 sm:max-[860px]:top-16 max-[860px]:rounded-3xl
          ${
            isVideo
              ? "bg-[#0d1418]/90 text-white backdrop-blur-xl border border-white/10"
              : isMapDark
              ? "bg-[#0f1014] text-white shadow-[0_20px_50px_rgba(0,0,0,0.75)] border border-white/15"
              : "bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.22)] border border-black/10"
          }`}
      >
        {/* Background Layer:
            - Voice Call: Pure White (Light Mode) or Obsidian Dark (Dark Mode) with static mini Coki faces, naturally trimmed around top header
            - Video Call: Heavy backdrop blur over caller visual */}
        {isVideo ? (
          <div className="absolute inset-0 z-0 overflow-hidden bg-black/60 backdrop-blur-xl">
            <div className="relative w-full h-full flex items-center justify-center">
              <ContentImage
                src={avatarUrl}
                alt={displayName}
                width={180}
                height={180}
                className="w-full h-full object-cover blur-[28px] scale-125 opacity-30"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
          </div>
        ) : (
          /* Voice Call: Solid 100% Opaque Base Layer + Coki Faces Pattern trimmed naturally around top header */
          <>
            {/* 1. Pure Opaque Base: Absolutely zero leakage from chat/map underneath */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none ${
                isMapDark ? "bg-[#0f1014]" : "bg-white"
              }`}
            />

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
                  className={`w-10 h-13 pointer-events-none select-none ${
                    isMapDark
                      ? "opacity-[0.38] invert brightness-115 contrast-125"
                      : "opacity-[0.42] contrast-125"
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

        {/* TOP BAR: Caller Display Name Mid-Center & Calling Status */}
        <div
          className={`relative z-10 pt-5 pb-3 px-4 flex flex-col items-center text-center ${
            !isVideo ? (isMapDark ? "bg-[#0f1014]" : "bg-white") : ""
          }`}
        >
          <h3
            className={`font-sans font-bold text-lg sm:text-xl tracking-tight truncate max-w-[260px] ${
              isVideo ? "text-white drop-shadow" : isMapDark ? "text-white" : "text-black"
            }`}
          >
            {displayName}
          </h3>

          <p
            style={{ fontFamily: "Arial, sans-serif" }}
            className={`font-bold text-[9.5px] sm:text-[10px] tracking-tight mt-1 ${
              isVideo ? "text-white/80 drop-shadow" : isMapDark ? "text-white/85" : "text-black/80"
            }`}
          >
            {isVideo ? "Video Call Ringing..." : "Ringing..."}
          </p>
        </div>

        {/* CENTER: Caller Avatar with 3-Second Heartbeat Pulse ('berdetak dug dug dug dug') */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
          <div className="relative flex items-center justify-center">
            {/* Soft outer pulse halo */}
            <motion.div
              animate={{
                scale: [1, 1.24, 1],
                opacity: [0.35, 0.05, 0.35],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                times: [0, 0.18, 1],
                ease: "easeInOut",
              }}
              className={`absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border ${
                isVideo || isMapDark ? "border-white/40" : "border-black/30"
              }`}
            />

            {/* Main Avatar Heartbeat Pulse:
                Period = 3.0s, starting immediately at n = 0 (t = 0),
                Double-thump heartbeat sequence ('dug dug'): [1, 1.15, 1.04, 1.20, 1, 1] */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1.04, 1.20, 1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                times: [0, 0.06, 0.12, 0.20, 0.32, 1],
                ease: "easeInOut",
              }}
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 shadow-2xl ${
                isVideo || isMapDark
                  ? "border-white bg-[#161b22]"
                  : "border-black bg-white"
              }`}
            >
              <ContentImage
                src={avatarUrl}
                alt={displayName}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>

        {/* BOTTOM CONTROLS: Accept (✓) and Decline (✕) */}
        <div className="relative z-10 pb-9 px-8 flex items-center justify-around">
          {/* Decline Button: Cross Icon (✕) */}
          <button
            type="button"
            onClick={onDecline}
            onPointerDown={() => setIsDeclinePressed(true)}
            onPointerUp={() => setIsDeclinePressed(false)}
            onPointerLeave={() => setIsDeclinePressed(false)}
            title="Tolak Panggilan"
            className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-3 transition-transform hover:scale-110 active:scale-95"
          >
            <span
              className={`block font-sans text-3xl sm:text-4xl font-normal select-none transition-colors duration-150 ${
                isDeclinePressed
                  ? "text-[#ef4444]"
                  : isVideo || isMapDark
                  ? "text-white/80 group-hover:text-white active:text-[#ef4444]"
                  : "text-black/80 group-hover:text-black active:text-[#ef4444]"
              }`}
            >
              ✕
            </span>
          </button>

          {/* Accept Button: Checklist Icon (✓) */}
          <button
            type="button"
            onClick={handleAcceptClick}
            title="Terima Panggilan"
            className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-3 transition-transform hover:scale-110 active:scale-95"
          >
            <span
              className={`block font-sans text-3xl sm:text-4xl font-normal select-none transition-colors duration-150 ${
                isVideo || isMapDark
                  ? "text-white/80 group-hover:text-white"
                  : "text-black/80 group-hover:text-black"
              }`}
            >
              ✓
            </span>
          </button>
        </div>

        {/* Non-Blocking Hardware Permission Dialog:
            Screen blurs, ringtone keeps playing, allows user to Grant or Cancel */}
        <HardwarePermissionModal
          isOpen={Boolean(showPermissionGate)}
          type={showPermissionGate || "mic"}
          isMapDark={isMapDark}
          keepRingtonePlaying={true}
          onGrant={handleGrantFromModal}
          onCancel={handleCancelFromModal}
        />
      </motion.div>
    </AnimatePresence>
  );
}
