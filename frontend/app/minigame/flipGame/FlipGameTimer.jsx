"use client";
import React from "react";

export function Timer({ ms }) {
  const m = String(Math.floor(ms / 6000)).padStart(2, "0");
  const s = String(Math.floor((ms % 6000) / 100)).padStart(2, "0");
  const mil = String(ms % 100).padStart(2, "0");
  return (
    <div className="flex items-baseline justify-center gap-1 font-sans font-black text-white tracking-tighter leading-none tabular-nums" style={{
      textShadow: "0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(0,0,0,0.5)"
    }}>
      <span className="text-4xl sm:text-6xl md:text-[5rem]">{m}:{s}</span>
      <span className="text-xl sm:text-2xl md:text-[2rem] opacity-60">:{mil}</span>
    </div>
  );
}

