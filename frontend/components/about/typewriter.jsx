"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";

export function StaticTypewriter({ text, speed = 20, delay = 0, highlights = [] }) {
  const [started, setStarted] = useState(false);
  const scheduleTimeout = useTimeoutRegistry();

  const getStyle = (i) => {
    for (const h of highlights) {
      if (i >= h.start && i <= h.end) return "font-bold underline text-slate-100";
    }
    return "";
  };

  return (
    <motion.span
      initial={{ opacity: 1 }}
      whileInView={{ opacity: 1 }}
      onViewportEnter={() => {
        scheduleTimeout(() => setStarted(true), delay);
      }}
      viewport={{ once: true }}
      className="inline-block whitespace-pre-wrap"
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={started ? { opacity: 1 } : { opacity: 0 }}
          transition={{ 
            duration: 0.1, 
            delay: i * (speed / 1000),
            ease: "easeOut"
          }}
          className={getStyle(i)}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}
