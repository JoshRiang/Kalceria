"use client";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VintageLaserGrid, DominoChevrons } from "@/components/map/AtmosphereLayers";
import { createSeededRandom } from "@/lib/seededRandom";
import ContentImage from "@/components/ui/ContentImage";

export function StartupSequenceOverlay({ showStartup, startupProgress, particles, hasMounted, currentQuote, tilt }) {
  const speedLines = useMemo(() => {
    const random = createSeededRandom("map-startup-speed-lines-v1");
    return Array.from({ length: 20 }, (_, id) => ({
      id,
      duration: random() * 0.5 + 0.3,
      delay: random() * 2,
      top: `${random() * 100}%`,
      width: `${random() * 300 + 100}px`,
    }));
  }, []);

  return (
    <AnimatePresence>
      {showStartup && (
        <motion.div
          key="startup-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(40px)" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className={`fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden transition-colors duration-[3000ms] ease-in-out ${startupProgress < 50 ? "bg-white" : "bg-[#050a14]"}`}
        >
          {/* Smooth 4x Chevron Dash Transition (B&W on White, Red-Black on Dark) */}
          {showStartup && (
            <DominoChevrons
              key={
                startupProgress < 25 ? "wave1" :
                  startupProgress < 50 ? "wave2" :
                    startupProgress < 75 ? "wave3" : "wave4"
              }
              active={showStartup}
              isDark={startupProgress >= 50}
            />
          )}

          {/* Faint vintage laser grid: spawning black on white, and turning into golden glow on black background */}
          <VintageLaserGrid active={showStartup} startupProgress={startupProgress} />


          {/* Adaptive Atmospheric Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div
              className={`absolute inset-0 transition-colors duration-1000 ${startupProgress < 50 ? "bg-white" : "bg-gradient-to-br from-[#ff006e]/20 via-transparent to-[#ffd60a]/20"}`}
            />

            {/* Dynamic Speed Lines */}
            <div className="absolute inset-0 opacity-20">
              {hasMounted &&
                speedLines.map((line) => (
                  <motion.div
                    key={line.id}
                    initial={{ x: "-100%", opacity: 0 }}
                    animate={{ x: "200%", opacity: [0, 1, 0] }}
                    transition={{
                      duration: line.duration,
                      repeat: Infinity,
                      delay: line.delay,
                      ease: "linear",
                    }}
                    className={`absolute h-[1px] transition-colors duration-1000 ${startupProgress < 50 ? "bg-slate-200" : "bg-white"}`}
                    style={{
                      top: line.top,
                      width: line.width,
                      transform: "rotate(-5deg)",
                    }}
                  />
                ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
              <h2
                className={`text-[25vw] font-black tracking-tighter uppercase leading-none transition-colors duration-1000 ${startupProgress < 50 ? "text-slate-200" : "text-white"}`}
              >
                KALCERIA
              </h2>
            </div>
          </div>

          {/* Ambient Golden & Magenta Microparticles (Spawns at 10% progress and morphs dynamically on black background) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
            {startupProgress >= 10 && particles.map((p) => {
              const isDark = startupProgress >= 50;
              // Dynamically morph Neon Magenta (#ff006e) into Cyan (#00f0ff) once screen is black!
              const activeColor = isDark
                ? (p.color === "#ff006e" ? "#00f0ff" : p.color)
                : p.color;

              return (
                <div
                  key={p.id}
                  className="absolute rounded-full blur-[0.5px] pointer-events-none"
                  style={{
                    left: p.left,
                    bottom: "-20px", // Pinned below visible boundary to prevent traffic jams
                    width: p.size,
                    height: p.size,
                    backgroundColor: activeColor,
                    boxShadow: `0 0 8px ${activeColor}, 0 0 16px ${activeColor}`,
                    animation: `floatUp ${p.duration}s linear ${p.delay}s infinite both`,
                    opacity: 0, // Fully transparent during positive delays
                    transition: "background-color 1.5s ease-in-out, box-shadow 1.5s ease-in-out", // Smooth morphing
                  }}
                />
              );
            })}
          </div>

          {/* Inner Content that fades in dramatically over solid background */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative z-10 w-full h-screen flex flex-col items-center pt-24"
          >
            {/* Main Title Section */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="flex flex-col items-center mb-2 sm:mb-4 px-4"
            >
              <h1
                className={`text-4xl sm:text-6xl md:text-8xl font-sans font-black italic tracking-tighter uppercase leading-none transition-all duration-1000 text-center flex flex-col md:flex-row items-center justify-center gap-1 md:gap-4 ${startupProgress < 50 ? "text-slate-800" : "text-white"}`}
                style={{
                  textShadow: startupProgress >= 50 ? `
                      2px 2px 0 #1a1a24,
                      4px 4px 0 #1a1a24,
                      6px 6px 0 #1a1a24,
                      8px 8px 0 #FF00FF,
                      10px 10px 0 #00FFFF,
                      12px 12px 30px rgba(255, 0, 255, 0.6)
                    ` : `
                      2px 2px 0 #cbd5e1,
                      4px 4px 0 #cbd5e1,
                      6px 6px 0 #cbd5e1,
                      8px 8px 0 #FF00FF,
                      10px 10px 0 #00FFFF,
                      12px 12px 30px rgba(0, 255, 255, 0.4)
                    `,
                  transform: "perspective(1000px) rotateX(10deg) rotateY(-5deg) scale(1.05)"
                }}
              >
                <span>Kalcerians</span>
                <span>Map</span>
              </h1>
            </motion.div>

            {/* Floating Kalcerman Image (Slides in from left when background turns black) */}
            <AnimatePresence>
              {startupProgress >= 50 && (
                <div className="relative w-[280px] sm:w-[360px] md:w-[440px] h-[280px] sm:h-[350px] md:h-[450px] flex flex-col items-center justify-center my-2 sm:my-4 z-20 mx-auto -translate-x-0 md:-translate-x-[15%] -translate-y-0 md:-translate-y-[15%]">
                  {/* Glowing 3D Grid Floor when background is dark */}
                  <div
                    className="absolute bottom-[-60px] md:bottom-[-100px] w-[300px] sm:w-[400px] md:w-[500px] h-[200px] md:h-[300px] opacity-20 pointer-events-none transition-all duration-1000 ease-out"
                    style={{
                      background: "linear-gradient(rgba(0, 240, 255, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.25) 1px, transparent 1px)",
                      backgroundSize: "30px 30px",
                      transform: "rotateX(75deg) translateZ(-60px)",
                      maskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
                      WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
                    }}
                  />

                  {/* The 3D Perspective Wrapper Container */}
                  <div
                    style={{
                      perspective: "1000px",
                      transformStyle: "preserve-3d",
                      transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                      transition: "transform 0.15s ease-out",
                      width: "100%",
                      height: "100%",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Fixed Position Portal: Centered and responsive */}
                    <motion.img
                      key="portal-bg"
                      src="/portal.webp"
                      alt="Portal background"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 0.7,
                        scale: 1,
                        rotate: 360,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 1.2, ease: "easeOut" },
                        scale: { duration: 1.2, ease: "easeOut" },
                        rotate: { duration: 22, repeat: Infinity, ease: "linear" },
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:top-2 md:left-[56%] md:translate-x-0 md:translate-y-0 w-[240px] sm:w-[320px] md:w-[400px] h-[240px] sm:h-[320px] md:h-[400px] object-contain pointer-events-none filter drop-shadow-[0_0_25px_rgba(0,240,255,0.3)]"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: "translateZ(0px)",
                        zIndex: 0,
                      }}
                    />

                    {/* Floating Character & Subtitle Subgroup */}
                    <motion.div
                      key="kalcerman-character"
                      initial={{ x: "-100vw", opacity: 0, scale: 0.7 }}
                      animate={{
                        x: 0,
                        opacity: 0.9,
                        scale: 1,
                        y: [0, -15, 0],
                      }}
                      exit={{ x: "100vw", opacity: 0 }}
                      transition={{
                        x: { type: "spring", stiffness: 60, damping: 14 },
                        opacity: { duration: 0.5 },
                        scale: { duration: 0.5 },
                        y: {
                          repeat: Infinity,
                          duration: 3,
                          ease: "easeInOut",
                        },
                      }}
                      className="relative z-10 w-full flex flex-col items-center justify-center"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: "translateZ(80px)",
                      }}
                    >
                      {/* Character Sprite */}
                      <ContentImage
                        src="/kalcermanmap.png"
                        alt="Kalcerman Map"
                        width={2048}
                        height={2048}
                        className="relative w-[170px] h-[170px] sm:w-[220px] sm:h-[220px] md:w-[275px] md:h-[275px] object-contain filter drop-shadow-[0_0_35px_rgba(255,214,10,0.35)] mb-3 sm:mb-6 z-10"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: "translateZ(20px)",
                        }}
                      />

                      {/* Dialog Subtitle */}
                      <p
                        className="relative text-white font-sans font-bold text-base sm:text-[22px] tracking-wide text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] z-10"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: "translateZ(40px)",
                        }}
                      >
                        &quot;Let me in, Coki!&quot;
                      </p>
                    </motion.div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* High Impact Progress Section */}
            <div className="absolute bottom-6 sm:bottom-12 md:bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[800px] px-6 sm:px-8">
              <div className="flex justify-between items-end mb-2 sm:mb-4">
                {/* Game Loading Style Quotes */}
                <div className="text-left pb-1 max-w-[70%]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={currentQuote}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 0.85, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={`text-[11px] sm:text-xs md:text-sm font-normal tracking-wide transition-colors duration-1000 ${startupProgress < 50 ? "text-slate-500" : "text-white"}`}
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      {currentQuote}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="text-right">
                  <span
                    className={`text-3xl sm:text-4xl md:text-5xl font-sans font-black tracking-tighter leading-none transition-colors duration-1000 ${startupProgress < 50 ? "text-slate-800" : "text-white"}`}
                  >
                    {Math.round(startupProgress)}
                    <span className="text-[14px] sm:text-[20px] ml-1 opacity-40">%</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                className={`relative h-2.5 sm:h-3.5 md:h-4 w-full overflow-hidden border transition-colors duration-1000 ${startupProgress < 50 ? "bg-slate-100 border-slate-200" : "bg-white/5 border-white/10"}`}
              >
                <motion.div
                  className={`absolute top-0 left-0 h-full transition-colors duration-1000 ${startupProgress < 50 ? "bg-slate-600" : "bg-gradient-to-r from-[#ff6f00] via-[#ffd60a] to-[#ffc300] shadow-[0_0_30px_#ffd60a]"}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${startupProgress}%` }}
                  transition={{ type: "spring", stiffness: 40, damping: 15 }}
                />
                {/* Subtle stripes over progress */}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.1)_50%,transparent_100%)] bg-[length:20px_100%] pointer-events-none" />
              </div>
            </div>
          </motion.div>

          {/* Corner Decorative Elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#ffd60a]/10 to-transparent rounded-br-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-[#ff006e]/10 to-transparent rounded-tl-full blur-3xl" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
