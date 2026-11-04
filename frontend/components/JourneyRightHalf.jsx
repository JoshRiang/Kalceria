"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export function JourneySlider({
  images = [],
  logo,
  logoAlt,
  logoWidth = 260,
  logoHeight = 130,
  isFlipped: controlledFlipped,
  onToggleFlip,
  className,
}) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = typeof controlledFlipped === "boolean" ? controlledFlipped : internalFlipped;
  const setFlipped = (nextVal) => {
    if (typeof onToggleFlip === "function") {
      onToggleFlip(nextVal);
    } else {
      setInternalFlipped(nextVal);
    }
  };

  const [activeIndex, setActiveIndex] = useState(0);
  const count = images?.length || 1;
  const isDsl = Boolean(logo && (logo.includes('dsl') || logoAlt?.toLowerCase().includes('dsl')));

  // Auto-advance photos when card is flipped face-up
  useEffect(() => {
    if (!isFlipped || count <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, 3200);
    return () => clearInterval(timer);
  }, [isFlipped, count]);

  // Reset active index when flipped back to logo
  useEffect(() => {
    if (!isFlipped) {
      setActiveIndex(0);
    }
  }, [isFlipped]);

  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full aspect-square ${hasMaxWidth ? "" : "max-w-[280px] xs:max-w-[320px] sm:max-w-[360px] md:max-w-[400px]"}`;

  const handleCardClick = (e) => {
    // If card is already flipped to photo, check if user tapped the left or right 25% edge for prev/next
    if (isFlipped && count > 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = clickX / rect.width;

      if (ratio < 0.25) {
        // Tap left edge: Previous photo
        setActiveIndex((prev) => (prev - 1 + count) % count);
        return;
      }
      if (ratio > 0.75) {
        // Tap right edge: Next photo
        setActiveIndex((prev) => (prev + 1) % count);
        return;
      }
    }

    // Otherwise tap flips the card (TAP HERE flips to photo, tapping back flips to logo)
    setFlipped(!isFlipped);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`${defaultClasses} ${className || ""} cursor-pointer select-none group`}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        animate={{
          rotateY: isFlipped ? 180 : 0,
          y: isFlipped ? -6 : 0,
        }}
        transition={{
          duration: 0.65,
          ease: [0.45, 0.05, 0.55, 0.95],
        }}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        className="w-full h-full"
      >
        {/* ─── Front Face: Partner Logo & TAP HERE ─── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
          }}
          className={`rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${
            isDsl ? "bg-black border border-white/20" : "bg-white border border-slate-100"
          } flex flex-col items-center justify-center p-6 transition-transform duration-300 group-hover:scale-[1.02]`}
        >
          <div className="relative w-full h-[65%] flex items-center justify-center p-2">
            <Image
              src={logo}
              alt={logoAlt || "Partner"}
              width={logoWidth}
              height={logoHeight}
              quality={85}
              loading="lazy"
              className={`max-w-[85%] max-h-[85%] w-auto h-auto object-contain filter ${
                isDsl ? "drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "drop-shadow-md"
              } group-hover:scale-105 transition-transform duration-300`}
            />
          </div>
          <span
            className={`text-xs sm:text-sm font-black uppercase tracking-tight mt-2 ${
              isDsl ? "text-white" : "text-black"
            }`}
            style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
          >
            TAP HERE
          </span>
        </div>

        {/* ─── Back Face: Photo Showcase with Transparent Indicator Lines (Picture 3) ─── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] bg-black/80 border border-white/25 flex flex-col items-center justify-center"
        >
          {/* Transparent Segmented Story Progress Lines at Top Edge (Picture 3) */}
          <div className="absolute top-3.5 sm:top-4 left-4 right-4 z-30 flex items-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full backdrop-blur-sm transition-all duration-300"
                style={{
                  backgroundColor: i === activeIndex ? "#ffffff" : "rgba(255, 255, 255, 0.35)",
                  boxShadow: i === activeIndex ? "0 0 8px rgba(255, 255, 255, 0.9)" : "none",
                }}
              />
            ))}
          </div>

          {/* Crossfading Photos */}
          <div className="relative w-full h-full">
            {images.map((src, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                  i === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <Image
                  src={src}
                  alt={logoAlt || "Journey Photo"}
                  fill
                  sizes="(min-width: 1280px) 440px, (min-width: 768px) 380px, 300px"
                  quality={85}
                  className="object-cover object-center"
                />
              </div>
            ))}
          </div>

          {/* Subtle Bottom Flip Hint */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <span className="text-[10px] tracking-wider uppercase font-mono text-white/70 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
              Tap card to flip back
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function JourneyDescriptionBox({ description, className }) {
  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full px-2 py-0.5 flex items-center justify-center ${hasMaxWidth ? "" : "max-w-[360px] md:max-w-[480px]"}`;

  return (
    <div className={`${defaultClasses} ${className || ""}`}>
      <p className="relative z-10 w-full text-[15px] sm:text-base md:text-[17px] xl:text-[18px] font-serif not-italic text-white text-center leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
        {String(description || '').split(/(Universitas Indonesia Motorsport|Dream Shift Labs|Mist)/g).map((part, index) => (
          ['Mist', 'Dream Shift Labs', 'Universitas Indonesia Motorsport'].includes(part)
            ? <span key={`${part}-${index}`} className="underline font-bold italic">{part}</span>
            : part
        ))}
      </p>
    </div>
  );
}

export default function JourneyRightHalf({
  images,
  logo,
  logoAlt,
  logoWidth,
  logoHeight,
  description,
  isFlipped,
  onToggleFlip,
  className,
}) {
  return (
    <div className={`hidden xl:flex flex-col items-center justify-center gap-4 xl:gap-5 z-30 ${className || "absolute right-0 top-1/2 -translate-y-1/2 w-1/2"}`}>
      <JourneySlider
        images={images}
        logo={logo}
        logoAlt={logoAlt}
        logoWidth={logoWidth}
        logoHeight={logoHeight}
        isFlipped={isFlipped}
        onToggleFlip={onToggleFlip}
      />
      <JourneyDescriptionBox description={description} />
    </div>
  );
}
