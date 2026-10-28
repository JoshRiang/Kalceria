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
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            y: [0, -15, 0]
          }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: "easeInOut"
          }}
          className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)]"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        />
      ))}
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
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0, 1, 0], 
            y: [0, -20, 0],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: "easeInOut"
          }}
          className={`absolute w-1 h-1 rounded-full ${p.bgColor}`}
          style={{ 
            left: `${p.x}%`, top: `${p.y}%`,
            filter: `drop-shadow(0 0 4px ${p.shadowColor})`
          }}
        />
      ))}
    </div>
  );
}

export function FloatingSpareParts() {
  const parts = [
    { src: "/support_1.webp", pos: "top-10 left-4 md:left-20", rot: 15, delay: 0.2, dur: 7.5 },
    { src: "/support_2.webp", pos: "top-10 right-4 md:right-20", rot: -15, delay: 1.5, dur: 6.2 },
    { src: "/support_3.webp", pos: "bottom-10 left-4 md:left-20", rot: -20, delay: 0.8, dur: 8.4 },
    { src: "/support_4.webp", pos: "bottom-10 right-4 md:right-20", rot: 25, delay: 2.3, dur: 5.8 },
  ];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {parts.map((part, i) => {
        // Adjust size for top-right (index 1) and bottom-left (index 2)
        const isSmaller = i === 1 || i === 2;
        const sizeClass = isSmaller ? "w-20 md:w-44" : "w-28 md:w-64";

        return (
          <motion.img
            key={i}
            src={part.src}
            className={`absolute ${part.pos} ${sizeClass} h-auto ${isSmaller && i === 2 || i === 3 ? "opacity-100" : "opacity-70"}`}
            initial={{ rotate: part.rot }}
            animate={{
              y: [0, -20, 0],
              rotate: [part.rot, part.rot + 4, part.rot],
            }}
            transition={{
              duration: part.dur,
              repeat: Infinity,
              ease: "easeInOut",
              delay: part.delay,
            }}
          />
        );
      })}
    </div>
  );
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
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: p.bottom,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}88`,
          }}
          animate={{
            x: [0, p.xDrift, 0],
            y: [0, p.yRise],
            opacity: [0, 0.75, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export function AuroraParticles() {
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
        width: random() * 400 + 150, // Wider for softer edges
        color: colors[Math.floor(random() * colors.length)],
        duration: 20 + random() * 20, // Much slower for natural feel
        skew: (random() - 0.5) * 40,
        blur: random() * 50 + 80, // High blur for feathering
      };
      setPillars(prev => [...prev, newPillar]);
      scheduleTimeout(() => {
        setPillars(prev => prev.filter(p => p.id !== id));
      }, newPillar.duration * 1000);
    };

    // Initial scattered start
    for(let i=0; i<8; i++) {
      scheduleTimeout(spawnPillar, i * 600);
    }

    const interval = setInterval(spawnPillar, 4000); 
    return () => {
      active = false;
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

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
            className="absolute top-[-30%] h-[160%]"
            style={{
              width: p.width,
              left: p.left,
              filter: `blur(${p.blur}px)`,
              background: `linear-gradient(to bottom, transparent, ${p.color}22 20%, ${p.color} 50%, ${p.color}22 80%, transparent)`,
              maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function DynamicCollage() {
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
    <div className="absolute inset-0 z-0 overflow-hidden opacity-45 pointer-events-none">
      <div className="flex w-[200%] h-full animate-roll">
         <div className="grid w-1/2 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {activePhotos.map((src, i) => (
              <ContentImage key={i} src={src} alt="" width={800} height={800} loading="eager" className="w-full h-full object-cover border-[0.5px] border-white/5" />
            ))}
         </div>
         <div className="grid w-1/2 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {activePhotos.map((src, i) => (
              <ContentImage key={`loop-${i}`} src={src} alt="" width={800} height={800} loading="eager" className="w-full h-full object-cover border-[0.5px] border-white/5" />
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
