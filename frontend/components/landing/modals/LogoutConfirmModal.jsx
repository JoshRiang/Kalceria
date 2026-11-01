"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center text-center max-w-md w-full select-none"
          >
            {/* Pure 2D Text - Balanced Size (Not too big), No Outer Boxes, No Cat */}
            <h3 
              className="relative z-10 text-base sm:text-lg md:text-xl text-white tracking-normal text-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] mb-6 sm:mb-8"
              style={{
                fontFamily: "Arial, sans-serif",
                fontWeight: "normal",
              }}
            >
              You sure want to <span className="text-red-500 font-medium">Log - Out?</span>
            </h3>

            {/* 2D Responsive Yes / No Buttons: Arial, Not Bold, Not All Capital */}
            <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-14 w-full">
              <button
                type="button"
                onClick={handleYesClick}
                className={`transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-lg sm:text-xl md:text-2xl ${
                  logoutChoice === 'yes' ? 'text-red-600' : 'text-white hover:text-red-500 active:text-red-600'
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
                className={`transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-lg sm:text-xl md:text-2xl ${
                  logoutChoice === 'no' ? 'text-black' : 'text-white hover:text-black active:text-black'
                }`}
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: "normal",
                  textTransform: "none",
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
