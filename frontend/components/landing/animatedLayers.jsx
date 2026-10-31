"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createRuntimeSeededRandom, createSeededRandom } from "@/lib/seededRandom";

const COMMUNITY_QUOTES = [
  "Kak mau photoo!", "Woi Wahib mana woi!", "Kak mau colabbb",
  "Coki ganteng, no gay tho", "Otniel jelek wleee", "Aku mau Kalceria menjadi....",
  "Tolong diet lagi ya mas", "Kak main UMINGLE yuk!", "Cok, lagi dimana, sama siapa?",
  "Keren bangetttt!!", "GG, Speechless"
];

export function CometEffect() {
  const [comets, setComets] = useState([]);

  useEffect(() => {
    let active = true;
    const random = createRuntimeSeededRandom("landing-comets-v1");
    let nextCometId = 0;
    const timeouts = new Set();
    const scheduleTimeout = (callback, delay) => {
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        if (active) callback();
      }, delay);
      timeouts.add(timeout);
    };

    function spawnComet() {
      if (!active) return;
      const id = nextCometId++;
      const isLeft = random() > 0.5;
      const winW = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const aspect = winW / Math.max(winH, 1);

      // Realistic diagonal trajectory (~30 to 40 deg angle across the sky)
      const slope = 0.55 + random() * 0.25;

      const startX = isLeft ? -20 : 120;
      const startY = 5 + random() * 30;
      const endX = isLeft ? 120 : -20;
      const deltaX_pct = Math.abs(endX - startX);
      const deltaY_pct = Math.min((deltaX_pct * aspect) * slope, 80);
      const endY = startY + deltaY_pct;
      
      const pixelDx = (endX - startX) * winW / 100;
      const pixelDy = (endY - startY) * winH / 100;
      const angle = (Math.atan2(pixelDy, pixelDx) * 180) / Math.PI;

      setComets(prev => [...prev, { id, startX, startY, endX, endY, angle }]);
      
      scheduleTimeout(() => {
        setComets(prev => prev.filter(c => c.id !== id));
      }, 900);

      scheduleTimeout(spawnComet, 1600 + random() * 1200);
    }

    spawnComet();
    return () => {
      active = false;
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {comets.map((c) => (
          <motion.div
            key={c.id}
            initial={{ left: `${c.startX}%`, top: `${c.startY}%`, opacity: 0 }}
            animate={{ left: `${c.endX}%`, top: `${c.endY}%`, opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "linear" }}
            className="absolute"
          >
            <div 
              className="w-32 md:w-64 h-[1px] md:h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-white blur-[0.5px]"
              style={{ transform: `rotate(${c.angle}deg)`, transformOrigin: "left center" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function FloatingAssets({ isMobile }) {
  const assets = useMemo(() => {
    const assetDefinitions = [
      // ccar_1 & ccar_2 shifted more left
      ...(!isMobile ? [
        { src: '/ccar_1.webp', x: 5, y: 18, w: "w-32 md:w-56", rot: -35, dX: 60, dY: 45, rS: 55 },
        { src: '/ccar_2.webp', x: 8, y: 62, w: "w-24 md:w-36", rot: 45, dX: -70, dY: -65, rS: -60 },
      ] : []),
      { src: '/ccar_3.webp', x: isMobile ? 75 : 85, y: isMobile ? 8 : 18, w: isMobile ? "w-24 xs:w-28 md:w-56" : "w-32 md:w-56", rot: 25, dX: -40, dY: 35, rS: 35 },
      { src: '/ccar_4.webp', x: isMobile ? 70 : 82, y: isMobile ? 55 : 62, w: isMobile ? "w-20 xs:w-24 md:w-36" : "w-24 md:w-36", rot: -15, dX: 35, dY: -35, rS: -45 },
      // stikermobil_3 & stikermobil_1 — only on desktop
      ...(!isMobile ? [
        { src: '/stikermobil_3.webp', x: 28.5, y: 80, w: "w-20 md:w-32", rot: -8, dX: 55, dY: -50, rS: 40 },
        { src: '/stikermobil_1.webp', x: 65, y: 81, w: "w-16 md:w-28", rot: 14, dX: -45, dY: -40, rS: -35 },
      ] : []),
    ];
    
    return assetDefinitions.map((def, i) => ({
      src: def.src,
      id: i,
      x: def.x,
      y: def.y,
      widthClass: def.w,
      rotate: def.rot,
      duration: 25 + (i * 3),
      delay: i * 2,
      xDrift: def.dX,
      yDrift: def.dY,
      rotationSpeed: def.rS,
    }));
  }, [isMobile]);

  return (
    <div className="absolute inset-0 z-[15] pointer-events-none overflow-hidden">
      {assets.map((a) => (
        <motion.img
          key={a.id}
          src={a.src}
          alt=""
          className={`absolute object-contain drop-shadow-2xl ${a.widthClass}`}
          style={{
            left: `${a.x}%`,
            top: `${a.y}%`,
          }}
          animate={{
            x: [0, a.xDrift],
            y: [0, a.yDrift],
            rotate: [a.rotate, a.rotate + a.rotationSpeed],
          }}
          transition={{
            duration: a.duration,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
            delay: a.delay,
          }}
        />
      ))}
    </div>
  );
}

export function CommunityQuotes({ isMobile }) {
  // Two bands: above heading (25-40% Y) and below button (68-80% Y)
  // Horizontal constrained to 32-68% to stay clear of corner cars
  const floatingQuotes = useMemo(() => {
    const random = createSeededRandom(`landing-community-quotes-${isMobile ? "mobile" : "desktop"}-v1`);
    // If mobile, slice quotes list to spawn 30% less items (ceil(11 * 0.7) = 8 quotes)
    const activeList = isMobile ? COMMUNITY_QUOTES.slice(0, Math.ceil(COMMUNITY_QUOTES.length * 0.7)) : COMMUNITY_QUOTES;

    return activeList.map((text, i) => {
      const inUpperBand = i % 2 === 0;
      return {
        id: i,
        text,
        left: `${32 + random() * 36}%`,
        top: inUpperBand ? `${25 + random() * 15}%` : `${68 + random() * 12}%`,
        delay: i * (isMobile ? 5 : 3.5) + random() * 2, // 30% slower delays
        duration: (8 + random() * 8) * (isMobile ? 1.3 : 1), // 30% longer duration for calmer speed
        xDrift: (random() - 0.5) * 40,  // small drift to stay in zone
        yDrift: (random() - 0.5) * 30,
        rotate: (random() - 0.5) * 20,
        fontSize: isMobile ? (random() * 6 + 10) : (random() * 8 + 13), // slightly smaller text for mobile elegance
        bold: random() > 0.5,
        italic: random() > 0.4,
        under: random() > 0.7,
        repeatDelay: (15 + random() * 10) * (isMobile ? 1.5 : 1),
      };
    });
  }, [isMobile]);

  return (
    <div className="absolute inset-0 z-[14] pointer-events-none overflow-hidden select-none">
      {floatingQuotes.map((q) => (
        <motion.div
          key={q.id}
          className={`absolute font-sans text-white whitespace-nowrap drop-shadow-lg
            ${q.bold ? 'font-black' : 'font-medium'} 
            ${q.italic ? 'italic' : ''} 
            ${q.under ? 'underline underline-offset-4 decoration-white' : ''}`}
          style={{
            left: q.left,
            top: q.top,
            fontSize: q.fontSize,
          }}
          animate={{
            x: [0, q.xDrift],
            y: [0, q.yDrift],
            rotate: [q.rotate, q.rotate + 12],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: q.duration,
            repeat: Infinity,
            repeatDelay: q.repeatDelay, // 50% longer wait time on mobile to reduce density
            ease: "easeInOut",
            delay: q.delay,
          }}
        >
          {q.text}
        </motion.div>
      ))}
    </div>
  );
}

export function GeminiSparkParticles() {
  const particles = useMemo(() => {
    const random = createSeededRandom("landing-gemini-spark-particles-v1");
    return Array.from({ length: 60 }, (_, id) => {
      const value = random();
      let color = '#60A5FA';
      if (value > 0.8) color = '#FBBF24';
      else if (value > 0.6) color = '#D946EF';
      else if (value > 0.3) color = '#38BDF8';

      return {
        id,
        left: `${random() * 100}%`,
        top: `${random() * 100}%`,
        size: random() * 3 + 1,
        color,
        delay: random() * 5,
        duration: 3 + random() * 5,
        xDrift: (random() - 0.5) * 60,
        yDrift: (random() - 0.5) * 60,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            top: p.top,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}, 0 0 24px ${p.color}44`,
          }}
          animate={{
            x: [0, p.xDrift, 0],
            y: [0, p.yDrift, 0],
            opacity: [0.3, 1, 0.3],
            scale: [0.5, 1.2, 0.5],
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
  );
}
