"use client";
import React from 'react';

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
            <div key={i} className="h-full bg-cover bg-center" style={{ width: itemWidth, backgroundImage: `url('${src}')` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function JourneyDescriptionBox({ description, delay = 0, className }) {
  const hasMaxWidth = className && className.includes("max-w-");
  const defaultClasses = `relative w-full p-6 flex items-center justify-center overflow-hidden rounded-[2rem] ${hasMaxWidth ? "" : "max-w-[400px]"}`;

  return (
    <div className={`${defaultClasses} ${className || ""}`}>
      {/* Dynamic Blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-black rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-50%] right-[-10%] w-[120%] h-[200%] bg-black rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      </div>

      <div 
        className="absolute inset-0 border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_80px_rgba(0,0,0,0.5)] z-0 pointer-events-none" 
        style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }} 
      />
      <div className="relative z-10 w-full text-xs md:text-sm font-serif not-italic text-white/90 drop-shadow-md leading-relaxed text-justify">
        {(() => {
          let formattedText = description;
          const formatStart = '<span class="underline font-bold italic">';
          const formatEnd = '</span>';
          formattedText = formattedText.replace(/Mist/g, `${formatStart}Mist${formatEnd}`);
          formattedText = formattedText.replace(/Dream Shift Labs/g, `${formatStart}Dream Shift Labs${formatEnd}`);
          formattedText = formattedText.replace(/Universitas Indonesia Motorsport/g, `${formatStart}Universitas Indonesia Motorsport${formatEnd}`);
          return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
        })()}
      </div>
    </div>
  );
}

export default function JourneyRightHalf({ images, description, delay = 0, className }) {
  return (
    <div className={`hidden md:flex flex-col items-center justify-center gap-8 z-30 ${className || "absolute right-0 top-1/2 -translate-y-1/2 w-1/2"}`}>
      <JourneySlider images={images} />
      <JourneyDescriptionBox description={description} delay={delay} />
    </div>
  );
}
