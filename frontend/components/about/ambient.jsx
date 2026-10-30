"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { createSeededRandom } from "@/lib/seededRandom";
import { useViewportActivity } from "@/hooks/useViewportActivity";

export function GoldenAmbientSparks() {
  const containerRef = useRef(null);
  const isActive = useViewportActivity(containerRef, { rootMargin: "350px 0px" });
  const [sparks, setSparks] = useState([]);
  
  useEffect(() => {
    const random = createSeededRandom("about-ambient-sparks-v1");
    const generated = [];
    for (let i = 0; i < 18; i++) {
      const size = random() * 4 + 2;
      const top = random() * 100;
      const left = random() * 100;
      const duration = random() * 6 + 10; // Even slower
      const delay = random() * 12;
      const driftX = (random() - 0.5) * 150;
      const driftY = (random() - 0.5) * 150;
      generated.push({ id: i, size, top, left, duration, delay, driftX, driftY });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the existing post-mount particle generation and animation start.
    setSparks(generated);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {isActive && sparks.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.7, 0.7, 0],
            scale: [0.3, 1, 1, 0.3],
            x: [0, s.driftX * 0.5, s.driftX, s.driftX * 0.5, 0],
            y: [0, s.driftY * 0.5, s.driftY, s.driftY * 0.5, 0],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: -s.delay,
            times: [0, 0.2, 0.8, 1] // Spends 60% of time fully visible
          }}
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            top: `${s.top}%`,
            left: `${s.left}%`,
            backgroundColor: '#FFD700',
            willChange: "transform, opacity",
            boxShadow: `0 0 ${s.size * 3}px #FFD700, 0 0 ${s.size * 6}px rgba(255, 215, 0, 0.4)`,
          }}
        />
      ))}
    </div>
  );
}

export function DanglingSymbols({ char, color, side = "left", configs = [], isMobile = false }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {configs.map((s, i) => (
        <motion.div
          key={i}
          animate={{ 
            y: [0, -20, 0],
            rotate: [s.rotate || 0, (s.rotate || 0) + 12, (s.rotate || 0) - 6, s.rotate || 0]
          }}
          transition={{ 
            duration: 3.5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: s.delay || 0
          }}
          className="absolute text-3xl md:text-5xl lg:text-7xl font-mono font-black uppercase tracking-tighter select-none z-[60]"
          style={{ 
            color: color, 
            top: s.top,
            [side === "left" ? "left" : "right"]: isMobile ? `${s.offset * 0.7}px` : `${s.offset}px`,
            textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
            filter: `drop-shadow(0 0 25px ${color}aa)`,
            opacity: 0.95
          }}
        >
          {char}
        </motion.div>
      ))}
    </div>
  );
}

export function AnimatedReiiPair({ isMobile }) {
  const containerRef = useRef(null);
  const isActive = useViewportActivity(containerRef, { rootMargin: "350px 0px" });
  const [imgToggle, setImgToggle] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const itv = setInterval(() => setImgToggle((prev) => !prev), 1000);
    return () => clearInterval(itv);
  }, [isActive]);

  return (
    <>
      {/* LEFT REII IMAGE */}
      <div ref={containerRef} className="absolute -bottom-24 md:-bottom-40 mr-0 md:mr-6 pointer-events-none flex items-end justify-center z-10 -left-6 sm:left-0 md:left-auto md:right-full">
        <motion.div
          animate={isActive ? { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] } : { scale: 1, opacity: 0.4 }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[140px] h-[140px] md:w-[300px] md:h-[300px] bg-gradient-to-tr from-[#FFD700]/40 to-cyan-500/40 blur-[50px] md:blur-[70px] rounded-full z-[-1]"
        />
        <div className="relative z-10 w-[6.5rem] sm:w-[9.6rem] md:w-[17.25rem] aspect-[768/905] flex-shrink-0">
          <Image
            src="/reii.webp"
            alt="Reii Left"
            fill
            sizes="(max-width: 768px) 110px, 276px"
            quality={75}
            loading="lazy"
            decoding="async"
            className={`object-contain object-bottom transition-none ${imgToggle ? "opacity-0" : "opacity-90"}`}
          />
          <Image
            src="/reii2.webp"
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 768px) 110px, 276px"
            quality={75}
            loading="lazy"
            decoding="async"
            className={`object-contain object-bottom transition-none ${imgToggle ? "opacity-90" : "opacity-0"}`}
          />
        </div>

        <DanglingSymbols
          char="?"
          color="#FFD700"
          side="left"
          isMobile={isMobile}
          configs={[
            { delay: 0, rotate: -15, top: isMobile ? "5%" : "-15%", offset: isMobile ? 80 : 145 },
            { delay: 0.8, rotate: 10, top: isMobile ? "55%" : "35%", offset: isMobile ? 110 : 200 },
          ]}
        />
      </div>

      {/* RIGHT REII IMAGE */}
      <div className="absolute -bottom-24 md:-bottom-40 ml-0 md:ml-6 pointer-events-none flex items-end justify-center z-10 -right-6 sm:right-0 md:right-auto md:left-full">
        <motion.div
          animate={isActive ? { scale: [1.3, 1, 1.3], opacity: [0.6, 0.3, 0.6] } : { scale: 1, opacity: 0.4 }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute w-[140px] h-[140px] md:w-[300px] md:h-[300px] bg-gradient-to-tl from-[#FF00FF]/40 to-cyan-500/40 blur-[50px] md:blur-[70px] rounded-full z-[-1]"
        />
        <div className="relative z-10 w-[6.5rem] sm:w-[9.6rem] md:w-[17.25rem] aspect-[768/905] flex-shrink-0">
          <Image
            src="/reii2.webp"
            alt="Reii Right"
            fill
            sizes="(max-width: 768px) 110px, 276px"
            quality={75}
            loading="lazy"
            decoding="async"
            className={`object-contain object-bottom transition-none ${imgToggle ? "opacity-0" : "opacity-90"}`}
          />
          <Image
            src="/reii3.webp"
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 768px) 110px, 276px"
            quality={75}
            loading="lazy"
            decoding="async"
            className={`object-contain object-bottom transition-none ${imgToggle ? "opacity-90" : "opacity-0"}`}
          />
        </div>

        <DanglingSymbols
          char="!"
          color="#00FFFF"
          side="right"
          isMobile={isMobile}
          configs={[
            { delay: 0, rotate: -15, top: isMobile ? "0%" : "-15%", offset: isMobile ? 80 : 145 },
            { delay: 0.8, rotate: 10, top: isMobile ? "35%" : "30%", offset: isMobile ? 110 : 200 },
            { delay: 1.5, rotate: -5, top: isMobile ? "65%" : "65%", offset: isMobile ? 130 : 250 },
          ]}
        />
      </div>
    </>
  );
}
