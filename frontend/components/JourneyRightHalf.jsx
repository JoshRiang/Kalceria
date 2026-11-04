"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export function JourneySlider({
  images = [],
  logo,
  logoAlt,
  logoWidth = 260,
  logoHeight = 130,
  isFlipped: controlledFlipped,
  onToggleFlip,
  className,
  brandName,
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

  const resolvedBrandName =
    brandName ||
    (isDsl
      ? "DSL"
      : String(logoAlt || "").toLowerCase().includes("ui") || String(logo || "").includes("se2")
      ? "UIMS"
      : "Mist");

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
          } flex flex-col items-center justify-between p-5 sm:p-6 transition-transform duration-300 group-hover:scale-[1.02]`}
        >
          <div className="relative w-full flex-1 flex items-center justify-center p-2 min-h-0">
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

          {/* Collaboration Line: Arial bold, not all capital, mid-justified with line wrap */}
          <div className="w-full flex items-center justify-center px-3 my-1">
            <p
              className={`text-xs sm:text-[13px] font-bold text-center leading-snug max-w-[88%] break-words select-none ${
                isDsl ? "text-white" : "text-black"
              }`}
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              Our collaboration with{" "}
              <span className="italic font-bold underline">{resolvedBrandName}</span>
            </p>
          </div>

          <span
            className={`text-xs sm:text-sm font-black uppercase tracking-tight mt-1 mb-1 ${
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
          {/* Transparent Segmented Story Progress Lines at Top Edge (Picture 2: No glow, flat white) */}
          <div className="absolute top-3.5 sm:top-4 left-4 right-4 z-30 flex items-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full backdrop-blur-sm transition-all duration-300"
                style={{
                  backgroundColor: i === activeIndex ? "#ffffff" : "rgba(255, 255, 255, 0.35)",
                  boxShadow: "none",
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

          {/* Bottom Flip Hint - Discard outer box, Arial bold, not all capital, no glow (Picture 1) */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full text-center px-2">
            <span
              className="text-xs sm:text-[13px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none tracking-normal"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              Tap card to flip back
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function JourneyDescriptionBox({
  description,
  isFlipped = false,
  className,
  delay = 350,
  speed = 22,
}) {
  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full px-2 py-0.5 flex items-center justify-center min-h-[58px] sm:min-h-[66px] ${
    hasMaxWidth ? "" : "max-w-[360px] md:max-w-[480px]"
  }`;

  // Parse segments for keyword highlighting (Mist, Dream Shift Labs, Universitas Indonesia Motorsport)
  const keywords = ['Mist', 'Dream Shift Labs', 'Universitas Indonesia Motorsport'];
  const parsedSegments = useMemo(() => {
    const parts = String(description || '').split(/(Universitas Indonesia Motorsport|Dream Shift Labs|Mist)/g);
    let currentIndex = 0;
    return parts.filter(Boolean).map((part) => {
      const isKeyword = keywords.includes(part);
      const start = currentIndex;
      const end = currentIndex + part.length;
      currentIndex = end;
      return { part, isKeyword, start, end };
    });
  }, [description]);

  const totalLength = useMemo(() => {
    return parsedSegments.reduce((sum, s) => sum + s.part.length, 0);
  }, [parsedSegments]);

  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (!isFlipped) {
      setCharCount(0);
      return;
    }

    let rafId;
    let startTs = null;
    const timer = setTimeout(() => {
      const step = (ts) => {
        if (startTs === null) startTs = ts;
        const next = Math.min(totalLength, Math.floor((ts - startTs) / speed) + 1);
        setCharCount(next);
        if (next < totalLength) {
          rafId = requestAnimationFrame(step);
        }
      };
      rafId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isFlipped, totalLength, delay, speed]);

  return (
    <div className={`${defaultClasses} ${className || ""}`}>
      <AnimatePresence>
        {isFlipped && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.25 } }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative z-10 w-full text-[15px] sm:text-base md:text-[17px] xl:text-[18px] font-serif not-italic text-white text-center leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
          >
            {parsedSegments.map(({ part, isKeyword, start, end }, idx) => {
              if (charCount <= start) return null;
              const visibleSlice = part.slice(0, Math.min(part.length, charCount - start));
              if (isKeyword) {
                return (
                  <span key={idx} className="underline font-bold italic">
                    {visibleSlice}
                  </span>
                );
              }
              return <span key={idx}>{visibleSlice}</span>;
            })}
            {charCount > 0 && charCount < totalLength && (
              <span className="inline-block w-1 h-3.5 sm:h-4 ml-0.5 bg-white/80 animate-pulse align-middle" />
            )}
          </motion.p>
        )}
      </AnimatePresence>
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
  brandName,
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
        brandName={brandName}
      />
      <JourneyDescriptionBox description={description} isFlipped={isFlipped} />
    </div>
  );
}
