"use client";
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MINIGAME_TRAILER_CHARACTERS } from "@/lib/pageBgAssets";
import { LineParticles } from "./MinigameVisuals";

export function MinigameTrailerModal({
  showTrailer,
  onClose,
  videoRef,
}) {
  useEffect(() => {
    if (!showTrailer) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showTrailer, onClose]);

  const swapFallback = (fallbackUrl) => (e) => {
    if (e.currentTarget.dataset.fallbackApplied) return;
    e.currentTarget.dataset.fallbackApplied = "1";
    e.currentTarget.src = fallbackUrl;
  };

  return (
    <AnimatePresence>
      {showTrailer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Social Cult event trailer"
          className="fixed inset-0 z-[4000] flex flex-col items-center justify-between bg-black/92 overflow-hidden"
        >
          {/* Backdrop click to dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />

          {/* Top Header */}
          <motion.div
            initial={{ opacity: 0, y: 10, filter: "blur(16px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, filter: "blur(24px)", transition: { duration: 0.45 } }}
            transition={{ duration: 0.85 }}
            className="relative z-20 shrink-0 text-center w-full max-w-[340px] xs:max-w-[380px] sm:max-w-md px-4 pt-4 sm:pt-6 pb-2"
          >
            <div className="flex items-center justify-center gap-4 mb-1.5">
              <h2
                className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white"
                style={{ textShadow: "3px 3px 0px #d946ef" }}
              >
                SOCIAL CULT
              </h2>
              <button
                type="button"
                aria-label="Close trailer"
                onClick={onClose}
                className="p-2 flex items-center justify-center text-white/90 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-md transition-opacity duration-150"
              >
                <svg className="w-5 h-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-[11px] sm:text-xs font-sans text-white/80 leading-relaxed text-center px-2">
              A revolutionary fusion of high-performance automotive engineering and urban street culture. Join the collective as we redefine the boundaries of style and speed.
            </p>
          </motion.div>

          {/* Center Video Stage */}
          <div className="relative z-10 flex-1 min-h-0 w-full flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative h-full max-h-[52dvh] xs:max-h-[55dvh] sm:max-h-[57dvh] md:max-h-[59dvh] max-w-[82vw] aspect-[9/16] rounded-3xl md:rounded-[2.25rem] border border-yellow-500/50 shadow-[0_0_35px_rgba(251,191,36,0.35)] bg-black overflow-visible transform-gpu will-change-transform"
            >
              <div className="absolute inset-[-6%] bg-yellow-500/20 blur-[25px] rounded-[3rem] z-0 pointer-events-none transform-gpu" />
              <LineParticles />

              <div className="relative w-full h-full z-10 overflow-hidden rounded-3xl md:rounded-[2.25rem] border border-white/10 transform-gpu">
                <video
                  ref={videoRef}
                  src="/trailer.mp4"
                  controls
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  preload="metadata"
                  controlsList="nodownload"
                  className="w-full h-full object-cover transform-gpu will-change-transform"
                  style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
                />
              </div>
            </motion.div>
          </div>

          {/* 2 Half-Body Semi-Pixel Shocked Characters sliding smoothly up from bottom edge with small clean gap below video */}
          <div
            aria-hidden="true"
            data-trailer-peek-duo="true"
            className="relative z-20 shrink-0 w-full flex items-end justify-center gap-3 xs:gap-5 sm:gap-8 md:gap-12 pt-3 sm:pt-4 pointer-events-none overflow-hidden"
          >
            <motion.div
              initial={{ y: "115%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "115%", opacity: 0, transition: { duration: 0.45, ease: "easeIn" } }}
              transition={{ duration: 0.95, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="transform-gpu will-change-transform flex items-end"
            >
              {/* Left character mirrored horizontally via explicit inline transform so he gazes UP-RIGHT toward the video */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MINIGAME_TRAILER_CHARACTERS.left.cdn}
                alt=""
                loading="eager"
                decoding="async"
                data-peek-gaze="up-right"
                onError={swapFallback(MINIGAME_TRAILER_CHARACTERS.left.local)}
                className="h-[20dvh] xs:h-[22dvh] sm:h-[23dvh] md:h-[24dvh] max-h-[220px] min-h-[104px] w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)] select-none"
                style={{ transform: "scaleX(-1)", imageRendering: "pixelated" }}
              />
            </motion.div>

            <motion.div
              initial={{ y: "115%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "115%", opacity: 0, transition: { duration: 0.45, ease: "easeIn" } }}
              transition={{ duration: 1.05, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="transform-gpu will-change-transform flex items-end"
            >
              {/* Right character gazes UP-LEFT toward the video */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MINIGAME_TRAILER_CHARACTERS.right.cdn}
                alt=""
                loading="eager"
                decoding="async"
                data-peek-gaze="up-left"
                onError={swapFallback(MINIGAME_TRAILER_CHARACTERS.right.local)}
                className="h-[20dvh] xs:h-[22dvh] sm:h-[23dvh] md:h-[24dvh] max-h-[220px] min-h-[104px] w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)] select-none"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
