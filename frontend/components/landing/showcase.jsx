import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";

export function Typewriter({ text, mode = "letter", delay = 0, skipAnim = false }) {
  const [displayText, setDisplayText] = useState("");
  
  useEffect(() => {
    if (skipAnim) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the current instant text display when animation is skipped.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Keep the Typewriter restart dependencies aligned with main and avoid restarting active loops when skipAnim changes.
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

export function FilmLane({ rotation, top, left, height = "h-16 md:h-24" }) {
  return (
    <div 
      className={`absolute w-[300%] ${height} bg-white shadow-[0_0_40px_rgba(255,255,255,0.8)] pointer-events-none`}
      style={{ top, left, transform: `rotate(${rotation}deg)`, transformOrigin: "left center" }}
    />
  );
}

export function FilmStrip({ rotation, top, left, speed = 40, height = "h-16 md:h-24" }) {
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

const EVENT_IMAGES = ["/event_1.webp", "/event_2.webp", "/event_3.webp"];

export function EventSlider() {
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

export function useMerchRandomizer() {
  const [, setInventory] = useState([]);
  const [displayed, setDisplayed] = useState([]);

  useEffect(() => {
    const random = createRuntimeSeededRandom("landing-showcase-products-v1");
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

      const picked = [...items].sort(() => 0.5 - random()).slice(0, 4);
      setInventory(items);
      setDisplayed(picked);
    };

    loadAndPick();
    const interval = setInterval(loadAndPick, 6000); // Slightly slower for typewriter
    return () => clearInterval(interval);
  }, []);

  return displayed;
}

export function ShowcaseTypewriter({ text }) {
  const [displayed, setDisplayed] = useState("");
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the immediate reset frame before each showcase typewriter cycle.
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

export function MerchCard({ item, isInitial, index, isMobile }) {
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

const FINDMORE_VIDEOS = Array.from({length: 10}, (_, i) => `/vit_tt${i+1}.mp4`);

export function FindMoreSlider() {
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
