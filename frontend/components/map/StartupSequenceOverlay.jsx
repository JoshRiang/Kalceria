"use client";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

import { useStartupProgress } from "./startupSequence/useStartupProgress";
import { useStartup3DTilt } from "./startupSequence/useStartup3DTilt";
import { useStartupQuotes } from "./startupSequence/useStartupQuotes";
import { StartupAtmosphere } from "./startupSequence/StartupAtmosphere";
import { StartupHeroCharacter } from "./startupSequence/StartupHeroCharacter";

export function StartupSequenceOverlay({
  showStartup,
  authReady = false,
  mapEngineReady = false,
  isReady = false,
  onComplete,
}) {
  const isMobile = useIsMobileViewport();
  const tiltWrapperRef = useRef(null);
  const barFillRef = useRef(null);
  const percentTextRef = useRef(null);

  // Hook 1: Precision Monotonic Staged Progress Engine
  const { isDark, progressValRef } = useStartupProgress({
    showStartup,
    authReady,
    mapEngineReady,
    isReady,
    onComplete,
    barFillRef,
    percentTextRef,
  });

  // Hook 2: Direct-DOM 3D Tilt Tracking
  useStartup3DTilt({ showStartup, tiltWrapperRef });

  // Hook 3: Quotes cycler
  const { currentQuote } = useStartupQuotes({ showStartup });

  return (
    <AnimatePresence>
      {showStartup && (
        <motion.div
          key="startup-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          className={`fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden transition-colors duration-[1500ms] ease-in-out ${
            !isDark ? "bg-white" : "bg-[#050a14]"
          }`}
          style={{ willChange: "opacity" }}
        >
          {/* Atmosphere: Chevrons, Vintage Laser Grid, Speed Lines, Watermark, Microparticles, Corner Glow */}
          <StartupAtmosphere
            showStartup={showStartup}
            isDark={isDark}
            isMobile={isMobile}
          />

          {/* Inner Content that fades in dramatically */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 w-full h-screen flex flex-col items-center justify-center pb-24 md:pb-0 md:justify-start pt-16 md:pt-20 lg:pt-24 select-none"
          >
            {/* Main Title Section */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "circOut" }}
              className="flex flex-col items-center mb-2 sm:mb-4 px-4 w-full text-center"
            >
              <h1
                className={`text-5xl xs:text-6xl sm:text-7xl md:text-8xl xl:text-9xl font-sans font-black italic tracking-tighter uppercase leading-[0.9] transition-all duration-700 text-center flex flex-col xl:flex-row items-center justify-center gap-1 xl:gap-4 ${
                  !isDark ? "text-slate-800" : "text-white"
                }`}
                style={{
                  textShadow:
                    isDark
                      ? `
                        2px 2px 0 #1a1a24,
                        4px 4px 0 #1a1a24,
                        6px 6px 0 #1a1a24,
                        8px 8px 0 #FF00FF,
                        10px 10px 0 #00FFFF,
                        12px 12px 30px rgba(255, 0, 255, 0.6)
                      `
                      : `
                        2px 2px 0 #cbd5e1,
                        4px 4px 0 #cbd5e1,
                        6px 6px 0 #cbd5e1,
                        8px 8px 0 #FF00FF,
                        10px 10px 0 #00FFFF,
                        12px 12px 30px rgba(0, 255, 255, 0.4)
                      `,
                }}
              >
                <span>Kalcerians</span>
                <span>Map</span>
              </h1>
            </motion.div>

            {/* Floating Kalcerman Revisi Hero Image (Desktop & iPad/Tablet family) */}
            <StartupHeroCharacter
              isDark={isDark}
              tiltWrapperRef={tiltWrapperRef}
            />

            {/* High Impact Progress Section */}
            <div className="absolute bottom-16 xs:bottom-20 md:bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[800px] px-6 sm:px-8">
              <div className="flex justify-between items-end mb-2 sm:mb-4">
                {/* Game Loading Style Quotes */}
                <div className="text-left pb-1 max-w-[70%]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentQuote}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 0.85, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`text-[11px] sm:text-xs md:text-sm font-normal tracking-wide transition-colors duration-700 ${
                        !isDark ? "text-slate-500" : "text-white"
                      }`}
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      {currentQuote}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="text-right">
                  <span
                    className={`text-3xl sm:text-4xl md:text-5xl font-sans font-black tracking-tighter leading-none transition-colors duration-700 ${
                      !isDark ? "text-slate-800" : "text-white"
                    }`}
                  >
                    <span
                      ref={(node) => {
                        percentTextRef.current = node;
                        if (node && !node.textContent) {
                          node.textContent = String(
                            Math.min(
                              100,
                              Math.floor(progressValRef.current + 0.0001)
                            )
                          );
                        }
                      }}
                    />
                    <span className="text-[14px] sm:text-[20px] ml-1 opacity-40">
                      %
                    </span>
                  </span>
                </div>
              </div>

              {/* Progress Bar (Crisp, Smooth, No Elastic Jitter) */}
              <div
                className={`relative h-2.5 sm:h-3.5 md:h-4 w-full overflow-hidden border transition-colors duration-700 ${
                  !isDark
                    ? "bg-slate-100 border-slate-200"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div
                  ref={(node) => {
                    barFillRef.current = node;
                    if (node) {
                      const ratio = Math.min(
                        1,
                        Math.max(0, progressValRef.current / 100)
                      );
                      node.style.transform = `scaleX(${ratio})`;
                    }
                  }}
                  className={`absolute top-0 left-0 h-full w-full transition-none ${
                    !isDark
                      ? "bg-slate-600"
                      : "bg-gradient-to-r from-[#ff6f00] via-[#ffd60a] to-[#ffc300] shadow-[0_0_25px_#ffd60a]"
                  }`}
                  style={{
                    transformOrigin: "left",
                    willChange: "transform",
                  }}
                />
                {/* Subtle stripes over progress */}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.1)_50%,transparent_100%)] bg-[length:20px_100%] pointer-events-none" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
