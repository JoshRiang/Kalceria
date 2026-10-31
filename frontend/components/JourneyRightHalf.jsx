"use client";
import React from 'react';
import Image from 'next/image';

export function JourneySlider({ images, className }) {
  const count = images.length;
  const sliderClass = count === 5 ? "animate-slider-5" : count === 3 ? "animate-slider-3" : "animate-slider-2";
  const trackWidth = `${count * 100}%`;
  const itemWidth = `${100 / count}%`;

  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full aspect-square ${hasMaxWidth ? "" : "max-w-[400px]"}`;

  return (
    <div className={`${defaultClasses} ${className || ""}`}>
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-[0_0_60px_rgba(255,255,255,0.1)] bg-black/50 backdrop-blur-sm z-20">
        <div className={`absolute inset-0 flex ${sliderClass}`} style={{ width: trackWidth }}>
          {images.map((src, i) => (
            <div key={i} className="relative h-full" style={{ width: itemWidth }}>
              <Image src={src} alt="" fill sizes="(min-width: 768px) 400px, 280px" quality={90} className="object-cover object-center" />
            </div>
          ))}
        </div>
      </div>
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

export default function JourneyRightHalf({ images, description, className }) {
  return (
    <div className={`hidden md:flex flex-col items-center justify-center gap-8 z-30 ${className || "absolute right-0 top-1/2 -translate-y-1/2 w-1/2"}`}>
      <JourneySlider images={images} />
      <JourneyDescriptionBox description={description} />
    </div>
  );
}
