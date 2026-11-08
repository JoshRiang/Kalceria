"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTimeoutRegistry } from "../../hooks/useTimeoutRegistry";
import api from "@/lib/api";
import {
  makeCards,
  Timer,
  FlipGameCard,
  FlipGameQuitModal,
  FlipGameSaveModal,
  FlipGameSubmittingOverlay,
} from "./flipGame";

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
    setQuitChoice("yes");
    scheduleTimeout(() => {
      onQuit();
    }, 180);
  };

  const handleQuitNo = () => {
    setQuitChoice("no");
    scheduleTimeout(() => {
      setShowQuit(false);
      setQuitChoice(null);
    }, 180);
  };

  const handleSaveYesClick = () => {
    setSaveChoice("yes");
    scheduleTimeout(() => {
      handleSaveYes();
    }, 180);
  };

  const handleSaveNoClick = () => {
    setSaveChoice("no");
    scheduleTimeout(() => {
      handleSaveNo();
    }, 180);
  };

  const handleSaveYes = async () => {
    setShowSave(false);
    setSubmissionPhase("submitting");
    try {
      const submitPromise = api.post("/minigame/score", {
        ms,
        seed
      }).catch(() => {});
      const minDelay = new Promise(resolve => setTimeout(resolve, 1200));
      await Promise.all([submitPromise, minDelay]);
      setSubmissionPhase("idle");
      setBlurOut(true);
      scheduleTimeout(() => onFinish(), 1200);
    } catch {
      setSubmissionPhase("idle");
      setBlurOut(true);
      scheduleTimeout(() => onFinish(), 1200);
    }
  };

  const handleSaveNo = () => {
    setShowSave(false);
    api.post("/minigame/score", { ms, seed, skipped: true }).catch(() => {});
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
      {/* Back Button - Pure Icon Without Outer Box */}
      <button
        type="button"
        onClick={() => setShowQuit(true)}
        aria-label="Quit game"
        className="absolute top-4 left-4 sm:top-10 sm:left-10 z-50 flex items-center justify-center p-2 bg-transparent border-none text-white/80 hover:text-white transition-all hover:scale-110 active:scale-95 cursor-pointer outline-none select-none"
      >
        <svg 
          className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
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
            <FlipGameCard
              key={card.id}
              card={card}
              phase={phase}
              isFlipped={isFlipped}
              getCardTransform={getCardTransform}
              onClick={() => handleCardClick(card.id)}
            />
          );
        })}
      </div>

      {/* Quit Modal */}
      <FlipGameQuitModal
        showQuit={showQuit}
        quitChoice={quitChoice}
        onQuitYes={handleQuitYes}
        onQuitNo={handleQuitNo}
      />

      {/* Save Modal */}
      <FlipGameSaveModal
        showSave={showSave}
        ms={ms}
        saveChoice={saveChoice}
        onSaveYes={handleSaveYesClick}
        onSaveNo={handleSaveNoClick}
      />

      {/* Submitting Score Overlay */}
      <AnimatePresence>
        <FlipGameSubmittingOverlay submissionPhase={submissionPhase} />
      </AnimatePresence>
    </motion.div>
  );
}
