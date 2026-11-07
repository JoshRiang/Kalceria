"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { VintageLaserGrid, DominoChevrons } from "@/components/map/AtmosphereLayers";
import { createSeededRandom } from "@/lib/seededRandom";

export function StartupAtmosphere({ showStartup, isDark, isMobile }) {
  // Ambient Speed Lines & Microparticles
  const speedLines = useMemo(() => {
    const random = createSeededRandom("map-startup-speed-lines-v1");
    return Array.from({ length: 16 }, (_, id) => ({
      id,
      duration: random() * 0.4 + 0.3,
      delay: random() * 1.8,
      top: `${random() * 100}%`,
      width: `${random() * 260 + 90}px`,
    }));
  }, []);

  const particles = useMemo(() => {
    const random = createSeededRandom("map-startup-particles-v1");
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${random() * 100}%`,
      size: `${random() * 4 + 3}px`,
      color:
        random() > 0.5 ? "#ff006e" : random() > 0.5 ? "#ffd60a" : "#ffc300",
      duration: random() * 4 + 4,
      delay: random() * 3.5,
      opacity: random() * 0.35 + 0.45,
    }));
  }, []);

  return (
    <>
      {/* Smooth 4x Chevron Dash Transition */}
      <DominoChevrons active={showStartup} isDark={isDark} isMobile={isMobile} />

      {/* Faint Vintage Laser Grid (GPU-Optimized) */}
      <VintageLaserGrid active={showStartup} startupProgress={isDark ? 50 : 0} />

      {/* Adaptive Atmospheric Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div
          className={`absolute inset-0 transition-colors duration-1000 ${
            !isDark
              ? "bg-white"
              : "bg-gradient-to-br from-[#ff006e]/20 via-transparent to-[#ffd60a]/20"
          }`}
        />

        {/* Dynamic Speed Lines */}
        <div className="absolute inset-0 opacity-20">
          {speedLines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: "200%", opacity: [0, 1, 0] }}
              transition={{
                duration: line.duration,
                repeat: Infinity,
                delay: line.delay,
                ease: "linear",
              }}
              className={`absolute h-[1px] transition-colors duration-1000 ${
                !isDark ? "bg-slate-200" : "bg-white"
              }`}
              style={{
                top: line.top,
                width: line.width,
                transform: "rotate(-5deg)",
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
          <h2
            className={`text-[25vw] font-black tracking-tighter uppercase leading-none transition-colors duration-1000 ${
              !isDark ? "text-slate-200" : "text-white"
            }`}
          >
            KALCERIA
          </h2>
        </div>
      </div>

      {/* Ambient Golden & Cyan/Magenta Microparticles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
        {particles.map((p) => {
          const activeColor = isDark
            ? p.color === "#ff006e"
              ? "#00f0ff"
              : p.color
            : p.color;

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
              }}
            />
          );
        })}
      </div>

      {/* Corner Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#ffd60a]/10 to-transparent rounded-br-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-[#ff006e]/10 to-transparent rounded-tl-full blur-3xl pointer-events-none" />
    </>
  );
}
