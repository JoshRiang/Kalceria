"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineParticles } from "./MinigameVisuals";

export function MinigameTrailerModal({
  showTrailer,
  onClose,
  isMobile,
  isTablet,
  videoRef,
}) {
  return (
    <AnimatePresence>
      {showTrailer && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 overflow-y-auto bg-black/90">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            onClick={onClose}
            className="absolute inset-0 cursor-pointer"
          />
          <div className="relative flex flex-col items-center py-6 sm:py-12 min-h-full justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10, filter: "blur(20px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 20, filter: "blur(40px)", transition: { duration: 0.8 } }}
              transition={{ duration: 1.5 }}
              className="text-center mb-6 sm:mb-8 w-full max-w-[340px] xs:max-w-[370px] sm:max-w-md px-2 relative"
            >
              <div className="flex items-center justify-center gap-4 mb-2">
                <h2 className="text-4xl font-black italic tracking-tighter text-white" style={{ textShadow: "3px 3px 0px #d946ef" }}>
                  SOCIAL CULT
                </h2>
                <button
                  aria-label="Close trailer"
                  onClick={onClose}
                  className="p-2 flex items-center justify-center text-white/90 hover:text-white hover:scale-110 transition-all group translate-x-2"
                >
                  <svg className="w-5 h-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs font-sans text-white/80 leading-relaxed text-center px-2 mt-2">
                A revolutionary fusion of high-performance automotive engineering and urban street culture. Join the collective as we redefine the boundaries of style and speed.
              </p>
            </motion.div>

            <div className="relative">
              {/* Corner framing stickers - Spread outward for phone, tab & iPad family to completely clear play/pause controls */}
              {[
                { src: "/ge_1.webp", pos: isMobile ? "-top-6 -left-10" : isTablet ? "-top-8 -left-14" : "-top-24 -left-40", rot: -15 },
                { src: "/ge_2.webp", pos: isMobile ? "-top-6 -right-10" : isTablet ? "-top-8 -right-14" : "-top-20 -right-36", rot: 20 },
                { src: "/ge_3.webp", pos: isMobile ? "-bottom-8 -left-12" : isTablet ? "-bottom-10 -left-16" : "bottom-[5%] -left-48", rot: 10 },
                { src: "/ge_4.webp", pos: isMobile ? "-bottom-8 -right-12" : isTablet ? "-bottom-10 -right-14" : "bottom-[7%] -right-44", rot: -10 },
              ].map((ge, idx) => (
                <motion.img
                  key={idx}
                  src={ge.src}
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  decoding="async"
                  initial={{ opacity: 0, scale: 0.6, rotate: ge.rot }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: ge.rot,
                  }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.15 + idx * 0.08,
                    ease: "easeOut",
                  }}
                  className={`absolute ${ge.pos} ${isMobile ? "w-14" : isTablet ? "w-16 md:w-20" : "w-24 md:w-36"} h-auto object-contain z-20 drop-shadow-xl pointer-events-none transform-gpu will-change-transform`}
                />
              ))}

              {/* Video Card - Rock-solid static presentation while playing with zero layout repainting */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative w-[220px] xs:w-[240px] md:w-[320px] aspect-[9/16] rounded-3xl md:rounded-[2.5rem] border border-yellow-500/50 shadow-[0_0_35px_rgba(251,191,36,0.35)] bg-black mt-0 sm:mt-[-1rem] overflow-visible transform-gpu will-change-transform"
              >
                {/* Golden Glow Accent - Static GPU accelerated glow without CPU blur recalculation */}
                <div
                  className="absolute inset-[-6%] bg-yellow-500/20 blur-[25px] rounded-[3rem] z-0 pointer-events-none transform-gpu"
                />

                {/* Rainbow Particles (Desktop Only) */}
                <LineParticles />

                <div className="relative w-full h-full z-10 overflow-hidden rounded-3xl md:rounded-[2.5rem] border border-white/10 transform-gpu">
                  <video 
                    ref={videoRef} 
                    src="/trailer.mp4" 
                    controls 
                    autoPlay 
                    playsInline 
                    webkit-playsinline="true"
                    preload="metadata"
                    controlsList="nodownload"
                    className="w-full h-full object-cover transform-gpu will-change-transform" 
                    style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

