"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTimeoutRegistry } from "../../hooks/useTimeoutRegistry";
import { createSeededRandom } from "@/lib/seededRandom";
import api from "@/lib/api";

const CARD_IMAGES = ["/ge_1.webp", "/ge_2.webp", "/ge_3.webp", "/ge_4.webp"];

function shuffleArray(arr, seed) {
  const a = [...arr];
  const random = createSeededRandom(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards(seed) {
  const pairs = [...CARD_IMAGES, ...CARD_IMAGES];
  const shuffled = shuffleArray(pairs, seed);
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
      <span className="text-4xl sm:text-6xl md:text-[5rem]">{m}:{s}</span>
      <span className="text-xl sm:text-2xl md:text-[2rem] opacity-60">:{mil}</span>
    </div>
  );
}

export default function FlipGame({ seed, onQuit, onFinish }) {
  const [cards, setCards] = useState(() => makeCards(`${seed}:opening`));
  const [phase, setPhase] = useState("intro"); // intro | faceup | facedown | absorb | spread | playing | done
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState([]);
  const [ms, setMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState("idle"); // idle | submitting | submitted
  const [blurOut, setBlurOut] = useState(false);
  const [quitChoice, setQuitChoice] = useState(null); // 'yes' | 'no' | null
  const [saveChoice, setSaveChoice] = useState(null); // 'yes' | 'no' | null
  
  const lockRef = useRef(false);
  const timerRef = useRef(null);
  const scheduleTimeout = useTimeoutRegistry();

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- This phase transition starts the existing timed card reveal.
    setCards(prev => prev.map(c => ({ ...c, flipped: true })));
    scheduleTimeout(() => setPhase("facedown"), 1800);
  }, [phase, scheduleTimeout]);

  // Step 3: Flip Down
  useEffect(() => {
    if (phase !== "facedown") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- This phase transition starts the existing timed card hide.
    setCards(prev => prev.map(c => ({ ...c, flipped: false })));
    scheduleTimeout(() => setPhase("absorb"), 800);
  }, [phase, scheduleTimeout]);

  // Step 4: Absorb to Center
  useEffect(() => {
    if (phase !== "absorb") return;
    scheduleTimeout(() => {
      // Re-shuffle and prepare spread
      setCards(makeCards(`${seed}:layout`));
      setPhase("spread");
    }, 1000);
  }, [phase, scheduleTimeout, seed]);

  // Step 5: Spread Out
  useEffect(() => {
    if (phase !== "spread") return;
    scheduleTimeout(() => {
      setPhase("playing");
      setTimerOn(true);
    }, 800);
  }, [phase, scheduleTimeout]);

  // Timer - automatically pauses when showQuit (pause) is active
  useEffect(() => {
    if (timerOn && !showQuit) {
      timerRef.current = setInterval(() => setMs(t => t + 1), 10);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerOn, showQuit]);

  // Win condition
  useEffect(() => {
    if (matched.length === 8 && timerOn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Winning ends the clock and advances the existing game timeline.
      setTimerOn(false);
      setPhase("done");
      scheduleTimeout(() => setShowSave(true), 800);
    }
  }, [matched, timerOn, scheduleTimeout]);

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

      scheduleTimeout(() => {
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

  const handleQuitYes = () => {
    setQuitChoice('yes');
    scheduleTimeout(() => {
      onQuit();
    }, 180);
  };

  const handleQuitNo = () => {
    setQuitChoice('no');
    scheduleTimeout(() => {
      setShowQuit(false);
      setQuitChoice(null);
    }, 180);
  };

  const handleSaveYesClick = () => {
    setSaveChoice('yes');
    scheduleTimeout(() => {
      handleSaveYes();
    }, 180);
  };

  const handleSaveNoClick = () => {
    setSaveChoice('no');
    scheduleTimeout(() => {
      handleSaveNo();
    }, 180);
  };

  const handleSaveYes = async () => {
    setShowSave(false);
    setSubmissionPhase("submitting");
    try {
      const submitPromise = api.post("/map/telemetry", {
        type: "MINIGAME_SCORE",
        ms,
        seed
      }).catch(() => {});
      const minDelay = new Promise(resolve => setTimeout(resolve, 1400));
      await Promise.all([submitPromise, minDelay]);
      setSubmissionPhase("submitted");
      scheduleTimeout(() => {
        setSubmissionPhase("idle");
        setBlurOut(true);
        scheduleTimeout(() => onFinish(), 1400);
      }, 1200);
    } catch {
      setSubmissionPhase("submitted");
      scheduleTimeout(() => {
        setSubmissionPhase("idle");
        setBlurOut(true);
        scheduleTimeout(() => onFinish(), 1400);
      }, 1200);
    }
  };

  const handleSaveNo = () => {
    setShowSave(false);
    setBlurOut(true);
    scheduleTimeout(() => onFinish(), 1200);
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
      {/* Back Button - Cloudy Borderless */}
      <button
        onClick={() => setShowQuit(true)}
        className="absolute top-4 left-4 sm:top-10 sm:left-10 z-50 flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-2xl border-none shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] group transition-all hover:scale-105 active:scale-95 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-60">
          <div className="absolute -top-3 -left-3 w-14 h-14 bg-[#FFB07C] rounded-full blur-[18px] opacity-70" />
          <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-cyan-400 rounded-full blur-[18px] opacity-60" />
        </div>
        <svg 
          className="relative z-10 w-5 h-5 sm:w-6 sm:h-6 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Timer Header */}
      <div className="mb-6 sm:mb-10 text-center relative z-10">
        <Timer ms={ms} />
        <p className="text-white font-sans text-base sm:text-xl tracking-tighter mt-2 sm:mt-4">
          {phase === "intro" || phase === "faceup" || phase === "facedown" ? "Feel it coming" : "Find all matches"}
        </p>
      </div>

      {/* Grid Container - CLEAN, NO OUTER BOX */}
      <div className="relative grid grid-cols-4 gap-2 xs:gap-3 sm:gap-6 md:gap-8 max-w-[95vw] px-2">
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
              className="relative w-[70px] h-[92px] xs:w-[90px] xs:h-[118px] sm:w-[120px] sm:h-[155px] md:w-[145px] md:h-[180px] cursor-pointer"
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
                  padding: "10px"
                }}>
                   <Image src="/favicon.webp" alt="Logo" width={771} height={681} unoptimized loading="eager" decoding="auto" className="w-[45px] h-[45px] sm:w-[80px] sm:h-[80px] opacity-40 object-contain" />
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
                  <Image src={card.img} alt="Card" width={512} height={512} unoptimized loading="lazy" className="w-full h-full object-contain" />
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-2xl" 
              onClick={handleQuitNo} 
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
                  onClick={handleQuitYes} 
                  className={`font-sans font-black uppercase tracking-tighter text-xl sm:text-2xl md:text-3xl transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none ${
                    quitChoice === 'yes' ? 'text-red-600' : 'text-white hover:text-red-500 active:text-red-600'
                  }`}
                  style={{
                    textShadow: quitChoice === 'yes' 
                      ? "0 0 20px rgba(220,38,38,0.9), 0 2px 10px rgba(0,0,0,0.8)" 
                      : "0 2px 12px rgba(0,0,0,0.8)"
                  }}
                >
                  Yes
                </button>
                <button 
                  type="button"
                  onClick={handleQuitNo} 
                  className={`font-sans font-black uppercase tracking-tighter text-xl sm:text-2xl md:text-3xl transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none ${
                    quitChoice === 'no' ? 'text-black' : 'text-white hover:text-black active:text-black'
                  }`}
                  style={{
                    textShadow: quitChoice === 'no' 
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

        {showSave && (
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
                  onClick={handleSaveYesClick} 
                  className={`font-sans font-black uppercase tracking-tighter text-xl sm:text-2xl md:text-3xl transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none ${
                    saveChoice === 'yes' ? 'text-red-600' : 'text-white hover:text-red-500 active:text-red-600'
                  }`}
                  style={{
                    textShadow: saveChoice === 'yes' 
                      ? "0 0 20px rgba(220,38,38,0.9), 0 2px 10px rgba(0,0,0,0.8)" 
                      : "0 2px 12px rgba(0,0,0,0.8)"
                  }}
                >
                  Yes
                </button>
                <button 
                  type="button"
                  onClick={handleSaveNoClick} 
                  className={`font-sans font-black uppercase tracking-tighter text-xl sm:text-2xl md:text-3xl transition-colors duration-200 outline-none border-none bg-transparent cursor-pointer p-0 select-none ${
                    saveChoice === 'no' ? 'text-black' : 'text-white hover:text-black active:text-black'
                  }`}
                  style={{
                    textShadow: saveChoice === 'no' 
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

        {submissionPhase !== "idle" && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.95, filter: "blur(20px)" }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[700] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {/* Preserved blurred BG behind */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />

            <div className="relative z-10 flex flex-col items-center justify-center px-4">
              {submissionPhase === "submitting" ? (
                <>
                  {/* BIG Responsive Arc Spinner matching LOGGING OUT */}
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
                  <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                    SUBMITTING SCORE
                  </p>
                </>
              ) : (
                <motion.p 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-emerald-400 font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-100 drop-shadow-[0_0_25px_rgba(52,211,153,0.8)]"
                >
                  SCORE SUBMITTED
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
