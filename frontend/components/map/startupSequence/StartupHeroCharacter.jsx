"use client";

import { motion, AnimatePresence } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";

export function StartupHeroCharacter({ isDark, tiltWrapperRef }) {
  return (
    <AnimatePresence>
      {isDark && (
        <motion.div
          key="kalcermanmap-revisi-entrance"
          initial={{ x: -1600, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            x: { type: "spring", stiffness: 50, damping: 14 },
            opacity: { duration: 0.4 },
          }}
          className="hidden sm:flex relative w-full max-w-[480px] sm:max-w-[560px] md:max-w-[640px] lg:max-w-[760px] xl:max-w-[900px] h-[260px] sm:h-[320px] md:h-[420px] lg:h-[480px] xl:h-[520px] flex-col items-center justify-center my-2 sm:my-3 md:my-4 z-20 mx-auto pointer-events-none"
          style={{ willChange: "transform, opacity" }}
        >
          {/* Glowing 3D Grid Floor when background is dark */}
          <div
            className="absolute bottom-[-40px] md:bottom-[-60px] w-[360px] sm:w-[480px] md:w-[640px] lg:w-[800px] h-[160px] md:h-[240px] opacity-25 pointer-events-none transition-all duration-1000 ease-out"
            style={{
              background:
                "linear-gradient(rgba(0, 240, 255, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.25) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
              transform: "rotateX(75deg) translateZ(-60px)",
              maskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
            }}
          />

          {/* The 3D Perspective Wrapper Container */}
          <div
            ref={tiltWrapperRef}
            style={{
              perspective: "1000px",
              transformStyle: "preserve-3d",
              transition: "transform 0.08s ease-out",
              width: "100%",
              height: "100%",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Floating Character - Vertical bobbing inside 3D perspective */}
            <motion.div
              key="kalcermanmap-revisi-sprite"
              animate={{
                y: [0, -16, 0],
              }}
              transition={{
                y: {
                  repeat: Infinity,
                  duration: 3.2,
                  ease: "easeInOut",
                },
              }}
              className="relative z-10 w-full h-full flex items-center justify-center"
              style={{
                transformStyle: "preserve-3d",
                transform: "translateZ(60px)",
                willChange: "transform",
              }}
            >
              {/* Sized decently big to cover the middle of the screen */}
              <ContentImage
                src="/kalcermanmap_revisi.webp"
                alt="Kalcerman Map"
                width={1200}
                height={1200}
                sizes="(max-width: 1024px) 580px, (max-width: 1280px) 720px, 840px"
                priority
                className="relative w-auto h-full max-h-[260px] sm:max-h-[320px] md:max-h-[400px] lg:max-h-[460px] xl:max-h-[500px] max-w-[95%] object-contain filter drop-shadow-[0_0_35px_rgba(255,0,110,0.45)] drop-shadow-[0_0_60px_rgba(255,214,10,0.25)] select-none pointer-events-none"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "translateZ(20px)",
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
