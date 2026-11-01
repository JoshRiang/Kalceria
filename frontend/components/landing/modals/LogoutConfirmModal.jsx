"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createSeededRandom } from "@/lib/seededRandom";
import ContentImage from "@/components/ui/ContentImage";

const LOGOUT_PARTICLE_COLORS = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];

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
      yDrift: (random() - 0.5) * 120
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
            boxShadow: `0 0 14px ${p.color}`
          }}
          animate={{
            x: [0, p.xDrift],
            y: [0, p.yDrift],
            opacity: [0, 1, 0],
            scale: [0.5, 1.6, 0.5]
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

export function LogoutConfirmModal({ onConfirm, onCancel }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutChoice, setLogoutChoice] = useState(null); // 'yes' | 'no' | null

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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center max-w-lg w-full select-none"
          >
            {/* Flying Cat with Floating Animation & Preserved Particles (No White Border Box) */}
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
              className="relative w-44 xs:w-52 sm:w-64 md:w-80 h-auto flex items-center justify-center pointer-events-none"
            >
              {/* Preserved Floating Colorful Dynamic Particles */}
              <div className="absolute -inset-10 pointer-events-none z-30">
                <LineParticles />
              </div>
              
              <ContentImage
                src="/flying_cat.webp"
                alt="Flying Cat"
                width={1600}
                height={893}
                loading="eager"
                className="w-full h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)] relative z-10"
              />
            </motion.div>

            {/* Pure 2D Text - Balanced Size, No Outer Box, No Sub-Boxes */}
            <h3 
              className="relative z-10 font-sans text-lg xs:text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight text-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] mt-3 sm:mt-4 mb-6 sm:mb-8"
            >
              You sure want to <span className="text-red-500">Log -Out?</span>
            </h3>

            {/* 2D Responsive Yes / No Buttons: Arial, Not Bold, Not All Capital */}
            <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-16 w-full">
              <button
                type="button"
                onClick={handleYesClick}
                className={`font-sans font-normal text-xl sm:text-2xl md:text-3xl transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none ${
                  logoutChoice === 'yes' ? 'text-red-600' : 'text-white hover:text-red-500 active:text-red-600'
                }`}
                style={{
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
                className={`font-sans font-normal text-xl sm:text-2xl md:text-3xl transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none ${
                  logoutChoice === 'no' ? 'text-black' : 'text-white hover:text-black active:text-black'
                }`}
                style={{
                  textShadow: logoutChoice === 'no' 
                    ? "0 0 2px #ffffff, 0 0 10px rgba(255,255,255,0.95)" 
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
