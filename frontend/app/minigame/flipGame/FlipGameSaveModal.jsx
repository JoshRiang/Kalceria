"use client";
import React from "react";
import { motion } from "framer-motion";
import { Timer } from "./FlipGameTimer";

export function FlipGameSaveModal({ showSave, ms, saveChoice, onSaveYes, onSaveNo }) {
  if (!showSave) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-2xl" 
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
        <p 
          className="text-white font-sans text-lg sm:text-xl md:text-2xl tracking-tight mb-3 sm:mb-4 opacity-90"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
        >
          Final Time
        </p>
        <Timer ms={ms} />
        <h3 
          className="text-xl sm:text-2xl md:text-3xl font-sans font-bold text-white mt-8 sm:mt-10 mb-8 sm:mb-10 tracking-tight"
          style={{ textShadow: "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)" }}
        >
          Save this score?
        </h3>
        <div className="flex items-center justify-center gap-10 sm:gap-16">
          <button 
            type="button"
            onClick={onSaveYes} 
            className={`transition-all duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-xl sm:text-2xl md:text-3xl hover:scale-110 active:scale-115 focus:scale-110 ${
              saveChoice === "yes" ? "text-red-600 scale-110" : "text-white hover:text-red-500 active:text-red-600"
            }`}
            style={{
              fontFamily: "Arial, sans-serif",
              fontWeight: "normal",
              textTransform: "none",
              textShadow: saveChoice === "yes" 
                ? "0 0 20px rgba(220,38,38,0.9), 0 2px 10px rgba(0,0,0,0.8)" 
                : "0 2px 12px rgba(0,0,0,0.8)"
            }}
          >
            Yes
          </button>
          <button 
            type="button"
            onClick={onSaveNo} 
            className={`transition-all duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none text-xl sm:text-2xl md:text-3xl hover:scale-110 active:scale-115 focus:scale-110 text-white hover:text-white active:text-white ${
              saveChoice === "no" ? "scale-110 text-white" : ""
            }`}
            style={{
              fontFamily: "Arial, sans-serif",
              fontWeight: "normal",
              textTransform: "none",
              textShadow: saveChoice === "no" 
                ? "0 0 2px #ffffff, 0 0 10px rgba(255,255,255,0.95)" 
                : "0 2px 12px rgba(0,0,0,0.8)"
            }}
          >
            No
          </button>
        </div>
      </motion.div>
    </div>
  );
}

