"use client";
import React, { useState } from 'react';
import Image from 'next/image';

export function JourneySlider({ images, logo, logoAlt, logoWidth = 260, logoHeight = 130, className }) {
  const [revealed, setRevealed] = useState(false);
  const count = images?.length || 1;
  const sliderClass = count === 5 ? "animate-slider-5" : count === 3 ? "animate-slider-3" : "animate-slider-2";
  const trackWidth = `${count * 100}%`;
  const itemWidth = `${100 / count}%`;

  const isDsl = Boolean(logo && (logo.includes('dsl') || logoAlt?.toLowerCase().includes('dsl')));

  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full aspect-square ${hasMaxWidth ? "" : "max-w-[400px]"}`;

  return (
    <div 
      onClick={() => setRevealed(prev => !prev)}
      className={`${defaultClasses} ${className || ""} cursor-pointer select-none group transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]`}
    >
      {!revealed && logo ? (
        /* Card with Partner Logo & TAP HERE font (Black box for DSL, White for others) */
        <div className={`absolute inset-0 rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4)] ${isDsl ? "bg-black border border-white/20" : "bg-white border border-slate-100"} z-20 flex flex-col items-center justify-center p-6 transition-all duration-500`}>
          <div className="relative w-full h-[65%] flex items-center justify-center p-2">
            <Image
              src={logo}
              alt={logoAlt || "Partner"}
              width={logoWidth}
              height={logoHeight}
              quality={85}
              loading="lazy"
              className={`max-w-[85%] max-h-[85%] w-auto h-auto object-contain filter ${isDsl ? "drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "drop-shadow-md"} group-hover:scale-105 transition-transform duration-300`}
            />
          </div>
          <span 
            className={`text-xs sm:text-sm font-black uppercase tracking-tight mt-2 ${isDsl ? "text-white" : "text-black"}`}
            style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
          >
            TAP HERE
          </span>
        </div>
      ) : (
        /* Revealed Photo Slider */
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-[0_0_60px_rgba(255,255,255,0.2)] bg-black/50 backdrop-blur-sm z-20 animate-in fade-in zoom-in-95 duration-500">
          <div className={`absolute inset-0 flex ${sliderClass}`} style={{ width: trackWidth }}>
            {images.map((src, i) => (
              <div key={i} className="relative h-full" style={{ width: itemWidth }}>
                <Image src={src} alt="" fill sizes="(min-width: 768px) 400px, 280px" quality={85} className="object-cover object-center" />
              </div>
            ))}
          </div>
        </div>
      )}
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

export default function JourneyRightHalf({ images, logo, logoAlt, logoWidth, logoHeight, description, className }) {
  return (
    <div className={`hidden xl:flex flex-col items-center justify-center gap-4 xl:gap-5 z-30 ${className || "absolute right-0 top-1/2 -translate-y-1/2 w-1/2"}`}>
      <JourneySlider images={images} logo={logo} logoAlt={logoAlt} logoWidth={logoWidth} logoHeight={logoHeight} />
      <JourneyDescriptionBox description={description} />
    </div>
  );
}
