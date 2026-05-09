"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ServiceRequestModal from "./ServiceRequestModal";

// ─── Typewriter Component ─────────────────────────────
function Typewriter({ text, mode = "letter", delay = 0 }) {
  const [displayText, setDisplayText] = useState("");
  
  useEffect(() => {
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
        <div className="flex-shrink-0 w-1/3 h-full" style={{ backgroundImage: 'url(/filmroll.png)', backgroundSize: 'contain', backgroundRepeat: 'repeat-x' }} />
        <div className="flex-shrink-0 w-1/3 h-full" style={{ backgroundImage: 'url(/filmroll.png)', backgroundSize: 'contain', backgroundRepeat: 'repeat-x' }} />
        <div className="flex-shrink-0 w-1/3 h-full" style={{ backgroundImage: 'url(/filmroll.png)', backgroundSize: 'contain', backgroundRepeat: 'repeat-x' }} />
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
const EVENT_IMAGES = ["/event_1.jpeg", "/event_2.jpeg", "/event_3.jpeg"];

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
const MOCK_MERCH = Array.from({ length: 12 }).map((_, i) => {
  let status = "available";
  if (i % 3 === 1) status = "new_drop";
  if (i % 3 === 2) status = "sold_out";

  return {
    id: `merch_${i}`,
    name: `KALCERIA EDITION MK-${i + 1}`,
    status: status,
    isSeven: status === "new_drop",
    isPilih: false,
    image: `https://picsum.photos/id/${10 + i}/400/400`
  };
});

function useMerchRandomizer(items) {
  const [inventory, setInventory] = useState(items);
  const [displayed, setDisplayed] = useState([]);

  useEffect(() => {
    const pickMerch = () => {
      setInventory((prev) => {
        let pool = prev.filter(p => !p.isPilih);
        if (pool.length < 4) {
          prev = prev.map(p => ({ ...p, isPilih: false }));
          pool = prev;
        }
        
        let priority = pool.filter(p => p.isSeven).sort(() => 0.5 - Math.random());
        let normal = pool.filter(p => !p.isSeven).sort(() => 0.5 - Math.random());
        
        const merged = [...priority, ...normal];
        const picked = merged.slice(0, 4);
        const pickedIds = picked.map(p => p.id);
        
        setDisplayed(picked);
        return prev.map(p => pickedIds.includes(p.id) ? { ...p, isPilih: true } : p);
      });
    };

    pickMerch();
    const interval = setInterval(pickMerch, 5000);
    return () => clearInterval(interval);
  }, []);

  return displayed;
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
  const particles = Array.from({ length: 20 });
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-visible mix-blend-screen">
      {particles.map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 2 + Math.random() * 3;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0], 
              y: [0, -15, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: duration,
              delay: delay,
              ease: "easeInOut"
            }}
            className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        );
      })}
    </div>
  );
}

// ─── Star Dust Particle System (50/50 Violet & Gold) ──
function StarDust() {
  const particles = Array.from({ length: 30 });
  return (
    <div className="absolute inset-[-10%] z-0 pointer-events-none overflow-visible mix-blend-screen">
      {particles.map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 2 + Math.random() * 3;
        
        // 50/50 logic for Violet and Gold
        const isViolet = Math.random() > 0.5;
        const bgColor = isViolet ? "bg-[#D946EF]" : "bg-[#FACC15]";
        const shadowColor = isViolet ? "rgba(217,70,239,0.8)" : "rgba(250,204,21,0.8)";
        
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 0, rotate: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 0], 
              y: [0, -20, 0],
              rotate: [0, 90, 180],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              repeat: Infinity,
              duration: duration,
              delay: delay,
              ease: "easeInOut"
            }}
            className={`absolute w-3 h-3 ${bgColor}`}
            style={{ 
              left: `${x}%`, top: `${y}%`,
              clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
              filter: `drop-shadow(0 0 6px ${shadowColor})`
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Floating Spare Parts Component ──────────────────
function FloatingSpareParts() {
  const parts = [
    { src: "/support_1.png", pos: "top-10 left-4 md:left-20", rot: 15, delay: 0.2, dur: 7.5 },
    { src: "/support_2.png", pos: "top-10 right-4 md:right-20", rot: -15, delay: 1.5, dur: 6.2 },
    { src: "/support_3.png", pos: "bottom-10 left-4 md:left-20", rot: -20, delay: 0.8, dur: 8.4 },
    { src: "/support_4.png", pos: "bottom-10 right-4 md:right-20", rot: 25, delay: 2.3, dur: 5.8 },
  ];

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {parts.map((part, i) => {
        // Adjust size for top-right (index 1) and bottom-left (index 2)
        const isSmaller = i === 1 || i === 2;
        const sizeClass = isSmaller ? "w-20 md:w-44" : "w-28 md:w-64";

        return (
          <motion.img
            key={i}
            src={part.src}
            className={`absolute ${part.pos} ${sizeClass} h-auto opacity-70`}
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

// ─── Dynamic Collage Component ────────────────────────
function DynamicCollage() {
  const photos = Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.jpeg`);
  
  return (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-45 pointer-events-none">
      <div className="flex w-[200%] h-full animate-roll">
         <div className="grid grid-cols-5 grid-rows-4 w-1/2 h-full">
            {photos.map((src, i) => (
              <img key={i} src={src} className="w-full h-full object-cover border-[0.5px] border-white/5" />
            ))}
         </div>
         <div className="grid grid-cols-5 grid-rows-4 w-1/2 h-full">
            {photos.map((src, i) => (
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

// ─── Landing Page Component ──────────────────────────
export default function LandingPage({ onNavigateAuth }) {
  const [mounted, setMounted] = useState(false);
  const [aboutIndex, setAboutIndex] = useState(0);
  const [mascotFrame, setMascotFrame] = useState(1);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const displayedMerch = useMerchRandomizer(MOCK_MERCH);

  const ABOUT_IMAGES = [
    "/aboutus_bg1.png",
    "/aboutus_bg2.png",
    "/aboutus_bg3.png",
    "/aboutus_bg4.png"
  ];

  useEffect(() => {
    setMounted(true);
    // Check login status
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    window.location.reload();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAboutIndex((prev) => (prev + 1) % ABOUT_IMAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="relative w-full bg-[#050a14] text-white font-mono overflow-x-hidden selection:bg-[#FF00FF] selection:text-white"
    >
      {/* ── Section 1: Hero ── */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden py-24 z-10">
        <DynamicCollage />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/50 via-[#050a14]/10 to-[#050a14] z-0" />

        {/* Video Container */}
        <div className="relative w-[72%] max-w-4xl aspect-video rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center z-10">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
            <source src="/video_landingatas.mp4" type="video/mp4" />
          </video>
          
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-10 px-4 w-full">
            <motion.img 
              src="/logo_landing.png" 
              alt="Kalceria" 
              className="w-[85%] md:w-[70%] max-w-3xl h-auto object-contain drop-shadow-2xl" 
              draggable={false}
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {isLoggedIn ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="group relative px-12 py-3.5 rounded-[20px] overflow-hidden transition-all duration-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              >
                <div className="absolute inset-0 bg-red-500/20 group-hover:bg-red-500/30 transition-colors" />
                <div className="absolute inset-0 border border-red-500/30 group-hover:border-red-500/50 rounded-[20px]" />
                <div className="absolute inset-0 shadow-[0_0_40px_rgba(239,68,68,0.1)] group-hover:shadow-[0_0_60px_rgba(239,68,68,0.2)] transition-all" />
                
                <span className="relative z-10 font-sans font-black text-white uppercase tracking-widest text-[15px]">
                  LOGOUT
                </span>
              </button>
            ) : (
              <button
                onClick={onNavigateAuth}
                className="relative px-10 py-3.5 font-sans font-extrabold tracking-wide text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_30px_rgba(255,255,255,0.15)]"
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
      <section className="relative w-full min-h-[70vh] flex flex-col md:flex-row items-center justify-between overflow-hidden bg-[#050a14] z-20 px-8 md:px-24 py-20 gap-16">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[100px] bg-[#FF00FF]" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[0%] right-[10%] w-[50vw] h-[50vw] rounded-full blur-[120px] bg-[#FFD700]" />
          <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[30%] left-[50%] w-[30vw] h-[30vw] rounded-full blur-[80px] bg-[#ffffff]" />
        </div>

        {/* Left Content (Absolute for no shift) */}
        <div className="absolute left-8 md:left-24 top-1/2 -translate-y-1/2 z-20 flex flex-col items-start gap-6">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter" style={{ textShadow: "4px 4px 0 rgba(255,0,255,0.15)" }}>
            <Typewriter text="SEE EVENT" mode="letter" delay={0} />
          </h2>
          <Link href="/events">
            <button
              className="relative px-8 py-3 font-sans font-extrabold uppercase tracking-wide text-[13px] text-[#050a14] bg-white border border-white transition-all hover:border-[#FF00FF] hover:bg-transparent hover:text-white group cursor-pointer"
              style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
            >
              <span className="relative z-10">EXPLORE</span>
              <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
            </button>
          </Link>
        </div>

        {/* Center: Event Slider Card (Absolutely Centered) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-[320px] aspect-[4/5] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-sm" style={{ clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" }}>
          <EventSlider />
        </div>

        {/* Silhouettes - Static Background */}
        <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden px-8 md:px-24">
          <div className="absolute bottom-0 left-12 md:left-40 opacity-35 flex items-end">
            <img src="/grup.png" alt="Group" className="h-[180px] md:h-[280px] object-contain translate-y-[2.5px]" />
          </div>
          <div className="absolute bottom-0 right-4 md:right-10 opacity-50 flex flex-col items-center pointer-events-none">
            {/* Magenta Tapakan (Base) - Wedge Shape from Sketch */}
            <div 
              className="absolute bottom-[-5px] right-[-20%] w-[150%] h-[140px] bg-gradient-to-r from-[#D946EF] to-[#FACC15] blur-[22px] z-0 opacity-80"
              style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%, 0 100%)" }}
            />
            <img src="/brio_black.png" alt="Brio" className="relative z-10 h-[150px] md:h-[240px] object-contain translate-y-[2.5px]" />
          </div>
        </div>
      </section>

      {/* ── Section 3: About Us ── */}
      <section className="relative w-full h-[70vh] overflow-hidden bg-black flex items-center justify-center border-t border-slate-900 z-30">
        <AnimatePresence initial={false} custom={aboutIndex}>
          <motion.div key={aboutIndex} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0 w-full h-full">
            <img src={ABOUT_IMAGES[aboutIndex]} alt="About Us BG" className="w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050a14] via-[#050a14]/60 to-transparent" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 w-full max-w-6xl px-8 flex justify-start">
          <div className="flex flex-col items-start gap-6 border-l-2 border-[#FF00FF] pl-8">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white">
              <Typewriter text="ABOUT US" mode="word" delay={3000} />
            </h2>
            <Link href="/about">
              <button
                className="relative px-10 py-3.5 font-sans font-extrabold uppercase tracking-wide text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)]"
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
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center py-20 z-40 border-t border-slate-900 bg-transparent isolate">
        
        {/* The Ultimate Background */}
        <SupportUsBackground />
        <FloatingSpareParts />

        <h2 className="relative z-10 text-6xl md:text-8xl font-black uppercase tracking-tighter mb-16" style={{ textShadow: "4px 4px 0 rgba(255,255,255,0.1)" }}>
          <Typewriter text="SUPPORT US" mode="none" delay={6000} />
        </h2>

        {/* Merch Grid Wrapper */}
        <div className="relative z-10 w-full max-w-5xl px-4 mb-20">
          <StarDust />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
            {displayedMerch.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, ease: "backOut" }}
                className="relative flex flex-col bg-[#0c1528] border border-slate-800 shadow-xl overflow-hidden group min-h-[420px]"
                style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
              >
                <div className="relative aspect-square w-full flex items-center justify-center border-b border-slate-800 overflow-hidden bg-[#050a14]">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-4 flex flex-col bg-[#0c1528] group-hover:bg-[#111c34] transition-colors h-full flex-1">
                  <h3 className="font-sans font-bold text-sm tracking-wide text-white uppercase">{item.name}</h3>
                  <div className="mt-auto pt-4 flex">
                    {item.status === 'available' && (
                      <div className="px-3 py-1.5 bg-[#22c55e] text-[#050a14] font-sans font-extrabold uppercase tracking-wide text-[10px]" style={{ clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}>
                        AVAILABLE
                      </div>
                    )}
                    {item.status === 'new_drop' && (
                      <div className="px-3 py-1.5 bg-[#FF00FF] text-white font-sans font-extrabold uppercase tracking-wide text-[10px]" style={{ clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}>
                        NEW DROP
                      </div>
                    )}
                    {item.status === 'sold_out' && (
                      <div className="px-3 py-1.5 bg-gray-200 text-[#ff003c] font-sans font-extrabold uppercase tracking-wide text-[10px]" style={{ clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}>
                        SOLD OUT
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          </div>
        </div>

        {/* Marketplace Links */}
        <div className="relative z-10 flex gap-16 items-center justify-center">
          <a href="#" className="flex flex-col items-center gap-3 group transition-transform hover:scale-105">
            <div className="relative w-48 md:w-56 h-16 block">
              <img src="/logo_tokpedgray.png" alt="Tokopedia" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" draggable={false} />
              <img src="/logo_tokped.png" alt="Tokopedia Colored" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(3,172,14,0.6)]" draggable={false} />
            </div>
            <span className="font-sans text-sm text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF]">Tokopedia - Kalceros</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-3 group transition-transform hover:scale-105">
            <div className="relative w-48 md:w-56 h-16 block">
              <img src="/logo_shopeegray.png" alt="Shopee" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" draggable={false} />
              <img src="/logo_shopee.png" alt="Shopee Colored" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(238,77,45,0.6)]" draggable={false} />
            </div>
            <span className="font-sans text-sm text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF]">Shopee - Kalcres</span>
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
          <div className="relative flex flex-col items-start justify-center text-left p-4">
            <GoldenDust />
            <div className="relative z-10">
              <motion.h2 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-8 font-mono"
              >
                FIND MORE
              </motion.h2>
              <p className="font-sans text-gray-300 text-lg max-w-md text-left leading-relaxed">
                Wahib embut keren banget wowowowow. Kalceria is the ultimate destination for automotive euphoria.
              </p>

              {/* Social Media Icon List - Vertical Style */}
              <div className="flex flex-col gap-6 mt-8">
                {/* Instagram Icon */}
                <a 
                  href="https://www.instagram.com/kalceria/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-4 group cursor-pointer"
                >
                  <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                    <img 
                      src="/ig_gray.png" 
                      alt="Instagram" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0 scale-[1.4]" 
                      draggable={false}
                    />
                    <img 
                      src="/ig.png" 
                      alt="Instagram Colored" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(225,48,108,0.3)] scale-[1.4]" 
                      draggable={false}
                    />
                  </div>
                  <span className="font-sans text-sm text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF]">
                    Instagram - kalceria
                  </span>
                </a>

                {/* TikTok Icon */}
                <a 
                  href="https://www.tiktok.com/@gallerykalceria" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-4 group cursor-pointer"
                >
                  <div className="relative w-10 h-10 shrink-0">
                    <img 
                      src="/tiktok_gray.png" 
                      alt="TikTok" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" 
                      draggable={false}
                    />
                    <img 
                      src="/tiktok.png" 
                      alt="TikTok Colored" 
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                      draggable={false}
                    />
                  </div>
                  <span className="font-sans text-sm text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF]">
                    tiktok kalceria
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: TikTok Feed Container */}
          <div className="relative flex items-center justify-start -ml-[10%] md:-ml-[20%] py-10">
            <GoldenDust />
            {/* Clean, minimalist video container (15% smaller) */}
            <div className="relative w-full max-w-[289px] aspect-[340/680] group z-10 rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl">
              <FindMoreSlider />
            </div>
          </div>

        </div>

        {/* Looping 8-Bit Mascot (Fixed Corner Position) */}
        <div className="absolute bottom-0 right-0 w-56 md:w-80 z-20 pointer-events-none">
          {/* Hat placed above the head */}
          <img 
            src="/kalcer_hat.png" 
            alt="Kalcer Hat" 
            className="absolute top-[-30%] left-1/2 -translate-x-[56%] w-[185%] h-auto z-30 drop-shadow-[0_15px_10px_rgba(0,0,0,0.5)]"
          />
          
          <img 
            src={mascotFrame === 1 ? "/kalcer_man.png" : "/kalcer_man2.png"} 
            alt="Kalcer Mascot" 
            className="relative z-10 w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(255,0,255,0.3)]"
          />

          {/* Static Favicon Overlay to cover Gemini Logo in the absolute corner */}
          <img
            src="/favicon.png"
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
            <FilmLane rotation={-55} top="80%" left="10%" height="h-20 md:h-32" />
          </div>

          {/* Top Layer: All Scrolling Film Strips */}
          <div className="absolute inset-0 z-20">
            <FilmStrip rotation={15} top="15%" left="-10%" speed={50} />
            <FilmStrip rotation={-3} top="48%" left="-10%" speed={60} />
            <FilmStrip rotation={6} top="75%" left="-10%" speed={45} />
            <FilmStrip rotation={-55} top="80%" left="10%" speed={55} height="h-20 md:h-32" />
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 flex flex-col items-center justify-center w-full h-full"
        >
          {/* Shrunk square box, centered perfectly with Moto photographers (Dark translucent for white bg) */}
          <div className="relative bg-black/[0.08] border border-black/10 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 aspect-square w-full max-w-[420px] flex flex-col items-center justify-center shadow-[0_40px_100px_rgba(0,0,0,0.1)]">
             
             {/* Moto Figures: Locked tightly to box edges using wrappers for perfect alignment */}
             
             {/* TOP (Normal, 0deg) */}
             <div className="absolute inset-0 pointer-events-none z-20">
               <motion.img 
                 src="/moto_1.png" 
                 alt="Moto 1"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* RIGHT (90deg) */}
             <div className="absolute inset-0 rotate-90 pointer-events-none z-20">
               <motion.img 
                 src="/moto_2.png" 
                 alt="Moto 2"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* BOTTOM (180deg) */}
             <div className="absolute inset-0 rotate-180 pointer-events-none z-20">
               <motion.img 
                 src="/moto_3.png" 
                 alt="Moto 3"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-44 md:h-60 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* LEFT (-90deg) */}
             <div className="absolute inset-0 -rotate-90 pointer-events-none z-20">
               <motion.img 
                 src="/moto_4.png" 
                 alt="Moto 4"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white mb-10 text-center leading-none" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
               Need Our Help?
             </h2>
             
             <motion.button
               onClick={() => setShowServiceModal(true)}
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="relative px-12 py-4 font-sans font-black uppercase tracking-tighter text-base text-black bg-white group cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.2)]"
               style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
             >
               <span className="relative z-10">APPLY A REQUEST</span>
               <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
             </motion.button>
          </div>
        </motion.div>
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
                  src={`/kucing${catFrame}.png`}
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
