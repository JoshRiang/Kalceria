"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, animate } from "framer-motion";
import { createSeededRandom } from "@/lib/seededRandom";

const RAINBOW_COLORS = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];

export function StatCounter({ target, label, suffix = "", align = "start", active = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (active) {
      const controls = animate(0, target, {
        duration: 3, // Slower, more "grave" count-up
        ease: [0.16, 1, 0.3, 1], // Smooth cinematic ease
        onUpdate: (value) => setCount(Math.floor(value)),
      });
      return () => controls.stop();
    }
  }, [active, target]);

  return (
    <div className={`flex flex-col leading-none ${align === "end" ? "items-end" : "items-start"}`}>
      <div className="flex items-baseline">
        <span 
          className="font-mono font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          style={{ fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)" }}
        >
          {count}
        </span>
        {suffix && (
          <span 
            className="font-mono font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
            style={{ fontSize: "clamp(1.5rem, 3.5vw, 3rem)", marginLeft: "4px" }}
          >
            {suffix}
          </span>
        )}
      </div>
      <span 
        className="font-mono font-bold tracking-tight text-white/60"
        style={{ fontSize: "clamp(0.8rem, 1.8vw, 1.3rem)", marginTop: "6px" }}
      >
        {label}
      </span>
    </div>
  );
}

export function RainbowPixels() {
  const particles = useMemo(() => {
    const random = createSeededRandom("events-rainbow-pixels-v1");
    return Array.from({ length: 30 }, () => ({
      x: random() * 100,
      y: random() * 100,
      color: RAINBOW_COLORS[Math.floor(random() * RAINBOW_COLORS.length)],
      size: random() * 6 + 4,
      duration: 15 + random() * 20,
      delay: random() * 5,
      xDrift: (random() - 0.5) * 150
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden mix-blend-screen opacity-50">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}`
          }}
          animate={{
            y: [0, -300, 0],
            x: [0, p.xDrift, 0],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.8, 0.1]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </div>
  );
}

export function MicroParticles() {
  const particles = useMemo(() => {
    const random = createSeededRandom("events-micro-particles-v1");
    return Array.from({ length: 60 }, () => ({
      x: random() * 100,
      y: random() * 100,
      size: random() * 2 + 0.5,
      duration: 8 + random() * 12,
      delay: -random() * 20,
      driftX: (random() - 0.5) * 80
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden opacity-30">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            boxShadow: `0 0 4px rgba(255,255,255,0.6)`
          }}
          animate={{
            y: [0, -150, 0],
            x: [0, p.driftX, 0],
            opacity: [0, 0.7, 0]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </div>
  );
}
