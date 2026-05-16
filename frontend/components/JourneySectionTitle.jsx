"use client";
import React from 'react';

export default function JourneySectionTitle({ text, align = "left", delay = 500 }) {
  return (
    <h1 
      className={`text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-2xl font-rog relative z-10 text-${align}`}
      style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}
    >
      <span>{text}</span>
    </h1>
  );
}
