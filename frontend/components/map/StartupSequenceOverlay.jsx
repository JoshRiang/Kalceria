"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VintageLaserGrid, DominoChevrons } from "@/components/map/AtmosphereLayers";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import { createSeededRandom, createRuntimeSeededRandom } from "@/lib/seededRandom";
import ContentImage from "@/components/ui/ContentImage";

const QUOTES = [
  "Composing the map...",
  "Adjusting the position...",
  "Wahib embut...",
  "Otniel keren banget...",
  "Connecting Kalcerians nodes...",
  "Calibrating neural markers..."
];

export function StartupSequenceOverlay({
  showStartup,
  authReady = false,
  mapEngineReady = false,
  isReady = false,
  onComplete,
}) {
  const isMobile = useIsMobileViewport();
  const [isDark, setIsDark] = useState(false);
  const isDarkRef = useRef(false);
  const authReadyRef = useRef(authReady);
  const mapEngineReadyRef = useRef(mapEngineReady);
  const isReadyRef = useRef(isReady);
  const onCompleteRef = useRef(onComplete);
  const [currentQuote, setCurrentQuote] = useState("Composing the map...");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tiltTargetRef = useRef({ x: 0, y: 0 });
  const barFillRef = useRef(null);
  const percentTextRef = useRef(null);
  const progressValRef = useRef(0);
  const completedRef = useRef(false);

  // Keep refs synchronized without EVER tearing down or resetting the progress loop on parent re-renders
  useEffect(() => {
    authReadyRef.current = authReady;
  }, [authReady]);

  useEffect(() => {
    mapEngineReadyRef.current = mapEngineReady;
  }, [mapEngineReady]);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 1. Precision Monotonic Phase-Synchronized Progress Engine (Zero React reconciliation overhead, zero reset)
  useEffect(() => {
    if (!showStartup) return;

    let rafId = null;
    let completionTimer = null;
    let lastTime = performance.now();
    let readyStartTime = null;
    let darkEnteredTime = null;
    let progressAtReady = 0;
    completedRef.current = false;
    progressValRef.current = 0;
    isDarkRef.current = false;
    setIsDark(false);

    let lastPercentInt = -1;
    if (barFillRef.current) {
      barFillRef.current.style.transform = "scaleX(0)";
    }
    if (percentTextRef.current) percentTextRef.current.textContent = "0";

    const tick = (now) => {
      if (completedRef.current) return;
      const dt = Math.min(Math.max((now - lastTime) / 1000, 0.001), 0.05); // clamp delta
      lastTime = now;

      const current = progressValRef.current;
      const hasAuth = authReadyRef.current;
      const hasMapEngine = mapEngineReadyRef.current;
      const ready = isReadyRef.current;

      let computedNext = current;

      if (ready) {
        // Phase 4: Backend telemetry & map ready -> sweep monotonically to 100%
        if (readyStartTime === null) {
          readyStartTime = now;
          progressAtReady = current;
        }

        const elapsedSinceReady = (now - readyStartTime) / 1000;
        // Ensure smooth completion sweep (1.5s if already past 65%, or 2.0s if backend resolved very fast)
        const finishDuration = progressAtReady >= 65 ? 1.5 : 2.0;
        const t = Math.min(1, elapsedSinceReady / finishDuration);
        const eased = t * (2 - t);
        computedNext = Math.min(100, progressAtReady + (100 - progressAtReady) * eased);

        if (computedNext < current + 14 * dt) {
          computedNext = Math.min(100, current + 14 * dt);
        }
      } else {
        // Synchronized Backend Preparation Phases (Cold-Start Resilient)
        // Phase 1 (0% -> 35%): Session & Auth Handshake
        // Phase 2 (35% -> 65%): Map Engine & Dark-Mode Coki Entrance (crosses 50% smoothly)
        // Phase 3 (65% -> 90%): Kalcerians & Mini-Events Telemetry Sync (holds at 88-90% during cold start)
        let speed;
        if (current < 35) {
          speed = 46;
        } else if (current < 52) {
          // Cross 50% smoothly so Coki flies to center and holds there
          speed = hasAuth || hasMapEngine ? 38 : 26;
        } else if (current < 68) {
          speed = hasMapEngine || hasAuth ? 28 : 16;
        } else if (current < 82) {
          speed = 14;
        } else {
          // Asymptotic cold-start hold between 82% and 90% while backend wakes up
          speed = Math.max(0.25, (90.2 - current) * 0.85);
        }
        computedNext = Math.min(90.2, current + speed * dt);
      }

      // STRICT MONOTONIC CLAMP: Progress can NEVER decrease or jump backward
      const next = Math.min(100, Math.max(current, computedNext));
      progressValRef.current = next;

      // GPU-accelerated transform: scaleX eliminates expensive layout reflows (0 stutter)
      if (barFillRef.current) {
        barFillRef.current.style.transform = `scaleX(${Math.min(1, next / 100)})`;
      }
      const roundInt = Math.floor(next + 0.0001);
      if (roundInt !== lastPercentInt && percentTextRef.current) {
        lastPercentInt = roundInt;
        percentTextRef.current.textContent = String(Math.min(100, roundInt));
      }

      // Single one-way threshold at 50% for dark theme & Coki entrance (never resets to false)
      if (next >= 50 && !isDarkRef.current) {
        isDarkRef.current = true;
        darkEnteredTime = now;
        setIsDark(true);
      }

      // Complete when ready, Coki has reached center (at least 1.5s since 50% dark entrance), and progress >= 99.8%
      const darkElapsed = darkEnteredTime !== null ? now - darkEnteredTime : 0;
      if (ready && readyStartTime !== null && darkElapsed >= 1500 && next >= 99.8) {
        completedRef.current = true;
        if (barFillRef.current) barFillRef.current.style.transform = "scaleX(1)";
        if (percentTextRef.current) percentTextRef.current.textContent = "100";
        completionTimer = setTimeout(() => {
          onCompleteRef.current?.();
        }, 140);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      completedRef.current = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (completionTimer) clearTimeout(completionTimer);
    };
  }, [showStartup]);

  // 2. High-performance Throttled 3D Tilt Tracking (Guarded for Mouse/Pointer, disabled on touch/iPad)
  useEffect(() => {
    if (!showStartup) return;
    // Guard against touch devices (iPad / tablets / mobile) where hover is not supported.
    // Synthetic touch events on iPad flip tilt and distort 3D perspective.
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(hover: none)").matches) {
      return;
    }

    let tiltRaf = null;
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      tiltTargetRef.current = {
        x: (e.clientX / innerWidth - 0.5) * 22,
        y: (e.clientY / innerHeight - 0.5) * -22,
      };
    };

    const updateTilt = () => {
      setTilt((prev) => {
        const dx = tiltTargetRef.current.x - prev.x;
        const dy = tiltTargetRef.current.y - prev.y;
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return prev;
        return { x: prev.x + dx * 0.15, y: prev.y + dy * 0.15 };
      });
      tiltRaf = requestAnimationFrame(updateTilt);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    tiltRaf = requestAnimationFrame(updateTilt);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
    };
  }, [showStartup]);

  // 3. Cycle Quotes with randomized pacing
  useEffect(() => {
    if (!showStartup) return;
    const random = createRuntimeSeededRandom("map-startup-quotes-v1");
    let timeoutId = null;

    const changeQuote = () => {
      setCurrentQuote((prev) => {
        const available = QUOTES.filter((q) => q !== prev);
        return available[Math.floor(random() * available.length)];
      });
      const nextDelay = 750 + random() * 950;
      timeoutId = setTimeout(changeQuote, nextDelay);
    };

    timeoutId = setTimeout(changeQuote, 900);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showStartup]);

  // 4. Ambient Speed Lines & Microparticles
  const speedLines = useMemo(() => {
    const random = createSeededRandom("map-startup-speed-lines-v1");
    return Array.from({ length: 16 }, (_, id) => ({
      id,
      duration: random() * 0.4 + 0.3,
      delay: random() * 1.8,
      top: `${random() * 100}%`,
      width: `${random() * 260 + 90}px`,
    }));
  }, []);

  const particles = useMemo(() => {
    const random = createSeededRandom("map-startup-particles-v1");
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${random() * 100}%`,
      size: `${random() * 4 + 3}px`,
      color: random() > 0.5 ? "#ff006e" : (random() > 0.5 ? "#ffd60a" : "#ffc300"),
      duration: random() * 4 + 4,
      delay: random() * 3.5,
      opacity: random() * 0.35 + 0.45,
    }));
  }, []);

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
          {/* Smooth 4x Chevron Dash Transition */}
          <DominoChevrons active={showStartup} isDark={isDark} isMobile={isMobile} />

          {/* Faint Vintage Laser Grid (GPU-Optimized) */}
          <VintageLaserGrid active={showStartup} startupProgress={isDark ? 50 : 0} />

          {/* Adaptive Atmospheric Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <div
              className={`absolute inset-0 transition-colors duration-1000 ${
                !isDark
                  ? "bg-white"
                  : "bg-gradient-to-br from-[#ff006e]/20 via-transparent to-[#ffd60a]/20"
              }`}
            />

            {/* Dynamic Speed Lines */}
            <div className="absolute inset-0 opacity-20">
              {speedLines.map((line) => (
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
                  className={`absolute h-[1px] transition-colors duration-1000 ${
                    !isDark ? "bg-slate-200" : "bg-white"
                  }`}
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
                className={`text-[25vw] font-black tracking-tighter uppercase leading-none transition-colors duration-1000 ${
                  !isDark ? "text-slate-200" : "text-white"
                }`}
              >
                KALCERIA
              </h2>
            </div>
          </div>

          {/* Ambient Golden & Cyan/Magenta Microparticles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
            {particles.map((p) => {
              const activeColor = isDark
                ? p.color === "#ff006e" ? "#00f0ff" : p.color
                : p.color;

              return (
                <div
                  key={p.id}
                  className="absolute rounded-full blur-[0.5px] pointer-events-none"
                  style={{
                    left: p.left,
                    bottom: "-20px",
                    width: p.size,
                    height: p.size,
                    backgroundColor: activeColor,
                    boxShadow: `0 0 6px ${activeColor}, 0 0 12px ${activeColor}`,
                    animation: `floatUp ${p.duration}s linear ${p.delay}s infinite both`,
                    opacity: p.opacity,
                  }}
                />
              );
            })}
          </div>

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
                    style={{
                      perspective: "1000px",
                      transformStyle: "preserve-3d",
                      transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
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
                    <span ref={percentTextRef}>0</span>
                    <span className="text-[14px] sm:text-[20px] ml-1 opacity-40">%</span>
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
                  ref={barFillRef}
                  className={`absolute top-0 left-0 h-full w-full transition-none ${
                    !isDark
                      ? "bg-slate-600"
                      : "bg-gradient-to-r from-[#ff6f00] via-[#ffd60a] to-[#ffc300] shadow-[0_0_25px_#ffd60a]"
                  }`}
                  style={{
                    transform: "scaleX(0)",
                    transformOrigin: "left",
                    willChange: "transform",
                  }}
                />
                {/* Subtle stripes over progress */}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.1)_50%,transparent_100%)] bg-[length:20px_100%] pointer-events-none" />
              </div>
            </div>
          </motion.div>

          {/* Corner Decorative Elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-[#ffd60a]/10 to-transparent rounded-br-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-[#ff006e]/10 to-transparent rounded-tl-full blur-3xl pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
