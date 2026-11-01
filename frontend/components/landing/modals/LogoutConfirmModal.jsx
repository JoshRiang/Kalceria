"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { createSeededRandom } from "@/lib/seededRandom";

const LOGOUT_PARTICLE_COLORS = [
  "#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"
];

export function LineParticles() {
  const particles = useMemo(() => {
    const random = createSeededRandom("logout-line-particles-v1");
    return Array.from({ length: 28 }, () => ({
      x: random() * 40 - 20,
      y: random() * 100,
      color: LOGOUT_PARTICLE_COLORS[Math.floor(random() * LOGOUT_PARTICLE_COLORS.length)],
      size: random() * 5 + 3,
      duration: 1.5 + random() * 2.5,
      delay: random() * 4,
      xDrift: (random() - 0.5) * 100,
      yDrift: (random() - 0.5) * 120,
    }));
  }, []);

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
            boxShadow: `0 0 14px ${p.color}`,
          }}
          animate={{
            x: [0, p.xDrift],
            y: [0, p.yDrift],
            opacity: [0, 1, 0],
            scale: [0.5, 1.6, 0.5],
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            ease: "circOut", 
            delay: p.delay,
          }}
        />
      ))}
    </motion.div>
  );
}

export function LogoutConfirmModal({ onConfirm, onCancel }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutChoice, setLogoutChoice] = useState(null); // 'yes' | 'no' | null

  // Ensure /flying_cat.webp is preloaded immediately into browser memory
  useEffect(() => {
    if (typeof window !== "undefined") {
      const img = new window.Image();
      img.src = "/flying_cat.webp";
    }
  }, []);

  useEffect(() => {
    if (isLoggingOut) {
      // Allow the buffering animation to spin briefly then trigger onConfirm
      const timer = setTimeout(() => {
        onConfirm();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isLoggingOut, onConfirm]);

  const handleYesClick = () => {
    setLogoutChoice('yes');
    setTimeout(() => {
      setIsLoggingOut(true);
    }, 180);
  };

  const handleNoClick = () => {
    setLogoutChoice('no');
    setTimeout(() => {
      onCancel();
    }, 180);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Background Overlay - Deep Blur & Dimmed */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isLoggingOut ? onCancel : undefined}
        className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
      />

      <AnimatePresence mode="wait">
        {!isLoggingOut ? (
          <motion.div
            key="confirm-box"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              y: [0, -5, 0]
            }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              opacity: { duration: 0.25 },
              scale: { duration: 0.25 },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="relative z-10 flex flex-col items-center text-center max-w-lg w-full select-none"
          >
            {/* Flying Cat with Floating Animation & Preserved Rainbow Particles */}
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [-2, 2, -2]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="relative w-44 xs:w-52 sm:w-64 md:w-80 h-auto flex items-center justify-center pointer-events-none mb-3 sm:mb-4"
            >
              {/* Preserved Floating Colorful Dynamic Particles */}
              <div className="absolute -inset-10 pointer-events-none z-30">
                <LineParticles />
              </div>
              
              {/* Immediate high-priority delivery, no dark blocking blur box */}
              <Image
                src="/flying_cat.webp"
                alt="Flying Cat"
                width={600}
                height={335}
                unoptimized
                priority
                fetchPriority="high"
                placeholder="empty"
                className="w-full h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] relative z-10"
              />
            </motion.div>

            {/* Pure 2D Text matching Quit the game / Save score module */}
            <h3 
              className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-sans font-bold text-white mb-8 sm:mb-10 tracking-tighter"
              style={{ textShadow: "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)" }}
            >
              You sure want to <span className="text-red-500 font-bold" style={{ textShadow: "0 0 20px rgba(239,68,68,0.7), 0 4px 20px rgba(0,0,0,0.9)" }}>Log - Out?</span>
            </h3>

            {/* 2D Responsive Yes / No Buttons: Arial, Not Bold, Not All Capital, Scaling on hover/click */}
            <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-16 w-full">
              <button
                type="button"
                onClick={handleYesClick}
                className={`transition-all duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-xl sm:text-2xl md:text-3xl hover:scale-110 active:scale-115 focus:scale-110 ${
                  logoutChoice === 'yes' ? 'text-red-600 scale-110' : 'text-white hover:text-red-500 active:text-red-600'
                }`}
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: "normal",
                  textTransform: "none",
                  textShadow: logoutChoice === 'yes' 
                    ? "0 0 20px rgba(220,38,38,0.9), 0 2px 10px rgba(0,0,0,0.8)" 
                    : "0 2px 12px rgba(0,0,0,0.8)"
                }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={handleNoClick}
                className={`transition-all duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-xl sm:text-2xl md:text-3xl hover:scale-110 active:scale-115 focus:scale-110 text-white hover:text-white active:text-white ${
                  logoutChoice === 'no' ? 'scale-110 text-white' : ''
                }`}
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: "normal",
                  textTransform: "none",
                  textShadow: logoutChoice === 'no' 
                    ? "0 0 20px rgba(255,255,255,0.95), 0 2px 10px rgba(0,0,0,0.8)" 
                    : "0 2px 12px rgba(0,0,0,0.8)"
                }}
              >
                No
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logout-loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center z-[1000] text-center select-none px-4"
          >
            {/* BIG Responsive Arc Spinner */}
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 mb-6 sm:mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="4" 
                    strokeDasharray="70 200" 
                    strokeLinecap="round"
                    className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                  />
                </svg>
              </div>
            </div>
            {/* BIG Responsive Monospace / Sans Spaced Typography */}
            <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              LOGGING OUT
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
