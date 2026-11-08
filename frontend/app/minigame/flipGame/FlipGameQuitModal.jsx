"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FlipGameQuitModal({ showQuit, quitChoice, onQuitYes, onQuitNo }) {
  return (
    <AnimatePresence>
      {showQuit && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-2xl" 
            onClick={onQuitNo} 
          />
          <motion.div 
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
            className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <h3 
              className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-sans font-bold text-white mb-8 sm:mb-10 tracking-tighter"
              style={{ textShadow: "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)" }}
            >
              Quit the game?
            </h3>
            <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-16">
              <button 
                type="button"
                onClick={onQuitYes} 
                className={`transition-all duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-xl sm:text-2xl md:text-3xl hover:scale-110 active:scale-115 focus:scale-110 ${
                  quitChoice === "yes" ? "text-red-600 scale-110" : "text-white hover:text-red-500 active:text-red-600"
                }`}
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: "normal",
                  textTransform: "none",
                  textShadow: quitChoice === "yes" 
                    ? "0 0 20px rgba(220,38,38,0.9), 0 2px 10px rgba(0,0,0,0.8)" 
                    : "0 2px 12px rgba(0,0,0,0.8)"
                }}
              >
                Yes
              </button>
              <button 
                type="button"
                onClick={onQuitNo} 
                className={`transition-all duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-xl sm:text-2xl md:text-3xl hover:scale-110 active:scale-115 focus:scale-110 text-white hover:text-white active:text-white ${
                  quitChoice === "no" ? "scale-110 text-white" : ""
                }`}
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontWeight: "normal",
                  textTransform: "none",
                  textShadow: quitChoice === "no" 
                    ? "0 0 2px #ffffff, 0 0 10px rgba(255,255,255,0.95)" 
                    : "0 2px 12px rgba(0,0,0,0.8)"
                }}
              >
                No
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

