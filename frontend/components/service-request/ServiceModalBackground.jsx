"use client";

import { motion } from "framer-motion";
import { CLIP } from "./constants";

export function ServiceModalBackground({ step }) {
  return (
    <>
      {/* Animated Conic Glow Overlay */}
      <div
        className="absolute -inset-[2px] z-0 overflow-hidden opacity-30 pointer-events-none"
        style={CLIP}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, #FF00FF 30%, transparent 50%, #FACC15 80%, transparent 100%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Dynamic Ambient Blobs: 60% Black, 25% Pink, 15% Yellow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={CLIP}>
        {/* 60% Dominant Dynamic Black Blobs */}
        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [-20, 25, -20],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[480px] bg-black/95 blur-[70px] rounded-full z-[1]"
        />
        <motion.div
          animate={{
            x: [25, -25, 25],
            y: [30, -30, 30],
            scale: [1.1, 0.95, 1.1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-16 -left-16 w-[420px] h-[420px] bg-black/90 blur-[80px] rounded-full z-[1]"
        />
        <motion.div
          animate={{
            x: [-20, 20, -20],
            y: [20, -20, 20],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-16 -right-16 w-[380px] h-[380px] bg-black/95 blur-[65px] rounded-full z-[1]"
        />

        {/* 25% Pink / Magenta Dynamic Blobs */}
        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [-15, 20, -15],
          }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 -left-12 w-[300px] h-[300px] bg-[#FF00FF]/25 blur-[75px] rounded-full z-[2]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [15, -15, 15],
          }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/3 -right-10 w-[240px] h-[240px] bg-[#EC4899]/20 blur-[65px] rounded-full z-[2]"
        />

        {/* 15% Yellow Dynamic Blob */}
        <motion.div
          animate={{
            x: [20, -20, 20],
            y: [20, -20, 20],
            scale: [0.95, 1.1, 0.95],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-10 right-1/4 w-[220px] h-[220px] bg-[#FACC15]/20 blur-[70px] rounded-full z-[2]"
        />
      </div>

      {/* Top Progress Bar: High-priority z-index (z-50) so it is NEVER covered on scroll in Part 2 or 3 */}
      <div className="absolute top-0 left-0 right-0 h-[4px] bg-white/10 overflow-hidden z-50 pointer-events-none shadow-[0_0_12px_rgba(255,0,255,0.7)]">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${((step + 1) / 3) * 100}%` }}
          className="h-full bg-gradient-to-r from-[#FF00FF] via-[#FACC15] to-[#FF00FF] bg-[length:200%_auto]"
          transition={{ duration: 0.8, ease: "circOut" }}
        />
      </div>
    </>
  );
}
