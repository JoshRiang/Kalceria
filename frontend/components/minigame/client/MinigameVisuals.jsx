"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { createSeededRandom } from "@/lib/seededRandom";

export const LINE_PARTICLE_COLORS = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];
export const DECORATIVE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
export const DECORATIVE_SHAPES = ["●", "■", "▲", "◆", "▼", "✖"];

export function generateDecorativeContent(random) {
  const type = Math.floor(random() * 3);
  const color = DECORATIVE_COLORS[Math.floor(random() * DECORATIVE_COLORS.length)];
  let char = "";

  if (type === 0) char = Math.floor(random() * 10);
  else if (type === 1) char = String.fromCharCode(65 + Math.floor(random() * 26));
  else char = DECORATIVE_SHAPES[Math.floor(random() * DECORATIVE_SHAPES.length)];

  return { char, color };
}

export function MicroParticles({ active, stopping }) {
  const particles = useMemo(() => {
    const random = createSeededRandom("minigame-micro-particles-v1");
    return Array.from({ length: 24 }, (_, id) => ({
      id,
      size: random() * 4 + 2,
      left: random() * 100,
      delay: random() * 5,
      duration: random() * 5 + 3.5,
      isGold: random() > 0.5,
      xDrift: (random() - 0.5) * 100,
      exitDuration: random() * 2 + 1,
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-[10] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {(active && !stopping) && (
          <div className="absolute inset-0">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ y: "110vh", opacity: 0 }}
                animate={{ y: "-10vh", opacity: [0, 1, 0], x: [0, p.xDrift, 0] }}
                exit={{ opacity: 0, scale: 0, transition: { duration: p.exitDuration } }}
                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
                className="absolute rounded-full"
                style={{
                  width: p.size, height: p.size, left: `${p.left}%`,
                  backgroundColor: p.isGold ? "#fbbf24" : "#22c55e",
                  boxShadow: `0 0 10px ${p.isGold ? "#fbbf24" : "#22c55e"}`
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function getResetCountdown() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Math.floor((tomorrow - now) / 1000);
}

export function ResetTimer() {
  const [secs, setSecs] = useState(getResetCountdown);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return <span className="text-white font-sans tracking-tighter underline underline-offset-4 decoration-white/20">{h}h {m}m {s}s</span>;
}

export function LineParticles() {
  const particles = useMemo(() => {
    const random = createSeededRandom("minigame-line-particles-v1");
    return Array.from({ length: 16 }, () => ({
      x: random() * 100,
      y: random() * 100,
      color: LINE_PARTICLE_COLORS[Math.floor(random() * LINE_PARTICLE_COLORS.length)],
      size: random() * 5 + 3,
      duration: 2 + random() * 2,
      delay: random() * 2,
      xDrift: (random() - 0.5) * 120,
      yDrift: (random() - 0.5) * 120
    }));
  }, []);

  return (
    <div className="hidden md:block absolute inset-0 pointer-events-none overflow-visible z-0 transform-gpu">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full will-change-transform"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}`
          }}
          animate={{
            x: [0, p.xDrift],
            y: [0, p.yDrift],
            opacity: [0, 0.8, 0],
            scale: [0.6, 1.2, 0.6]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeOut",
            delay: p.delay
          }}
        />
      ))}
    </div>
  );
}

export function DecorativeCard({ seed }) {
  const scheduleTimeout = useTimeoutRegistry();
  const random = useRef(createSeededRandom(`minigame-decorative-card-${seed}-updates`));
  const [isFlipped, setIsFlipped] = useState(false);
  const [content, setContent] = useState(() => generateDecorativeContent(createSeededRandom(`minigame-decorative-card-${seed}-initial`)));

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipped(f => {
        if (f) scheduleTimeout(() => setContent(generateDecorativeContent(random.current)), 400);
        return !f;
      });
    }, 2000 + random.current() * 2000);
    return () => clearInterval(interval);
  }, [scheduleTimeout]);

  return (
    <div className="relative w-14 h-16" style={{ perspective: "1000px" }}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-0 bg-white rounded-xl flex items-center justify-center p-2 shadow-xl border border-black/5" style={{ backfaceVisibility: "hidden" }}>
          <Image src="/favicon.webp" alt="" width={771} height={681} sizes="32px" quality={75} loading="eager" decoding="async" className="w-8 h-8 opacity-70 object-contain" />
        </div>
        <div className="absolute inset-0 bg-white rounded-xl flex items-center justify-center p-2 shadow-xl border border-black/5" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
          <span className="font-black text-3xl select-none" style={{
            color: content.color,
            textShadow: `
              0 1px 0 rgba(0,0,0,0.1),
              0 2px 0 rgba(0,0,0,0.1),
              0 3px 0 rgba(0,0,0,0.1),
              0 4px 0 rgba(0,0,0,0.1),
              0 5px 0 rgba(0,0,0,0.2),
              0 6px 1px rgba(0,0,0,0.1),
              0 0 5px rgba(0,0,0,0.1)
            `,
            transform: "translateY(-2px)"
          }}>
            {content.char}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

