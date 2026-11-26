"use client";
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MinigameRulesModal({ showInfo, onClose }) {
  useEffect(() => {
    if (!showInfo) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showInfo, onClose]);

  return (
    <AnimatePresence>
      {showInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game rules"
          className="fixed inset-0 z-[3000] flex items-center justify-center p-4 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{
              clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)",
              background: "linear-gradient(135deg, #f8fafd 0%, #eef4ff 45%, #fdf6e3 100%)",
            }}
            data-rules-theme="blue-gold"
            className="relative w-full max-w-lg p-7 sm:p-10 overflow-hidden border border-[#124cc6]/25 shadow-[0_28px_80px_rgba(10,16,36,0.35)]"
          >
            {/* Cohesive Royal Cobalt Blue -> Luminous Gold editorial washes matching Light Minigame */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div
                className="absolute -top-[35%] -left-[20%] w-[85%] h-[85%] rounded-full blur-[70px] opacity-25"
                style={{ backgroundColor: "#124cc6" }}
              />
              <div
                className="absolute -bottom-[35%] -right-[20%] w-[85%] h-[85%] rounded-full blur-[70px] opacity-30"
                style={{ backgroundColor: "#d6920c" }}
              />
            </div>

            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-rog font-black text-[#0a0c12] mb-6 sm:mb-7 tracking-tighter uppercase">
                Game Rules
              </h3>
              <div className="space-y-4 sm:space-y-5 text-[#0f172a] font-sans text-sm leading-relaxed">
                <div className="flex gap-3.5">
                  <span className="font-bold text-[#124cc6]">1.</span>
                  <p>Every registered user is granted 1 (one) attempt daily until the day before the event (H-1).</p>
                </div>
                <div className="flex gap-3.5">
                  <span className="font-bold text-[#124cc6]">2.</span>
                  <p>The score achieved in the first attempt will be saved automatically.</p>
                </div>
                <div className="flex gap-3.5">
                  <span className="font-bold text-[#b87b08]">3.</span>
                  <p>During the second attempt, users can choose whether to keep the newest score or retain their previous one.</p>
                </div>
                <div className="flex gap-3.5">
                  <span className="font-bold text-[#b87b08]">4.</span>
                  <p>
                    Users compete for the top leaderboard spots until H-1; those with the highest scores will be selected to win an{" "}
                    <span className="italic font-semibold underline decoration-[#d6920c] underline-offset-4">
                      Event Voucher
                    </span>
                    .
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "linear-gradient(90deg, #124cc6 0%, #c98a0a 100%)",
                }}
                className="mt-8 w-full py-3.5 rounded-lg font-sans font-black uppercase text-xs tracking-widest text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#124cc6]/60 transition-opacity duration-150 cursor-pointer shadow-[0_8px_24px_rgba(18,76,198,0.22)]"
              >
                Understood
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
