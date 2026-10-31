"use client";
import React, { useState } from 'react';
import Image from 'next/image';

export function JourneySlider({ images, logo, logoAlt, logoWidth = 260, logoHeight = 130, className }) {
  const [revealed, setRevealed] = useState(false);
  const count = images?.length || 1;
  const sliderClass = count === 5 ? "animate-slider-5" : count === 3 ? "animate-slider-3" : "animate-slider-2";
  const trackWidth = `${count * 100}%`;
  const itemWidth = `${100 / count}%`;

  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full aspect-square ${hasMaxWidth ? "" : "max-w-[400px]"}`;

  return (
    <div 
      onClick={() => setRevealed(prev => !prev)}
      className={`${defaultClasses} ${className || ""} cursor-pointer select-none group transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]`}
    >
      {!revealed && logo ? (
        /* White Card with Partner Logo & TAP ME font */
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)] bg-white border border-slate-100 z-20 flex flex-col items-center justify-center p-6 transition-all duration-500">
          <div className="relative w-full h-[65%] flex items-center justify-center p-2">
            <Image
              src={logo}
              alt={logoAlt || "Partner"}
              width={logoWidth}
              height={logoHeight}
              quality={95}
              loading="eager"
              className="max-w-[85%] max-h-[85%] w-auto h-auto object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <span className="text-[11px] sm:text-xs font-sans font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-black transition-colors mt-2 animate-pulse">
            TAP ME
          </span>
        </div>
      ) : (
        /* Revealed Photo Slider */
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-[0_0_60px_rgba(255,255,255,0.2)] bg-black/50 backdrop-blur-sm z-20 animate-in fade-in zoom-in-95 duration-500">
          <div className={`absolute inset-0 flex ${sliderClass}`} style={{ width: trackWidth }}>
            {images.map((src, i) => (
              <div key={i} className="relative h-full" style={{ width: itemWidth }}>
                <Image src={src} alt="" fill sizes="(min-width: 768px) 400px, 280px" quality={90} className="object-cover object-center" />
              </div>
            ))}
          </div>
          <div className="absolute top-3 right-3 z-30 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[9px] sm:text-[10px] font-sans font-bold text-white/90 tracking-wider uppercase border border-white/20">
            TAP TO FLIP
          </div>
        </div>
      )}
    </div>
  );
}

export function JourneyDescriptionBox({ description, className }) {
  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full p-6 sm:p-8 flex items-center justify-center overflow-hidden rounded-3xl ${hasMaxWidth ? "" : "max-w-[400px]"}`;

  return (
    <div 
      className={`${defaultClasses} ${className || ""} bg-white/10 backdrop-blur-3xl border-none shadow-[0_0_50px_rgba(255,255,255,0.25)]`}
      style={{
        maskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4) 75%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4) 75%, transparent 100%)"
      }}
    >
      {/* Cloud Dynamic Glow Blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen">
        <div className="absolute top-[-40%] left-[-20%] w-[120%] h-[160%] bg-[#FF00FF]/30 rounded-full blur-[50px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-40%] right-[-20%] w-[120%] h-[160%] bg-[#FFD700]/30 rounded-full blur-[50px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full text-xs md:text-sm font-serif not-italic text-white/95 drop-shadow-md leading-relaxed text-justify">
        {String(description || '').split(/(Universitas Indonesia Motorsport|Dream Shift Labs|Mist)/g).map((part, index) => (
          ['Mist', 'Dream Shift Labs', 'Universitas Indonesia Motorsport'].includes(part)
            ? <span key={`${part}-${index}`} className="underline font-bold italic">{part}</span>
            : part
        ))}
      </div>
    </div>
  );
}

export default function JourneyRightHalf({ images, logo, logoAlt, logoWidth, logoHeight, description, className }) {
  return (
    <div className={`hidden md:flex flex-col items-center justify-center gap-8 z-30 ${className || "absolute right-0 top-1/2 -translate-y-1/2 w-1/2"}`}>
      <JourneySlider images={images} logo={logo} logoAlt={logoAlt} logoWidth={logoWidth} logoHeight={logoHeight} />
      <JourneyDescriptionBox description={description} />
    </div>
  );
}
