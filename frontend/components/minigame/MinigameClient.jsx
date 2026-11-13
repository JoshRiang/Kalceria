"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image, { getImageProps } from "next/image";
import dynamic from "next/dynamic";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import api from "@/lib/api";
import {
  MicroParticles,
  DecorativeCard,
  ResetTimer,
  DueTimer,
  MinigameTrailerModal,
  MinigameRulesModal,
  MinigameVoucherModal,
} from "./client";

const FlipGame = dynamic(() => import("@/app/minigame/FlipGame"), { ssr: false });

export default function MinigamePage() {
  const [showInfo, setShowInfo] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [gamePhase, setGamePhase] = useState("idle");
  const [attempt, setAttempt] = useState(1); // 1 = has attempt, 0 = used up
  const [targetEvent, setTargetEvent] = useState(null);
  const [userVoucher, setUserVoucher] = useState(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const videoRef = useRef(null);
  const [gameSeed, setGameSeed] = useState("");
  const scheduleTimeout = useTimeoutRegistry();

  useEffect(() => {
    let active = true;
    api.get("/minigame/status")
      .then((res) => {
        if (!active) return;
        if (typeof res.data?.attempt === "number") {
          setAttempt(res.data.attempt);
        }
        if (res.data?.targetEvent) {
          setTargetEvent(res.data.targetEvent);
        }
        if (res.data?.voucher) {
          setUserVoucher(res.data.voucher);
        }
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
    // Quit doesn't use up attempt
    setGamePhase((phase) => phase === "ending" ? "ending-quit" : "idle");
  };

  const handleFinish = () => {
    // After game finishes, attempt becomes 0, start ending sequence
    setAttempt(0);
    setGamePhase("ending");
    api.get("/minigame/status")
      .then((res) => {
        if (typeof res.data?.attempt === "number") {
          setAttempt(res.data.attempt);
        }
        if (res.data?.targetEvent) {
          setTargetEvent(res.data.targetEvent);
        }
        if (res.data?.voucher) {
          setUserVoucher(res.data.voucher);
        }
      })
      .catch(() => {});

    // Gradual cleanup and transition back to landing page state
    scheduleTimeout(() => {
      setGamePhase("finished");
    }, 2800); // Sequential timing to match the exit animation layers
  };

  const heroCommon = { alt: "", quality: 75, sizes: "100vw" };
  const {
    props: { srcSet: desktopHeroSrcSet, ...desktopHeroRest },
  } = getImageProps({
    ...heroCommon,
    width: 2816,
    height: 1502,
    src: "/bg_game.webp",
  });
  const {
    props: { srcSet: mobileHeroSrcSet },
  } = getImageProps({
    ...heroCommon,
    width: 2048,
    height: 2048,
    src: "/hp/bg_game_hp.webp",
  });

  return (
    <main className="relative w-full h-[100dvh] max-h-[100dvh] bg-black overflow-hidden select-none">

      {/* In-Game Overlay */}
      <AnimatePresence>
        {inGame && (
          <FlipGame attempt={attempt} seed={gameSeed} onQuit={handleQuit} onFinish={handleFinish} />
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
        <picture className="block w-full h-full">
          <source media="(max-width: 767px)" srcSet={mobileHeroSrcSet} sizes="100vw" />
          <source media="(min-width: 768px)" srcSet={desktopHeroSrcSet} sizes="100vw" />
          <img
            {...desktopHeroRest}
            alt=""
            fetchPriority="high"
            decoding="sync"
            className="w-full h-full object-cover object-center"
          />
        </picture>
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
        initial={{ opacity: 0.01, filter: "blur(28px) brightness(0.5)" }}
        animate={{ opacity: 1, filter: "blur(0px) brightness(1)", transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }}
        className="relative w-full h-[100dvh] max-h-[100dvh] flex flex-col items-center overflow-hidden"
      >
        {/* Title */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(30px)" : "blur(0px)",
            transition: { opacity: { duration: 1 }, filter: { duration: 1 } }
          }}
          className="relative z-20 mt-[3vh] xs:mt-[4vh] sm:mt-[10vh] text-center px-4"
        >
          <motion.h1
            initial={{ y: -40, opacity: 0.01 }}
            animate={{ 
              y: [0, -8, 0], // Floating tipis-tipis
              opacity: 1 
            }}
            transition={{ 
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 1.5, delay: 0.5, ease: "easeOut" }
            }}
            className="font-black tracking-tighter text-white font-rog leading-[0.92] sm:leading-none"
            style={{ textShadow: "0 0 20px rgba(255,255,0,0.6), 0 0 40px rgba(255,255,0,0.3), 0 10px 30px rgba(0,0,0,0.5)" }}
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
            {[0, 1, 2, 3].map(i => <DecorativeCard key={i} seed={i} />)}
          </div>
        </motion.div>

        {/* PLAY IT + Attempt - Centered on Mobile Screen HP */}
        <motion.div
          animate={{
            opacity: isGameStarting ? 0 : 1,
            filter: isGameStarting ? "blur(20px)" : "blur(0px)",
            pointerEvents: isGameStarting ? "none" : "auto",
            transition: { opacity: { duration: 0.8 } }
          }}
          className="relative z-20 flex flex-col sm:flex-row items-center gap-4 sm:gap-10 mt-[2vh] xs:mt-[3vh] sm:mt-[6vh]"
        >
          <div className="relative group">
            <button
              onClick={handlePlayIt}
              disabled={!canPlay}
              className="relative z-10 text-3xl sm:text-4xl md:text-5xl font-rog font-black text-white tracking-[0.2em] hover:scale-105 transition-transform duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                textShadow: "0px 1px 0px #999, 0px 2px 0px #888, 0px 3px 0px #777, 0px 4px 0px #666, 0px 5px 30px rgba(0,0,0,0.9)"
              }}
            >
              PLAY IT
            </button>

            {/* Hand Icon - Only points when game is playable in JIT period */}
            {canPlay && (
              <motion.div
                animate={{ y: [0, 8, 0, 5, 0], scale: [1, 1.08, 1, 1.04, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[35%] left-[30%] pointer-events-none opacity-95 -rotate-[20deg] z-[50]"
              >
                <Image src="/hand_point.webp" alt="Point" width={460} height={612} sizes="96px" quality={80} loading="eager" decoding="async" className="w-14 h-14 sm:w-[6rem] sm:h-[6rem] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
              </motion.div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col gap-2 translate-x-0 sm:translate-x-[5%]">
            <div className="flex items-center justify-center gap-4 sm:gap-6 px-5 sm:px-8 py-1.5 sm:py-2 min-w-[180px] sm:min-w-[250px] bg-black/40 backdrop-blur-[20px] rounded-2xl border border-white/10 shadow-2xl">
              <span className="text-white font-sans text-base sm:text-xl tracking-tighter underline underline-offset-8 decoration-white/20">Attempt :</span>
              <span className="text-white font-sans text-base sm:text-xl tracking-tighter">{attempt}</span>
            </div>

            {/* Reset Countdown - Controlled by active target Due period */}
            <AnimatePresence>
              {(isTargetWithin7Days && (showReset || attempt === 0)) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-center gap-4 sm:gap-6 px-5 sm:px-8 py-1.5 sm:py-2 min-w-[180px] sm:min-w-[250px] bg-black/40 backdrop-blur-[20px] rounded-2xl border border-white/10 shadow-2xl"
                >
                  <span className="text-white font-sans text-base sm:text-xl tracking-tighter underline underline-offset-8 decoration-white/20">Reset :</span>
                  <div className="text-base sm:text-xl font-sans tracking-tighter">
                    <ResetTimer />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Due Box */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 px-5 sm:px-8 py-1.5 sm:py-2 min-w-[180px] sm:min-w-[250px] bg-black/40 backdrop-blur-[20px] rounded-2xl border border-white/10 shadow-2xl">
              <span className="text-white font-sans text-base sm:text-xl tracking-tighter underline underline-offset-8 decoration-white/20">Due :</span>
              {isTargetWithin7Days ? (
                <div className="text-base sm:text-xl font-sans tracking-tighter">
                  <DueTimer
                    regEndTime={targetEvent.regEndTime}
                    onExpire={() => {
                      const expiredEventId = targetEvent?.id || null;
                      setTargetEvent((prev) => (prev ? { ...prev, hasTarget: false, isWithin7Days: false } : null));
                      api.post("/minigame/finalize", { eventId: expiredEventId })
                        .then((res) => {
                          if (res.data?.targetEvent) {
                            setTargetEvent(res.data.targetEvent);
                          }
                          if (res.data?.voucher) {
                            setUserVoucher(res.data.voucher);
                          }
                        })
                        .catch(() => {
                          api.get("/minigame/status")
                            .then((res) => {
                              if (res.data?.targetEvent) setTargetEvent(res.data.targetEvent);
                              if (res.data?.voucher) setUserVoucher(res.data.voucher);
                            })
                            .catch(() => {});
                        });
                    }}
                  />
                </div>
              ) : (
                <span className="text-white font-sans text-base sm:text-xl tracking-tighter">
                  Not Started
                </span>
              )}
            </div>
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
          className="absolute bottom-3 right-3 xs:bottom-4 xs:right-4 sm:bottom-[4%] sm:right-[2%] z-30 flex items-center justify-center gap-3 sm:gap-6"
        >
          {userVoucher && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowVoucherModal(true)} className="relative group cursor-pointer">
              <div className="relative py-2 sm:py-3 px-3 sm:px-4 flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-yellow-300 bg-gradient-to-r from-amber-500 to-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                <span className="relative z-10 text-xs sm:text-sm font-rog font-black text-white tracking-widest uppercase">MY VOUCHER</span>
              </div>
            </motion.div>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowTrailer(true)} className="relative group cursor-pointer">
            <div className="relative w-[140px] sm:w-[180px] py-2 sm:py-3 flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-white bg-[#e60000] shadow-[0_0_25px_rgba(230,0,0,0.5)]">
              <span className="relative z-10 text-base sm:text-xl font-rog font-black text-white tracking-widest" style={{ textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 10px rgba(0,0,0,0.8)" }}>THE EVENT</span>
            </div>
          </motion.div>
          <div className="relative group w-10 h-10 sm:w-11 sm:h-11">
            <button 
              aria-label="Game rules" 
              onClick={() => setShowInfo(true)} 
              className="relative z-10 w-full h-full rounded-full border-2 border-white bg-[#15803d] flex items-center justify-center text-white font-serif font-bold text-xl sm:text-2xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(21,128,61,0.5)]"
            >
              <span className="leading-none">i</span>
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Trailer Modal */}
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

      {/* Voucher Modal */}
      <MinigameVoucherModal
        show={showVoucherModal}
        voucher={userVoucher}
        onClose={() => setShowVoucherModal(false)}
      />

      {/* Initial Blackout */}
      <motion.div initial={{ opacity: 0.92 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} className="fixed inset-0 z-[2000] bg-black pointer-events-none" />
    </main>
  );
}
