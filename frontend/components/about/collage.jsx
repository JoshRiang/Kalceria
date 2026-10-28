"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";

const ABOUT_VIDEOS = Array.from({ length: 8 }, (_, i) => `/vid_abt${i + 1}.mp4`);

export function PhotoCollage({ isMobile }) {
  const photos = Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.webp`);
  const activePhotos = isMobile ? photos.slice(0, 9) : photos;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]">
      {/* Background Glows */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-[#FFD700]/15 via-[#00FFFF]/10 to-[#FFD700]/15" />
      </div>

      <motion.div 
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        <div 
          className="flex h-full animate-[roll_80s_linear_infinite]"
          style={{ width: "200%" }}
        >
          {/* Each "half" is a grid */}
          {[0, 1].map((setIndex) => (
            <div key={setIndex} className={`grid w-1/2 h-full gap-1 ${isMobile ? "grid-cols-3" : "grid-cols-5"}`}>
              {activePhotos.map((src, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden bg-slate-900 border border-white/5">
                  <img 
                    src={src} 
                    alt="Background" 
                    className="w-full h-full object-cover filter grayscale contrast-125 brightness-75 opacity-80" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-transparent to-[#050a14]" />
      
      <style jsx>{`
        @keyframes roll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export function VideoCell({ initialSrc, allVids }) {
  const [src, setSrc] = useState(initialSrc);
  const [glowColor, setGlowColor] = useState("#fbbf24");
  const videoRef = useRef(null);
  const randomRef = useRef(null);

  useEffect(() => {
    randomRef.current = createRuntimeSeededRandom(`about-video-cell-${initialSrc}`);
  }, [initialSrc]);

  useEffect(() => {
    if (!randomRef.current) return;
    const colors = ["#ef4444", "#fbbf24", "#22c55e"]; // Red, Yellow, Green
    setGlowColor(colors[Math.floor(randomRef.current() * colors.length)]);
  }, [src]);

  const handleEnded = () => {
    const others = allVids.filter(v => v !== src);
    const next = others[Math.floor((randomRef.current?.() ?? 0) * others.length)];
    setSrc(next);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 border border-white/10">
      {/* Randomized Traffic Light Glow (Fills empty transition slots) */}
      <motion.div 
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 z-0 blur-[30px]"
        style={{ backgroundColor: glowColor }}
      />

      <video 
        ref={videoRef}
        src={src} 
        autoPlay 
        muted 
        playsInline 
        onEnded={handleEnded}
        className="relative z-10 w-full h-full object-cover opacity-90"
      />
    </div>
  );
}

export function VideoCollage({ isMobile }) {
  const [initialGrid, setInitialGrid] = useState([]);
  
  useEffect(() => {
    const random = createRuntimeSeededRandom(`about-video-collage-${isMobile ? "mobile" : "desktop"}`);
    const size = isMobile ? 6 : 12;
    const base = Array.from({ length: size }, (_, i) => ABOUT_VIDEOS[i % ABOUT_VIDEOS.length]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the seeded post-mount shuffle and mobile grid transition.
    setInitialGrid(base.sort(() => random() - 0.5));
  }, [isMobile]);

  if (initialGrid.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, ease: "easeOut" }}
      className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]"
    >
      {/* Background Glow to fill gaps */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FF00FF]/20 via-[#00FFFF]/10 to-[#FF00FF]/20" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 w-full h-full gap-1 opacity-60">
        {initialGrid.map((src, i) => (
          <VideoCell 
            key={i} 
            index={i} 
            initialSrc={src} 
            allVids={ABOUT_VIDEOS} 
          />
        ))}
      </div>
      
      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-transparent to-[#050a14] opacity-80" />
    </motion.div>
  );
}
