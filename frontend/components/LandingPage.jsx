"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ServiceRequestModal from "./ServiceRequestModal";
import api from "@/lib/api";

// ─── Typewriter Component ─────────────────────────────
function Typewriter({ text, mode = "letter", delay = 0, skipAnim = false }) {
  const [displayText, setDisplayText] = useState("");
  
  useEffect(() => {
    if (skipAnim) {
      setDisplayText(text);
      return;
    }

    let isCancelled = false;
    let timeoutIds = [];
    let loop;
    
    const playAnim = () => {
      // 1. Type forward (0 to ~1500ms)
      const chars = text.split("");
      chars.forEach((char, i) => {
        const t = setTimeout(() => {
          if(!isCancelled) setDisplayText(text.slice(0, i + 1));
        }, i * 100);
        timeoutIds.push(t);
      });
      
      // 2. Wait until 3000ms, then backspace
      if (mode === "none") {
        const tReset = setTimeout(() => {
          if(!isCancelled) setDisplayText("");
        }, 5900);
        timeoutIds.push(tReset);
      } else if (mode === "letter") {
        const tStartBack = setTimeout(() => {
          chars.forEach((_, i) => {
            const t = setTimeout(() => {
              if(!isCancelled) setDisplayText(text.slice(0, chars.length - 1 - i));
            }, i * 100);
            timeoutIds.push(t);
          });
        }, 3000);
        timeoutIds.push(tStartBack);
      } else if (mode === "word") {
        const tStartBack = setTimeout(() => {
          // split by space but keep the spaces for slicing
          const words = text.match(/\S+|\s+/g) || [];
          let currentWords = [...words];
          words.forEach((_, i) => {
            const t = setTimeout(() => {
              if(!isCancelled) {
                // remove the last word/space chunk
                currentWords.pop();
                setDisplayText(currentWords.join(""));
              }
            }, i * 400); // Slower, per word chunk
            timeoutIds.push(t);
          });
        }, 3000);
        timeoutIds.push(tStartBack);
      }
    };
    
    // Initial start delay to stagger the animations
    const startDelay = setTimeout(() => {
      if(isCancelled) return;
      playAnim();
      loop = setInterval(() => {
        if(!isCancelled) setDisplayText("");
        playAnim();
      }, 6000); // Base loop is 6 seconds
    }, delay);
    
    return () => {
      isCancelled = true;
      clearTimeout(startDelay);
      if(loop) clearInterval(loop);
      timeoutIds.forEach(clearTimeout);
    };
  }, [text, mode, delay]);

  return (
    <span className="inline-block min-h-[1em] relative">
      <style>{`
        @keyframes solid-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .animate-solid-blink {
          animation: solid-blink 1s infinite;
        }
      `}</style>
      {displayText}
      <span className="animate-solid-blink ml-1 font-light text-white">|</span>
    </span>
  );
}

// ─── Rolling Film Roll Components ─────────────────────
function FilmLane({ rotation, top, left, height = "h-16 md:h-24" }) {
  return (
    <div 
      className={`absolute w-[300%] ${height} bg-white shadow-[0_0_40px_rgba(255,255,255,0.8)] pointer-events-none`}
      style={{ top, left, transform: `rotate(${rotation}deg)`, transformOrigin: "left center" }}
    />
  );
}

function FilmStrip({ rotation, top, left, speed = 40, height = "h-16 md:h-24" }) {
  return (
    <div 
      className={`absolute w-[300%] ${height} pointer-events-none overflow-hidden`}
      style={{ top, left, transform: `rotate(${rotation}deg)`, transformOrigin: "left center" }}
    >
      <div className="flex w-full h-full opacity-70 animate-film-scroll">
        <div className="flex-shrink-0 w-1/3 h-full" style={{ backgroundImage: 'url(/filmroll.webp)', backgroundSize: 'contain', backgroundRepeat: 'repeat-x' }} />
        <div className="flex-shrink-0 w-1/3 h-full" style={{ backgroundImage: 'url(/filmroll.webp)', backgroundSize: 'contain', backgroundRepeat: 'repeat-x' }} />
        <div className="flex-shrink-0 w-1/3 h-full" style={{ backgroundImage: 'url(/filmroll.webp)', backgroundSize: 'contain', backgroundRepeat: 'repeat-x' }} />
      </div>
      <style>{`
        @keyframes film-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-film-scroll {
          animation: film-scroll ${speed}s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Event Slider Component ──────────────────────────
const EVENT_IMAGES = ["/event_1.webp", "/event_2.webp", "/event_3.webp"];

function EventSlider() {
  const [index, setIndex] = useState(0);
  const n = EVENT_IMAGES.length; // Variable n for dynamic expansion

  useEffect(() => {
    const int = setInterval(() => {
      setIndex(prev => (prev + 1) % n);
    }, 4000);
    return () => clearInterval(int);
  }, [n]);

  const variants = {
    enter: { x: "100%" },
    center: { x: "0%", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    exit: { x: "-100%", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0c1528]">
      <AnimatePresence initial={false} custom={index}>
        <motion.img
          key={index}
          src={EVENT_IMAGES[index]}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
    </div>
  );
}

// ─── Merch Randomizer (Null-It Engine) ───────────────
function useMerchRandomizer() {
  const [inventory, setInventory] = useState([]);
  const [displayed, setDisplayed] = useState([]);

  useEffect(() => {
    const INITIAL_DUMMIES = Array.from({ length: 10 }).map((_, i) => ({
      id: `mock-${i}`,
      productId: `KLCR-${100 + i}`,
      name: i === 0 ? "Obsidian Shift Knob" : i === 1 ? "Carbon Fiber Lip" : i === 2 ? "Aero Dynamic Wing" : i === 3 ? "Forged Pistons Set" : i === 4 ? "Titanium Exhaust" : i === 5 ? "Cold Air Intake" : i === 6 ? "Racing Brake Pads" : i === 7 ? "Coilover Suspension" : i === 8 ? "Billet Fuel Rail" : "High Flow Injectors",
      imageUrl: `https://picsum.photos/seed/kalceria${i}/600/800`,
      label: i % 4 === 0 ? "HOT DEALS" : i % 4 === 1 ? "SOLD OUT" : "AVAILABLE"
    }));

    const loadAndPick = () => {
      let items = [];
      try {
        const raw = localStorage.getItem("kalceria_dummy_products");
        if (raw && raw !== "undefined" && raw !== "null") {
          items = JSON.parse(raw);
        }
      } catch (e) {
        console.error("Failed to parse dummy products", e);
      }
      
      if (!Array.isArray(items) || items.length === 0) {
        items = INITIAL_DUMMIES;
        localStorage.setItem("kalceria_dummy_products", JSON.stringify(INITIAL_DUMMIES));
      }

      setInventory((prev) => {
        const shuffled = [...items].sort(() => 0.5 - Math.random());
        const picked = shuffled.slice(0, 4);
        setDisplayed(picked);
        return items;
      });
    };

    loadAndPick();
    const interval = setInterval(loadAndPick, 6000); // Slightly slower for typewriter
    return () => clearInterval(interval);
  }, []);

  return displayed;
}

function ShowcaseTypewriter({ text }) {
  const [displayed, setDisplayed] = useState("");
  
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 40); // Fast but readable typing
    return () => clearInterval(interval);
  }, [text]);

  return <span className="font-mono">{displayed}</span>;
}

function MerchCard({ item, isInitial, index, isMobile }) {
  const bg = item.imageUrl || `https://picsum.photos/seed/${item.id}/600/800`;
  
  // Dynamic Blobs based on Index
  const blobConfigs = [
    { c1: "bg-red-500", c2: "bg-emerald-500" }, // Index 0: Red - Green
    { c1: "bg-yellow-500", c2: "bg-red-500" },   // Index 1: Gold - Red
    { c1: "bg-yellow-500", c2: "bg-emerald-500" }, // Index 2: Gold - Green
    { c1: "bg-yellow-500", c2: "bg-cyan-500" }     // Index 3: Gold - Blue Sea
  ];
  const blobs = blobConfigs[index % 4];

  return (
    <motion.div
      layout
      initial={isInitial ? { opacity: 0, y: 30 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group min-h-[374px] w-full max-w-[280px] sm:max-w-none ${isMobile ? "rounded-2xl" : ""}`}
      style={{ 
        clipPath: isMobile 
          ? "none"
          : "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)"
      }}
    >
      {/* Background Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
        <motion.div 
          animate={{ x: [0, 15, 0], y: [0, -15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -top-8 -left-8 w-32 h-32 rounded-full blur-[35px] ${blobs.c1}`} 
        />
        <motion.div 
          animate={{ x: [0, -15, 0], y: [0, 15, 0], scale: [1.1, 0.9, 1.1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-[35px] ${blobs.c2}`} 
        />
      </div>

      {/* Invisible Frame for Image */}
      <div className="p-3 relative z-10">
        <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-black/60 border border-white/5 shadow-inner">
          <AnimatePresence mode="wait">
            <motion.img 
              key={item.id}
              initial={{ opacity: 0, x: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -30, filter: "blur(8px)" }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              src={bg} 
              alt={item.name} 
              className="absolute inset-0 w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" 
            />
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-3 left-3 z-20"
            >
              {item.label === "HOT DEALS" && (
                <span 
                  className="text-[12px] font-mono font-black uppercase tracking-tighter text-yellow-400"
                  style={{ textShadow: "1px 1.2px 0px #854d0e, 2px 2.5px 0px #713f12, 2.5px 4px 6px rgba(0,0,0,0.6)" }}
                >
                  HOT DEALS
                </span>
              )}
              {item.label === "AVAILABLE" && (
                <span 
                  className="text-[10px] font-mono font-black uppercase tracking-tighter text-[#ffe2d1]"
                  style={{ textShadow: "1px 0.8px 0px #94a3b8, 1.5px 1.5px 0px #64748b, 2px 2px 5px rgba(0,0,0,0.4)" }}
                >
                  AVAILABLE
                </span>
              )}
              {item.label === "SOLD OUT" && (
                <div className="relative inline-block">
                  <span 
                    className="text-[10px] font-mono font-black uppercase tracking-tighter text-white"
                    style={{ textShadow: "1px 0.8px 0px #475569, 1.5px 1.5px 0px #334155, 2px 2px 5px rgba(0,0,0,0.5)" }}
                  >
                    SOLD OUT
                  </span>
                  <div className="absolute top-[55%] left-[-2px] w-[calc(100%+4px)] h-[1.2px] bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.5)]" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="px-5 pb-6 flex flex-col flex-1 relative z-10">
        <div className="mt-3 mb-2 h-14 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="font-sans font-black text-base tracking-tight text-white uppercase leading-tight">
                <ShowcaseTypewriter text={item.name} />
              </h3>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}


// ─── Find More Slider Component ──────────────────────
const FINDMORE_VIDEOS = Array.from({length: 10}, (_, i) => `/vit_tt${i+1}.mp4`);

function FindMoreSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setIndex(prev => (prev + 1) % FINDMORE_VIDEOS.length);
    }, 5000);
    return () => clearInterval(int);
  }, []);

  const variants = {
    enter: { y: "100%" },
    center: { y: "0%", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    exit: { y: "-100%", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <AnimatePresence initial={false} custom={index}>
        <motion.video
          key={index}
          src={FINDMORE_VIDEOS[index]}
          autoPlay
          muted
          playsInline
          loop={false}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
    </div>
  );
}

// ─── Golden Dust Particle System ─────────────────────
function GoldenDust() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 20 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 2 + Math.random() * 3
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

// ─── Star Dust Particle System (50/50 Violet & Gold - Circular Micro Dust) ──
function StarDust() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 30 }).map(() => {
      const isViolet = Math.random() > 0.5;
      return {
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
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

// ─── Floating Spare Parts Component ──────────────────
function FloatingSpareParts() {
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

// ─── Tropical Particles Component (Lush Greenery) ────────
function TropicalParticles() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      bottom: `${40 + Math.random() * 30}%`,
      size: Math.random() * 4 + 2, 
      color: ['#bef264', '#4ade80', '#22c55e', '#166534', '#86efac'][Math.floor(Math.random() * 5)],
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
      xDrift: (Math.random() - 0.5) * 60,
      yRise: -(120 + Math.random() * 180),
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

// ─── Aurora Particles Component (Tokyo Night Atmosphere) ─
function AuroraParticles() {
  const [pillars, setPillars] = useState([]);

  useEffect(() => {
    const spawnPillar = () => {
      const id = Date.now() + Math.random();
      // Organic aurora color spectrum
      const colors = ['#4ade80', '#10b981', '#d946ef', '#a855f7', '#06b6d4', '#4ade80'];
      const newPillar = {
        id,
        left: `${Math.random() * 140 - 20}%`,
        width: Math.random() * 400 + 150, // Wider for softer edges
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: 20 + Math.random() * 20, // Much slower for natural feel
        skew: (Math.random() - 0.5) * 40,
        blur: Math.random() * 50 + 80, // High blur for feathering
      };
      setPillars(prev => [...prev, newPillar]);
      setTimeout(() => {
        setPillars(prev => prev.filter(p => p.id !== id));
      }, newPillar.duration * 1000);
    };

    // Initial scattered start
    for(let i=0; i<8; i++) {
      setTimeout(spawnPillar, i * 600);
    }

    const interval = setInterval(spawnPillar, 4000); 
    return () => clearInterval(interval);
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

// ─── Dynamic Collage Component ────────────────────────
function DynamicCollage() {
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
              <img key={i} src={src} className="w-full h-full object-cover border-[0.5px] border-white/5" />
            ))}
         </div>
         <div className="grid w-1/2 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {activePhotos.map((src, i) => (
              <img key={`loop-${i}`} src={src} className="w-full h-full object-cover border-[0.5px] border-white/5" />
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

// ─── Prince Rupert's Drop Animation ────────────────────
const PR_DOT_COUNT = 45;
const PR_COLORS = ["#F97316", "#FACC15", "#D946EF"];

function PrinceRupertDropInstance({ position }) {
  const dots = useMemo(() => {
    const generatedDots = [];
    for (let i = 0; i < PR_DOT_COUNT; i++) {
      const t = Math.pow(i / (PR_DOT_COUNT - 1), 1.5); 
      const curveX = Math.sin(t * Math.PI * 1.5) * 180 * t;
      const curveY = -t * 400 + 100;
      const maxRadius = 130;
      const radiusAtT = Math.max((1 - t) * maxRadius * Math.exp(-t * 2.5), 2);
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radiusAtT; 
      const x = curveX + r * Math.cos(angle);
      const y = curveY + r * Math.sin(angle);
      const size = Math.random() * 5 + 3; 
      const color = PR_COLORS[Math.floor(Math.random() * PR_COLORS.length)];
      const duration = 2 + Math.random() * 3;
      const delay = Math.random() * duration;
      const xOscillation = (Math.random() - 0.5) * 20;
      const yOscillation = (Math.random() - 0.5) * 20;

      generatedDots.push({ id: i, t, x, y, size, color, duration, delay, xOscillation, yOscillation });
    }
    return generatedDots;
  }, []);

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

function PrinceRupertDrop() {
  const [drops, setDrops] = useState([]);

  useEffect(() => {
    const spawnDrop = () => {
      const newDrop = {
        id: Math.random().toString(36).substring(2, 9),
        x: `${Math.random() * 60 + 20}%`, // Random X between 20% and 80%
        y: `${Math.random() * 60 + 20}%`, // Random Y between 20% and 80%
        rotation: Math.random() * 360,
        scale: Math.random() * 0.4 + 0.6, // Scale between 0.6 and 1.0
      };
      
      setDrops(prev => [...prev, newDrop]);
      
      // TTL is 4 seconds. Remove after 4000ms.
      setTimeout(() => {
        setDrops(prev => prev.filter(d => d.id !== newDrop.id));
      }, 4000);
    };

    // Spawn first
    spawnDrop();
    
    // Spawn new one every 3 seconds (1 second overlap with the 4s TTL)
    const interval = setInterval(spawnDrop, 3000);
    
    return () => clearInterval(interval);
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

// ─── Support Us Background: Blobs & Signal Noise ─────
function SupportUsBackground() {
  const magentaRef = useRef(null);
  const yellowRef = useRef(null);

  // Noise & Flicker Engine (PWM Envelope)
  useEffect(() => {
    let startTime = Date.now();
    let rafId;
    
    const updatePaths = () => {
      let mPath = `M0,100`;
      let yPath = `M0,100`;
      const POINT_COUNT = 80;
      const widthStep = 2000 / POINT_COUNT;
      
      const elapsed = Date.now() - startTime;
      const cycleDuration = 8000; // 8s loop (4s rise, 4s fall)
      const phase = (elapsed % cycleDuration) / cycleDuration;
      
      // Envelope: Sine wave from 0 to 1 and back to 0
      const envelope = Math.sin(phase * Math.PI);
      
      // Amplitude modulation: 4px base, ramping up to ~140px max
      const currentAmplitude = 4 + (136 * envelope);
      
      for (let i = 1; i <= POINT_COUNT; i++) {
        const x = i * widthStep;
        
        // Randomization scaled dynamically by the continuous envelope
        const mAmplitude = (Math.random() - 0.5) * currentAmplitude;
        const yAmplitude = (Math.random() - 0.5) * currentAmplitude;
        
        mPath += ` L${x},${100 + mAmplitude}`;
        yPath += ` L${x},${100 + yAmplitude}`;
      }
      
      // Flicker intensity scales with the envelope
      const mOpacity = 0.8 - (Math.random() * 0.6 * envelope);
      const yOpacity = 0.8 - (Math.random() * 0.6 * envelope);

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
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Background base */}
      <div className="absolute inset-0 bg-[#050a14] z-[-10]" />

      {/* Dynamic Blobs (Z: -5) - Unaffected by Glitch */}
      <motion.div 
        className="absolute top-[-10%] left-[5%] w-[60vw] h-[60vw] rounded-full bg-[#D946EF] mix-blend-screen blur-[140px] z-[-5]"
        animate={{
          x: ["0%", "15%", "-10%", "0%"],
          y: ["0%", "-10%", "20%", "0%"],
          opacity: [0.15, 0.2, 0.15]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: "transform, opacity" }}
      />
      <motion.div 
        className="absolute bottom-[-10%] right-[5%] w-[55vw] h-[55vw] rounded-full bg-[#F97316] mix-blend-screen blur-[130px] z-[-5]"
        animate={{
          x: ["0%", "-20%", "10%", "0%"],
          y: ["0%", "15%", "-15%", "0%"],
          opacity: [0.15, 0.2, 0.15]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: "transform, opacity" }}
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
              filter: "drop-shadow(0 0 10px rgba(217,70,239,0.9))" 
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
              filter: "drop-shadow(0 0 10px rgba(250,204,21,0.9))" 
            }}
          />
        </svg>
      </div>
    </div>
  );
}

function SolarPhoenix({ isMobile }) {
  const particles = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() > 0.8 ? '12px' : '6px', // Much larger
    color: ['#ffffff', '#fbbf24', '#ff8c00', '#ffed4a'][Math.floor(Math.random() * 4)],
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    xDrift: (Math.random() - 0.5) * 100, // Bigger drift
    yDrift: (Math.random() - 0.5) * 100,
  })), []);

  const flares = [
    {
      id: 1, // Top Left
      paths: [
        "M 38 38 C 25 15, 15 40, -5 5",
        "M 36 36 C 22 12, 12 38, -8 2",
        "M 40 40 C 28 18, 18 42, -2 8"
      ],
      colors: ["#FFA07A", "#ff8c00", "#ffd700"]
    },
    {
      id: 2, // Top Right
      paths: [
        "M 62 38 C 75 15, 85 40, 105 5",
        "M 64 36 C 78 12, 88 38, 108 2",
        "M 60 40 C 72 18, 82 42, 102 8"
      ],
      colors: ["#FFA07A", "#ffd700", "#ff8c00"]
    },
    {
      id: 3, // Bottom Left
      paths: [
        "M 38 62 C 25 85, 15 60, -5 95",
        "M 36 64 C 22 88, 12 62, -8 98",
        "M 40 60 C 28 82, 18 58, -2 92"
      ],
      colors: ["#ffd700", "#FFA07A", "#FFB07C"]
    },
    {
      id: 4, // Bottom Right
      paths: [
        "M 62 62 C 75 85, 85 60, 105 95",
        "M 64 64 C 78 88, 88 62, 108 98",
        "M 60 60 C 72 82, 82 58, 102 92"
      ],
      colors: ["#ff8c00", "#FFB07C", "#ffd700"]
    },
    {
      id: 5, // Asymmetrical Sci-Fi Sweep 1
      paths: [
        "M -10 30 C 30 50, 60 10, 110 -10",
        "M -15 32 C 28 55, 62 15, 108 -5",
        "M -5 28 C 32 45, 58 5, 112 -15"
      ],
      colors: ["#ffd700", "#FFA07A", "#ff8c00"]
    },
    {
      id: 6, // Asymmetrical Sci-Fi Sweep 2
      paths: [
        "M 110 90 C 70 70, 40 20, 50 -20",
        "M 115 88 C 72 75, 45 22, 52 -25",
        "M 105 92 C 68 65, 35 18, 48 -15"
      ],
      colors: ["#ff8c00", "#FFB07C", "#ffd700"]
    },
    {
      id: 7, // Massive Deep U-Loop (Sci-fi Prominence)
      paths: [
        "M 115 5 C 80 110, 20 110, -15 5",
        "M 110 0 C 75 105, 25 105, -10 0",
        "M 120 -5 C 85 115, 15 115, -20 -5"
      ],
      colors: ["#FFB07C", "#FFA07A", "#ff8c00"]
    }
  ];

  return (
    <div className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Deep Red Corona Backdrop */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: isMobile ? [0.42, 0.63, 0.42] : [0.6, 0.9, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute rounded-full bg-red-600 blur-[120px] ${isMobile ? "w-[42vw] h-[42vw]" : "w-[60vw] h-[60vw]"}`}
      />
      
      {/* Intense Yellow Core */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: isMobile ? [0.56, 0.7, 0.56] : [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute rounded-full bg-gradient-to-t from-yellow-500 to-white mix-blend-add ${isMobile ? "w-[17vw] h-[17vw] blur-[42px]" : "w-[25vw] h-[25vw] blur-[60px]"}`}
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
              {flare.paths.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  stroke={flare.colors[i]}
                  strokeWidth={0.8 + Math.random() * 0.6}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, opacity: [0.4, 1, 0.4] }}
                  transition={{ 
                    pathLength: { duration: 3, ease: "easeOut" },
                    opacity: { duration: 2 + Math.random() * 2, repeat: Infinity, ease: "easeInOut", delay: Math.random() }
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

// ─── Landing Page Component ──────────────────────────
export default function LandingPage({ onNavigateAuth }) {
  const [mounted, setMounted] = useState(false);
  const [aboutIndex, setAboutIndex] = useState(0);
  const [mascotFrame, setMascotFrame] = useState(1);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);
  const displayedMerch = useMerchRandomizer();
  const [merchInitial, setMerchInitial] = useState(true);

  useEffect(() => {
    if (displayedMerch.length > 0) {
      const t = setTimeout(() => setMerchInitial(false), 2000);
      return () => clearTimeout(t);
    }
  }, [displayedMerch.length]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const ABOUT_IMAGES = [
    "/aboutus_bg1.webp",
    "/aboutus_bg2.webp",
    "/aboutus_bg3.webp",
    "/aboutus_bg4.webp"
  ];

  const ABOUT_IMAGES_HP = [
    "/hp/abt_landing_hp1.webp",
    "/hp/abt_landing_hp2.webp",
    "/hp/abt_landing_hp3.webp"
  ];

  const currentAboutImages = isMobile ? ABOUT_IMAGES_HP : ABOUT_IMAGES;

  useEffect(() => {
    if (sessionStorage.getItem("landingSeen")) {
      setSkipAnim(true);
    } else {
      sessionStorage.setItem("landingSeen", "true");
    }
    setMounted(true);
    // Check login status
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    // Smooth scroll restoration on fallback navigation
    const scrollTarget = sessionStorage.getItem("landingScrollTarget");
    const scrollY = sessionStorage.getItem("landingScrollY");
    if (scrollTarget || scrollY) {
      sessionStorage.removeItem("landingScrollTarget");
      sessionStorage.removeItem("landingScrollY");
      const isQuickRestoration = sessionStorage.getItem("landingSeen") === "true";
      const timer = setTimeout(() => {
        if (scrollY) {
          window.scrollTo({
            top: parseInt(scrollY, 10),
            behavior: isQuickRestoration ? "auto" : "smooth"
          });
        } else {
          const element = document.getElementById(scrollTarget);
          if (element) {
            element.scrollIntoView({ behavior: isQuickRestoration ? "auto" : "smooth", block: "center" });
          }
        }
      }, isQuickRestoration ? 50 : 1000); // Trigger instant scrolling if already seen, else wait for fade-in
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    window.location.reload();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAboutIndex((prev) => (prev + 1) % currentAboutImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentAboutImages.length]);

  useEffect(() => {
    const mascotInterval = setInterval(() => {
      setMascotFrame(prev => prev === 1 ? 2 : 1);
    }, 2000);
    return () => clearInterval(mascotInterval);
  }, []);

  const slideVariants = {
    enter: { x: "100%", opacity: 0 },
    center: { x: "0%", opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    exit: { x: "-100%", opacity: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div
      initial={{ opacity: skipAnim ? 1 : 0 }}
      animate={{ opacity: skipAnim ? 1 : (mounted ? 1 : 0) }}
      transition={{ duration: skipAnim ? 0 : 1.5, ease: "easeOut" }}
      className="relative w-full bg-[#050a14] text-white font-mono overflow-x-hidden selection:bg-[#FF00FF] selection:text-white"
    >
      {/* ── Section 1: Hero ── */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden py-24 z-10">
        <DynamicCollage />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/50 via-[#050a14]/10 to-[#050a14] z-0" />

        {/* Video Container */}
        <div className="relative w-[88%] md:w-[72%] max-w-4xl aspect-square md:aspect-video rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center z-10">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover bg-[#000000]/60">
            <source src="/video_landingatas.mp4" type="video/mp4" />
          </video>
          
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-6 md:gap-10 px-4 w-full">
            <motion.img 
              src="/logo_landing.webp" 
              alt="Kalceria" 
              className="w-[85%] md:w-[70%] max-w-3xl h-auto object-contain drop-shadow-2xl" 
              draggable={false}
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {isLoggedIn ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="group relative px-10 md:px-12 py-2.5 md:py-3.5 rounded-[20px] overflow-hidden transition-all duration-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              >
                <div className="absolute inset-0 bg-red-500/20 group-hover:bg-red-500/30 transition-colors" />
                <div className="absolute inset-0 border border-red-500/30 group-hover:border-red-500/50 rounded-[20px]" />
                <div className="absolute inset-0 shadow-[0_0_40px_rgba(239,68,68,0.1)] group-hover:shadow-[0_0_60px_rgba(239,68,68,0.2)] transition-all" />
                
                <span className="relative z-10 font-sans font-black text-white uppercase tracking-widest text-[13px] md:text-[15px]">
                  LOGOUT
                </span>
              </button>
            ) : (
              <button
                onClick={onNavigateAuth}
                className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
              >
                <span className="relative z-10">LOGIN / REGISTER</span>
                <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Events ── */}
      <section id="section-events" className="relative w-full min-h-[70vh] flex flex-col md:flex-row items-center justify-center md:justify-between overflow-hidden bg-[#050a14] z-20 px-8 md:px-24 py-20 gap-12 md:gap-16">
        <StarDust />
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[100px] bg-[#FF00FF]" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[0%] right-[10%] w-[50vw] h-[50vw] rounded-full blur-[120px] bg-[#FFD700]" />
          <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[30%] left-[50%] w-[30vw] h-[30vw] rounded-full blur-[80px] bg-[#ffffff]" />
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }} className="absolute bottom-[-10%] left-[5%] w-[40vw] h-[40vw] rounded-full blur-[110px] bg-[#FF0000]" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }} className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[120px] bg-[#FF8C00]" />
        </div>

        {/* Mobile-only Silhouette: grup_hp.webp (on top of background layer z-0 but behind crystal_2 z-10) */}
        <div className="absolute bottom-0 left-0 w-full h-[300px] pointer-events-none z-[1] overflow-hidden md:hidden flex justify-center items-end">
          <img src="/hp/grup_hp.webp" alt="Group Mobile" className="h-full w-auto object-contain opacity-35" />
        </div>

        {/* Center: Event Slider Card (Relative on Mobile, Absolutely Centered on Desktop) */}
        <div 
          className="relative md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10 w-full max-w-[260px] md:max-w-[320px] aspect-[4/5] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-sm" 
          style={{ clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" }}
        >
          <EventSlider />
        </div>

        {/* Left Content (Relative on Mobile placed under card, Absolute on Desktop) */}
        <div className="relative md:absolute left-0 md:left-24 bottom-0 md:top-1/2 md:-translate-y-1/2 z-20 flex flex-col items-center md:items-start gap-4 md:gap-6 mt-8 md:mt-0">
          <h2 className="text-center md:text-left text-5xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter" style={{ textShadow: "4px 4px 0 rgba(255,0,255,0.15)" }}>
            <Typewriter text="SEE EVENT" mode="letter" delay={0} skipAnim={skipAnim} />
          </h2>
          <Link href="/events" onClick={() => {
            sessionStorage.setItem("landingScrollTarget", "section-events");
            sessionStorage.setItem("landingScrollY", window.scrollY);
          }}>
            <button
              className="relative px-8 py-3 font-sans font-extrabold uppercase tracking-wide text-[13px] text-[#050a14] bg-white border border-white transition-all hover:border-[#FF00FF] hover:bg-transparent hover:text-white group cursor-pointer"
              style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
            >
              <span className="relative z-10">EXPLORE</span>
              <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
            </button>
          </Link>
        </div>

        {/* Floating Crystal 2 Instances */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
           {/* Bottom (Smallest) */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[20px] md:h-[28px] object-contain opacity-70 left-[20%] md:left-[35%] bottom-[42%] md:bottom-[5%] -translate-x-1/2"
             animate={{ y: [0, -8, 0], rotate: [55, 65, 55] }}
             transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
           />
           {/* Left Small */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[26px] md:h-[36px] object-contain opacity-70 left-[calc(50%-185px)] md:left-[calc(50%-260px)] top-[30%] md:top-[55%]"
             animate={{ y: [0, -10, 0], rotate: [-35, -25, -35] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           />
           {/* Right Medium */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[34px] md:h-[47px] object-contain opacity-70 left-[calc(50%+165px)] md:left-[calc(50%+175px)] top-[22%] md:top-[18%]"
             animate={{ y: [0, -15, 0], rotate: [30, 40, 30] }}
             transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
           />
           {/* Right Large */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[45px] md:h-[63px] object-contain opacity-70 left-[calc(50%+190px)] md:left-[calc(50%+200px)] top-[45%] md:top-[50%]"
             animate={{ y: [0, -18, 0], rotate: [0, 10, 0] }}
             transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           />
        </div>

        {/* Silhouettes - Static Background */}
        <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden px-8 md:px-24">
          
          {/* Crystal 3 Top Right (Truncated at Top) */}
          <div className="absolute top-[-20px] md:top-[-40px] right-12 md:right-40 hidden md:flex flex-col items-center pointer-events-none opacity-80">
            <img src="/crystal_3.webp" alt="Crystal 3" className="h-[75px] md:h-[120px] object-contain rotate-180" />
          </div>

          {/* Crystal 1 Bottom Left (Truncated at Bottom) */}
          <img src="/crystal_1.webp" alt="Crystal 1" className="absolute bottom-[-20px] md:bottom-[-30px] left-0 md:left-4 h-[80px] md:h-[130px] object-contain opacity-80 z-0 hidden md:block" />

          <div className="absolute bottom-0 left-12 md:left-40 hidden md:flex items-end">
            <img src="/grup.webp" alt="Group" className="relative z-10 h-[180px] md:h-[280px] object-contain translate-y-[2.5px] opacity-35" />
          </div>

          <div className="absolute bottom-0 right-4 md:right-10 opacity-50 hidden md:flex flex-col items-center pointer-events-none">
            {/* Magenta Tapakan (Base) - Wedge Shape from Sketch */}
            <div 
              className="absolute bottom-[-5px] right-[-20%] w-[150%] h-[140px] bg-gradient-to-r from-[#D946EF] to-[#FACC15] blur-[22px] z-0 opacity-80"
              style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%, 0 100%)" }}
            />
            <img src="/brio_black.webp" alt="Brio" className="relative z-10 h-[150px] md:h-[240px] object-contain translate-y-[2.5px]" />
          </div>
        </div>
      </section>

      {/* ── Section 3: About Us ── */}
      <section id="section-about" className="relative w-full h-[70vh] overflow-hidden bg-black flex items-center justify-center border-t border-slate-900 z-30">
        <AnimatePresence initial={false} custom={aboutIndex}>
          <motion.div key={aboutIndex} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0 w-full h-full">
            <img src={currentAboutImages[aboutIndex % currentAboutImages.length]} alt="About Us BG" className="w-full h-full object-cover opacity-70 grayscale md:grayscale-0" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050a14] via-[#050a14]/60 to-transparent z-[1]" />
            {/* Warm Peach & Gold & Magenta Master overlay on mobile */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/35 via-[#ffaa66]/30 to-[#ff00ff]/25 mix-blend-color md:hidden z-[2]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ff00ff]/20 via-[#ffaa66]/20 to-[#ffd700]/15 mix-blend-overlay md:hidden z-[3]" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 w-full max-w-6xl px-8 flex justify-center md:justify-start">
          <div className="flex flex-col items-center md:items-start gap-6 border-l-0 md:border-l-2 pl-0 md:pl-8">
            <h2 className="text-center md:text-left text-5xl md:text-7xl font-black uppercase tracking-tighter text-white">
              <Typewriter text="ABOUT US" mode="word" delay={3000} skipAnim={skipAnim} />
            </h2>
            <Link href="/about" onClick={() => {
              sessionStorage.setItem("landingScrollTarget", "section-about");
              sessionStorage.setItem("landingScrollY", window.scrollY);
            }}>
              <button
                className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
              >
                <span className="relative z-10">Get to Know More</span>
                <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 4: Merchandise / Support Us ── */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center py-20 z-40 border-t border-white/10 bg-transparent isolate overflow-hidden">
        {/* Golden Glow Border Aura - Aggressive */}
        <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_50px_rgba(251,191,36,0.7)] z-50 pointer-events-none" />
        
        {/* The Ultimate Background */}
        <SupportUsBackground />
        
        {/* Altar Border Element (Reversed 180, Truncated at Border) */}
        <div className="absolute top-[-60px] md:top-[-220px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-5 opacity-80">
          <img 
            src={isMobile ? "/hp/altar_hp.webp" : "/altar.webp"} 
            alt="Altar" 
            className={`h-[192px] md:h-[540px] object-contain drop-shadow-[0_10px_70px_rgba(255,255,255,0.05)] ${isMobile ? "" : "rotate-180"}`} 
          />
        </div>

        {/* Architectural Wall Backgrounds */}
        <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
          <img src="/wall_2.webp" alt="Wall 2" className="absolute bottom-0 right-0 h-[215px] md:h-[377px] object-contain opacity-90 brightness-110" />
          <img src="/wall_1.webp" alt="Wall 1" className="absolute bottom-0 left-[-2%] md:left-[9%] h-[175px] md:h-[304px] object-contain opacity-90 brightness-110" />
        </div>

        <FloatingSpareParts />

        <div className="relative z-10 mb-24 flex justify-center w-full">
           <motion.h2 
             className="relative text-6xl md:text-8xl font-black uppercase tracking-tighter text-transparent bg-clip-text"
             style={{ 
               backgroundColor: "white",
               backgroundImage: "linear-gradient(to bottom, #ffffff 20%, #fff5f0 50%, #ffccac 100%)",
               backgroundSize: "100% 200%",
               textShadow: "1px 1.5px 0px #e2e8f0, 2px 3px 0px #cbd5e1, 3px 4.5px 0px #94a3b8, 4px 6px 25px rgba(0,0,0,0.6)" 
             }}
             animate={{ backgroundPosition: ["0% 0%", "0% 100%", "0% 0%"] }}
             transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
           >
             <Typewriter text="SUPPORT US" mode="none" delay={6000} skipAnim={skipAnim} />
           </motion.h2>
        </div>

        <div className="relative z-10 w-full max-w-6xl px-4 mb-20 flex justify-center">
          <StarDust />
          <div className={`grid gap-8 justify-items-center w-full ${isMobile ? "grid-cols-1 max-w-[280px]" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"}`}>
            {(isMobile ? displayedMerch.slice(0, 1) : displayedMerch).map((item, idx) => (
              <MerchCard key={idx} item={item} isInitial={merchInitial} index={idx} isMobile={isMobile} />
            ))}
            {!displayedMerch.length && (
               <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl w-full">
                 <p className="font-mono text-slate-500 uppercase tracking-widest text-sm">Synchronizing Inventory...</p>
               </div>
            )}
          </div>
        </div>

        {/* Bush Footer Decoration (Colliding in Middle, Truncated at Border) */}
        <div className="absolute bottom-[-75px] md:bottom-[-125px] left-1/2 -translate-x-1/2 flex items-end justify-center pointer-events-none z-5 w-screen overflow-hidden opacity-90">
          <TropicalParticles />
          <img src="/bush_1.webp" alt="Bush 1" className="h-[180px] md:h-[320px] object-contain -mr-16 md:-mr-28 -translate-y-6 md:-translate-y-10" />
          <img src="/bush_2.webp" alt="Bush 2" className="h-[180px] md:h-[320px] object-contain -ml-16 md:-ml-28" />
        </div>

        {/* Marketplace Links */}
        <div className="relative z-20 flex gap-6 md:gap-16 items-center justify-center mb-24">
          <a href="#" className="flex flex-col items-center gap-4 group transition-transform hover:scale-105">
            <div className="relative w-32 md:w-64 h-[42px] md:h-[72px] block">
              <img src="/logo_tokpedgray.webp" alt="Tokopedia" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" draggable={false} />
              <img src="/logo_tokped.webp" alt="Tokopedia Colored" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(3,172,14,0.6)]" draggable={false} />
            </div>
            <span className="font-sans text-[12px] md:text-[17px] text-white font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center">Tokopedia - Kalceros</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-4 group transition-transform hover:scale-105">
            <div className="relative w-32 md:w-64 h-[42px] md:h-[72px] block">
              <img src="/logo_shopeegray.webp" alt="Shopee" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" draggable={false} />
              <img src="/logo_shopee.webp" alt="Shopee Colored" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(238,77,45,0.6)]" draggable={false} />
            </div>
            <span className="font-sans text-[12px] md:text-[17px] text-white font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center">Shopee - Kalcres</span>
          </a>
        </div>
      </section>

      {/* ── Section 5: Find More ── */}
      <section className="relative w-full min-h-[90vh] bg-[#050a14] flex flex-col items-center justify-center py-20 z-50 border-t border-slate-900 overflow-hidden">
        
        {/* Ambient Blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[30%] w-[30vw] h-[30vw] rounded-full blur-[120px] bg-[#00FFFF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[20%] right-[30%] w-[40vw] h-[40vw] rounded-full blur-[140px] bg-[#FF00FF]" />
        </div>

        {/* Prince Rupert's Drop Assembly */}
        <PrinceRupertDrop />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          
          {/* Left Column: Typography */}
          <div className="relative flex flex-col items-center md:items-start justify-center text-center md:text-left p-4 order-2 md:order-1">
            <GoldenDust />
            <div className="relative z-10">
              <motion.h2 
                animate={isMobile ? { opacity: 1 } : { opacity: [0.3, 1, 0.3] }}
                transition={isMobile ? { duration: 0 } : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-6 font-mono text-center md:text-left"
              >
                FIND MORE
              </motion.h2>
              <p className="font-sans text-gray-300 text-sm md:text-lg max-w-md text-center md:text-left leading-relaxed px-4 md:px-0">
                Wahib embut keren banget wowowowow. Kalceria is the ultimate destination for automotive euphoria.
              </p>

              {/* Social Media Icon List - Horizontal Style on Mobile */}
              <div className="flex flex-row md:flex-col gap-6 mt-8 items-center justify-center md:items-start w-full">
                {/* Instagram Icon */}
                <a 
                  href="https://www.instagram.com/kalceria/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex flex-col md:flex-row items-center gap-2 md:gap-4 group cursor-pointer"
                >
                  <div className={`relative shrink-0 flex items-center justify-center ${isMobile ? "w-10 h-10" : "w-8 md:w-10 h-8 md:h-10"}`}>
                    <img 
                      src="/ig_gray.webp" 
                      alt="Instagram" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0 scale-[1.4]" 
                      draggable={false}
                    />
                    <img 
                      src="/ig.webp" 
                      alt="Instagram Colored" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(225,48,108,0.3)] scale-[1.4]" 
                      draggable={false}
                    />
                  </div>
                  <span className={`font-sans text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center ${isMobile ? "text-[13px]" : "text-[11px] md:text-sm"}`}>
                    Instagram - kalceria
                  </span>
                </a>

                {/* TikTok Icon */}
                <a 
                  href="https://www.tiktok.com/@gallerykalceria" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex flex-col md:flex-row items-center gap-2 md:gap-4 group cursor-pointer"
                >
                  <div className={`relative shrink-0 ${isMobile ? "w-10 h-10" : "w-8 md:w-10 h-8 md:h-10"}`}>
                    <img 
                      src="/tiktok_gray.webp" 
                      alt="TikTok" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" 
                      draggable={false}
                    />
                    <img 
                      src="/tiktok.webp" 
                      alt="TikTok Colored" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                      draggable={false}
                    />
                  </div>
                  <span className={`font-sans text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center ${isMobile ? "text-[13px]" : "text-[11px] md:text-sm"}`}>
                    tiktok kalceria
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: TikTok Feed Container */}
          <div className="relative flex items-center justify-center md:justify-start ml-0 md:-ml-[20%] py-10 order-1 md:order-2 w-full">
            <GoldenDust />
            {/* Clean, minimalist video container (shrunk 20% on mobile) */}
            <div className={`relative w-full ${isMobile ? "max-w-[210px] aspect-[9/16]" : "max-w-[289px] aspect-[340/680]"} group z-10 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl`}>
              <FindMoreSlider />
            </div>
          </div>

        </div>

        {/* Floating Mobile Mascot Background */}
        {isMobile && (
          <motion.div 
            animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[5%] right-[25%] w-96 h-auto opacity-90 pointer-events-none z-[1]"
          >
            <img src="/hp/kalcer_man_hp.webp" alt="Kalcer Mascot HP" className="w-full h-auto object-contain" />
          </motion.div>
        )}

        {/* Looping 8-Bit Mascot (Fixed Corner Position) */}
        <div className="hidden md:block absolute bottom-0 right-0 w-56 md:w-80 z-20 pointer-events-none">
          {/* Hat placed above the head */}
          <img 
            src="/kalcer_hat.webp" 
            alt="Kalcer Hat" 
            className="absolute top-[-30%] left-1/2 -translate-x-[56%] w-[185%] h-auto z-30 drop-shadow-[0_15px_10px_rgba(0,0,0,0.5)]"
          />
          
          <img 
            src={mascotFrame === 1 ? "/kalcer_man.webp" : "/kalcer_man2.webp"} 
            alt="Kalcer Mascot" 
            className="relative z-10 w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(255,0,255,0.3)]"
          />

          {/* Static Favicon Overlay to cover Gemini Logo in the absolute corner */}
          <img
            src="/favicon.webp"
            alt="Favicon"
            className="absolute bottom-1 right-1 w-6 md:w-8 h-auto z-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          />
        </div>
      </section>

      {/* ── Section 6: Need Help? ── */}
      <section className="relative w-full min-h-[107vh] bg-white flex flex-col items-center justify-center py-32 z-50 overflow-hidden">
        
        {/* Solid Section Divider */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#050a14] z-[70]" />

        {/* Layer 1: Subtle geometry background (Dark dots for white base) */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none z-0">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
        </div>

        {/* Dynamic Aggressive Blobs (Magenta & Gold) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1], 
              x: ["-15%", "25%", "-15%"], 
              y: ["-10%", "15%", "-10%"]
            }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-0 left-0 w-[70vw] h-[70vw] rounded-full blur-[140px] bg-[#D946EF] opacity-40 mix-blend-multiply" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1.6, 1.2], 
              x: ["20%", "-20%", "20%"], 
              y: ["20%", "-5%", "20%"]
            }} 
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
            className="absolute bottom-0 right-0 w-[65vw] h-[65vw] rounded-full blur-[150px] bg-[#FACC15] opacity-40 mix-blend-multiply" 
          />
        </div>

        {/* Layer 2: Rolling Film Rolls (Strict Global Layering to prevent any cutting) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Bottom Layer: All White Lanes */}
          <div className="absolute inset-0 z-10">
            <FilmLane rotation={15} top="15%" left="-10%" />
            <FilmLane rotation={-3} top="48%" left="-10%" />
            <FilmLane rotation={6} top="75%" left="-10%" />
            <FilmLane rotation={-55} top="100%" left="15%" height="h-20 md:h-32" />
          </div>

          {/* Top Layer: All Scrolling Film Strips */}
          <div className="absolute inset-0 z-20">
            <FilmStrip rotation={15} top="15%" left="-10%" speed={50} />
            <FilmStrip rotation={-3} top="48%" left="-10%" speed={60} />
            <FilmStrip rotation={6} top="75%" left="-10%" speed={45} />
            <FilmStrip rotation={-55} top="100%" left="15%" speed={55} height="h-20 md:h-32" />
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 flex flex-col items-center justify-center w-full h-full"
        >
          {/* Shrunk square box, centered perfectly with Moto photographers (Dark translucent for white bg) */}
          <div className="relative bg-black/[0.08] border border-black/10 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 aspect-square w-full max-w-[290px] md:max-w-[420px] flex flex-col items-center justify-center shadow-[0_40px_100px_rgba(0,0,0,0.1)]">
             
             {/* Moto Figures: Locked tightly to box edges using wrappers for perfect alignment */}
             
             {/* TOP (Normal, 0deg) */}
             <div className="hidden md:block absolute inset-0 pointer-events-none z-20">
               <motion.img 
                 src="/moto_1.webp" 
                 alt="Moto 1"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* Mobile Cokineed HP on top of the box in the middle top */}
             {isMobile && (
               <div className="absolute inset-0 pointer-events-none z-20">
                 <motion.img 
                   src="/hp/cokineed_hp.webp" 
                   alt="Cokineed HP" 
                   animate={{ rotate: [-6, 6, -6], y: [0, -4, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute bottom-full left-1/2 -translate-x-1/2 w-28 h-auto object-contain origin-bottom select-none"
                   draggable={false}
                 />
               </div>
             )}

             {/* RIGHT (90deg) */}
             <div className="hidden md:block absolute inset-0 rotate-90 pointer-events-none z-20">
               <motion.img 
                 src="/moto_2.webp" 
                 alt="Moto 2"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* BOTTOM (180deg) */}
             <div className="hidden md:block absolute inset-0 rotate-180 pointer-events-none z-20">
               <motion.img 
                 src="/moto_3.webp" 
                 alt="Moto 3"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-44 md:h-60 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* LEFT (-90deg) */}
             <div className="hidden md:block absolute inset-0 -rotate-90 pointer-events-none z-20">
               <motion.img 
                 src="/moto_4.webp" 
                 alt="Moto 4"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white mb-8 md:mb-10 text-center leading-none" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
               Need Our Help?
             </h2>
             
             <motion.button
               onClick={() => setShowServiceModal(true)}
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="relative px-8 md:px-12 py-3 md:py-4 font-sans font-black uppercase tracking-tighter text-sm md:text-base text-black bg-white group cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.2)]"
               style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
             >
               <span className="relative z-10">APPLY A REQUEST</span>
               <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
             </motion.button>
          </div>
        </motion.div>

        {isMobile && (
          <div className="absolute bottom-0 left-0 w-full h-48 pointer-events-none z-30 overflow-visible">
            {/* Camera HP: Centered at the middle bottom and scaled 75% bigger */}
            <img 
              src="/hp/camera_hp.webp" 
              alt="Camera HP" 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[196px] h-auto object-contain select-none translate-y-[2px]" 
              draggable={false}
            />
          </div>
        )}
      </section>

      {/* ── Section 7: Big Square Concept ── */}
      <section id="section-map" className="relative w-full aspect-square bg-[#0c1528] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900">
        {/* Background Blobs (Cyan, Magenta, Gold) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
          <motion.div 
            animate={{ scale: [1, 1.25, 1], x: ["-15%", "15%", "-15%"], y: ["-10%", "10%", "-10%"] }} 
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-0 left-0 w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#00FFFF]" 
          />
          <motion.div 
            animate={{ scale: [1.1, 1.35, 1.1], x: ["15%", "-15%", "15%"], y: ["10%", "-10%", "10%"] }} 
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
            className="absolute bottom-0 right-0 w-[65vw] h-[65vw] rounded-full blur-[150px] bg-[#D946EF]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.4, 1], x: ["0%", "10%", "0%"], y: ["20%", "-20%", "20%"] }} 
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }} 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] rounded-full blur-[160px] bg-[#FACC15]" 
          />
        </div>

        {/* Earthman on mobile - sits at z-[3], behind particles (z-[4]) and asteroids (z-10 container wrapper) */}
        {isMobile && (
          <motion.img 
            src="/hp/earthman_hp.webp" 
            alt="Earthman" 
            className="absolute bottom-[-1%] h-[105%] xs:h-[115%] object-contain z-[3] pointer-events-none"
            initial={{ y: 60, opacity: 0, rotate: 0, scale: 1 }}
            whileInView={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}

        <SolarPhoenix isMobile={isMobile} />

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {/* Earth - Core Centerpiece */}
          {!isMobile && (
            <motion.img 
              src="/earth.webp" 
              alt="Earth" 
              className="absolute h-[30%] md:h-[40%] object-contain opacity-90 z-0 drop-shadow-[0_0_50px_rgba(0,255,255,0.2)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Find The Others Button */}
          <motion.button
            onClick={() => {
              sessionStorage.setItem("landingScrollTarget", "section-map");
              sessionStorage.setItem("landingScrollY", window.scrollY);
              window.location.href = "/map";
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 40px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.2)",
              backgroundColor: "rgba(255,255,255,0.15)"
            }}
            whileTap={{ scale: 0.95 }}
            className="absolute z-30 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-black uppercase tracking-tighter text-xl md:text-3xl px-8 py-4 md:px-12 md:py-5 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors duration-300"
          >
            {/* Peach Blob */}
            <motion.div 
              animate={{ x: [0, 30, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 -left-4 w-24 h-24 bg-[#FFB07C] rounded-full blur-[24px] opacity-70 z-0 pointer-events-none"
            />
            {/* Green Blob */}
            <motion.div 
              animate={{ x: [0, -30, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -right-4 w-24 h-24 bg-green-400 rounded-full blur-[24px] opacity-60 z-0 pointer-events-none"
            />
            
            <span 
              className="relative z-10"
              style={{
                textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)"
              }}
            >
              FIND THE OTHERS !
            </span>
          </motion.button>

          {/* Earthman - Desktop Hero Figure at Bottom */}
          {!isMobile && (
            <motion.img 
              src="/earthman.webp" 
              alt="Earthman" 
              className="absolute bottom-[-4%] h-[40%] md:h-[54%] object-contain z-20 pointer-events-none"
              initial={{ y: 60, opacity: 0, rotate: 0, scale: 1 }}
              whileInView={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}

          {/* Asteroid Field - Grouped Clusters */}
          {[
            // Cluster 1: Top Left (2x A1, 1x A2)
            { id: 1, src: '/asteroid_1.webp', top: '5%', left: '5%', size: '42px', delay: 0, rot: 45 },
            { id: 2, src: '/asteroid_1.webp', top: '15%', left: '18%', size: '49px', delay: 1.2, rot: -30 },
            { id: 3, src: '/asteroid_2.webp', top: '22%', left: '8%', size: '31px', delay: 2.5, rot: 115 },
            
            // Cluster 2: Top Right (2x A1, 2x A2)
            { id: 4, src: '/asteroid_1.webp', top: '10%', right: '10%', size: '55px', delay: 0.8, rot: -80 },
            { id: 14, src: '/asteroid_1.webp', top: '3%', right: '22%', size: '38px', delay: 1.4, rot: 25 },
            { id: 5, src: '/asteroid_2.webp', top: '18%', right: '15%', size: '28px', delay: 1.8, rot: 12 },
            { id: 10, src: '/asteroid_2.webp', top: '5%', right: '30%', size: '34px', delay: 0.9, rot: 55 },
            
            // Cluster 3: Bottom Left (2x A1, 2x A2)
            { id: 6, src: '/asteroid_1.webp', bottom: '18%', left: '10%', size: '35px', delay: 3.2, rot: 155 },
            { id: 15, src: '/asteroid_1.webp', bottom: '5%', left: '22%', size: '44px', delay: 0.5, rot: -60 },
            { id: 7, src: '/asteroid_2.webp', bottom: '25%', left: '5%', size: '44px', delay: 0.4, rot: -40 },
            { id: 12, src: '/asteroid_2.webp', bottom: '12%', left: '28%', size: '24px', delay: 3.5, rot: 190 },
            
            // Cluster 4: Bottom Right (2x A1, 3x A2)
            { id: 8, src: '/asteroid_1.webp', bottom: '22%', right: '10%', size: '52px', delay: 1.5, rot: 100 },
            { id: 16, src: '/asteroid_1.webp', bottom: '30%', right: '25%', size: '39px', delay: 2.2, rot: 10 },
            { id: 9, src: '/asteroid_2.webp', bottom: '35%', right: '12%', size: '37px', delay: 2.8, rot: -120 },
            { id: 11, src: '/asteroid_2.webp', bottom: '10%', right: '32%', size: '43px', delay: 2.1, rot: -20 },
            { id: 13, src: '/asteroid_2.webp', bottom: '5%', right: '40%', size: '49px', delay: 0.6, rot: -10 }
          ].map((ast) => (
            <motion.img
              key={ast.id}
              src={ast.src}
              alt="Asteroid"
              className="absolute pointer-events-none opacity-60 z-[5]"
              style={{ 
                top: ast.top, 
                left: ast.left, 
                right: ast.right, 
                bottom: ast.bottom, 
                width: ast.size
              }}
              animate={{ 
                y: [0, -12, 0],
                rotate: [ast.rot - 15, ast.rot + 15, ast.rot - 15]
              }}
              transition={{ 
                duration: 6 + (ast.id % 4), 
                repeat: Infinity, 
                ease: "easeInOut", 
                delay: ast.delay 
              }}
            />
          ))}

          {/* Floating Clouds Assembly */}
          {!isMobile && (
            <>
              {/* Left Cloud: awan_3 - Now fully opaque */}
              <motion.img 
                src="/awan_3.webp" 
                alt="Cloud Left"
                className="absolute left-[23%] bottom-[27%] h-[103px] md:h-[184px] object-contain opacity-100 z-30 pointer-events-none"
                animate={{ 
                  y: [0, -15, 0], 
                  rotate: [-37, -33, -37],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Right Top Cloud: awan_1 - Duplicated awan_2 but in awan_1 position */}
              <motion.img 
                src="/awan_2.webp" 
                alt="Cloud Right Top"
                className="absolute right-[28%] top-[27%] h-[76px] md:h-[131px] object-contain opacity-100 z-30 pointer-events-none"
                animate={{ 
                  y: [0, -12, 0], 
                  rotate: [1, -3, 1],
                  scale: [1, 1.08, 1]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />

              {/* Right Middle Cloud: awan_2 - 2% lefter */}
              <motion.img 
                src="/awan_2.webp" 
                alt="Cloud Right Middle"
                className="absolute right-[21%] bottom-[33%] h-[66px] md:h-[121px] object-contain opacity-100 z-30 pointer-events-none"
                animate={{ 
                  y: [0, -20, 0], 
                  rotate: [-1, 1, -1],
                  scale: [1, 1.03, 1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Section 8: Final Scene / Tokyo Nights ── */}
      <section id="section-journey" className="relative w-full min-h-[75vh] flex flex-col items-center justify-center py-20 z-50 border-t border-slate-900 overflow-hidden bg-black isolation-auto">
        {/* Tokyo Night Background - ABSOLUTE BACK */}
        <img src="/bg_tokyo.webp" alt="Tokyo Night" className="absolute inset-0 w-full h-full object-cover opacity-50 z-[-2] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a14] via-transparent to-[#050a14] z-[-2] pointer-events-none" />
        
        {/* Battle Glows (Anakin vs Obi-Wan Vibe) - BEHIND LOGOS */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           {/* Red Dynamic Glow (Left / Kalceria) */}
           <motion.div 
             animate={{ opacity: [0.3, 0.5, 0.3] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-[-10%] left-[-15%] w-[60%] h-[120%] bg-red-600/30 blur-[130px] rounded-full will-change-transform"
           />
           {/* Cyan Dynamic Glow (Right / DSL) */}
           <motion.div 
             animate={{ opacity: [0.3, 0.5, 0.3] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
             className="absolute top-[-10%] right-[-15%] w-[60%] h-[120%] bg-cyan-500/30 blur-[130px] rounded-full will-change-transform"
           />
        </div>

        {/* Static Star Wars Backdrop Focal Point */}
        <div 
          className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-full flex items-center justify-center z-[5] pointer-events-none"
          style={{ opacity: 0.7 }}
        >
          <img 
            src="/starwarr.webp" 
            alt="Battle of Heroes" 
            className={`w-full h-auto max-h-[85vh] object-contain ${isMobile ? "scale-[1.12]" : "scale-[1.82]"}`}
            style={{ 
              filter: "contrast(1.2) brightness(0.9) saturate(1.1) drop-shadow(0 0 80px rgba(0,0,0,0.8))",
            }}
          />
        </div>

        {/* Scattered Aurora Effect - TOP ATMOSPHERE */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          <AuroraParticles />
        </div>
        
        <div className="relative z-10 w-full max-w-6xl px-8 flex flex-col items-center gap-16">
           {/* Collaboration Header - Shifted 15% Under */}
           <div 
             className="flex items-center justify-center gap-6 md:gap-10"
             style={{ transform: `translateY(${isMobile ? "35%" : "15%"})` }}
           >
              {/* Kalceria Logo - Shifted 15% Under */}
              <motion.img 
                src="/logologin.webp" 
                alt="Kalceria" 
                className={`${isMobile ? "h-[58px]" : "h-18 md:h-24"} w-auto object-contain -rotate-[12deg] drop-shadow-[0_0_40px_rgba(255,0,0,0.6)] z-20 will-change-transform`}
                animate={{ y: isMobile ? [75, 69, 75] : [75, 69, 75], x: '20%' }}
                transition={{ 
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.8 }
                }}
              />

              {/* The "X" as an SVG Clipped Glass Artifact (Stabilized) */}
              <div 
                className="relative flex items-center justify-center group z-20"
                style={{ transform: `translateY(${isMobile ? "30%" : "0%"})` }}
              >
                 {/* X-Backglow */}
                 <div className="absolute inset-0 bg-white/10 blur-[40px] rounded-full scale-110 opacity-30 pointer-events-none" />

                 {/* Golden-Red Corona Dynamic Flare */}
                 <motion.div 
                   animate={{ scale: [1, 1.1, 1], rotate: [0, 360], opacity: [0.2, 0.4, 0.2] }}
                   transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                   className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] bg-gradient-to-tr from-amber-500 via-orange-600 to-red-700 opacity-40 z-0 will-change-transform ${isMobile ? "w-[144px] h-[144px]" : "w-[240px] md:w-[340px] h-[240px] md:h-[340px]"}`}
                 />

                 <svg width={isMobile ? "132" : "220"} height={isMobile ? "132" : "220"} viewBox="0 0 220 220" className="relative z-10 transform-gpu">
                    <defs>
                      <clipPath id="collab-x-clip-v3">
                        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize="160" fontWeight="950" style={{ fontFamily: 'Arial Black, sans-serif' }}>X</text>
                      </clipPath>
                    </defs>
                    
                    <g clipPath="url(#collab-x-clip-v3)">
                       {/* Glass Fill */}
                       <rect width="100%" height="100%" fill="rgba(255,255,255,0.18)" />
                       
                       {/* Internal Energy Blobs */}
                       <motion.circle 
                         animate={{ cx: [30, 190], cy: [30, 190], r: [45, 75, 45] }}
                         transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                         fill="#FF00FF" style={{ filter: 'blur(35px)', opacity: 0.9 }}
                         className="will-change-[cx,cy]"
                       />
                       <motion.circle 
                         animate={{ cx: [190, 30], cy: [190, 30], r: [75, 45, 75] }}
                         transition={{ duration: 7, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                         fill="#FFD700" style={{ filter: 'blur(35px)', opacity: 0.9 }}
                         className="will-change-[cx,cy]"
                       />
                    </g>
                    
                    {/* HD Stroke */}
                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize="160" fontWeight="950" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" style={{ fontFamily: 'Arial Black, sans-serif' }}>X</text>
                 </svg>
              </div>

              {/* DSL Logo - Shifted 15% Under */}
              <motion.img 
                src="/dsl.webp" 
                alt="DSL" 
                className={`${isMobile ? "h-[58px]" : "h-18 md:h-24"} w-auto object-contain rotate-[12deg] drop-shadow-[0_0_40px_rgba(0,255,255,0.6)] z-20 will-change-transform`}
                animate={{ y: isMobile ? [64, 70, 64] : [69, 75, 69], x: '-20%' }}
                transition={{ 
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.8 }
                }}
              />
           </div>
           
           <div className="flex flex-col items-center gap-8">
              <motion.h2 
                initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, x: '4%', scale: 0.85, filter: "blur(0px)" }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white text-center"
                style={{ 
                  textShadow: "2px 2px 0px #444, 4px 4px 0px #222, 0 0 30px rgba(255,255,255,0.2)"
                }}
              >
                JOIN US?
              </motion.h2>

              <motion.img 
                src="/wa_logo.webp" 
                alt="WhatsApp" 
                className="h-16 md:h-28 w-auto object-contain drop-shadow-[0_0_40px_rgba(37,211,102,0.5)] z-20"
                animate={{ y: [0, -6, 0], x: '22%' }}
                transition={{ 
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.8 }
                }}
              />

              <Link href="/journey" onClick={() => {
                sessionStorage.setItem("landingScrollTarget", "section-journey");
                sessionStorage.setItem("landingScrollY", window.scrollY);
              }}>
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 40px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(255,255,255,0.15)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="relative mt-4 ml-6 md:ml-10 z-30 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-black uppercase tracking-tighter text-xl md:text-3xl px-8 py-4 md:px-12 md:py-5 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors duration-300"
                >
                  {/* Peach Blob */}
                  <motion.div 
                    animate={{ x: [0, 30, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-8 -left-4 w-24 h-24 bg-[#FFB07C] rounded-full blur-[24px] opacity-70 z-0 pointer-events-none"
                  />
                  {/* Green Blob */}
                  <motion.div 
                    animate={{ x: [0, -30, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-8 -right-4 w-24 h-24 bg-green-400 rounded-full blur-[24px] opacity-60 z-0 pointer-events-none"
                  />
                  
                  <span 
                    className="relative z-10 whitespace-nowrap"
                    style={{
                      textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)"
                    }}
                  >
                    SEE THE JOURNEY
                  </span>
                </motion.button>
              </Link>
           </div>
        </div>
      </section>

      {/* ── Section 9: The Legacy ── */}
      <section id="section-minigame" className="relative w-full aspect-square bg-[#02040a] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900">
        {/* Background Atmosphere - Simplified Astral Divine (Lightweight) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           {/* Cyan Core Glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full blur-[160px] bg-cyan-950/40" />
           {/* Magenta Bloom */}
           <div className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[180px] bg-purple-950/30" />
           {/* Blue Sweep */}
           <div className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[180px] bg-blue-950/20" />
        </div>

        {isMobile && (
          <img 
            src="/hp/bg_astro_hp.webp" 
            alt="Astronaut Background Mobile" 
            className="absolute inset-0 w-full h-full object-cover z-[1] opacity-70 pointer-events-none"
          />
        )}

        {/* Dynamic Comet Effect - Replacing Portal */}
        <CometEffect />
 
        {/* Community Quotes - Floating Text (Ahead of Astronaut Layer) */}
        <div className="absolute inset-0 z-[40] pointer-events-none">
          <CommunityQuotes isMobile={isMobile} />
        </div>
 
        {/* Night Background at Bottom */}
        {!isMobile && (
          <img 
            src="/night.webp" 
            alt="Night Sky" 
            className="absolute bottom-0 left-0 w-full h-auto object-cover z-[10] opacity-90"
            style={{ maskImage: "linear-gradient(to top, black 80%, transparent)" }}
          />
        )}
        
        {/* Astronaut - Semi-transparent, Massive and Lowered, Behind Night */}
        {!isMobile && (
          <img 
            src="/astronaut.webp" 
            alt="Astronaut" 
            className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[105%] h-auto object-contain z-[5] opacity-40 mix-blend-screen pointer-events-none" 
          />
        )}

        {/* Micro Particles - Layered Higher than Night */}
        <div className="absolute inset-0 z-[20]">
          <GeminiSparkParticles />
        </div>

        {/* Floating Car & Sticker Assets - Concentrated near Center */}
        <FloatingAssets isMobile={isMobile} />

        <div 
          className="relative z-30 flex flex-col items-center text-center gap-12"
          style={{ transform: `translateY(${isMobile ? "120%" : "0%"})` }}
        >
          {isMobile && (
            <motion.img 
              src="/hp/astronaut_hp.webp" 
              alt="Astronaut Mobile" 
              className="absolute bottom-[135%] left-1/2 -translate-x-1/2 w-[420px] h-auto object-contain z-10 pointer-events-none"
              animate={{ y: [-15, 15, -15] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          <motion.div
             initial={{ opacity: 0, y: 30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
           >
             <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-white"
                 style={{ 
                   textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 0px #555, 5px 5px 20px rgba(0,0,0,0.8)",
                   filter: "drop-shadow(0 0 15px rgba(255,255,255,0.2))"
                 }}>
               Make Us Better !
             </h2>
           </motion.div>

           {/* The Box - Clean Rounded Rectangle, Hover Only Affects Rectangle */}
           <motion.button
             onClick={() => setShowIdeaModal(true)}
             whileTap={{ scale: 0.95 }}
             className="relative group cursor-pointer z-40 focus:outline-none"
           >
              <div className="relative w-48 md:w-[240px] py-4 md:py-6 bg-white/8 backdrop-blur-3xl border border-white/15 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] group-hover:bg-white/12 group-hover:border-white/25 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-500 flex items-center justify-center">
                {/* Glassmorphism Blobs - always visible, subtle */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                   <motion.div 
                     animate={{ x: [-10, 30, -10], y: [-10, 10, -10], scale: [1, 1.2, 1] }}
                     transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute -top-4 -left-4 w-24 h-24 bg-[#00FFFF] rounded-full blur-[30px]" 
                   />
                   <motion.div 
                     animate={{ x: [10, -30, 10], y: [10, -10, 10], scale: [1.2, 1, 1.2] }}
                     transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                     className="absolute -bottom-4 -right-4 w-28 h-28 bg-[#D946EF] rounded-full blur-[40px]" 
                   />
                </div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <span className="font-sans font-black text-white uppercase tracking-widest text-lg md:text-xl text-center px-4">
                    Leave it here
                  </span>
                </div>
              </div>
            </motion.button>
          </div>
          <DungeonGate />
        </section>

      <AnimatePresence>
        {showServiceModal && (
          <ServiceRequestModal onClose={() => setShowServiceModal(false)} />
        )}
        {showLogoutConfirm && (
          <LogoutConfirmModal 
            onConfirm={handleLogout} 
            onCancel={() => setShowLogoutConfirm(false)} 
          />
        )}
        {showIdeaModal && (
          <IdeaCommentModal onClose={() => setShowIdeaModal(false)} />
        )}
      </AnimatePresence>

    </motion.div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────
function LineParticles() {
  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];
  const particles = useMemo(() => Array.from({ length: 25 }).map(() => ({
    x: Math.random() * 20,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 5 + 2,
    duration: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 5,
    xDrift: 20 + Math.random() * 60,
    yDrift: (Math.random() - 0.5) * 120
  })), []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 pointer-events-none overflow-visible"
    >
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}px`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}`
          }}
          animate={{
            x: [0, p.xDrift],
            y: [0, p.yDrift],
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            ease: "circOut", 
            delay: p.delay 
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── Logout Confirmation Modal ───────────────────────────────────────────────
function LogoutConfirmModal({ onConfirm, onCancel }) {
  const [catFrame, setCatFrame] = useState(1);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let interval;
    if (isLoggingOut) {
      // Auto-refresh after exactly 1s (Faster)
      const timer = setTimeout(() => {
        onConfirm();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Normal toggling cats every 1s
      interval = setInterval(() => {
        setCatFrame(prev => (prev === 1 ? 2 : 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoggingOut, onConfirm]);

  const handleYes = () => {
    setIsLoggingOut(true);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Background Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isLoggingOut ? onCancel : undefined}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <AnimatePresence mode="wait">
        {!isLoggingOut ? (
          <motion.div
            key="confirm-box"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative w-full max-w-[450px] rounded-[30px] overflow-visible border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.6)]"
          >
            {/* Cat Mascot Area */}
            <div className="absolute bottom-[100%] left-1/2 -translate-x-[55%] w-32 h-32 z-50 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 1, 0.5, 1], // Entry then start pulse
                  boxShadow: [
                    "0 0 15px #fff, 0 0 30px #D946EF, 0 0 45px #FACC15",
                    "0 0 25px #fff, 0 0 50px #D946EF, 0 0 75px #FACC15",
                    "0 0 15px #fff, 0 0 30px #D946EF, 0 0 45px #FACC15"
                  ]
                }}
                transition={{ 
                  opacity: { duration: 0.8, times: [0, 0.2, 0.6, 1], delay: 0.2 },
                  boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute left-[1%] top-[0%] bottom-0 w-[10px] bg-white z-30" 
              >
                <LineParticles />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="w-full h-full"
              >
                <img
                  src={`/kucing${catFrame}.webp`}
                  alt="Cat"
                  className="w-full h-full object-contain object-bottom drop-shadow-[0_10px_20px_rgba(255,255,255,0.2)] z-10"
                />
              </motion.div>
            </div>

            {/* Modal Card Content */}
            <div className="relative bg-[#0c1528]/90 backdrop-blur-2xl rounded-[30px] p-10 flex flex-col items-center text-center">
              <motion.div
                animate={{ x: [-20, 20], opacity: [0.1, 0.2] }}
                transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
                className="absolute -top-20 -left-20 w-64 h-64 bg-red-600 rounded-full blur-[80px] pointer-events-none"
              />
              <h3 className="relative z-10 font-sans text-2xl font-black text-white uppercase tracking-tight mt-4 mb-12">
                You sure want to <span className="text-red-500">Log -Out?</span>
              </h3>
              <div className="relative z-10 flex gap-6 w-full">
                <button onClick={handleYes} className="flex-1 group relative py-4 rounded-[18px] overflow-hidden border border-white/5 transition-all">
                  <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-emerald-500/20" />
                  <span className="relative z-10 font-sans font-black text-emerald-500 uppercase tracking-widest text-sm">YES</span>
                </button>
                <button onClick={onCancel} className="flex-1 group relative py-4 rounded-[18px] overflow-hidden border border-white/5 transition-all">
                  <div className="absolute inset-0 bg-red-500/10 group-hover:bg-red-500/20" />
                  <span className="relative z-10 font-sans font-black text-red-500 uppercase tracking-widest text-sm">NO</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logout-loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center z-[1000]"
          >
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="4" 
                    strokeDasharray="70 200" 
                    strokeLinecap="round"
                    className="opacity-90 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
                </svg>
              </div>
            </div>
            <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg opacity-80">
              LOGGING OUT
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Comet Effect ────────────────────────────────────────────────────────
function CometEffect() {
  const [comets, setComets] = useState([]);

  useEffect(() => {
    const spawnComet = () => {
      const id = Math.random();
      const isLeft = Math.random() > 0.5;
      const startX = isLeft ? -20 : 120;
      const startY = Math.random() * 30;
      const endX = 20 + Math.random() * 60;
      const endY = 110;
      
      const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

      setComets(prev => [...prev, { id, startX, startY, endX, endY, angle }]);
      
      setTimeout(() => {
        setComets(prev => prev.filter(c => c.id !== id));
      }, 1000);

      setTimeout(spawnComet, 1500 + Math.random() * 1000);
    };

    spawnComet();
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

// ─── Floating Assets (Cars & Stickers) ──────────────────────────────────
function FloatingAssets({ isMobile }) {
  const assets = useMemo(() => {
    const assetDefinitions = [
      // ccar_1 & ccar_2 shifted more left
      ...(!isMobile ? [
        { src: '/ccar_1.webp', x: 5, y: 18, w: "w-32 md:w-56", rot: -35, dX: 60, dY: 45, rS: 55 },
        { src: '/ccar_2.webp', x: 8, y: 62, w: "w-24 md:w-36", rot: 45, dX: -70, dY: -65, rS: -60 },
      ] : []),
      { src: '/ccar_3.webp', x: isMobile ? 70 : 85, y: isMobile ? 3 : 18, w: isMobile ? "w-[153px] md:w-56" : "w-32 md:w-56", rot: 25, dX: -40, dY: 35, rS: 35 },
      { src: '/ccar_4.webp', x: isMobile ? 67 : 82, y: isMobile ? 47 : 62, w: isMobile ? "w-[115px] md:w-36" : "w-24 md:w-36", rot: -15, dX: 35, dY: -35, rS: -45 },
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

// ─── Community Quotes ──────────────────────────────────────────────────
function CommunityQuotes({ isMobile }) {
  const quotes = [
    "Kak mau photoo!", "Woi Wahib mana woi!", "Kak mau colabbb", 
    "Coki ganteng, no gay tho", "Otniel jelek wleee", "Aku mau Kalceria menjadi....",
    "Tolong diet lagi ya mas", "Kak main UMINGLE yuk!", "Cok, lagi dimana, sama siapa?",
    "Keren bangetttt!!", "GG, Speechless"
  ];

  // Two bands: above heading (25-40% Y) and below button (68-80% Y)
  // Horizontal constrained to 32-68% to stay clear of corner cars
  const floatingQuotes = useMemo(() => {
    // If mobile, slice quotes list to spawn 30% less items (ceil(11 * 0.7) = 8 quotes)
    const activeList = isMobile ? quotes.slice(0, Math.ceil(quotes.length * 0.7)) : quotes;

    return activeList.map((text, i) => {
      const inUpperBand = i % 2 === 0;
      return {
        id: i,
        text,
        left: `${32 + Math.random() * 36}%`,
        top: inUpperBand ? `${25 + Math.random() * 15}%` : `${68 + Math.random() * 12}%`,
        delay: i * (isMobile ? 5 : 3.5) + Math.random() * 2, // 30% slower delays
        duration: (8 + Math.random() * 8) * (isMobile ? 1.3 : 1), // 30% longer duration for calmer speed
        xDrift: (Math.random() - 0.5) * 40,  // small drift to stay in zone
        yDrift: (Math.random() - 0.5) * 30,
        rotate: (Math.random() - 0.5) * 20,
        fontSize: isMobile ? (Math.random() * 6 + 10) : (Math.random() * 8 + 13), // slightly smaller text for mobile elegance
        bold: Math.random() > 0.5,
        italic: Math.random() > 0.4,
        under: Math.random() > 0.7,
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
            repeatDelay: isMobile ? (15 + Math.random() * 10) * 1.5 : (15 + Math.random() * 10), // 50% longer wait time on mobile to reduce density
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

// ─── Gemini Spark Particles (Rounded Blue/Golden/Magenta Micro-Particles) ────
function GeminiSparkParticles() {
  const particles = useMemo(() => Array.from({ length: 60 }).map((_, i) => {
    const r = Math.random();
    let color = '#60A5FA'; 
    if (r > 0.8) color = '#FBBF24';
    else if (r > 0.6) color = '#D946EF';
    else if (r > 0.3) color = '#38BDF8';

    return {
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1, 
      color,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 5,
      xDrift: (Math.random() - 0.5) * 60,
      yDrift: (Math.random() - 0.5) * 60,
    };
  }), []);

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

// ─── Idea / Advice Comment Modal ─────────────────────────────────────────────
function IdeaCommentModal({ onClose }) {
  const [step, setStep] = useState(0); // 0=Choice, 1=Identity, 2=Category, 3=Content, 4=done
  const [mainType, setMainType] = useState(null); 
  const [identity, setIdentity] = useState("Anonymous");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [userFound, setUserFound] = useState(false);
  const [error, setError] = useState("");
  const [ideaType, setIdeaType] = useState(null); 
  const [adviceText, setAdviceText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [showFinalBuffer, setShowFinalBuffer] = useState(false);

  // Typewriter for success screen
  useEffect(() => {
    if (step !== 4) return;
    const msg = "Successfully Submitted!";
    let i = 0;
    setSuccessText("");
    // ~130ms interval * 23 chars = ~3 seconds. To get 4-5s, let's use 180ms.
    const iv = setInterval(() => {
      setSuccessText(msg.slice(0, i + 1));
      i++;
      if (i >= msg.length) {
        clearInterval(iv);
        // Blur out immediately after typing (small delay for legibility)
        setTimeout(onClose, 800);
      }
    }, 180);
    return () => clearInterval(iv);
  }, [step]);

  const checkUser = async () => {
    setError("");
    if (!username) return;
    setIsVerifying(true);
    try {
      const res = await api.get(`/auth/check-username/${username}`);
      if (res.data.exists) {
        setUserFound(true);
        // If already logged in, we can proceed
        const token = localStorage.getItem("token");
        if (token) {
          setStep(2);
        }
      }
    } catch (err) {
      setError("User not found");
      setUsername("");
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPassword = async () => {
    setError("");
    setIsVerifying(true);
    try {
      // Need to find the email first since login uses email
      const checkRes = await api.get(`/auth/check-username/${username}`);
      const email = checkRes.data.email;
      
      const loginRes = await api.post('/auth/login', { email, password });
      if (loginRes.data.token) {
        localStorage.setItem("token", loginRes.data.token);
        setStep(2);
      }
    } catch (err) {
      setError("Invalid password");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    try {
      await api.post('/comments', {
        content: adviceText,
        category: ideaType,
        type: mainType.toUpperCase(), // ADVICE or IDEA
        username: identity === 'User' ? username : identity,
        identity
      });
      setStep(4); // Success blur
    } catch (err) {
      setError("Failed to submit. Please try again.");
      console.error(err);
    }
  };

  const canSubmit = adviceText.trim().length >= 5;

  // Blobs shared across steps
  const Blobs = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl">
      <motion.div
        animate={{ x: [-20, 40, -20], y: [-20, 20, -20], scale: [1, 1.3, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-16 -left-16 w-64 h-64 bg-[#00FFFF] rounded-full blur-[80px] opacity-25"
      />
      <motion.div
        animate={{ x: [20, -50, 20], y: [20, -20, 20], scale: [1.2, 1, 1.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-1/2 -right-16 w-72 h-72 bg-[#D946EF] rounded-full blur-[90px] opacity-20"
      />
      <motion.div
        animate={{ x: [0, 30, 0], y: [30, -30, 30], scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-16 left-1/4 w-56 h-56 bg-[#06B6D4] rounded-full blur-[70px] opacity-20"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step < 4 ? onClose : undefined}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Full-screen processing blur overlay */}
      <AnimatePresence>
        {step === 4 && (
          <motion.div
            key="blur-overlay"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-[1000] bg-black/60 flex items-center justify-center"
            style={{ backdropFilter: "blur(20px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-8 text-center px-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight"
                  style={{
                    fontFamily: "'Google Sans', 'Inter', sans-serif",
                    textShadow: "0 0 15px rgba(74,222,128,0.6), 0 0 30px rgba(74,222,128,0.4)",
                  }}
                >
                  {successText}
                  <span className="animate-pulse ml-1 font-light text-green-400">|</span>
                </motion.div>
              </div>

              {/* Buffer removed as requested */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Card */}
      <AnimatePresence mode="wait">
        {step < 4 && (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[480px] z-[1001]"
          >
            <div className="relative bg-[#060d1f]/90 backdrop-blur-3xl border border-cyan-500/20 rounded-3xl p-8 md:p-10 overflow-hidden shadow-[0_0_60px_rgba(0,255,255,0.1),0_0_120px_rgba(217,70,239,0.08),0_30px_80px_rgba(0,0,0,0.6)]">
              <Blobs />

              {/* Glow border top */}
              <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent rounded-t-3xl" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all text-sm"
              >
                ✕
              </button>

              {/* Phase Indicator - 4 Steps */}
              <div className="relative z-10 flex items-center gap-2 mb-10 justify-center">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-500 border ${
                      step > i 
                        ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                        : step === i 
                          ? "bg-white/10 border-white/40 text-white" 
                          : "bg-white/5 backdrop-blur-md border-white/5 text-white/20"
                    }`}>
                      {i + 1}
                    </div>
                    {i < 3 && (
                      <div className={`h-[1px] w-6 md:w-10 rounded-full transition-all duration-700 ${
                        step > i ? "bg-white" : "bg-white/5 backdrop-blur-sm"
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* ── Step 0: Advice or Idea ── */}
              {step === 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      What's The Type?
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">What would you like to share?</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {["Advice", "Idea"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setMainType(opt)}
                        className={`w-full py-4 px-5 rounded-xl border text-left font-sans font-black text-sm uppercase tracking-widest transition-all duration-300 ${
                          mainType === opt
                            ? "bg-white/15 border-white/30 text-white"
                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:border-white/20 hover:text-white/70"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <motion.button
                    whileHover={mainType ? { scale: 1.02 } : {}}
                    whileTap={mainType ? { scale: 0.98 } : {}}
                    onClick={() => mainType && setStep(1)}
                    disabled={!mainType}
                    className={`w-full py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all ${
                      mainType 
                        ? "text-white bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30"
                        : "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                    }`}
                  >
                    Continue
                  </motion.button>
                </motion.div>
              )}

              {/* ── Step 1: Identity ── */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      Share As...
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">Who are you sharing as?</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {["Anonymous", "User"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setIdentity(opt)}
                        className={`w-full py-3.5 px-5 rounded-xl border text-left font-sans font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                          identity === opt
                            ? "bg-white/15 border-white/30 text-white"
                            : "bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:border-white/20 hover:text-white/70"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {identity === 'User' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden flex flex-col gap-3"
                      >
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => {
                              setUsername(e.target.value);
                              setError("");
                              setUserFound(false);
                            }}
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none transition-all ${
                              error ? "border-red-500/50 focus:border-red-500" : "border-white/20 focus:border-white/40"
                            }`}
                          />
                          {error && (
                            <p className="text-[10px] text-red-500 font-sans mt-1 ml-1">{error}</p>
                          )}
                        </div>

                        {userFound && !localStorage.getItem("token") && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                            <input
                              type="password"
                              placeholder="Password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white font-sans text-sm focus:outline-none focus:border-white/40 transition-all"
                            />
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(0)}
                      className="flex-1 py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 hover:text-white/60 transition-all"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (identity === 'Anonymous') setStep(2);
                        else if (!userFound) checkUser();
                        else if (!localStorage.getItem("token")) verifyPassword();
                        else setStep(2);
                      }}
                      disabled={isVerifying || (identity === 'User' && !username)}
                      className={`flex-[2] py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all ${
                        isVerifying || (identity === 'User' && !username)
                          ? "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                          : "text-white bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30"
                      }`}
                    >
                      {isVerifying ? "..." : (identity === 'User' && !userFound) ? "Check" : "Continue"}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Category ── */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      What is it?
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">
                      {mainType === "Idea" ? "What type of idea is this?" : "What category does this advice fall into?"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {[
                      { key: "Event", desc: "Community events, meetups, gatherings" },
                      { key: "Web Development", desc: "Features, UI/UX, tech improvements" },
                      { key: "Other", desc: "Anything else on your mind" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setIdeaType(opt.key)}
                        className={`w-full py-3.5 px-5 rounded-xl border text-left transition-all duration-300 ${
                          ideaType === opt.key
                            ? "bg-white/15 border-white/30"
                            : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                        }`}
                      >
                        <span className={`font-sans font-bold text-sm uppercase tracking-wider block ${
                          ideaType === opt.key ? "text-white" : "text-white/50"
                        }`}>
                          {opt.key}
                        </span>
                        <span className="font-sans text-xs text-white/30 mt-0.5 block">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 hover:text-white/60 transition-all"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={ideaType ? { scale: 1.02 } : {}}
                      whileTap={ideaType ? { scale: 0.98 } : {}}
                      onClick={() => ideaType && setStep(3)}
                      className={`flex-[2] py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all ${
                        ideaType
                          ? "text-white bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30"
                          : "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                      }`}
                    >
                      Continue
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Content ── */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                      Let us hear your thoughts!
                    </h3>
                    <p className="text-white/40 text-sm font-sans mt-1">
                      {mainType === "Idea" ? "Describe your idea below" : "Share your advice with us"}
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      value={adviceText}
                      onChange={(e) => setAdviceText(e.target.value.slice(0, 200))}
                      placeholder={
                        ideaType === "Event"
                          ? "Describe your event idea..."
                          : ideaType === "Web Development"
                          ? "Describe your web development idea..."
                          : "Share your thoughts with us..."
                      }
                      rows={5}
                      maxLength={200}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pb-8 text-white text-sm font-sans resize-none focus:outline-none focus:border-white/25 focus:bg-white/8 placeholder-white/20 transition-all"
                      style={{ backdropFilter: "blur(10px)" }}
                    />
                    <div className="absolute bottom-3 right-4 text-xs font-mono">
                      <span className={adviceText.trim().length < 5 ? "text-white/25" : "text-white/40"}>
                        {adviceText.length}
                      </span>
                      <span className="text-white/20">/200</span>
                    </div>
                    {error && (
                      <p className="text-[10px] text-red-500 font-sans mt-1 ml-1">{error}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 hover:text-white/60 transition-all"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={canSubmit ? { scale: 1.02 } : {}}
                      whileTap={canSubmit ? { scale: 0.98 } : {}}
                      onClick={canSubmit ? handleSubmit : undefined}
                      className={`flex-[2] py-4 rounded-xl font-sans font-black text-sm uppercase tracking-widest transition-all duration-500 ${
                        canSubmit
                          ? "text-white bg-white/15 border border-white/30 hover:bg-white/20 hover:border-white/40"
                          : "text-white/20 bg-white/5 border border-white/5 cursor-not-allowed"
                      }`}
                    >
                      Submit
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dungeon Gate Component ──────────────────────────────────────────
function DungeonGate() {
  const [isLocked, setIsLocked] = useState(false); // Dummy: Event has started
  const [showPopup, setShowPopup] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = require('next/navigation').useRouter();

  // Check login status on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // Dummy target: Past date to keep it unlocked
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1); // Set to last year
    return d;
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diff = targetDate - now;
      if (diff <= 0) {
        setIsLocked(false);
        setTimeLeft("00:00:00:00"); // Reset display for auth check
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const handleGateClick = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 5000);
    } else {
      sessionStorage.setItem("landingScrollTarget", "section-minigame");
      sessionStorage.setItem("landingScrollY", window.scrollY);
      // Dramatic Blackout Transition
      setIsNavigating(true);
      setTimeout(() => {
        router.push("/minigame");
      }, 1000);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isNavigating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[3000] bg-black pointer-events-auto"
          />
        )}
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-md pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 right-4 z-[100] flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {showPopup && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, x: 40, filter: "blur(15px)" }}
              animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.8, x: 40, filter: "blur(15px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 flex items-center gap-4 pointer-events-auto"
            >
              {/* Floating dgf_2.webp */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [-5, 5, -5]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <img 
                  src="/dgf_2.webp" 
                  alt="Guide" 
                  className="w-20 md:w-28 h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                />
                <div className="absolute -inset-4 bg-red-500/20 blur-2xl rounded-full z-[-1] opacity-50" />
              </motion.div>
              
              {/* Glassmorphic Popup Box - Black 3D Style */}
              <div className="relative w-[240px] md:w-[300px] p-6 flex flex-col items-center justify-center overflow-hidden rounded-[2rem]">
                {/* Dynamic Animated Blobs - Black */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-50%] left-[-20%] w-[140%] h-[200%] bg-black rounded-full blur-[60px]" 
                  />
                  <motion.div 
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[-50%] right-[-20%] w-[140%] h-[200%] bg-black rounded-full blur-[70px]" 
                  />
                </div>

                {/* Box Shape & Border */}
                <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] z-0 pointer-events-none rounded-[2rem]" />
                
                <div className="relative z-10 w-full text-center">
                  <h4 
                    className="text-sm md:text-base font-black uppercase tracking-tighter mb-2 text-white"
                    style={{ 
                      textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)"
                    }}
                  >
                    LOGIN FIRST
                  </h4>
                  <div className="py-2 px-4 bg-black/40 rounded-xl border border-white/5 backdrop-blur-sm">
                    <span className="text-lg md:text-xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                      00:00:00:00
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto transform translate-y-[10%]">
          {isLocked ? (
            <button 
              onClick={() => {
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 5000);
              }}
              className="group relative cursor-pointer outline-none border-none ring-0 active:scale-95 transition-transform bg-transparent p-0"
            >
              {/* Glow Aura */}
              <div className="absolute inset-[-20%] bg-red-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <img 
                src="/dg_1.webp" 
                alt="Locked Gate" 
                className="w-24 md:w-36 h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] group-hover:brightness-110 transition-all duration-500 border-none outline-none ring-0"
              />
              
              {/* Status Indicator */}
              <div className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            </button>
          ) : (
            <button onClick={handleGateClick} className="outline-none border-none ring-0 no-underline block bg-transparent group">
              <div className="relative cursor-pointer outline-none border-none ring-0 active:scale-95 transition-transform bg-transparent p-0">
                {/* Golden Glow Aura */}
                <motion.div 
                  animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-[-30%] bg-yellow-400/20 blur-[60px] rounded-full" 
                />
                
                <img 
                  src="/dg_2.webp" 
                  alt="Dungeon Gate" 
                  className="w-24 md:w-36 h-auto object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.9)] group-hover:scale-110 group-hover:brightness-125 transition-all duration-700 border-none outline-none ring-0"
                />
                
                {/* Ready Indicator */}
                <div className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white animate-bounce shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
              </div>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
