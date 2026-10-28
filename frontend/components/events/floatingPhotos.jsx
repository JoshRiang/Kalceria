"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";

export const FLOAT_PHOTOS = [
  { src: "/ven_3.webp", top: "23%",   left: "26%",   rotate: -12, delay: 0.6  }, // Top Left
  { src: "/ven_2.webp", top: "23%",   right: "26%",  rotate:  12, delay: 1.1  }, // Top Right
  { src: "/ven_5.webp", bottom: "23%", left: "26%",   rotate: -12, delay: 0.3  }, // Bottom Left
  { src: "/ven_6.webp", bottom: "23%", right: "26%",  rotate:  12, delay: 2.2  }, // Bottom Right
];

export function FloatingPhotoCard({ initialSrc, config, index }) {
  const [src, setSrc] = useState(initialSrc);
  const photos = useMemo(() => Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.webp`), []);
  const randomRef = useRef(null);

  useEffect(() => {
    randomRef.current = createRuntimeSeededRandom(`events-floating-photo-${initialSrc}`);
  }, [initialSrc]);

  useEffect(() => {
    const interval = setInterval(() => {
      const others = photos.filter(p => p !== src);
      const next = others[Math.floor(randomRef.current() * others.length)];
      setSrc(next);
    }, 3000 + randomRef.current() * 1000);
    return () => clearInterval(interval);
  }, [photos, src, initialSrc]);

  return (
    <motion.div
      className="absolute z-30 pointer-events-none"
      style={{ top: config.top, left: config.left, right: config.right, bottom: config.bottom }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -14, 0] }}
      transition={{
        opacity: { duration: 1.2, delay: config.delay },
        y: { duration: 4 + index * 0.4, repeat: Infinity, ease: "easeInOut", delay: config.delay },
      }}
    >
      <div 
        className="relative overflow-hidden" 
        style={{ 
          width: 112, 
          height: 77, 
          borderRadius: 14, 
          transform: `rotate(${config.rotate}deg)`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)"
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={src}
            src={src}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
            alt=""
          />
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function FloatingPhotos({ isMobile }) {
  const configs = [
    { src: "/ven_3.webp", top: "23%",   left: isMobile ? "11%" : "26%",   rotate: -12, delay: 0.6  }, // Top Left
    { src: "/ven_2.webp", top: "23%",   right: isMobile ? "11%" : "26%",  rotate:  12, delay: 1.1  }, // Top Right
    { src: "/ven_5.webp", bottom: "23%", left: isMobile ? "11%" : "26%",   rotate: -12, delay: 0.3  }, // Bottom Left
    { src: "/ven_6.webp", bottom: "23%", right: isMobile ? "11%" : "26%",  rotate:  12, delay: 2.2  }, // Bottom Right
  ];

  return (
    <>
      {configs.map((p, i) => (
        <FloatingPhotoCard key={i} index={i} config={p} initialSrc={p.src} />
      ))}
    </>
  );
}
