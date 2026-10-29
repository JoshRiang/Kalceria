"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import { useViewportActivity } from "@/hooks/useViewportActivity";
import { useHasMounted } from "@/hooks/useHasMounted";

const ABOUT_VIDEOS = Array.from({ length: 8 }, (_, i) => `/vid_abt${i + 1}.mp4`);

export function PhotoCollage({ isMobile }) {
  const containerRef = useRef(null);
  const mounted = useHasMounted();
  const isActive = useViewportActivity(containerRef, { rootMargin: "400px 0px" });
  const photos = Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.webp`);
  const activePhotos = mounted && isMobile ? photos.slice(0, 9) : photos;

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]">
      {/* Background Glows */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-[#FFD700]/15 via-[#00FFFF]/10 to-[#FFD700]/15" />
      </div>

      <motion.div
        animate={isActive ? { opacity: [0.4, 0.7, 0.4] } : { opacity: 0.5 }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        <div
          className="flex h-full animate-[roll_80s_linear_infinite]"
          style={{ width: "200%", animationPlayState: isActive ? "running" : "paused" }}
        >
          {/* Each "half" is a grid */}
          {[0, 1].map((setIndex) => (
            <div key={setIndex} className="grid w-1/2 h-full gap-1 grid-cols-3 md:grid-cols-5">
              {activePhotos.map((src, i) => (
                <div key={i} className="relative w-full h-full min-h-0 overflow-hidden bg-slate-900 border border-white/5">
                  <Image
                    src={src}
                    alt=""
                    aria-hidden="true"
                    width={800}
                    height={800}
                    sizes="(max-width: 768px) 33vw, 20vw"
                    quality={70}
                    loading="lazy"
                    decoding="async"
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

export function VideoCell({ index = 0, initialSrc, allVids, active = true }) {
  const [src, setSrc] = useState(initialSrc);
  const [glowColor, setGlowColor] = useState("#fbbf24");
  const [streamReady, setStreamReady] = useState(false);
  const videoRef = useRef(null);
  const randomRef = useRef(null);

  useEffect(() => {
    randomRef.current = createRuntimeSeededRandom(`about-video-cell-${initialSrc}`);
  }, [initialSrc]);

  useEffect(() => {
    const timer = setTimeout(() => setStreamReady(true), 450 + index * 180);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (!randomRef.current) return;
    const colors = ["#ef4444", "#fbbf24", "#22c55e"]; // Red, Yellow, Green
    setGlowColor(colors[Math.floor(randomRef.current() * colors.length)]);
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !streamReady) return;
    if (active) {
      v.play().catch(() => { });
    } else {
      v.pause();
    }
  }, [active, streamReady, src]);

  const handleEnded = () => {
    const others = allVids.filter(v => v !== src);
    const next = others[Math.floor((randomRef.current?.() ?? 0) * others.length)];
    setSrc(next);
  };

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-slate-950 border border-white/10">
      {/* Randomized Traffic Light Glow (GPU-composited pulse fills empty transition slots) */}
      <div
        className={`absolute inset-0 z-0 blur-[30px] opacity-55 ${active ? "animate-pulse" : ""}`}
        style={{ backgroundColor: glowColor }}
      />

      {streamReady && (
        <video
          ref={videoRef}
          src={src}
          autoPlay={active}
          muted
          playsInline
          preload="metadata"
          onEnded={handleEnded}
          className="relative z-10 w-full h-full object-cover opacity-90"
        />
      )}
    </div>
  );
}

export function VideoCollage({ isMobile }) {
  const containerRef = useRef(null);
  const isActive = useViewportActivity(containerRef, { rootMargin: "200px 0px", initialActive: true });
  const [initialGrid, setInitialGrid] = useState([]);
  const lastSizeRef = useRef(0);

  useEffect(() => {
    const mobileNow = typeof window !== "undefined" ? window.innerWidth < 768 : isMobile;
    const size = mobileNow ? 6 : 12;
    if (lastSizeRef.current === size) return;
    lastSizeRef.current = size;
    const random = createRuntimeSeededRandom(`about-video-collage-${mobileNow ? "mobile" : "desktop"}`);
    const base = Array.from({ length: size }, (_, i) => ABOUT_VIDEOS[i % ABOUT_VIDEOS.length]);
    setInitialGrid(base.sort(() => random() - 0.5));
  }, [isMobile]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]">
      {initialGrid.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {/* Background Glow to fill gaps */}
          <div className="absolute inset-0 opacity-40 mix-blend-screen">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FF00FF]/20 via-[#00FFFF]/10 to-[#FF00FF]/20" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-3 w-full h-full gap-1 opacity-60">
            {initialGrid.map((src, i) => (
              <VideoCell
                key={i}
                index={i}
                initialSrc={src}
                allVids={ABOUT_VIDEOS}
                active={isActive}
              />
            ))}
          </div>

          {/* Atmospheric Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-transparent to-[#050a14] opacity-80" />
        </motion.div>
      )}
    </div>
  );
}
