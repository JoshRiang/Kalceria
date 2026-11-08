"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MinigameRulesModal({ showInfo, onClose }) {
  return (
    <AnimatePresence>
      {showInfo && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
            className="relative w-full max-w-lg p-10 overflow-hidden border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          >
            <div className="absolute inset-0 z-0 bg-black/95" />
            <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[40%] -left-[20%] w-[120%] h-[120%] bg-indigo-900 rounded-full blur-[80px]"
              />
              <motion.div
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-[40%] -right-[20%] w-[120%] h-[120%] bg-purple-800 rounded-full blur-[80px]"
              />
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-rog font-black text-white mb-8 tracking-tighter uppercase">Game Rules</h3>
              <div className="space-y-6 text-white font-sans text-sm leading-relaxed">
                <div className="flex gap-4"><span className="font-bold">1.</span><p>Every registered user is granted 1 (one) attempt daily until the day before the event (H-1).</p></div>
                <div className="flex gap-4"><span className="font-bold">2.</span><p>The score achieved in the first attempt will be saved automatically.</p></div>
                <div className="flex gap-4"><span className="font-bold">3.</span><p>During the second attempt, users can choose whether to keep the newest score or retain their previous one.</p></div>
                <div className="flex gap-4"><span className="font-bold">4.</span><p>Users compete for the top leaderboard spots until H-1; those with the highest scores will be selected to win an <span className="italic underline decoration-purple-400 underline-offset-4">Event Voucher</span>.</p></div>
              </div>
              <button
                onClick={onClose}
                className="mt-10 w-full py-4 font-sans font-black uppercase text-xs tracking-widest text-white hover:opacity-80 transition-all active:scale-95 cursor-pointer"
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

