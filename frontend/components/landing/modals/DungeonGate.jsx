"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function DungeonGate() {
  const [isLocked, setIsLocked] = useState(false); // Dummy: Event has started
  const [showPopup, setShowPopup] = useState(false);
  const [, setTimeLeft] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pendingTimeouts = useRef(new Set());
  const router = useRouter();

  const scheduleTimeout = (callback, delay) => {
    const timeout = setTimeout(() => {
      pendingTimeouts.current.delete(timeout);
      callback();
    }, delay);
    pendingTimeouts.current.add(timeout);
  };

  useEffect(() => () => {
    pendingTimeouts.current.forEach(clearTimeout);
    pendingTimeouts.current.clear();
  }, []);

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
      scheduleTimeout(() => setShowPopup(false), 5000);
    } else {
      sessionStorage.setItem("landingScrollTarget", "section-minigame");
      sessionStorage.setItem("landingScrollY", window.scrollY);
      // Dramatic Blackout Transition
      setIsNavigating(true);
      scheduleTimeout(() => {
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
                scheduleTimeout(() => setShowPopup(false), 5000);
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
