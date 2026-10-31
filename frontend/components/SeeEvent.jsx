"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import { fetchPublicEvents } from "@/lib/api";
import { StatCounter, RainbowPixels, MicroParticles } from "./events/effects";
import { FloatingPhotos } from "./events/floatingPhotos";
import { Typewriter } from "./events/typewriter";
const ApplyModal = dynamic(() => import("./events/applyModal").then(m => m.ApplyModal), { ssr: false });
import { CLIP } from "./events/constants";
const SpinningGlobeCanvas = dynamic(() => import("./SpinningGlobeCanvas"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-transparent" />
});
const HERO_IMAGES = [
  "/bg_s1ev.webp",
  "/bg_s2ev.webp",
  "/bg_s3ev.webp",
  "/bg_s4ev.webp",
];
export default function SeeEvent() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [heroIdx, setHeroIdx] = useState(0);
  const [hasCycledHero, setHasCycledHero] = useState(false);
  const [eventIdx, setEventIdx] = useState(0);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const publicEvents = await fetchPublicEvents();
      setEvents(publicEvents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts data fetch on mount
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHasCycledHero(true);
      setHeroIdx((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      const eventTimer = setInterval(() => setEventIdx((prev) => (prev + 1) % events.length), 6000);
      return () => clearInterval(eventTimer);
    }
  }, [events]);

  const activeEvent = events[eventIdx];
  const atmosRef = useRef(null);
  const isAtmosView = useInView(atmosRef, { once: true, margin: "-100px" });
  const eventEffectsRef = useRef(null);
  const areEventEffectsVisible = useInView(eventEffectsRef, { once: true, margin: "-100px" });

  return (
    <main className="w-full min-h-screen bg-[#0B0C10] text-white font-sans overflow-x-hidden relative">
      
      {/* ─── SECTION 1: HERO CAROUSEL ────────────────────────────────────────── */}
      <section className="relative z-10 w-full min-h-screen md:h-screen overflow-hidden flex items-center justify-center py-10 md:py-0">
        
        {/* Full-bleed Slideshow Background: Covers the exact rear of the entire screen on iPad family and Desktop */}
        <div className="hidden md:block absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
          <AnimatePresence mode="sync">
            {HERO_IMAGES.map((src, idx) => (
              idx === heroIdx && (
                <motion.div
                  key={src}
                  initial={idx === 0 && !hasCycledHero ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                >
                  <motion.div
                    animate={{ x: ["0%", "-15%"] }}
                    transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
                    className="w-[120%] h-full absolute left-0 top-0 opacity-100"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="100vw"
                      quality={75}
                      priority={idx === 0}
                      fetchPriority={idx === 0 ? "high" : "auto"}
                      className="object-cover object-center"
                    />
                  </motion.div>
                </motion.div>
              )
            ))}
          </AnimatePresence>
          <div className="absolute inset-0 bg-orange-400/10 md:bg-orange-400/20 mix-blend-overlay z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-b md:from-transparent md:to-[#0B0C10] z-10 pointer-events-none" />
        </div>

        {/* Foreground Content Container - Left aligned on iPad family and Desktop (`md:items-start md:text-left`) */}
        <div className="relative z-10 container mx-auto px-6 md:px-12 flex flex-col items-center text-center justify-center md:items-start md:text-left md:h-full">
          
          {/* Top: See Event Title + Coki Logo */}
          <div className="relative inline-block text-center flex flex-col items-center justify-center md:text-left md:items-start mb-2 md:mb-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="relative mb-3 md:mb-4 w-max flex items-end justify-center group mx-auto md:ml-0 md:mr-0">
               <Image src="/coki_event.webp" alt="Coki Event" width={1536} height={2304} sizes="(min-width: 768px) 144px, 80px" quality={75} loading="eager" decoding="async" className="w-20 md:w-36 block relative z-10 drop-shadow-2xl" />
               <div className="absolute left-0 bottom-0 w-[4px] h-[50%] bg-white z-20" />
               <div className="absolute left-0 bottom-0 h-[4px] w-full bg-white z-20" />
            </motion.div>

            <motion.h1 initial={{ scale: 0.92, opacity: 0.01 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }} className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-2xl font-rog mb-2 md:mb-4 relative z-10 text-center md:text-left" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}>
              SEE EVENT
            </motion.h1>
          </div>

          {/* Description Text: Consistently placed UNDER the title across all devices */}
          <div className="w-full max-w-2xl text-sm sm:text-base md:text-lg font-medium text-gray-200 leading-relaxed drop-shadow-lg min-h-[70px] md:min-h-[90px] text-center mx-auto md:text-left md:mx-0 mb-4 md:mb-6">
            <Typewriter text="This Event hosted by Kalceria and by the use of community. We bring automotive enthusiasts together to share the same obsession. Prepare your engines for the ultimate street euphoria." delay={800} speed={40} />
          </div>

          {/* Mobile-Only: Photo Carousel Glass Card */}
          <div className="md:hidden w-[90%] max-w-[380px] aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 backdrop-blur-md bg-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] my-5 flex items-center justify-center relative">
            <div
              className="relative w-full h-full overflow-hidden flex items-center justify-center [clip-path:polygon(20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_20px)]"
            >
              <AnimatePresence mode="sync">
                {HERO_IMAGES.map((src, idx) => (
                  idx === heroIdx && (
                    <motion.div
                      key={src}
                      initial={idx === 0 && !hasCycledHero ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2 }}
                      className="absolute inset-0 w-full h-full flex items-center justify-center"
                    >
                      <motion.div
                        animate={{ x: ["0%", "-15%"] }}
                        transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
                        className="w-[120%] h-full absolute left-0 top-0 opacity-80"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 85vw, 115vw"
                          quality={70}
                          priority={idx === 0}
                          fetchPriority={idx === 0 ? "high" : "auto"}
                          className="object-cover object-center"
                        />
                      </motion.div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
              <div className="absolute inset-0 bg-orange-400/10 mix-blend-overlay z-10 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
            </div>
          </div>

        </div>
      </section>

      {/* ─── SECTION 2 & 3 WRAPPER ─────────────────────────────────────────── */}
      <div ref={eventEffectsRef} className="relative w-full bg-[#0B0C10]">
        {areEventEffectsVisible && <>
          <RainbowPixels />
          <MicroParticles />
        </>}
        <Image src="/stikermobil_5.webp" alt="" width={2698} height={1568} sizes="(min-width: 1280px) 224px, (min-width: 768px) 144px, 112px" quality={75} loading="lazy" decoding="async" className="absolute z-10 w-24 xs:w-28 sm:w-32 md:w-36 xl:w-56 bottom-2 md:bottom-6 xl:bottom-10 right-[2%] md:right-[4%] xl:right-[10%] opacity-80 drop-shadow-xl pointer-events-none -rotate-3" />
        <Image src="/stikermobil_2.webp" alt="" width={2410} height={1436} sizes="(min-width: 1280px) 224px, (min-width: 768px) 144px, 112px" quality={75} loading="lazy" decoding="async" className="absolute z-10 w-24 xs:w-28 sm:w-32 md:w-36 xl:w-56 bottom-2 md:bottom-6 xl:bottom-10 left-[2%] md:left-[2%] xl:left-[4%] opacity-80 drop-shadow-xl pointer-events-none rotate-6 scale-90 sm:scale-100" />

        {/* ─── SECTION 1.5: ATMOSPHERIC BREAK ────────────────────────────────── */}
        <section ref={atmosRef} className="relative w-full py-[60vh] z-20 overflow-hidden">
          {/* Section Title with 3D Effect */}
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 z-30 text-center w-full px-4">
             <motion.h2 
               initial={{ opacity: 0, y: 30, filter: "blur(20px)" }}
               animate={isAtmosView ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 30, filter: "blur(20px)" }}
               transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
               className="font-rog font-black tracking-tighter text-white uppercase relative inline-block select-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
               style={{ 
                 fontSize: isMobile ? "clamp(2.4rem, 7.2vw, 6rem)" : "clamp(2rem, 6vw, 5rem)",
                 WebkitTextStroke: "1px rgba(255,255,255,0.1)",
                 textShadow: `
                   0 1px 0 #ccc, 
                   0 2px 0 #c9c9c9, 
                   0 3px 0 #bbb, 
                   0 4px 0 #b9b9b9, 
                   0 5px 0 #aaa, 
                   0 6px 1px rgba(0,0,0,.1), 
                   0 0 5px rgba(0,0,0,.1), 
                   0 1px 3px rgba(0,0,0,.3), 
                   0 3px 5px rgba(0,0,0,.2), 
                   0 5px 10px rgba(0,0,0,.25), 
                   0 10px 10px rgba(0,0,0,.2), 
                   0 20px 20px rgba(0,0,0,.15)
                 `
               }}
             >
               <span className="text-[#ffcc00]">KALCER&apos;s</span> AROUND <span className="text-red-600">INDONESIA</span>
             </motion.h2>
          </div>

          {/* Enhanced Dynamic Background Blobs (Elegant Washy Wash) */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.28] mix-blend-screen">
             {/* Green Blob - Higher and more active */}
             <motion.div 
               animate={{ 
                 x: ["-10%", "20%", "5%", "-10%"],
                 y: ["-15%", "15%", "30%", "-15%"],
                 scale: [1, 1.3, 1.15, 1],
                 rotate: [0, 50, -50, 0]
               }}
               transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-[5%] left-[10%] w-[52vw] h-[52vw] rounded-full blur-[140px] bg-[#00ff88]/20"
             />
             {/* Gold Blob - Higher and more active */}
             <motion.div 
               animate={{ 
                 x: ["15%", "-15%", "10%", "15%"],
                 y: ["10%", "-10%", "-25%", "10%"],
                 scale: [1, 1.35, 1.2, 1],
                 rotate: [0, -60, 60, 0]
               }}
               transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
               className="absolute top-[10%] right-[10%] w-[58vw] h-[58vw] rounded-full blur-[160px] bg-[#ffcc00]/20"
             />
          </div>

          {/* Indonesia Map Background Behind Globe */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
             <Image
               src="/indo.webp" 
               alt="Indonesia Map" 
               width={2400}
               height={883}
               sizes="(min-width: 768px) 100vw, 151vw"
               quality={75}
               loading="lazy"
               decoding="async"
               className="w-[151vw] md:w-[100vw] h-auto object-contain opacity-25 filter brightness-150 contrast-125" 
             />
          </div>

          {/* 3D Spinning Globe: Perfectly centered in the dead center of the Indonesia Map */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] xs:w-[320px] xs:h-[320px] sm:w-[420px] sm:h-[420px] md:w-[680px] md:h-[680px] z-0 flex items-center justify-center pointer-events-none">
             {isAtmosView && <SpinningGlobeCanvas />}
          </div>
          {/* Aggressive Edge Blending for Seamless Transitions */}
          <div className="absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-[#0B0C10] to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-[#0B0C10] to-transparent z-10 pointer-events-none" />
          {/* Floating ven photos: dynamically spread left-right by 15% on mobile */}
          {isAtmosView && <FloatingPhotos isMobile={isMobile} />}

          {/* ── LEFT STATS ── */}
          <div className="absolute left-2 xs:left-4 sm:left-6 md:left-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-8 sm:gap-12 pointer-events-none">
            <StatCounter target={10} label="Users" suffix="" active={isAtmosView} />
            <StatCounter target={10} label="Events" suffix="+" active={isAtmosView} />
          </div>

          {/* ── RIGHT STATS ── */}
          <div className="absolute right-2 xs:right-4 sm:right-6 md:right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-8 sm:gap-12 pointer-events-none items-end scale-90 sm:scale-100 origin-right">
            <StatCounter target={100}  label="Hours Streamed" suffix="+" align="end" active={isAtmosView} />
            <StatCounter target={1000} label="Days Created" suffix="" align="end" active={isAtmosView} />
          </div>
        </section>

        {/* ─── SECTION 2: DYNAMIC EVENT CARDS ──────────────────────────────── */}
        <section className="relative w-full py-16 md:py-24 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              
              {/* Left: Picture Card Carousel - shrunk 50% on mobile */}
              <div className={`relative aspect-[4/5] rounded-2xl shadow-2xl bg-[#0B0C10] transition-all duration-300 ${isMobile ? "w-1/2 mx-auto scale-[1]" : "w-full scale-[1.03]"}`}>
                {!isMobile && (
                  <Image src="/stikermobil_4.webp" alt="" width={2730} height={1536} sizes="(min-width: 1280px) 224px, (min-width: 768px) 144px, 112px" quality={75} loading="lazy" decoding="async" className="absolute z-30 w-32 md:w-36 xl:w-56 -bottom-24 md:-bottom-28 xl:-bottom-48 -left-6 md:-left-8 xl:-left-16 opacity-90 drop-shadow-2xl pointer-events-none transition-transform duration-700" style={{ transform: "rotate(-3deg)" }} />
                )}
                {isMobile && (
                  <Image src="/stikermobil_3.webp" alt="" width={2679} height={1408} sizes="144px" quality={75} loading="lazy" decoding="async" className="absolute z-30 w-22 xs:w-24 sm:w-32 -top-14 xs:-top-16 -right-2 xs:right-0 opacity-85 drop-shadow-2xl pointer-events-none rotate-[6deg]" />
                )}
                
                <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-800">
                  <AnimatePresence mode="wait">
                    {activeEvent ? (
                      <motion.div key={activeEvent.id} initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: "0%" }} exit={{ opacity: 0, x: "-100%" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 w-full h-full">
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${activeEvent.displayPhotoUrl})` }} />
                        <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.6)]" />
                      </motion.div>
                    ) : (
                      <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.06] via-[#0B0C10] to-fuchsia-950/20">
                        <span className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 animate-pulse">
                          {eventsLoading ? "Syncing Grid..." : "Next Drop Soon"}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: Text Details - centered and placed under card on mobile */}
              <div className={`flex flex-col justify-center min-h-[450px] relative z-20 ${isMobile ? "items-center text-center mt-12" : ""}`}>
                {!isMobile && (
                  <>
                    <Image src="/stikermobil_1.webp" alt="" width={2387} height={1523} sizes="(min-width: 1280px) 224px, (min-width: 768px) 144px, 112px" quality={75} loading="lazy" decoding="async" className="absolute -top-28 md:-top-32 xl:-top-44 right-6 md:right-8 xl:right-10 w-32 md:w-36 xl:w-56 opacity-90 drop-shadow-2xl z-10 pointer-events-none transition-transform duration-700" style={{ transform: "rotate(6deg)" }} />
                    <Image src="/stikermobil_3.webp" alt="" width={2679} height={1408} sizes="(min-width: 1280px) 176px, (min-width: 768px) 130px, 112px" quality={75} loading="lazy" decoding="async" className="absolute z-10 w-28 md:w-32 xl:w-44 bottom-[-90px] md:bottom-[-110px] xl:bottom-[-160px] left-1/2 opacity-70 drop-shadow-2xl pointer-events-none transition-all duration-700" style={{ transform: "translateX(-50%) rotate(3deg)" }} />
                  </>
                )}

                <AnimatePresence mode="wait">
                  {activeEvent ? (
                    <motion.div key={activeEvent.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className={`flex flex-col relative z-20 ${isMobile ? "text-center items-center" : "text-right items-end"}`}>
                      <motion.h2 
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className={`text-5xl md:text-6xl font-black italic uppercase text-white tracking-tighter mb-6 inline-block relative z-20`}
                        style={{ 
                          WebkitTextStroke: "2px rgba(255,255,255,0.3)", 
                          minHeight: "1.2em",
                          textShadow: "0 0 15px rgba(255,0,255,0.5)"
                        }}
                      >
                        <Typewriter text={activeEvent.title} speed={70} delay={300} />
                      </motion.h2>

                      <div className="relative mb-8">
                        <p className={`text-gray-200 text-lg md:text-xl leading-relaxed max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium relative z-20 mb-8 ${isMobile ? "text-center mx-auto" : "text-right"}`}>
                          {activeEvent.description}
                        </p>

                        <div className={`space-y-1 text-sm md:text-base font-medium text-gray-300 ${isMobile ? "text-center" : "text-right"}`}>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Location: <span className="text-white not-italic font-bold">{activeEvent.location || "TBA"}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Registration Start: <span className="text-white not-italic font-bold">{new Date(activeEvent.regStartTime).toLocaleDateString()} {new Date(activeEvent.regStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Registration End: <span className="text-white not-italic font-bold">{new Date(activeEvent.regEndTime).toLocaleDateString()} {new Date(activeEvent.regEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Kuota: <span className="text-white not-italic font-bold">{activeEvent.quota} Slots</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Price: <span className="text-white not-italic font-bold">Rp {Number(activeEvent.price).toLocaleString('id-ID')}</span></p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="details-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`flex flex-col justify-center min-h-[300px] relative z-20 ${isMobile ? "text-center items-center" : "text-right items-end"}`}>
                      <h2 className="text-4xl md:text-5xl font-black italic uppercase text-white/80 tracking-tighter mb-4">
                        {eventsLoading ? "Loading Events..." : "Upcoming Drop"}
                      </h2>
                      <p className={`text-gray-400 text-base md:text-lg max-w-md ${isMobile ? "text-center mx-auto" : "text-right"}`}>
                        {eventsLoading
                          ? "Connecting to Kalceria event telemetry..."
                          : "Stay tuned. New automotive meets and underground runs are being prepared."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* On mobile, stikermobil_4 and stikermobil_1 sit cleanly below the event details with zero overlap and safe spacing */}
                {isMobile && (
                  <div className="w-full max-w-[320px] mx-auto mt-8 mb-4 px-2 flex items-center justify-between gap-4 pointer-events-none relative z-30">
                    <Image src="/stikermobil_4.webp" alt="" width={2730} height={1536} sizes="140px" quality={75} loading="lazy" decoding="async" className="w-28 opacity-90 drop-shadow-2xl -rotate-3" />
                    <Image src="/stikermobil_1.webp" alt="" width={2387} height={1523} sizes="140px" quality={75} loading="lazy" decoding="async" className="w-24 opacity-90 drop-shadow-2xl rotate-6 -translate-y-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: COMMUNITY INTERACTION ────────────────────────────── */}
        <section className="relative w-full py-16 pb-36 md:pb-32 md:pt-12 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto max-w-4xl">
            <div className="flex justify-center">
              <motion.div whileHover={{ scale: 1.02 }} className="relative bg-[#0B0C10]/40 p-8 rounded-2xl border-2 border-dashed border-gray-500/30 backdrop-blur-xl flex flex-col justify-between h-[300px] sm:h-[320px] w-full max-w-md">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Wanna Join?</h3>
                <div className="flex-1 flex items-center justify-center">
                   <button onClick={() => activeEvent && setApplyModalOpen(true)} disabled={!activeEvent} className="relative w-full py-5 font-sans font-black uppercase tracking-tighter text-black bg-white border border-white transition-all hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer shadow-[0_0_40px_rgba(255,255,255,0.2)]" style={CLIP}>
                    <span className="relative z-10 text-2xl">APPLY NOW</span>
                    <div className="absolute inset-0 bg-black/5 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 z-0" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

      </div>
      <AnimatePresence>
        {applyModalOpen && events.length > 0 && <ApplyModal events={events} startIndex={eventIdx} isMobile={isMobile} onClose={() => setApplyModalOpen(false)} />}
      </AnimatePresence>
    </main>
  );
}
