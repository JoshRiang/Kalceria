import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import { useViewportActivity } from "@/hooks/useViewportActivity";

export function Typewriter({ text, mode = "letter", delay = 0, skipAnim = false }) {
  const [displayText, setDisplayText] = useState(skipAnim ? text : "");
  
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
      
      // 2. Mode 'none' stays permanently typed without deletion
      if (mode === "none") {
        return;
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
          const words = text.match(/\S+|\s+/g) || [];
          let currentWords = [...words];
          words.forEach((_, i) => {
            const t = setTimeout(() => {
              if(!isCancelled) {
                currentWords.pop();
                setDisplayText(currentWords.join(""));
              }
            }, i * 400);
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
      if (mode !== "none") {
        loop = setInterval(() => {
          if(!isCancelled) setDisplayText("");
          playAnim();
        }, 6000);
      }
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
      {!skipAnim && (mode !== "none" || displayText !== text) && (
        <span className="animate-solid-blink ml-1 font-light text-white">|</span>
      )}
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
  const n = EVENT_IMAGES.length;

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

const PLACEHOLDER_POOL = ["Product Zero", "No Product", "Placeholder"];

export function useMerchRandomizer() {
  const [displayed, setDisplayed] = useState([]);

  useEffect(() => {
    const random = createRuntimeSeededRandom("landing-showcase-products-v1");
    // Generate 4 initial card slots
    const initialSlots = Array.from({ length: 4 }).map((_, i) => ({
      id: `slot-${i}`,
      name: PLACEHOLDER_POOL[Math.floor(random() * PLACEHOLDER_POOL.length)],
      imageUrl: null,
    }));
    setDisplayed(initialSlots);

    // Fetch live backend products if available
    fetch("/api/merch")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.merch && Array.isArray(data.merch) && data.merch.length > 0) {
          const formatted = data.merch.slice(0, 4).map((m, i) => ({
            id: m.id || `merch-${i}`,
            name: m.name || PLACEHOLDER_POOL[i % PLACEHOLDER_POOL.length],
            imageUrl: m.photoUrl || null,
          }));
          while (formatted.length < 4) {
            formatted.push({
              id: `slot-fallback-${formatted.length}`,
              name: PLACEHOLDER_POOL[formatted.length % PLACEHOLDER_POOL.length],
              imageUrl: null,
            });
          }
          setDisplayed(formatted);
        }
      })
      .catch(() => {});
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
    }, 45);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayed}</span>;
}

// ─── Minigame Inherited Flip Card for Support Us ─────────────────────────────────
export function MerchCard({ item, index, isMobile }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [currentName, setCurrentName] = useState(item?.name || "Placeholder");

  useEffect(() => {
    let isMounted = true;
    let timer = null;
    let typeInterval = null;

    // Stagger start delay based on card position so cards flip in a rhythmic wave
    const initialDelay = 500 + index * 550;

    const runFlipCycle = () => {
      if (!isMounted) return;

      // 1. Flip card to face-up (displaying product with white border)
      setIsFlipped(true);

      // Pick name: either actual product name or random placeholder
      const candidateName =
        item?.imageUrl && item?.name
          ? item.name
          : PLACEHOLDER_POOL[Math.floor(Math.random() * PLACEHOLDER_POOL.length)];
      setCurrentName(candidateName);

      // 2. Start typing animation under the card shortly after flip starts
      timer = setTimeout(() => {
        if (!isMounted) return;
        setTypedName("");
        let charIdx = 0;

        typeInterval = setInterval(() => {
          if (!isMounted) return;
          charIdx++;
          setTypedName(candidateName.slice(0, charIdx));

          if (charIdx >= candidateName.length) {
            clearInterval(typeInterval);

            // 3. Patokan: wait not less than (+ n seconds after typing animation finishes)
            // n = 2.4 seconds
            timer = setTimeout(() => {
              if (!isMounted) return;

              // 4. Flip back to face-down (black base with minigame logo)
              setIsFlipped(false);
              setTypedName("");

              // 5. Rest face-down for 1.8s, then repeat cycle
              timer = setTimeout(() => {
                if (!isMounted) return;
                runFlipCycle();
              }, 1800);
            }, 2400);
          }
        }, 50);
      }, 350);
    };

    const startTimeout = setTimeout(runFlipCycle, initialDelay);

    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      clearTimeout(timer);
      clearInterval(typeInterval);
    };
  }, [index, item]);

  return (
    <div className="flex flex-col items-center justify-start select-none w-full max-w-[240px] sm:max-w-none">
      {/* 3D Flip Card Container (Inheriting Minigame Card Dynamics) */}
      <div
        className="relative w-[190px] h-[250px] xs:w-[210px] xs:h-[275px] sm:w-[200px] sm:h-[265px] md:w-[215px] md:h-[285px] lg:w-[230px] lg:h-[305px] cursor-pointer"
        style={{ perspective: "1000px" }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: [0.45, 0.05, 0.55, 0.95] }}
          style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
        >
          {/* Back Face: Solid Black Base with original Minigame Logo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              background: "#000000",
              borderRadius: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "16px",
            }}
          >
            <Image
              src="/favicon.webp"
              alt="Kalceria Logo"
              width={771}
              height={681}
              unoptimized
              loading="eager"
              decoding="auto"
              className="w-[58px] h-[58px] sm:w-[72px] sm:h-[72px] md:w-[84px] md:h-[84px] object-contain drop-shadow-[0_0_20px_rgba(255,100,0,0.4)]"
            />
          </div>

          {/* Front Face: Product Screen with Rounded Edge White Border */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "#000000",
              borderRadius: "1.25rem",
              overflow: "hidden",
              border: "2.5px solid #ffffff",
              boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item?.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={currentName}
                className="w-full h-full object-cover rounded-[calc(1.25rem-2.5px)]"
              />
            ) : (
              /* Right now, when placeholder: full black base inside the white border */
              <div className="w-full h-full bg-black rounded-[calc(1.25rem-2.5px)]" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Under the Card: Typing Animation with Picture 4 Font Style & Texture */}
      <div className="mt-4 sm:mt-5 text-center min-h-[28px] flex items-center justify-center px-2">
        <span
          className="text-white text-sm sm:text-base md:text-[17px] font-normal tracking-tight"
          style={{ fontFamily: "Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        >
          {typedName}
          {isFlipped && typedName && typedName.length < currentName.length && (
            <span className="inline-block ml-0.5 text-white/70 animate-pulse">|</span>
          )}
        </span>
      </div>
    </div>
  );
}

const FINDMORE_VIDEOS = Array.from({length: 10}, (_, i) => `/vit_tt${i+1}.mp4`);

export function FindMoreSlider() {
  const containerRef = useRef(null);
  const isActive = useViewportActivity(containerRef, { rootMargin: "300px 0px" });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const int = setInterval(() => {
      setIndex(prev => (prev + 1) % FINDMORE_VIDEOS.length);
    }, 5000);
    return () => clearInterval(int);
  }, [isActive]);

  const variants = {
    enter: { y: "100%" },
    center: { y: "0%", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    exit: { y: "-100%", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
      <AnimatePresence initial={false} custom={index}>
        <motion.video
          key={index}
          src={FINDMORE_VIDEOS[index]}
          autoPlay={isActive}
          muted
          playsInline
          preload="metadata"
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
