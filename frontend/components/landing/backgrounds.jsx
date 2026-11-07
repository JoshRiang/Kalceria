"use client";
import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { createRuntimeSeededRandom, createSeededRandom } from "@/lib/seededRandom";
import { useViewportActivity } from "@/hooks/useViewportActivity";

const SOLAR_FLARE_DEFINITIONS = [
  {
    id: 1,
    paths: ["M 38 38 C 25 15, 15 40, -5 5", "M 36 36 C 22 12, 12 38, -8 2", "M 40 40 C 28 18, 18 42, -2 8"],
    colors: ["#FFA07A", "#ff8c00", "#ffd700"]
  },
  {
    id: 2,
    paths: ["M 62 38 C 75 15, 85 40, 105 5", "M 64 36 C 78 12, 88 38, 108 2", "M 60 40 C 72 18, 82 42, 102 8"],
    colors: ["#FFA07A", "#ffd700", "#ff8c00"]
  },
  {
    id: 3,
    paths: ["M 38 62 C 25 85, 15 60, -5 95", "M 36 64 C 22 88, 12 62, -8 98", "M 40 60 C 28 82, 18 58, -2 92"],
    colors: ["#ffd700", "#FFA07A", "#FFB07C"]
  },
  {
    id: 4,
    paths: ["M 62 62 C 75 85, 85 60, 105 95", "M 64 64 C 78 88, 88 62, 108 98", "M 60 60 C 72 82, 82 58, 102 92"],
    colors: ["#ff8c00", "#FFB07C", "#ffd700"]
  },
  {
    id: 5,
    paths: ["M -10 30 C 30 50, 60 10, 110 -10", "M -15 32 C 28 55, 62 15, 108 -5", "M -5 28 C 32 45, 58 5, 112 -15"],
    colors: ["#ffd700", "#FFA07A", "#ff8c00"]
  },
  {
    id: 6,
    paths: ["M 110 90 C 70 70, 40 20, 50 -20", "M 115 88 C 72 75, 45 22, 52 -25", "M 105 92 C 68 65, 35 18, 48 -15"],
    colors: ["#ff8c00", "#FFB07C", "#ffd700"]
  },
  {
    id: 7,
    paths: ["M 115 5 C 80 110, 20 110, -15 5", "M 110 0 C 75 105, 25 105, -10 0", "M 120 -5 C 85 115, 15 115, -20 -5"],
    colors: ["#FFB07C", "#FFA07A", "#ff8c00"]
  }
];

export function SupportUsBackground() {
  const containerRef = useRef(null);
  const isActive = useViewportActivity(containerRef, { rootMargin: "250px 0px" });
  const magentaRef = useRef(null);
  const yellowRef = useRef(null);

  // Noise & Flicker Engine (PWM Envelope) - Paused off-screen & throttled to 30fps for phone smoothness
  useEffect(() => {
    if (!isActive) return;

    let startTime = Date.now();
    let lastTime = 0;
    const random = createRuntimeSeededRandom("landing-support-us-wave-v1");
    let rafId;
    
    const updatePaths = () => {
      const now = Date.now();
      // Throttle to ~30 FPS (33ms) to save 75% GPU/CPU overhead on mobile screens
      if (now - lastTime < 33) {
        rafId = requestAnimationFrame(updatePaths);
        return;
      }
      lastTime = now;

      let mPath = `M0,100`;
      let yPath = `M0,100`;
      const POINT_COUNT = 40; // 40 points produces crisp wave contour with half the string allocation
      const widthStep = 2000 / POINT_COUNT;
      
      const elapsed = now - startTime;
      const cycleDuration = 8000; // 8s loop (4s rise, 4s fall)
      const phase = (elapsed % cycleDuration) / cycleDuration;
      
      // Envelope: Sine wave from 0 to 1 and back to 0
      const envelope = Math.sin(phase * Math.PI);
      
      // Amplitude modulation: 4px base, ramping up to ~140px max
      const currentAmplitude = 4 + (136 * envelope);
      
      for (let i = 1; i <= POINT_COUNT; i++) {
        const x = i * widthStep;
        
        // Randomization scaled dynamically by the continuous envelope
        const mAmplitude = (random() - 0.5) * currentAmplitude;
        const yAmplitude = (random() - 0.5) * currentAmplitude;
        
        mPath += ` L${x},${100 + mAmplitude}`;
        yPath += ` L${x},${100 + yAmplitude}`;
      }
      
      // Flicker intensity scales with the envelope
      const mOpacity = 0.8 - (random() * 0.6 * envelope);
      const yOpacity = 0.8 - (random() * 0.6 * envelope);

      if (magentaRef.current) {
        magentaRef.current.setAttribute("d", mPath);
        magentaRef.current.style.opacity = mOpacity;
      }
      if (yellowRef.current) {
        yellowRef.current.setAttribute("d", yPath);
        yellowRef.current.style.opacity = yOpacity;
      }
      
      rafId = requestAnimationFrame(updatePaths);
    };
    
    rafId = requestAnimationFrame(updatePaths);
    return () => cancelAnimationFrame(rafId);
  }, [isActive]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Background base */}
      <div className="absolute inset-0 bg-[#050a14] z-[-10]" />

      {/* Dynamic Blobs (Z: -5) - GPU Radial Gradients, Unaffected by Glitch */}
      <motion.div 
        className="absolute top-[-15%] left-[0%] w-[72vw] h-[72vw] rounded-full mix-blend-screen z-[-5]"
        animate={{
          x: ["0%", "15%", "-10%", "0%"],
          y: ["0%", "-10%", "20%", "0%"],
          opacity: [0.15, 0.22, 0.15]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{
          willChange: "transform, opacity",
          background: "radial-gradient(circle closest-side, rgba(217,70,239,0.9) 0%, rgba(217,70,239,0.38) 45%, transparent 100%)",
        }}
      />
      <motion.div 
        className="absolute bottom-[-15%] right-[0%] w-[68vw] h-[68vw] rounded-full mix-blend-screen z-[-5]"
        animate={{
          x: ["0%", "-20%", "10%", "0%"],
          y: ["0%", "15%", "-15%", "0%"],
          opacity: [0.15, 0.22, 0.15]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{
          willChange: "transform, opacity",
          background: "radial-gradient(circle closest-side, rgba(249,115,22,0.9) 0%, rgba(249,115,22,0.38) 45%, transparent 100%)",
        }}
      />

      {/* Extreme Radar Noise Waves (Z: -2) */}
      <div className="absolute inset-0 flex items-center justify-center z-[-2]">
        <svg className="w-[100vw] h-[300px] absolute" preserveAspectRatio="none" viewBox="0 0 2000 200">
          {/* Magenta Wave */}
          <path
            ref={magentaRef}
            d="M0,100"
            fill="none"
            stroke="#D946EF"
            strokeWidth="1.5"
            style={{ 
              opacity: 0.8,
            }}
          />
          {/* Yellow-Golden Wave */}
          <path
            ref={yellowRef}
            d="M0,100"
            fill="none"
            stroke="#FACC15"
            strokeWidth="1.5"
            style={{ 
              opacity: 0.8,
            }}
          />
        </svg>
      </div>
    </div>
  );
}

export function SolarPhoenix({ isMobile }) {
  const particles = useMemo(() => {
    const random = createSeededRandom("landing-solar-phoenix-particles-v1");
    const count = isMobile ? 6 : 14;
    return Array.from({ length: count }, (_, id) => ({
      id,
      left: `${random() * 100}%`,
      top: `${random() * 100}%`,
      size: random() > 0.8 ? '10px' : '5px',
      color: ['#ffffff', '#fbbf24', '#ff8c00', '#ffed4a'][Math.floor(random() * 4)],
      delay: random() * 4,
      duration: 3 + random() * 3,
      xDrift: (random() - 0.5) * 40,
      yDrift: (random() - 0.5) * 40,
    }));
  }, [isMobile]);

  const flares = useMemo(() => {
    const random = createSeededRandom("landing-solar-phoenix-flares-v1");
    return SOLAR_FLARE_DEFINITIONS.map((flare) => ({
      ...flare,
      paths: flare.paths.map((d, index) => ({
        id: index,
        d,
        color: flare.colors[index],
        strokeWidth: 0.8 + random() * 0.6,
        duration: 2 + random() * 2,
        delay: random(),
      })),
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Deep Red Corona Backdrop (Zero-Blur GPU Radial Gradient) */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: isMobile ? [0.42, 0.63, 0.42] : [0.6, 0.9, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute rounded-full will-change-transform ${isMobile ? "w-[54vw] h-[54vw]" : "w-[72vw] h-[72vw]"}`}
        style={{
          background: "radial-gradient(circle closest-side, rgba(220,38,38,0.88) 0%, rgba(220,38,38,0.38) 46%, transparent 100%)",
        }}
      />
      
      {/* Intense Yellow Core (Zero-Blur GPU Radial Gradient) */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: isMobile ? [0.56, 0.7, 0.56] : [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute rounded-full mix-blend-screen will-change-transform ${isMobile ? "w-[26vw] h-[26vw]" : "w-[36vw] h-[36vw]"}`}
        style={{
          background: "radial-gradient(circle closest-side, rgba(255,255,255,0.95) 0%, rgba(234,179,8,0.65) 42%, transparent 100%)",
        }}
      />

      {/* Micro Pixel Fire Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              top: p.top,
              backgroundColor: p.color,
              boxShadow: `0 0 5px ${p.color}`,
            }}
            animate={{
              x: [0, p.xDrift, 0],
              y: [0, p.yDrift, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Solar Phoenix Flare Strings */}
      {!isMobile && (
        <svg className="absolute w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          {flares.map((flare) => (
            <g key={flare.id}>
              {flare.paths.map((path) => (
                <motion.path
                  key={path.id}
                  d={path.d}
                  stroke={path.color}
                  strokeWidth={path.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, opacity: [0.4, 1, 0.4] }}
                  transition={{ 
                    pathLength: { duration: 3, ease: "easeOut" },
                    opacity: { duration: path.duration, repeat: Infinity, ease: "easeInOut", delay: path.delay }
                  }}
                  style={{ 
                    // Removed drop-shadow to stop heavy browser repainting
                  }}
                />
              ))}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
