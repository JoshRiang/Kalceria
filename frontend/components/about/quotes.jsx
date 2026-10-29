"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { useViewportActivity } from "@/hooks/useViewportActivity";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";

export const COMMUNITY_QUOTES = [
  "Bro, Kalceria keren ga si?", "Bro, Wahib Embut gimana?", "Kalceria, kece tuhh.",
  "CokiGakDisini sedang disini.", "Woy, Adnannn!!!!", "Halo, ada yang bisa saya bantu?",
  "Pilih Tekkom atau Fisip?", "Mending Brio atau Harrier?", "Kapan terakhir lu ******?",
  "Apaansi, Cok, Apaansi, Cok?", "Hi, aku Joshua, kamu siapa?", "Gw Otniel. Pendekar Volley.",
  "Iya Nil, Gw tau Nielll!", "Hayoooo, Besok Kelas ga ya??", "Hah, makan di F I A ga sieh?"
];

export function FloatingQuote({ quote }) {
  // quote contains: { id, text, style, pos }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: 0, y: 0 }}
      animate={{ 
        opacity: 0.78, 
        scale: 1, 
        x: quote.pos.dx, 
        y: quote.pos.dy 
      }}
      exit={{ opacity: 0, scale: 1.1, y: -20 }}
      transition={{ 
        duration: 8, 
        ease: "linear",
        opacity: { duration: 1.5 }, // Smooth fade in/out
      }}
      className={`absolute z-[60] pointer-events-none text-slate-100 whitespace-nowrap text-xl md:text-3xl drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] ${quote.style}`}
      style={{ left: `${quote.pos.x}%`, top: `${quote.pos.y}%` }}
    >
      &quot;{quote.text}&quot;
    </motion.div>
  );
}

export function FloatingQuotesLayer() {
  const containerRef = useRef(null);
  const isActive = useViewportActivity(containerRef, { rootMargin: "300px 0px" });
  const [activeQuotes, setActiveQuotes] = useState([]);
  const scheduleTimeout = useTimeoutRegistry();
  const availableIndicesRef = useRef(Array.from({ length: COMMUNITY_QUOTES.length }, (_, i) => i));
  const idCounter = useRef(0);

  useEffect(() => {
    if (!isActive) return;
    const random = createRuntimeSeededRandom("about-floating-quotes-v1");
    let spawnTimer;
    let cancelled = false;
    
    const spawnNext = () => {
      if (cancelled) return;
      if (availableIndicesRef.current.length > 0) {
        const rndIdxIdx = Math.floor(random() * availableIndicesRef.current.length);
        const quoteIdx = availableIndicesRef.current[rndIdxIdx];
        
        // Lock this quote: remove from available
        availableIndicesRef.current.splice(rndIdxIdx, 1);

        const text = COMMUNITY_QUOTES[quoteIdx];
        const fontStyles = ["font-serif italic", "font-sans font-black uppercase tracking-tighter", "font-mono font-bold tracking-widest", "font-serif underline font-medium"];
        const style = fontStyles[Math.floor(random() * fontStyles.length)];
        
        const quoteId = idCounter.current++;
        const newQuote = {
          id: quoteId,
          quoteIdx,
          text,
          style,
          pos: {
            x: random() * 70 + 15,
            y: random() * 70 + 15,
            dx: (random() - 0.5) * 150,
            dy: (random() - 0.5) * 150
          }
        };

        setActiveQuotes(prev => [...prev, newQuote]);

        // Lifespan of 8 seconds before removing
        scheduleTimeout(() => {
          setActiveQuotes(prev => prev.filter(q => q.id !== quoteId));
          // Unlock quote: return index to available pool
          if (!availableIndicesRef.current.includes(quoteIdx)) {
            availableIndicesRef.current.push(quoteIdx);
          }
        }, 8000);
      }

      // Rhythmic majestic spawning
      spawnTimer = scheduleTimeout(spawnNext, 1500 + random() * 1000);
    };

    spawnNext();
    return () => {
      cancelled = true;
      clearTimeout(spawnTimer);
    };
  }, [isActive, scheduleTimeout]);

  return (
    <div ref={containerRef} aria-hidden="true" className="absolute inset-0 z-[60] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {activeQuotes.map(q => (
          <FloatingQuote key={q.id} quote={q} />
        ))}
      </AnimatePresence>
    </div>
  );
}
