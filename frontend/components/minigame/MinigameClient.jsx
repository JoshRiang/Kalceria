"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import api from "@/lib/api";
import { MinigameEditorialBackdrop } from "./MinigameEditorialBackdrop";
import {
  MicroParticles,
  DecorativeCard,
  ResetTimer,
  DueTimer,
  MinigameTrailerModal,
  MinigameRulesModal,
} from "./client";

const FlipGame = dynamic(() => import("@/app/minigame/FlipGame"), { ssr: false });

// crisp black architectural 3D bevel relief (zero glow)
const TITLE_BEVEL_SHADOW =
  "0px 1px 0px #2b303a, 0px 2px 0px #414957, 0px 3px 0px #596375, 0px 4px 0px #727d92, 0px 5px 0px #8c98ae, 0px 8px 18px rgba(0,0,0,0.22)";
const ACTION_BEVEL_SHADOW =
  "0px 1px 0px #2c313b, 0px 2px 0px #454d5c, 0px 3px 0px #626c7f, 0px 4px 0px #808ba0, 0px 6px 14px rgba(0,0,0,0.22)";
const COMPACT_BEVEL_SHADOW =
  "0px 1px 0px #2e3440, 0px 2px 0px #4c566a, 0px 3px 0px #6d788d, 0px 5px 10px rgba(0,0,0,0.20)";

export default function MinigamePage() {
  const [showInfo, setShowInfo] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [gamePhase, setGamePhase] = useState("idle");
  const [attempt, setAttempt] = useState(1);
  const [targetEvent, setTargetEvent] = useState(null);
  const videoRef = useRef(null);
  const [gameSeed, setGameSeed] = useState("");
  const scheduleTimeout = useTimeoutRegistry();

  useEffect(() => {
    let active = true;
    api.get("/minigame/status")
      .then((res) => {
        if (!active) return;
        if (typeof res.data?.attempt === "number") setAttempt(res.data.attempt);
        if (res.data?.targetEvent) setTargetEvent(res.data.targetEvent);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const isGameStarting = gamePhase === "starting" || gamePhase === "playing" || gamePhase === "ending";
  const isGameEnding = gamePhase === "ending" || gamePhase === "ending-quit";
  const inGame = gamePhase === "playing" || gamePhase === "ending";
  const showReset = gamePhase === "finished";

  const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
  const isTargetActive = Boolean(targetEvent?.hasTarget && targetEvent?.regEndTime);
  const targetSecondsLeft = targetEvent?.regEndTime
    ? Math.max(0, Math.floor((new Date(targetEvent.regEndTime).getTime() - Date.now()) / 1000))
    : 0;
  const isTargetWithin7Days = isTargetActive && targetSecondsLeft <= SEVEN_DAYS_SECONDS && targetSecondsLeft > 0;
  const canPlay = attempt > 0 && isTargetWithin7Days;

  useEffect(() => {
    const checkViewport = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mob = w <= 768 || (h <= 768 && w <= 950);
      const tab = !mob && w < 1280;
      setIsMobile(mob);
      setIsTablet(tab);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => {
      window.removeEventListener("resize", checkViewport);
    };
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
    if (!canPlay) return;
    const seed = new Uint32Array(1);
    window.crypto.getRandomValues(seed);
    setGameSeed(`minigame-${seed[0]}`);
    setGamePhase("starting");
    scheduleTimeout(() => setGamePhase("playing"), 1800);
  };

  const handleQuit = () => {
    setGamePhase((phase) => (phase === "ending" ? "ending-quit" : "idle"));
  };

  const handleFinish = () => {
    setAttempt(0);
    setGamePhase("ending");
    api.get("/minigame/status")
      .then((res) => {
        if (typeof res.data?.attempt === "number") setAttempt(res.data.attempt);
        if (res.data?.targetEvent) setTargetEvent(res.data.targetEvent);
      })
      .catch(() => {});

    scheduleTimeout(() => {
      setGamePhase("finished");
    }, 2800);
  };

  const isPlayDarkTheme = isGameStarting && !isGameEnding;

  return (
    <main className="relative w-full h-[100dvh] max-h-[100dvh] bg-black overflow-hidden select-none">

      {/* In-Game Overlay */}
      <AnimatePresence>
        {inGame && (
          <FlipGame attempt={attempt} seed={gameSeed} onQuit={handleQuit} onFinish={handleFinish} />
        )}
      </AnimatePresence>

      {/* Dual-Scheme Hermes-Wired Responsive Backdrop */}
      <MinigameEditorialBackdrop isPlayDarkTheme={isPlayDarkTheme} />

      {/* Magenta Bleed Effect during Play */}
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
        initial={{ opacity: 0.01, filter: "blur(28px) brightness(0.5)" }}
        animate={{ opacity: 1, filter: "blur(0px) brightness(1)", transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
        className="relative w-full h-[100dvh] max-h-[100dvh] flex flex-col items-center overflow-hidden"
      >
        {/* Title: Crisp Black + 3D Bevel Structure, ZERO Glow */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(30px)" : "blur(0px)",
            transition: { opacity: { duration: 1 }, filter: { duration: 1 } },
          }}
          className="relative z-20 mt-[3vh] xs:mt-[4vh] sm:mt-[10vh] text-center px-4"
        >
          <motion.h1
            initial={{ y: -40, opacity: 0.01 }}
            animate={{ y: [0, -8, 0], opacity: 1 }}
            transition={{
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 1.5, delay: 0.5, ease: "easeOut" },
            }}
            className="font-black tracking-tighter text-[#0a0c12] font-rog leading-[0.92] sm:leading-none"
            style={{ textShadow: TITLE_BEVEL_SHADOW }}
          >
            <span className="block sm:inline text-5xl xs:text-6xl sm:text-7xl md:text-[8rem] lg:text-[9rem]">
              KALCER&apos;S
            </span>
            <span className="block sm:inline text-5xl xs:text-6xl sm:text-7xl md:text-[8rem] lg:text-[9rem] sm:ml-4">
              GAME
            </span>
          </motion.h1>

          {/* Decorative Cards Area */}
          <div className="flex justify-center gap-2 sm:gap-4 mt-2 sm:mt-6 h-14 sm:h-20">
            {[0, 1, 2, 3].map((i) => <DecorativeCard key={i} seed={i} />)}
          </div>
        </motion.div>

        {/* PLAY IT + Attempt / Reset / Due (All Black Text, No Outer Boxes, 3D Bevel on PLAY IT) */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(20px)" : "blur(0px)",
            pointerEvents: isGameStarting ? "none" : "auto",
            transition: { opacity: { duration: 0.8 } },
          }}
          className="relative z-20 flex flex-col sm:flex-row items-center gap-4 sm:gap-10 mt-[2vh] xs:mt-[3vh] sm:mt-[6vh]"
        >
          <div className="relative group">
            <button
              type="button"
              onClick={handlePlayIt}
              disabled={!canPlay}
              className="relative z-10 text-3xl sm:text-4xl md:text-5xl font-rog font-black text-[#0a0c12] tracking-[0.2em] cursor-pointer hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 rounded-md px-2 transition-opacity duration-150 disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ textShadow: ACTION_BEVEL_SHADOW }}
            >
              PLAY IT
            </button>

            {canPlay && (
              <motion.div
                animate={{ y: [0, 8, 0, 5, 0], scale: [1, 1.08, 1, 1.04, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[35%] left-[30%] pointer-events-none opacity-95 -rotate-[20deg] z-[50]"
              >
                <Image src="/hand_point.webp" alt="Point" width={460} height={612} sizes="96px" quality={80} loading="eager" decoding="async" className="w-14 h-14 sm:w-[6rem] sm:h-[6rem] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]" />
              </motion.div>
            )}
          </div>

          {/* Info Section: Borderless / No Outer Box, Pure Black Typography */}
          <div className="flex flex-col gap-1.5 sm:gap-2 translate-x-0 sm:translate-x-[5%]">
            <div className="flex items-center justify-center gap-3 sm:gap-5 px-2 py-0.5">
              <span className="text-[#0a0c12] font-sans font-semibold text-base sm:text-xl tracking-tighter underline underline-offset-8 decoration-black/25">Attempt :</span>
              <span className="text-[#0a0c12] font-sans font-bold text-base sm:text-xl tracking-tighter">{attempt}</span>
            </div>

            <AnimatePresence>
              {(isTargetWithin7Days && (showReset || attempt === 0)) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-center gap-3 sm:gap-5 px-2 py-0.5"
                >
                  <span className="text-[#0a0c12] font-sans font-semibold text-base sm:text-xl tracking-tighter underline underline-offset-8 decoration-black/25">Reset :</span>
                  <div className="text-base sm:text-xl font-sans tracking-tighter">
                    <ResetTimer />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-3 sm:gap-5 px-2 py-0.5">
              <span className="text-[#0a0c12] font-sans font-semibold text-base sm:text-xl tracking-tighter underline underline-offset-8 decoration-black/25">Due :</span>
              {isTargetWithin7Days ? (
                <div className="text-base sm:text-xl font-sans tracking-tighter">
                  <DueTimer
                    regEndTime={targetEvent.regEndTime}
                    onExpire={() => {
                      const expiredEventId = targetEvent?.id || null;
                      setTargetEvent((prev) => (prev ? { ...prev, hasTarget: false, isWithin7Days: false } : null));
                      api.post("/minigame/finalize", { eventId: expiredEventId })
                        .then((res) => {
                          if (res.data?.targetEvent) setTargetEvent(res.data.targetEvent);
                        })
                        .catch(() => {
                          api.get("/minigame/status")
                            .then((res) => {
                              if (res.data?.targetEvent) setTargetEvent(res.data.targetEvent);
                            })
                            .catch(() => {});
                        });
                    }}
                  />
                </div>
              ) : (
                <span className="text-[#0a0c12] font-sans font-semibold text-base sm:text-xl tracking-tighter">
                  Not Started
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Bottom Right Actions: Borderless Black Text with 3D Bevel (Voucher UI removed; email-only) */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(20px)" : "blur(0px)",
            pointerEvents: isGameStarting ? "none" : "auto",
            transition: { duration: 0.8 },
          }}
          className="absolute bottom-3 right-3 xs:bottom-4 xs:right-4 sm:bottom-[4%] sm:right-[2.5%] z-30 flex items-center justify-center gap-3 sm:gap-5"
        >
          <button
            type="button"
            onClick={() => setShowTrailer(true)}
            className="px-2 py-1.5 bg-transparent border-none text-base sm:text-xl font-rog font-black text-[#0a0c12] tracking-widest cursor-pointer hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 rounded-md transition-opacity duration-150"
            style={{ textShadow: COMPACT_BEVEL_SHADOW }}
          >
            THE EVENT
          </button>

          <button
            type="button"
            aria-label="Game rules"
            onClick={() => setShowInfo(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-transparent border-none flex items-center justify-center text-[#0a0c12] font-serif font-black italic text-2xl sm:text-3xl cursor-pointer hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 rounded-md transition-opacity duration-150"
            style={{ textShadow: COMPACT_BEVEL_SHADOW }}
          >
            <span className="leading-none">i</span>
          </button>
        </motion.div>
      </motion.div>

      {/* Trailer Modal (2 half-body semi-pixel peeking characters sliding from bottom) */}
      <MinigameTrailerModal
        showTrailer={showTrailer}
        onClose={() => setShowTrailer(false)}
        isMobile={isMobile}
        isTablet={isTablet}
        videoRef={videoRef}
      />

      {/* Rules Modal */}
      <MinigameRulesModal
        showInfo={showInfo}
        onClose={() => setShowInfo(false)}
      />

      {/* Initial Blackout */}
      <motion.div initial={{ opacity: 0.92 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} className="fixed inset-0 z-[2000] bg-black pointer-events-none" />
    </main>
  );
}
