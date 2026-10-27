"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export const FULL_TEXT1 = `"Kalian Kelompok 5 SBD kan, sama Gw kan ya?"`;

export const FULL_TEXT2 = `"Kerjain Web-nya Woi!"`;

export function WebDevEntrySequence({ onComplete }) {
  const [phase, setPhase] = useState('typing1'); 
  const [text, setText] = useState('');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let i = 0;
    let interval;
    let phaseTimeout;
    const targetText = phase === 'typing1' ? FULL_TEXT1 : FULL_TEXT2;

    interval = setInterval(() => {
      setText(targetText.slice(0, i + 1));
      i++;
      if (i >= targetText.length) {
        clearInterval(interval);
        if (phase === 'typing1') {
          phaseTimeout = setTimeout(() => {
            setPhase('angry');
            setText('');
          }, 1000);
        } else {
          phaseTimeout = setTimeout(() => onCompleteRef.current(), 2000);
        }
      }
    }, 70); 
    return () => {
      clearInterval(interval);
      if (phaseTimeout) clearTimeout(phaseTimeout);
    };
  }, [phase]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Character */}
        <motion.img 
          src={phase === 'angry' ? "/dy_02.webp" : "/dy_01.webp"}
          alt="DY"
          animate={{ rotate: [0, 15, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        />

        {/* Typing/Angry Text */}
        <div className="h-20 mt-6 text-center px-6">
          <motion.h3 
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xl md:text-3xl font-normal tracking-tight ${phase === 'angry' ? 'text-red-500 scale-110 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-white'}`}
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {text}
          </motion.h3>
        </div>
      </div>
    </motion.div>
  );
}
