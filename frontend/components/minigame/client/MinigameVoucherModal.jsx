"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MinigameVoucherModal({ show, voucher, onClose }) {
  if (!show || !voucher) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 cursor-pointer backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
          className="relative w-full max-w-md p-8 overflow-hidden border border-yellow-400/50 shadow-[0_0_50px_rgba(234,179,8,0.4)] bg-black/95 text-center select-none"
        >
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <div className="absolute -top-[30%] -left-[20%] w-[120%] h-[120%] bg-amber-600 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="px-3 py-1 mb-3 rounded-full border border-yellow-400 bg-yellow-400/10 text-yellow-300 text-[10px] font-sans font-bold uppercase tracking-widest">
              OFFICIAL EVENT VOUCHER
            </div>
            <h3 className="text-2xl sm:text-3xl font-rog font-black text-white tracking-wider mb-2" style={{ textShadow: "0 0 20px rgba(234,179,8,0.8)" }}>
              {voucher.eventTitle || "KALCERIA EVENT"}
            </h3>
            <p className="text-xs text-white/70 font-sans mb-6">
              Congratulations! You ranked among the top minigame performers and earned this exclusive admission voucher.
            </p>

            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <span className="block text-[11px] text-white/50 uppercase font-sans tracking-widest mb-1">VOUCHER CODE</span>
              <span className="block text-xl sm:text-2xl font-mono font-black text-yellow-400 tracking-widest select-all">
                {voucher.voucherCode}
              </span>
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-left text-xs text-white/80 font-sans">
                <div>
                  <span className="block text-[10px] text-white/40">RECIPIENT</span>
                  <span className="font-semibold text-white">{voucher.userName || "Participant"}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-white/40">BEST TIME</span>
                  <span className="font-semibold text-yellow-300">
                    {voucher.bestScoreMs ? `${(voucher.bestScoreMs / 1000).toFixed(2)}s` : "-"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-amber-200/80 font-sans italic mb-6">
              Show this screen to the Kalceria Event Staff at the venue gate for priority access.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-yellow-400 text-black font-sans font-black uppercase text-xs tracking-widest rounded-xl hover:bg-yellow-300 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

