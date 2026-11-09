"use client";

import { motion } from "framer-motion";

export function AtmosphericBackground({ showStartup }) {
  return (
    <>
      {/* 🌌 Atmospheric Tactical Background (Behind Map) */}
      {showStartup && (
        <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
          {/* GPU-Accelerated Radial-Gradient Blobs (Zero Gaussian Blur Shader Cost) */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 0], x: [-150, 150, -150], y: [-80, 80, -80] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full will-change-transform"
            style={{
              background: "radial-gradient(circle, rgba(255,0,110,0.26) 0%, rgba(255,0,110,0.09) 42%, transparent 70%)",
            }}
          />
          <motion.div
            animate={{ scale: [1.5, 1, 1.5], rotate: [0, -180, 0], x: [150, -150, 150], y: [80, -80, 80] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full will-change-transform"
            style={{
              background: "radial-gradient(circle, rgba(255,214,10,0.16) 0%, rgba(255,214,10,0.05) 42%, transparent 70%)",
            }}
          />
          <motion.div
            animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.3, 1], x: [0, 100, 0], y: [0, -100, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] left-[30%] w-[50%] h-[50%] rounded-full will-change-transform"
            style={{
              background: "radial-gradient(circle, rgba(147,51,234,0.18) 0%, rgba(147,51,234,0.06) 42%, transparent 70%)",
            }}
          />
        </div>
      )}

      {/* Subtle Vignette Overlay */}
      <div
        className="fixed inset-0 z-[40] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, transparent 50%, rgba(10, 14, 39, 0.5) 100%)",
        }}
      />
    </>
  );
}
