"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createSeededRandom } from "@/lib/seededRandom";

export function GoldenAmbientSparks() {
  const [sparks, setSparks] = useState([]);
  
  useEffect(() => {
    const random = createSeededRandom("about-ambient-sparks-v1");
    const generated = [];
    for (let i = 0; i < 18; i++) {
      const size = random() * 4 + 2;
      const top = random() * 100;
      const left = random() * 100;
      const duration = random() * 6 + 10; // Even slower
      const delay = random() * 12;
      const driftX = (random() - 0.5) * 150;
      const driftY = (random() - 0.5) * 150;
      generated.push({ id: i, size, top, left, duration, delay, driftX, driftY });
    }
    setSparks(generated);
  }, []);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {sparks.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.7, 0.7, 0],
            scale: [0.3, 1, 1, 0.3],
            x: [0, s.driftX * 0.5, s.driftX, s.driftX * 0.5, 0],
            y: [0, s.driftY * 0.5, s.driftY, s.driftY * 0.5, 0],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: -s.delay,
            times: [0, 0.2, 0.8, 1] // Spends 60% of time fully visible
          }}
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            top: `${s.top}%`,
            left: `${s.left}%`,
            backgroundColor: '#FFD700',
            willChange: "transform, opacity",
            boxShadow: `0 0 ${s.size * 3}px #FFD700, 0 0 ${s.size * 6}px rgba(255, 215, 0, 0.4)`,
          }}
        />
      ))}
    </div>
  );
}

export function DanglingSymbols({ char, color, side = "left", configs = [], isMobile = false }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {configs.map((s, i) => (
        <motion.div
          key={i}
          animate={{ 
            y: [0, -20, 0],
            rotate: [s.rotate || 0, (s.rotate || 0) + 12, (s.rotate || 0) - 6, s.rotate || 0]
          }}
          transition={{ 
            duration: 3.5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: s.delay || 0
          }}
          className="absolute text-3xl md:text-5xl lg:text-7xl font-mono font-black uppercase tracking-tighter select-none z-[60]"
          style={{ 
            color: color, 
            top: s.top,
            [side === "left" ? "left" : "right"]: isMobile ? `${s.offset * 0.7}px` : `${s.offset}px`,
            textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
            filter: `drop-shadow(0 0 25px ${color}aa)`,
            opacity: 0.95
          }}
        >
          {char}
        </motion.div>
      ))}
    </div>
  );
}
