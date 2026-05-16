"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CARD_IMAGES = ["/ge_1.png", "/ge_2.png", "/ge_3.png", "/ge_4.png"];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards() {
  const pairs = [...CARD_IMAGES, ...CARD_IMAGES];
  const shuffled = shuffleArray(pairs);
  return shuffled.map((img, i) => ({
    id: i, 
    img, 
    flipped: false, 
    matched: false,
    gridX: i % 4,
    gridY: Math.floor(i / 4)
  }));
}

function Timer({ ms }) {
  const m = String(Math.floor(ms / 6000)).padStart(2, "0");
  const s = String(Math.floor((ms % 6000) / 100)).padStart(2, "0");
  const mil = String(ms % 100).padStart(2, "0");
  return (
    <div className="flex items-baseline justify-center gap-1 font-sans font-black text-white tracking-tighter leading-none tabular-nums" style={{
      textShadow: "0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(0,0,0,0.5)"
    }}>
      <span className="text-[5rem]">{m}:{s}</span>
      <span className="text-[2rem] opacity-60">:{mil}</span>
    </div>
  );
}

export default function FlipGame({ onQuit, onFinish }) {
  const [cards, setCards] = useState(() => makeCards());
  const [phase, setPhase] = useState("intro"); // intro | faceup | facedown | absorb | spread | playing | done
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const [ms, setMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [blurOut, setBlurOut] = useState(false);
  
  const lockRef = useRef(false);
  const timerRef = useRef(null);

  // Step 1: Intro - Reveal all 8 cards one by one
  useEffect(() => {
    if (phase !== "intro") return;
    
    // We'll use a staggered approach.
    // Transition to faceup after all cards are likely revealed.
    const timer = setTimeout(() => {
      setPhase("faceup");
    }, 150 * 8 + 600);
    
    return () => clearTimeout(timer);
  }, [phase]);

  // Step 2: Show Faces
  useEffect(() => {
    if (phase !== "faceup") return;
    setCards(prev => prev.map(c => ({ ...c, flipped: true })));
    setTimeout(() => setPhase("facedown"), 1800);
  }, [phase]);

  // Step 3: Flip Down
  useEffect(() => {
    if (phase !== "facedown") return;
    setCards(prev => prev.map(c => ({ ...c, flipped: false })));
    setTimeout(() => setPhase("absorb"), 800);
  }, [phase]);

  // Step 4: Absorb to Center
  useEffect(() => {
    if (phase !== "absorb") return;
    setTimeout(() => {
      // Re-shuffle and prepare spread
      setCards(makeCards());
      setPhase("spread");
    }, 1000);
  }, [phase]);

  // Step 5: Spread Out
  useEffect(() => {
    if (phase !== "spread") return;
    setTimeout(() => {
      setPhase("playing");
      setTimerOn(true);
    }, 800);
  }, [phase]);

  // Timer
  useEffect(() => {
    if (timerOn) {
      timerRef.current = setInterval(() => setMs(t => t + 1), 10);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerOn]);

  // Win condition
  useEffect(() => {
    if (matched.length === 8 && timerOn) {
      setTimerOn(false);
      setPhase("done");
      setTimeout(() => setShowSave(true), 800);
    }
  }, [matched, timerOn]);

  const handleCardClick = (id) => {
    if (lockRef.current || phase !== "playing") return;
    if (selected.includes(id) || matched.includes(id)) return;
    if (selected.length >= 2) return;

    const newSel = [...selected, id];
    setSelected(newSel);
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));

    if (newSel.length === 2) {
      lockRef.current = true;
      const [aId, bId] = newSel;
      const cardA = cards.find(c => c.id === aId);
      const cardB = cards.find(c => c.id === bId);

      setTimeout(() => {
        if (cardA.img === cardB.img) {
          setMatched(prev => [...prev, aId, bId]);
          setCards(prev => prev.map(c => 
            (c.id === aId || c.id === bId) ? { ...c, matched: true } : c
          ));
        } else {
          setCards(prev => prev.map(c => 
            (c.id === aId || c.id === bId) ? { ...c, flipped: false } : c
          ));
        }
        setSelected([]);
        lockRef.current = false;
      }, 800);
    }
  };

  const getCardTransform = (card) => {
    if (phase === "absorb") {
      const centerX = 1.5;
      const centerY = 0.5;
      const moveX = (centerX - card.gridX) * 140;
      const moveY = (centerY - card.gridY) * 180;
      return { x: moveX, y: moveY, scale: 0.8, rotate: card.id * 10 };
    }
    return { x: 0, y: 0, scale: 1, rotate: 0 };
  };

  const handleSaveYes = () => {
    setShowSave(false);
    setShowSubmitted(true);
    setTimeout(() => {
      setShowSubmitted(false);
      setBlurOut(true);
      setTimeout(() => onFinish(), 1400);
    }, 3200);
  };

  const handleSaveNo = () => {
    setShowSave(false);
    setBlurOut(true);
    setTimeout(() => onFinish(), 1200);
  };

  const handleQuit = () => {
    setShowQuit(false);
    setBlurOut(true);
    setTimeout(() => onFinish(), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: blurOut ? 0 : 1, filter: blurOut ? "blur(40px)" : "blur(0px)" }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-transparent"
    >
      {/* 3-Layer Sequential Blur Exit Overlay */}
      <AnimatePresence>
        {blurOut && (
          <>
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(15px)" }}
              transition={{ duration: 0.6 }}
              className="fixed inset-0 z-[5000] bg-black/30"
            />
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(30px)" }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="fixed inset-0 z-[5001] bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(60px)" }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="fixed inset-0 z-[5002] bg-black/80"
            />
          </>
        )}
      </AnimatePresence>
      {/* Back Button - Bold Left Arrow */}
      <button
        onClick={() => setShowQuit(true)}
        className="absolute top-10 left-10 z-50 flex items-center justify-center w-14 h-14 rounded-2xl group transition-all hover:scale-110 active:scale-95"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -top-4 -left-4 w-20 h-20 bg-red-600 rounded-full blur-[30px] opacity-70" />
        </div>
        <svg 
          className="relative z-10 w-6 h-6 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Timer Header */}
      <div className="mb-10 text-center relative z-10">
        <Timer ms={ms} />
        <p className="text-white font-sans text-xl tracking-tighter mt-4">
          {phase === "intro" || phase === "faceup" || phase === "facedown" ? "Feel it coming" : "Find all matches"}
        </p>
      </div>

      {/* Grid Container - CLEAN, NO OUTER BOX */}
      <div className="relative grid grid-cols-4 gap-8">
        {cards.map((card) => {
          const isFlipped = card.flipped || card.matched;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ 
                opacity: 1,
                scale: (phase === "playing" && !isFlipped) ? [1, 0.95, 1] : 1,
                y: 0,
                ...getCardTransform(card)
              }}
              transition={{ 
                opacity: { delay: phase === "intro" ? card.id * 0.15 : 0, duration: 0.4 },
                scale: (phase === "playing" && !isFlipped) 
                  ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  : { delay: phase === "intro" ? card.id * 0.15 : 0, duration: 0.4 },
                y: { delay: phase === "intro" ? card.id * 0.15 : 0, duration: 0.4 },
                x: { duration: 0.5 }, // For absorb
                rotate: { duration: 0.5 } // For absorb
              }}
              onClick={() => handleCardClick(card.id)}
              className="relative w-[145px] h-[180px] cursor-pointer"
              style={{ perspective: "1000px" }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.45, 0.05, 0.55, 0.95] }}
                style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
              >
                {/* Back (White with Stretched Logo) */}
                <div style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden",
                  background: "#ffffff", borderRadius: "1.25rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  padding: "15px"
                }}>
                   <img src="/favicon.png" alt="Logo" className="w-[80px] h-[80px] opacity-40 object-contain" />
                </div>
                {/* Front (Face Image) */}
                <div style={{
                  position: "absolute", inset: 0, backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  background: "#ffffff", borderRadius: "1.25rem",
                  overflow: "hidden",
                  border: card.matched ? "4px solid #22c55e" : "none",
                  boxShadow: card.matched ? "0 0 40px rgba(34,197,94,0.6)" : "0 15px 35px rgba(0,0,0,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "15%"
                }}>
                  <img src={card.img} alt="Card" className="w-full h-full object-contain" />
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Quit Modal */}
      <AnimatePresence>
        {showQuit && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowQuit(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -5, 0]
              }} 
              transition={{
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-10 text-center shadow-2xl max-w-sm w-full overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute inset-0 bg-black rounded-full blur-3xl" />
              </div>
              <h3 className="relative z-10 text-xl font-sans font-bold text-white mb-8 tracking-tighter">Quit the game?</h3>
              <div className="relative z-10 flex gap-4">
                <button onClick={() => onQuit()} className="flex-1 py-4 bg-red-600 rounded-xl text-white font-black uppercase tracking-tighter hover:bg-red-700 transition-all">Yes</button>
                <button onClick={() => setShowQuit(false)} className="flex-1 py-4 bg-white/10 rounded-xl text-white font-black uppercase tracking-tighter hover:bg-white/20 transition-all">No</button>
              </div>
            </motion.div>
          </div>
        )}

        {showSave && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -5, 0]
              }} 
              transition={{
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-12 text-center shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[30%] -left-[20%] w-[100%] h-[100%] bg-fuchsia-600 rounded-full blur-[60px]" />
                <motion.div animate={{ scale: [1.3, 1, 1.3], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -bottom-[30%] -right-[20%] w-[100%] h-[100%] bg-amber-500 rounded-full blur-[60px]" />
              </div>

              <div className="relative z-10">
                <p className="text-white font-sans text-xl tracking-tighter mb-4">Final Time</p>
                <Timer ms={ms} />
                <h3 className="text-xl font-sans font-bold text-white mt-10 mb-10 tracking-tighter">Save this score?</h3>
                <div className="flex gap-4">
                  <button onClick={() => handleSaveYes()} className="flex-1 py-4 bg-white text-black font-black uppercase tracking-tighter rounded-xl hover:bg-white/90 transition-all">Yes</button>
                  <button onClick={() => handleSaveNo()} className="flex-1 py-4 bg-white/10 rounded-xl text-white font-black uppercase tracking-tighter hover:bg-white/20 transition-all">No</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSubmitted && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[700] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
            <div className="relative flex flex-col items-center">
              <div className="text-center">
                <motion.h2 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "linear" }}
                  className="overflow-hidden whitespace-nowrap text-5xl font-sans font-black text-emerald-400 tracking-tighter filter drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                >
                  Score Submitted
                </motion.h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
