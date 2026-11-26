"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import { useViewportActivity } from "@/hooks/useViewportActivity";
import { useHasMounted } from "@/hooks/useHasMounted";
import {
  ABOUT_VIDEOS,
  assignDistinctAboutVideos,
  pickNextDistinctAboutVideo,
} from "./aboutVideoSelector";

export function PhotoCollage({ isMobile }) {
  const containerRef = useRef(null);
  const mounted = useHasMounted();
  const isActive = useViewportActivity(containerRef, { rootMargin: "400px 0px" });
  const photos = Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.webp`);
  const activePhotos = mounted && isMobile ? photos.slice(0, 9) : photos;

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]">
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

export function VideoCell({
  index = 0,
  src,
  active = true,
  onRequestNextSrc,
}) {
  const [hasFrame, setHasFrame] = useState(false);
  const [glowColor] = useState(() => {
    const colors = ["#ef4444", "#fbbf24", "#22c55e"];
    return colors[index % colors.length];
  });
  const videoRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      if (v.readyState >= 2) setHasFrame(true);
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active, src]);

  const handleEnded = () => {
    const nextSrc = onRequestNextSrc?.(index, src);
    if (!nextSrc || nextSrc === src) {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-slate-950 border border-white/10">
      {/* Default traffic-light glow fallback stays intact while video buffers in-place */}
      <div
        className={`absolute inset-0 z-0 blur-[30px] opacity-55 ${active ? "animate-pulse" : ""}`}
        style={{ backgroundColor: glowColor }}
      />

      {/* Instant in-place preparation (0ms stagger, preload="auto" when within lazy rootMargin) */}
      {active && src && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setHasFrame(true)}
          onCanPlay={() => setHasFrame(true)}
          onEnded={handleEnded}
          className={`relative z-10 w-full h-full object-cover transition-opacity duration-200 ${
            hasFrame ? "opacity-90" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

export function VideoCollage({ isMobile }) {
  const containerRef = useRef(null);
  // Generous 900px lazy rootMargin prepares videos in-place right before scroll entry
  const isActive = useViewportActivity(containerRef, { rootMargin: "900px 0px", initialActive: true });
  const [cellVideos, setCellVideos] = useState([]);
  const activeSrcsRef = useRef(new Set());
  const randomRef = useRef(null);
  const lastSizeRef = useRef(0);

  useEffect(() => {
    const mobileNow = typeof window !== "undefined" ? window.innerWidth < 768 : isMobile;
    // 4 unique nodes on mobile (2x2), 8 unique nodes on desktop (4x2) — 100% distinct across all 8 clips
    const size = mobileNow ? 4 : Math.min(8, ABOUT_VIDEOS.length);
    if (lastSizeRef.current === size) return;
    lastSizeRef.current = size;
    const rng = createRuntimeSeededRandom(`about-video-collage-v2-${mobileNow ? "mobile" : "desktop"}`);
    randomRef.current = rng;
    const assigned = assignDistinctAboutVideos(size, ABOUT_VIDEOS, rng);
    activeSrcsRef.current = new Set(assigned);
    setCellVideos(assigned);
  }, [isMobile]);

  const handleRequestNextSrc = useCallback((cellIdx, currentSrc) => {
    const next = pickNextDistinctAboutVideo(
      currentSrc,
      activeSrcsRef.current,
      ABOUT_VIDEOS,
      randomRef.current || Math.random
    );
    if (next && next !== currentSrc) {
      activeSrcsRef.current.delete(currentSrc);
      activeSrcsRef.current.add(next);
      setCellVideos((prev) => prev.map((v, i) => (i === cellIdx ? next : v)));
    }
    return next;
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]">
      {cellVideos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 opacity-40 mix-blend-screen">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FF00FF]/20 via-[#00FFFF]/10 to-[#FF00FF]/20" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 w-full h-full gap-1 opacity-60">
            {cellVideos.map((src, i) => (
              <VideoCell
                key={i}
                index={i}
                src={src}
                active={isActive}
                onRequestNextSrc={handleRequestNextSrc}
              />
            ))}
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-transparent to-[#050a14] opacity-80" />
        </motion.div>
      )}
    </div>
  );
}
