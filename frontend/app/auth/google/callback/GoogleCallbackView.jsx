"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { closeCurrentWindow } from "./oauthCallbackHelpers";

export function DynamicDots() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    let count = 1;
    const interval = setInterval(() => {
      count = (count % 3) + 1;
      setDots(".".repeat(count));
    }, 380);
    return () => clearInterval(interval);
  }, []);

  return <span className="inline-block min-w-[16px] text-left">{dots}</span>;
}

export function GoogleCallbackView({
  statusMessage,
  isError,
  isSuccess,
  canCloseManually,
  isPopupContext,
}) {
  const phaseKey = isError ? "error" : isSuccess ? "success" : "loading";

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center p-6 text-white text-center select-none overflow-hidden bg-transparent">
      {/* Borderless, Colorless Semi-Blur Frosted Smoked Glass matching Quit Map & Calling Video Call */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(42,46,56,0.92) 0%, rgba(20,23,29,0.95) 55%, rgba(9,11,15,0.98) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute w-72 h-72 rounded-full bg-white/[0.07] blur-[72px] pointer-events-none z-0 -translate-y-4"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-1 backdrop-blur-2xl bg-gradient-to-b from-white/[0.06] via-white/[0.015] to-black/35 pointer-events-none"
      />

      {/* Center Content: Smooth Framer Motion Spinner & Scaled Typography */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center justify-center max-w-[300px]"
      >
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mb-3.5">
          <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="white"
              strokeWidth="4.5"
              strokeDasharray="70 200"
              strokeLinecap="round"
              className="opacity-95 drop-shadow-[0_0_16px_rgba(255,255,255,0.45)]"
            />
          </svg>
        </div>

        {/* Typography inheriting 'Find other Kalcerians' (font-sans font-bold tracking-tight) at ~60% scale */}
        <AnimatePresence mode="wait">
          <motion.p
            key={phaseKey}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`font-sans font-bold tracking-tight text-[11px] sm:text-[12px] leading-snug select-none ${
              isError ? "text-red-400" : "text-white/95"
            }`}
          >
            {isError ? (
              statusMessage
            ) : isSuccess ? (
              <>
                Redirecting back to Kalceria
                <DynamicDots />
              </>
            ) : (
              <>
                Authenticating with Google
                <DynamicDots />
              </>
            )}
          </motion.p>
        </AnimatePresence>

        {canCloseManually && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 flex flex-col items-center gap-2"
          >
            <p className="font-sans text-[11px] text-white/65 tracking-tight">
              {isPopupContext
                ? "Autentikasi selesai. Jendela ini dapat ditutup."
                : "Autentikasi selesai."}
            </p>
            <button
              type="button"
              onClick={closeCurrentWindow}
              className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-[11px] font-sans font-bold text-white tracking-tight cursor-pointer"
            >
              Tutup Jendela
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

