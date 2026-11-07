"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createRuntimeSeededRandom, createSeededRandom } from "@/lib/seededRandom";
import ContentImage from "@/components/ui/ContentImage";

export function GoldenDust() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const random = createSeededRandom("landing-golden-dust-v1");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the existing post-mount seed and initial particle animation timing.
    setParticles(Array.from({ length: 20 }, () => ({
      x: random() * 100,
      y: random() * 100,
      delay: random() * 5,
      duration: 2 + random() * 3
    })));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-visible mix-blend-screen">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)] will-change-transform"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `goldenDustAnim ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes goldenDustAnim {
          0%, 100% { opacity: 0; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-15px); }
        }
        @media (prefers-reduced-motion: reduce) {
          div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export function StarDust() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const random = createSeededRandom("landing-star-dust-v1");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the existing post-mount seed and initial particle animation timing.
    setParticles(Array.from({ length: 30 }, () => {
      const isViolet = random() > 0.5;
      return {
        x: random() * 100,
        y: random() * 100,
        delay: random() * 5,
        duration: 2 + random() * 3,
        bgColor: isViolet ? "bg-[#D946EF]" : "bg-[#FACC15]",
        shadowColor: isViolet ? "rgba(217,70,239,0.8)" : "rgba(250,204,21,0.8)"
      };
    }));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-[-10%] z-0 pointer-events-none overflow-visible mix-blend-screen">
      {particles.map((p, i) => (
        <div
          key={i}
          className={`absolute w-1 h-1 rounded-full ${p.bgColor} will-change-transform`}
          style={{ 
            left: `${p.x}%`, top: `${p.y}%`,
            filter: `drop-shadow(0 0 4px ${p.shadowColor})`,
            animation: `starDustAnim ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes starDustAnim {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
          50% { opacity: 1; transform: translateY(-20px) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export function FloatingSpareParts() {
  // 4 floating elements (gear, tool kit, kunci inggris, tires) removed per instruction
  return null;
}

export function TropicalParticles() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const random = createSeededRandom("landing-tropical-particles-v1");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the existing post-mount seed and initial particle animation timing.
    setParticles(Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${10 + random() * 80}%`,
      bottom: `${40 + random() * 30}%`,
      size: random() * 4 + 2,
      color: ['#bef264', '#4ade80', '#22c55e', '#166534', '#86efac'][Math.floor(random() * 5)],
      delay: random() * 5,
      duration: 4 + random() * 4,
      xDrift: (random() - 0.5) * 60,
      yRise: -(120 + random() * 180),
    })));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full will-change-transform"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: p.bottom,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}88`,
            "--xDrift": `${p.xDrift}px`,
            "--yRise": `${p.yRise}px`,
            animation: `tropicalAnim ${p.duration}s ease-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes tropicalAnim {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0);
          }
          50% {
            opacity: 0.75;
            transform: translate3d(var(--xDrift), calc(var(--yRise) * 0.5), 0);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, var(--yRise), 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export function AuroraParticles({ isMobile = false }) {
  const [pillars, setPillars] = useState([]);

  useEffect(() => {
    let active = true;
    const random = createRuntimeSeededRandom("landing-aurora-pillars-v1");
    let nextPillarId = 0;
    const timeouts = new Set();
    const scheduleTimeout = (callback, delay) => {
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        if (active) callback();
      }, delay);
      timeouts.add(timeout);
    };

    const spawnPillar = () => {
      if (!active) return;
      const id = nextPillarId++;
      // Organic aurora color spectrum
      const colors = ['#4ade80', '#10b981', '#d946ef', '#a855f7', '#06b6d4', '#4ade80'];
      const newPillar = {
        id,
        left: `${random() * 140 - 20}%`,
        width: isMobile ? random() * 200 + 100 : random() * 400 + 150,
        color: colors[Math.floor(random() * colors.length)],
        duration: isMobile ? 12 + random() * 8 : 20 + random() * 20,
        skew: (random() - 0.5) * 40,
        blur: isMobile ? 35 : random() * 50 + 80,
      };
      setPillars(prev => [...prev.slice(isMobile ? -2 : -5), newPillar]);
      scheduleTimeout(() => {
        setPillars(prev => prev.filter(p => p.id !== id));
      }, newPillar.duration * 1000);
    };

    // Initial scattered start
    const count = isMobile ? 2 : 5;
    for(let i=0; i<count; i++) {
      scheduleTimeout(spawnPillar, i * 600);
    }

    if (!isMobile) {
      const interval = setInterval(spawnPillar, 5500); 
      return () => {
        active = false;
        clearInterval(interval);
        timeouts.forEach(clearTimeout);
        timeouts.clear();
      };
    }
    return () => {
      active = false;
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, [isMobile]);

  return (
    <div className="absolute inset-0 z-1 pointer-events-none overflow-hidden mix-blend-screen opacity-60">
      <AnimatePresence>
        {pillars.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ 
              opacity: [0, 0.4, 0.5, 0.4, 0], 
              x: [0, 80, -40, 40], // Natural drifting
              skewX: [p.skew, p.skew + 12, p.skew - 8, p.skew], // Organic swaying
              scaleY: [1, 1.05, 0.98, 1.02, 1], // Breathing effect
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: p.duration, 
              ease: "easeInOut",
              times: [0, 0.15, 0.5, 0.85, 1] 
            }}
            className="absolute top-[-30%] h-[160%] will-change-transform"
            style={{
              width: p.width * 1.35,
              left: p.left,
              background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${p.color}66 0%, ${p.color}26 48%, transparent 100%)`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function DynamicCollage({ isGated = false }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const cols = isMobile ? 3 : 5;
  const rows = isMobile ? 3 : 4;
  const limit = cols * rows;
  const photos = Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.webp`);
  const activePhotos = photos.slice(0, limit);
  
  return (
    <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${isGated ? "opacity-20" : "opacity-45"}`}>
      <div className="flex w-[200%] h-full animate-roll">
         <div className="grid w-1/2 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {activePhotos.map((src, i) => (
              <ContentImage key={i} src={src} alt="" width={400} height={400} sizes="(max-width: 768px) 33vw, 20vw" quality={70} loading="lazy" className="w-full h-full object-cover border-[0.5px] border-white/5" />
            ))}
         </div>
         <div className="grid w-1/2 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {activePhotos.map((src, i) => (
              <ContentImage key={`loop-${i}`} src={src} alt="" width={400} height={400} sizes="(max-width: 768px) 33vw, 20vw" quality={70} loading="lazy" className="w-full h-full object-cover border-[0.5px] border-white/5" />
            ))}
         </div>
      </div>
      <style>{`
        @keyframes roll {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-roll {
          animation: roll 80s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-roll {
            animation: none !important;
            transform: translateX(-25%);
          }
        }
      `}</style>
    </div>
  );
}

const PR_DOT_COUNT = 45;

const PR_COLORS = ["#F97316", "#FACC15", "#D946EF"];

export function PrinceRupertDropInstance({ position }) {
  const dots = useMemo(() => {
    const random = createSeededRandom(`landing-prince-rupert-dots-${position.x}-${position.y}`);
    const generatedDots = [];
    for (let i = 0; i < PR_DOT_COUNT; i++) {
      const t = Math.pow(i / (PR_DOT_COUNT - 1), 1.5); 
      const curveX = Math.sin(t * Math.PI * 1.5) * 180 * t;
      const curveY = -t * 400 + 100;
      const maxRadius = 130;
      const radiusAtT = Math.max((1 - t) * maxRadius * Math.exp(-t * 2.5), 2);
      const angle = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * radiusAtT;
      const x = curveX + r * Math.cos(angle);
      const y = curveY + r * Math.sin(angle);
      const size = random() * 5 + 3;
      const color = PR_COLORS[Math.floor(random() * PR_COLORS.length)];
      const duration = 2 + random() * 3;
      const delay = random() * duration;
      const xOscillation = (random() - 0.5) * 20;
      const yOscillation = (random() - 0.5) * 20;

      generatedDots.push({ id: i, t, x, y, size, color, duration, delay, xOscillation, yOscillation });
    }
    return generatedDots;
  }, [position.x, position.y]);

  return (
    <motion.div
      className="absolute w-0 h-0 flex items-center justify-center pointer-events-none mix-blend-screen"
      style={{ left: position.x, top: position.y }}
      initial={{ scale: position.scale, rotate: position.rotation }}
      animate={{ scale: position.scale, rotate: position.rotation }}
      exit={{ opacity: 1, transition: { duration: 1.5 } }} // Hold DOM node alive for children to finish exiting
    >
      {dots.map((dot) => (
        <motion.div
          key={`wrapper-${dot.id}`}
          className="absolute"
          style={{
            left: dot.x - dot.size / 2,
            top: dot.y - dot.size / 2,
            width: dot.size,
            height: dot.size,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0, transition: { duration: 0.5, delay: (1 - dot.t) * 1.0 } }} // Fades out from tail first
          transition={{ duration: 0.5, delay: (1 - dot.t) * 1.2 }} // Spawns from tail (t=1) to head (t=0)
        >
          <motion.div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: dot.color,
              boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`
            }}
            animate={{
              x: [0, dot.xOscillation, 0],
              y: [0, dot.yOscillation, 0],
              opacity: [0.1, 0.9, 0.1],
            }}
            transition={{
              duration: dot.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: dot.delay,
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function PrinceRupertDrop() {
  const [drops, setDrops] = useState([]);

  useEffect(() => {
    let active = true;
    const random = createRuntimeSeededRandom("landing-prince-rupert-drops-v1");
    let nextDropId = 0;
    const timeouts = new Set();
    const scheduleTimeout = (callback, delay) => {
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        if (active) callback();
      }, delay);
      timeouts.add(timeout);
    };

    const spawnDrop = () => {
      if (!active) return;
      const newDrop = {
        id: nextDropId++,
        x: `${random() * 60 + 20}%`, // Random X between 20% and 80%
        y: `${random() * 60 + 20}%`, // Random Y between 20% and 80%
        rotation: random() * 360,
        scale: random() * 0.4 + 0.6, // Scale between 0.6 and 1.0
      };
      
      setDrops(prev => [...prev, newDrop]);
      
      // TTL is 4 seconds. Remove after 4000ms.
      scheduleTimeout(() => {
        setDrops(prev => prev.filter(d => d.id !== newDrop.id));
      }, 4000);
    };

    // Spawn first
    spawnDrop();
    
    // Spawn new one every 3 seconds (1 second overlap with the 4s TTL)
    const interval = setInterval(spawnDrop, 3000);
    
    return () => {
      active = false;
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen">
      <AnimatePresence>
        {drops.map(drop => (
          <PrinceRupertDropInstance key={drop.id} position={drop} />
        ))}
      </AnimatePresence>
    </div>
  );
}
