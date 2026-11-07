"use client";

import { motion } from "framer-motion";

export function AtmosphericBackground({ showStartup, isMapDark, mapParticles = [] }) {
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

      {/* Global Map Ambient Micro-Particles (60% sparse) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[30]">
        {!showStartup && mapParticles.map((p) => {
          const activeColor = isMapDark
            ? (p.id % 2 === 0 ? "#ff006e" : "#ffd60a") // Dark Mode: Neon Red/Magenta & Bright Gold
            : (p.id % 2 === 0 ? "#10b981" : "#3b82f6"); // Light Mode: Emerald Green & Dodger Blue

          return (
            <div
              key={p.id}
              className="absolute rounded-full blur-[0.5px] pointer-events-none"
              style={{
                left: p.left,
                bottom: "-20px",
                width: p.size,
                height: p.size,
                backgroundColor: activeColor,
                boxShadow: `0 0 6px ${activeColor}, 0 0 12px ${activeColor}`,
                animation: `floatUp ${p.duration}s linear ${p.delay}s infinite both`,
                opacity: p.opacity,
                transition: "background-color 1.5s ease-in-out, box-shadow 1.5s ease-in-out",
              }}
            />
          );
        })}
      </div>

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
