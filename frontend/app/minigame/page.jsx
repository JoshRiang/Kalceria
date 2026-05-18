"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FlipGame from "./FlipGame";

function MicroParticles({ active, stopping }) {
  const particles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 24; i++) {
      p.push({
        id: i,
        size: Math.random() * 4 + 2,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: Math.random() * 5 + 3.5,
        isGold: Math.random() > 0.5
      });
    }
    return p;
  }, []);

  return (
    <div className="absolute inset-0 z-[10] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {(active && !stopping) && (
          <div className="absolute inset-0">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ y: "110vh", opacity: 0 }}
                animate={{ y: "-10vh", opacity: [0, 1, 0], x: [0, (Math.random() - 0.5) * 100, 0] }}
                exit={{ opacity: 0, scale: 0, transition: { duration: Math.random() * 2 + 1 } }}
                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
                className="absolute rounded-full"
                style={{
                  width: p.size, height: p.size, left: `${p.left}%`,
                  backgroundColor: p.isGold ? "#fbbf24" : "#22c55e",
                  boxShadow: `0 0 10px ${p.isGold ? "#fbbf24" : "#22c55e"}`
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getResetCountdown() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Math.floor((tomorrow - now) / 1000);
}

function ResetTimer() {
  const [secs, setSecs] = useState(getResetCountdown);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return <span className="text-white font-sans tracking-tighter underline underline-offset-4 decoration-white/20">{h}h {m}m {s}s</span>;
}

function LineParticles() {
  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];
  const particles = useMemo(() => Array.from({ length: 60 }).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 7 + 2,
    duration: 1.5 + Math.random() * 2,
    delay: Math.random() * 3,
    xDrift: (Math.random() - 0.5) * 200,
    yDrift: (Math.random() - 0.5) * 200
  })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-0">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 15px ${p.color}`
          }}
          animate={{
            x: [0, p.xDrift],
            y: [0, p.yDrift],
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5]
          }}
          transition={{ 
            duration: p.duration, 
            repeat: Infinity, 
            ease: "easeOut", 
            delay: p.delay 
          }}
        />
      ))}
    </div>
  );
}

function DecorativeCard() {
  const generateContent = () => {
    const type = Math.floor(Math.random() * 3);
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    let char = "";
    if (type === 0) char = Math.floor(Math.random() * 10);
    else if (type === 1) char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    else {
      const shapes = ["●", "■", "▲", "◆", "▼", "✖"];
      char = shapes[Math.floor(Math.random() * shapes.length)];
    }
    return { char, color };
  };

  const [isFlipped, setIsFlipped] = useState(false);
  const [content, setContent] = useState(generateContent);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipped(f => {
        if (f) setTimeout(() => setContent(generateContent()), 400);
        return !f;
      });
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-14 h-16" style={{ perspective: "1000px" }}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-0 bg-white rounded-xl flex items-center justify-center p-2 shadow-xl border border-black/5" style={{ backfaceVisibility: "hidden" }}>
          <img src="/favicon.webp" alt="" className="w-8 h-8 opacity-70 object-contain" />
        </div>
        <div className="absolute inset-0 bg-white rounded-xl flex items-center justify-center p-2 shadow-xl border border-black/5" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
          <span className="font-black text-3xl select-none" style={{ 
            color: content.color,
            textShadow: `
              0 1px 0 rgba(0,0,0,0.1),
              0 2px 0 rgba(0,0,0,0.1),
              0 3px 0 rgba(0,0,0,0.1),
              0 4px 0 rgba(0,0,0,0.1),
              0 5px 0 rgba(0,0,0,0.2),
              0 6px 1px rgba(0,0,0,0.1),
              0 0 5px rgba(0,0,0,0.1)
            `,
            transform: "translateY(-2px)"
          }}>
            {content.char}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default function MinigamePage() {
  const [showInfo, setShowInfo] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isGameStarting, setIsGameStarting] = useState(false);
  const [isGameEnding, setIsGameEnding] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [attempt, setAttempt] = useState(1); // 1 = has attempt, 0 = used up
  const [showReset, setShowReset] = useState(false);
  const videoRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (showTrailer && videoRef.current) {
      videoRef.current.volume = 0.8;
      const interval = setInterval(() => {
        if (videoRef.current && videoRef.current.volume < 1) {
          videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.02);
        } else clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [showTrailer]);

  const handlePlayIt = () => {
    if (attempt === 0) return;
    setIsGameStarting(true);
    setTimeout(() => setInGame(true), 1800);
  };

  const handleQuit = () => {
    // Quit doesn't use up attempt
    setInGame(false);
    setIsGameStarting(false);
  };

  const handleFinish = (score, saved) => {
    // After game finishes, attempt becomes 0, start ending sequence
    setAttempt(0);
    setIsGameEnding(true);
    
    // Gradual cleanup and transition back to landing page state
    setTimeout(() => {
      setInGame(false);
      setIsGameStarting(false);
      setIsGameEnding(false);
      setShowReset(true);
    }, 2800); // Sequential timing to match the exit animation layers
  };

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden select-none">

      {/* In-Game Overlay */}
      <AnimatePresence>
        {inGame && (
          <FlipGame attempt={attempt} onQuit={handleQuit} onFinish={handleFinish} />
        )}
      </AnimatePresence>

      {/* Background */}
      <motion.div
        animate={{ 
          opacity: isGameStarting ? (isGameEnding ? 1 : 0.4) : 1,
          transition: { duration: 2.5, ease: "easeInOut" } 
        }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${isMobile ? '/hp/bg_game_hp.webp' : '/bg_game.webp'})` }} />
        <div className="absolute inset-0 bg-black/10" />
      </motion.div>

      {/* Magenta Bleed Effect */}
      <AnimatePresence>
        {(isGameStarting && !isGameEnding) && (
          <div className="absolute inset-0 z-[100] pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2 } }} className="absolute top-0 left-0 right-0 h-[15vh] bg-gradient-to-b from-fuchsia-600 to-transparent blur-[80px]" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2 } }} className="absolute bottom-0 left-0 right-0 h-[15vh] bg-gradient-to-t from-fuchsia-600 to-transparent blur-[80px]" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2 } }} className="absolute left-0 top-0 bottom-0 w-[15vw] bg-gradient-to-r from-fuchsia-600 to-transparent blur-[80px]" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2 } }} className="absolute right-0 top-0 bottom-0 w-[15vw] bg-gradient-to-l from-fuchsia-600 to-transparent blur-[80px]" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2.5 } }} className="absolute top-0 left-0 w-32 h-32 bg-fuchsia-500 rounded-full blur-[60px]" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2.5 } }} className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500 rounded-full blur-[60px]" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2.5 } }} className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500 rounded-full blur-[60px]" />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0, transition: { duration: 2.5 } }} className="absolute bottom-0 right-0 w-32 h-32 bg-fuchsia-500 rounded-full blur-[60px]" />
          </div>
        )}
      </AnimatePresence>

      <MicroParticles active={isGameStarting} stopping={isGameEnding} />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, filter: "blur(40px) brightness(0.5)" }}
        animate={{ opacity: 1, filter: "blur(0px) brightness(1)", transition: { duration: 1.5, ease: [0.16, 1, 0.3, 1] } }}
        className="relative w-full h-screen flex flex-col items-center"
      >
        {/* Title */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(30px)" : "blur(0px)",
            transition: { opacity: { duration: 1 }, filter: { duration: 1 } }
          }}
          className="relative z-20 mt-[12vh] text-center"
        >
          <motion.h1
            initial={{ y: -50, opacity: 0 }}
            animate={{ 
              y: [0, -8, 0], // Floating tipis-tipis
              opacity: 1 
            }}
            transition={{ 
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 1.5, delay: 0.5, ease: "easeOut" }
            }}
            className="text-[7.8rem] md:text-[9rem] font-black tracking-tighter text-white font-rog whitespace-nowrap"
            style={{ textShadow: "0 0 20px rgba(255,255,0,0.6), 0 0 40px rgba(255,255,0,0.3), 0 10px 30px rgba(0,0,0,0.5)" }}
          >
            KALCER'S GAME
          </motion.h1>

          {/* Decorative Cards Area */}
          <div className="flex justify-center gap-4 mt-6 h-20">
            {[0, 1, 2, 3].map(i => <DecorativeCard key={i} />)}
          </div>
        </motion.div>

        {/* PLAY IT + Attempt - Horizontal Layout */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(20px)" : "blur(0px)",
            pointerEvents: isGameStarting ? "none" : "auto",
            transition: { opacity: { duration: 0.8 } }
          }}
          className="relative z-20 flex items-center gap-10 mt-[8vh]"
        >
          <div className="relative group">
            <button
              onClick={handlePlayIt}
              disabled={attempt === 0}
              className="relative z-10 text-4xl md:text-5xl font-rog font-black text-white tracking-[0.2em] hover:scale-105 transition-transform duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                textShadow: "0px 1px 0px #999, 0px 2px 0px #888, 0px 3px 0px #777, 0px 4px 0px #666, 0px 5px 30px rgba(0,0,0,0.9)"
              }}
            >
              PLAY IT
            </button>

            {/* Hand Icon - Pointing to the button */}
            {attempt > 0 && (
              <motion.div
                animate={{ y: [0, 10, 0, 7, 0], scale: [1, 1.1, 1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[40%] left-[35%] pointer-events-none opacity-95 -rotate-[20deg] z-[50]"
              >
                <img src="/hand_point.webp" alt="Point" className="w-[6rem] h-[6rem] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
              </motion.div>
            )}
          </div>

          {/* Info Section - Now to the Right, Symmetrical and Balanced */}
          <div className="flex flex-col gap-2 translate-x-[5%]">
            <div className="flex items-center justify-center gap-6 px-8 py-2 min-w-[250px] bg-black/40 backdrop-blur-[20px] rounded-2xl border border-white/10 shadow-2xl">
              <span className="text-white font-sans text-xl tracking-tighter underline underline-offset-8 decoration-white/20">Attempt :</span>
              <span className="text-white font-sans text-xl tracking-tighter">{attempt}</span>
            </div>

            {/* Reset Countdown */}
            <AnimatePresence>
              {showReset && attempt === 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-center gap-6 px-8 py-2 min-w-[250px] bg-black/40 backdrop-blur-[20px] rounded-2xl border border-white/10 shadow-2xl"
                >
                  <span className="text-white font-sans text-xl tracking-tighter underline underline-offset-8 decoration-white/20">Reset :</span>
                  <div className="text-xl font-sans tracking-tighter">
                    <ResetTimer />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom Right Buttons */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(20px)" : "blur(0px)",
            pointerEvents: isGameStarting ? "none" : "auto",
            transition: { duration: 0.8 }
          }}
          className="absolute bottom-[4%] right-[2%] z-30 flex items-center justify-center gap-6"
        >
          <motion.div whileHover={{ scale: 1.05 }} onClick={() => setShowTrailer(true)} className="relative group cursor-pointer">
            <div className="relative w-[180px] py-3 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-[20px] shadow-2xl">
              <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-50%] left-[-20%] w-[120%] h-[150%] bg-amber-500 rounded-full blur-[40px]" />
                <motion.div animate={{ scale: [1.3, 1, 1.3], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-[-50%] right-[-20%] w-[120%] h-[150%] bg-red-600 rounded-full blur-[40px]" />
              </div>
              <span className="relative z-10 text-xl font-rog font-black text-white tracking-widest" style={{ textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 10px rgba(0,0,0,0.8)" }}>THE EVENT</span>
            </div>
          </motion.div>
          <div className="relative group w-10 h-10">
            {/* Green blob behind the glass */}
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-green-500/60 blur-[6px]" />
            </div>
            <button onClick={() => setShowInfo(true)} className="relative z-10 w-full h-full rounded-full border border-white/20 bg-black/40 backdrop-blur-[20px] flex items-center justify-center text-white font-serif text-xl hover:bg-black/60 hover:scale-110 transition-all shadow-lg">
              <span>i</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Trailer Modal */}
      <AnimatePresence>
        {showTrailer && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 overflow-y-auto bg-black/90">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} onClick={() => setShowTrailer(false)} className="absolute inset-0 cursor-pointer" />
            <div className="relative flex flex-col items-center py-12 min-h-full justify-center">
              <motion.div initial={{ opacity: 0, y: 10, filter: "blur(20px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: 20, filter: "blur(40px)", transition: { duration: 0.8 } }} transition={{ duration: 1.5 }} className="text-center mb-10 max-w-sm relative">
                <div className="flex items-center justify-center gap-4">
                  <h2 className="text-4xl font-black italic tracking-tighter text-white mb-2" style={{ textShadow: "3px 3px 0px #d946ef" }}>SOCIAL CULT</h2>
                  <button onClick={() => setShowTrailer(false)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all shadow-2xl border border-white/20 group overflow-hidden relative translate-x-2">
                    <div className="absolute inset-0 bg-red-600/60 blur-[4px] rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
                    <svg className="relative z-10 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-[10px] font-sans text-white leading-relaxed px-6 opacity-60">A revolutionary fusion of high-performance automotive engineering and urban street culture. Join the collective as we redefine the boundaries of style and speed.</p>
              </motion.div>

              <div className="relative">
                {/* Floating ge images around the card - More Spread & Smaller */}
                {[
                  { src: "/ge_1.webp", pos: isMobile ? "-top-12 -left-26" : "-top-24 -left-40", rot: -15, delay: 0 },
                  { src: "/ge_2.webp", pos: isMobile ? "-top-10 -right-24" : "-top-20 -right-36", rot: 20, delay: 0.5 },
                  { src: "/ge_3.webp", pos: isMobile ? "bottom-[-16%] -left-26" : "bottom-[5%] -left-48", rot: 10, delay: 1 },
                  { src: "/ge_4.webp", pos: isMobile ? "bottom-[-14%] -right-24" : "bottom-[7%] -right-44", rot: -10, delay: 1.5 },
                ].map((ge, idx) => (
                  <motion.img
                    key={idx}
                    src={ge.src}
                    initial={{ opacity: 0, scale: 0.5, rotate: ge.rot }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      y: [0, -10, 0],
                      rotate: [ge.rot, ge.rot + 5, ge.rot]
                    }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ 
                      opacity: { duration: 0.8, delay: 0.5 + idx * 0.1 },
                      scale: { duration: 0.8, delay: 0.5 + idx * 0.1 },
                      y: { duration: 4 + idx, repeat: Infinity, ease: "easeInOut", delay: ge.delay },
                      rotate: { duration: 5 + idx, repeat: Infinity, ease: "easeInOut", delay: ge.delay }
                    }}
                    className={`absolute ${ge.pos} ${isMobile ? "w-20" : "w-24 md:w-36"} h-auto object-contain z-20 drop-shadow-2xl pointer-events-none`}
                  />
                ))}

                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20, filter: "blur(30px)" }} 
                  animate={{ opacity: 1, scale: 1, y: [0, -6, 0], filter: "blur(0px)" }} 
                  exit={{ opacity: 0, scale: 0.9, y: 40, filter: "blur(50px)", transition: { duration: 0.8 } }} 
                  transition={{ duration: 1.5, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }} 
                  className="relative w-[280px] md:w-[320px] aspect-[9/16] rounded-[2.5rem] border border-yellow-500/50 shadow-[0_0_60px_rgba(251,191,36,0.4)] bg-black mt-[-2rem] overflow-visible"
                >
                  {/* Golden Glow Pulse */}
                  <motion.div
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-[-10%] bg-yellow-500/20 blur-[40px] rounded-[3rem] z-0"
                  />

                  {/* Rainbow Particles */}
                  <LineParticles />

                  <div className="relative w-full h-full z-10 overflow-hidden rounded-[2.5rem] border border-white/10">
                    <video ref={videoRef} src="/trailer.mp4" controls autoPlay className="w-full h-full object-cover" />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInfo(false)} className="absolute inset-0 bg-black/80 cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg p-10 overflow-hidden rounded-[2.5rem] border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
              <div className="absolute inset-0 z-0 bg-black/95" />
              <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[40%] -left-[20%] w-[120%] h-[120%] bg-indigo-900 rounded-full blur-[80px]" />
                <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -bottom-[40%] -right-[20%] w-[120%] h-[120%] bg-purple-800 rounded-full blur-[80px]" />
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-rog font-black text-white mb-8 tracking-tighter uppercase border-b border-white/10 pb-4">Game Rules</h3>
                <div className="space-y-6 text-white font-sans text-sm leading-relaxed">
                  <div className="flex gap-4"><span className="font-bold">1.</span><p>Every registered user is granted 1 (one) attempt daily until the day before the event (H-1).</p></div>
                  <div className="flex gap-4"><span className="font-bold">2.</span><p>The score achieved in the first attempt will be saved automatically.</p></div>
                  <div className="flex gap-4"><span className="font-bold">3.</span><p>During the second attempt, users can choose whether to keep the newest score or retain their previous one.</p></div>
                  <div className="flex gap-4"><span className="font-bold">4.</span><p>Users compete for the top leaderboard spots until H-1; those with the highest scores will be selected to win an <span className="italic underline decoration-purple-400 underline-offset-4">Event Voucher</span>.</p></div>
                </div>
                <button onClick={() => setShowInfo(false)} className="mt-10 w-full py-4 bg-white/10 border border-white/20 rounded-xl font-sans font-black uppercase text-xs tracking-widest text-white hover:bg-white/20 transition-all active:scale-95">Understood</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Initial Blackout */}
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="fixed inset-0 z-[2000] bg-black pointer-events-none" />
    </main>
  );
}
