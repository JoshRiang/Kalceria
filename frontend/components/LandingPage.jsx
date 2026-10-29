"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import ServiceRequestModal from "./ServiceRequestModal";
import { Typewriter, FilmLane, FilmStrip, EventSlider, useMerchRandomizer, MerchCard, FindMoreSlider } from "./landing/showcase";
import { GoldenDust, StarDust, FloatingSpareParts, TropicalParticles, DynamicCollage, PrinceRupertDrop } from "./landing/particles";
import { SupportUsBackground } from "./landing/backgrounds";
import { LogoutConfirmModal } from "./landing/modals/LogoutConfirmModal";
import { IdeaCommentModal } from "./landing/modals/IdeaCommentModal";
import { ClosingSections } from "./landing/ClosingSections";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import api from "@/lib/api";
import { clearSession, hasUserSession } from "@/lib/session";

export default function LandingPage({ onNavigateAuth }) {
  const mounted = useHasMounted();
  const [aboutIndex, setAboutIndex] = useState(0);
  const [mascotFrame, setMascotFrame] = useState(1);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const openIdeaModal = useCallback(() => setShowIdeaModal(true), []);
  const closeIdeaModal = useCallback(() => setShowIdeaModal(false), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);
  const displayedMerch = useMerchRandomizer();
  const [merchInitial, setMerchInitial] = useState(true);

  useEffect(() => {
    if (displayedMerch.length > 0) {
      const t = setTimeout(() => setMerchInitial(false), 2000);
      return () => clearTimeout(t);
    }
  }, [displayedMerch.length]);

  const isMobile = useIsMobileViewport();

  const ABOUT_IMAGES = [
    { src: "/aboutus_bg1.webp", width: 1358, height: 768 },
    { src: "/aboutus_bg2.webp", width: 1317, height: 800 },
    { src: "/aboutus_bg3.webp", width: 1317, height: 800 },
    { src: "/aboutus_bg4.webp", width: 1253, height: 832 }
  ];

  const ABOUT_IMAGES_HP = [
    { src: "/hp/abt_landing_hp1.webp", width: 720, height: 540 },
    { src: "/hp/abt_landing_hp2.webp", width: 1000, height: 701 },
    { src: "/hp/abt_landing_hp3.webp", width: 500, height: 333 }
  ];

  const currentAboutImages = isMobile ? ABOUT_IMAGES_HP : ABOUT_IMAGES;
  const currentAboutImage = currentAboutImages[aboutIndex % currentAboutImages.length];

  useEffect(() => {
    if (sessionStorage.getItem("landingSeen")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- This reads a session flag to preserve the returning-visitor animation behavior.
      setSkipAnim(true);
    } else {
      sessionStorage.setItem("landingSeen", "true");
    }
    // Check login status
    setIsLoggedIn(hasUserSession());

    // Smooth scroll restoration on fallback navigation
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const scrollTarget = urlParams?.get("anchor") || sessionStorage.getItem("landingScrollTarget");
    const scrollY = sessionStorage.getItem("landingScrollY");
    if (scrollTarget || scrollY) {
      if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      
      sessionStorage.removeItem("landingScrollTarget");
      sessionStorage.removeItem("landingScrollY");
      
      // Clean query parameters from address bar to keep UX clean
      if (typeof window !== "undefined" && window.history.replaceState) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Industrial-grade recurring scroll lock to force viewport position through dynamic loading reflows
      const scrollInterval = setInterval(() => {
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY, 10));
        } else {
          const element = document.getElementById(scrollTarget);
          if (element) {
            element.scrollIntoView({ behavior: "auto", block: "start" });
          }
        }
      }, 150);
      
      const timer = setTimeout(() => {
        clearInterval(scrollInterval);
        if (!scrollY) {
          const element = document.getElementById(scrollTarget);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 1600);
      return () => {
        clearInterval(scrollInterval);
        clearTimeout(timer);
      };
    }
  }, []);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch { /* Clear the local session marker even if the API is unavailable. */ }
    clearSession();
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    window.location.reload();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAboutIndex((prev) => (prev + 1) % currentAboutImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentAboutImages.length]);

  useEffect(() => {
    const mascotInterval = setInterval(() => {
      setMascotFrame(prev => prev === 1 ? 2 : 1);
    }, 2000);
    return () => clearInterval(mascotInterval);
  }, []);

  const slideVariants = {
    enter: { x: "100%", opacity: 0 },
    center: { x: "0%", opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    exit: { x: "-100%", opacity: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div
      initial={{ opacity: skipAnim ? 1 : 0 }}
      animate={{ opacity: skipAnim ? 1 : (mounted ? 1 : 0) }}
      transition={{ duration: skipAnim ? 0 : 1.5, ease: "easeOut" }}
      className="relative w-full bg-[#050a14] text-white font-mono overflow-x-hidden selection:bg-[#FF00FF] selection:text-white"
    >
      {/* ── Section 1: Hero ── */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden py-24 z-10">
        <DynamicCollage />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14]/50 via-[#050a14]/10 to-[#050a14] z-0" />

        {/* Video Container */}
        <div className="relative w-[88%] md:w-[72%] max-w-4xl aspect-square md:aspect-video rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-md flex flex-col items-center justify-center z-10">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover bg-[#000000]/60">
            <source src="/video_landingatas.mp4" type="video/mp4" />
          </video>
          
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-6 md:gap-10 px-4 w-full">
            <motion.img 
              src="/logo_landing.webp" 
              alt="Kalceria" 
              className="w-[85%] md:w-[70%] max-w-3xl h-auto object-contain drop-shadow-2xl" 
              draggable={false}
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {isLoggedIn ? (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="group relative px-10 md:px-12 py-2.5 md:py-3.5 rounded-[20px] overflow-hidden transition-all duration-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              >
                <div className="absolute inset-0 bg-red-500/20 group-hover:bg-red-500/30 transition-colors" />
                <div className="absolute inset-0 border border-red-500/30 group-hover:border-red-500/50 rounded-[20px]" />
                <div className="absolute inset-0 shadow-[0_0_40px_rgba(239,68,68,0.1)] group-hover:shadow-[0_0_60px_rgba(239,68,68,0.2)] transition-all" />
                
                <span className="relative z-10 font-sans font-black text-white uppercase tracking-widest text-[13px] md:text-[15px]">
                  LOGOUT
                </span>
              </button>
            ) : (
              <button
                onClick={onNavigateAuth}
                className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
              >
                <span className="relative z-10">LOGIN / REGISTER</span>
                <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Events ── */}
      <section id="section-events" className="relative w-full min-h-[70vh] flex flex-col md:flex-row items-center justify-center md:justify-between overflow-hidden bg-[#050a14] z-20 px-8 md:px-24 py-20 gap-12 md:gap-16">
        <StarDust />
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[100px] bg-[#FF00FF]" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[0%] right-[10%] w-[50vw] h-[50vw] rounded-full blur-[120px] bg-[#FFD700]" />
          <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[30%] left-[50%] w-[30vw] h-[30vw] rounded-full blur-[80px] bg-[#ffffff]" />
          <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }} className="absolute bottom-[-10%] left-[5%] w-[40vw] h-[40vw] rounded-full blur-[110px] bg-[#FF0000]" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }} className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[120px] bg-[#FF8C00]" />
        </div>

        {/* Mobile-only Silhouette: grup_hp.webp (on top of background layer z-0 but behind crystal_2 z-10) */}
        <div className="absolute bottom-0 left-0 w-full h-[300px] pointer-events-none z-[1] overflow-hidden md:hidden flex justify-center items-end">
          <Image src="/hp/grup_hp.webp" alt="Group Mobile" width={2304} height={1848} unoptimized loading="eager" decoding="auto" className="h-full w-auto object-contain opacity-35" />
        </div>

        {/* Center: Event Slider Card (Relative on Mobile, Absolutely Centered on Desktop) */}
        <div 
          className="relative md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10 w-full max-w-[260px] md:max-w-[320px] aspect-[4/5] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-sm" 
          style={{ clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" }}
        >
          <EventSlider />
        </div>

        {/* Left Content (Relative on Mobile placed under card, Absolute on Desktop) */}
        <div className="relative md:absolute left-0 md:left-24 bottom-0 md:top-1/2 md:-translate-y-1/2 z-20 flex flex-col items-center md:items-start gap-4 md:gap-6 mt-8 md:mt-0">
          <h2 className="text-center md:text-left text-5xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter" style={{ textShadow: "4px 4px 0 rgba(255,0,255,0.15)" }}>
            <Typewriter text="SEE EVENT" mode="letter" delay={0} skipAnim={skipAnim} />
          </h2>
          <Link href="/events" onClick={() => {
            sessionStorage.setItem("landingScrollTarget", "section-events");
            sessionStorage.setItem("landingScrollY", window.scrollY);
          }}>
            <button
              className="relative px-8 py-3 font-sans font-extrabold uppercase tracking-wide text-[13px] text-[#050a14] bg-white border border-white transition-all hover:border-[#FF00FF] hover:bg-transparent hover:text-white group cursor-pointer"
              style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
            >
              <span className="relative z-10">EXPLORE</span>
              <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
            </button>
          </Link>
        </div>

        {/* Floating Crystal 2 Instances */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
           {/* Bottom (Smallest) */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[20px] md:h-[28px] object-contain opacity-70 left-[20%] md:left-[35%] bottom-[42%] md:bottom-[5%] -translate-x-1/2"
             animate={{ y: [0, -8, 0], rotate: [55, 65, 55] }}
             transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
           />
           {/* Left Small */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[26px] md:h-[36px] object-contain opacity-70 left-[calc(50%-185px)] md:left-[calc(50%-260px)] top-[30%] md:top-[55%]"
             animate={{ y: [0, -10, 0], rotate: [-35, -25, -35] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           />
           {/* Right Medium */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[34px] md:h-[47px] object-contain opacity-70 left-[calc(50%+165px)] md:left-[calc(50%+175px)] top-[22%] md:top-[18%]"
             animate={{ y: [0, -15, 0], rotate: [30, 40, 30] }}
             transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
           />
           {/* Right Large */}
           <motion.img 
             src="/crystal_2.webp" 
             className="absolute h-[45px] md:h-[63px] object-contain opacity-70 left-[calc(50%+190px)] md:left-[calc(50%+200px)] top-[45%] md:top-[50%]"
             animate={{ y: [0, -18, 0], rotate: [0, 10, 0] }}
             transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
           />
        </div>

        {/* Silhouettes - Static Background */}
        <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden px-8 md:px-24">
          
          {/* Crystal 3 Top Right (Truncated at Top) */}
          <div className="absolute top-[-20px] md:top-[-40px] right-12 md:right-40 hidden md:flex flex-col items-center pointer-events-none opacity-80">
            <Image src="/crystal_3.webp" alt="Crystal 3" width={2480} height={1728} unoptimized loading="eager" decoding="auto" className="h-[75px] md:h-[120px] w-auto object-contain rotate-180" />
          </div>

          {/* Crystal 1 Bottom Left (Truncated at Bottom) */}
          <Image src="/crystal_1.webp" alt="Crystal 1" width={2016} height={2120} unoptimized loading="eager" decoding="auto" className="absolute bottom-[-20px] md:bottom-[-30px] left-0 md:left-4 h-[80px] md:h-[130px] w-auto object-contain opacity-80 z-0 hidden md:block" />

          <div className="absolute bottom-0 left-12 md:left-40 hidden md:flex items-end">
            <Image src="/grup.webp" alt="Group" width={2064} height={1655} unoptimized loading="eager" decoding="auto" className="relative z-10 h-[180px] md:h-[280px] w-auto object-contain translate-y-[2.5px] opacity-35" />
          </div>

          <div className="absolute bottom-0 right-4 md:right-10 opacity-50 hidden md:flex flex-col items-center pointer-events-none">
            {/* Magenta Tapakan (Base) - Wedge Shape from Sketch */}
            <div 
              className="absolute bottom-[-5px] right-[-20%] w-[150%] h-[140px] bg-gradient-to-r from-[#D946EF] to-[#FACC15] blur-[22px] z-0 opacity-80"
              style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%, 0 100%)" }}
            />
            <Image src="/brio_black.webp" alt="Brio" width={2226} height={1207} unoptimized loading="eager" decoding="auto" className="relative z-10 h-[150px] md:h-[240px] w-auto object-contain translate-y-[2.5px]" />
          </div>
        </div>
      </section>

      {/* ── Section 3: About Us ── */}
      <section id="section-about" className="relative w-full h-[70vh] overflow-hidden bg-black flex items-center justify-center border-t border-slate-900 z-30">
        <AnimatePresence initial={false} custom={aboutIndex}>
          <motion.div key={aboutIndex} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0 w-full h-full">
            <Image src={currentAboutImage.src} alt="About Us BG" width={currentAboutImage.width} height={currentAboutImage.height} unoptimized loading="eager" decoding="auto" className="w-full h-full object-cover opacity-70 grayscale md:grayscale-0" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050a14] via-[#050a14]/60 to-transparent z-[1]" />
            {/* Warm Peach & Gold & Magenta Master overlay on mobile */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/35 via-[#ffaa66]/30 to-[#ff00ff]/25 mix-blend-color md:hidden z-[2]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ff00ff]/20 via-[#ffaa66]/20 to-[#ffd700]/15 mix-blend-overlay md:hidden z-[3]" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 w-full max-w-6xl px-8 flex justify-center md:justify-start">
          <div className="flex flex-col items-center md:items-start gap-6 border-l-0 md:border-l-2 pl-0 md:pl-8">
            <h2 className="text-center md:text-left text-5xl md:text-7xl font-black uppercase tracking-tighter text-white">
              <Typewriter text="ABOUT US" mode="word" delay={3000} skipAnim={skipAnim} />
            </h2>
            <Link href="/about" onClick={() => {
              sessionStorage.setItem("landingScrollTarget", "section-about");
              sessionStorage.setItem("landingScrollY", window.scrollY);
            }}>
              <button
                className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
              >
                <span className="relative z-10">Get to Know More</span>
                <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 4: Merchandise / Support Us ── */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center py-20 z-40 border-t border-white/10 bg-transparent isolate overflow-hidden">
        {/* Golden Glow Border Aura - Aggressive */}
        <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_50px_rgba(251,191,36,0.7)] z-50 pointer-events-none" />
        
        {/* The Ultimate Background */}
        <SupportUsBackground />
        
        {/* Altar Border Element (Reversed 180, Truncated at Border) */}
        <div className="absolute top-[-60px] md:top-[-220px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-5 opacity-80">
          <Image
            src={isMobile ? "/hp/altar_hp.webp" : "/altar.webp"} 
            alt="Altar" 
            width={isMobile ? 2048 : 2400}
            height={isMobile ? 2048 : 1589}
            unoptimized
            loading="eager"
            decoding="auto"
            className={`h-[192px] md:h-[540px] w-auto object-contain drop-shadow-[0_10px_70px_rgba(255,255,255,0.05)] ${isMobile ? "" : "rotate-180"}`}
          />
        </div>

        {/* Architectural Wall Backgrounds */}
        <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
          <Image src="/wall_2.webp" alt="Wall 2" width={1888} height={2244} unoptimized loading="eager" decoding="auto" className="absolute bottom-0 right-0 h-[215px] md:h-[377px] w-auto object-contain opacity-90 brightness-110" />
          <Image src="/wall_1.webp" alt="Wall 1" width={2400} height={1603} unoptimized loading="eager" decoding="auto" className="absolute bottom-0 left-[-2%] md:left-[9%] h-[175px] md:h-[304px] w-auto object-contain opacity-90 brightness-110" />
        </div>

        <FloatingSpareParts />

        <div className="relative z-10 mb-24 flex justify-center w-full">
           <motion.h2 
             className="relative text-6xl md:text-8xl font-black uppercase tracking-tighter text-transparent bg-clip-text"
             style={{ 
               backgroundColor: "white",
               backgroundImage: "linear-gradient(to bottom, #ffffff 20%, #fff5f0 50%, #ffccac 100%)",
               backgroundSize: "100% 200%",
               textShadow: "1px 1.5px 0px #e2e8f0, 2px 3px 0px #cbd5e1, 3px 4.5px 0px #94a3b8, 4px 6px 25px rgba(0,0,0,0.6)" 
             }}
             animate={{ backgroundPosition: ["0% 0%", "0% 100%", "0% 0%"] }}
             transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
           >
             <Typewriter text="SUPPORT US" mode="none" delay={6000} skipAnim={skipAnim} />
           </motion.h2>
        </div>

        <div className="relative z-10 w-full max-w-6xl px-4 mb-20 flex justify-center">
          <StarDust />
          <div className={`grid gap-8 justify-items-center w-full ${isMobile ? "grid-cols-1 max-w-[280px]" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"}`}>
            {(isMobile ? displayedMerch.slice(0, 1) : displayedMerch).map((item, idx) => (
              <MerchCard key={idx} item={item} isInitial={merchInitial} index={idx} isMobile={isMobile} />
            ))}
            {!displayedMerch.length && (
               <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl w-full">
                 <p className="font-mono text-slate-500 uppercase tracking-widest text-sm">Synchronizing Inventory...</p>
               </div>
            )}
          </div>
        </div>

        {/* Bush Footer Decoration (Colliding in Middle, Truncated at Border) */}
        <div className="absolute bottom-[-75px] md:bottom-[-125px] left-1/2 -translate-x-1/2 flex items-end justify-center pointer-events-none z-5 w-screen overflow-hidden opacity-90">
          <TropicalParticles />
          <Image src="/bush_1.webp" alt="Bush 1" width={3178} height={1129} unoptimized loading="eager" decoding="auto" className="h-[180px] md:h-[320px] w-auto object-contain -mr-16 md:-mr-28 -translate-y-6 md:-translate-y-10" />
          <Image src="/bush_2.webp" alt="Bush 2" width={3172} height={1139} unoptimized loading="eager" decoding="auto" className="h-[180px] md:h-[320px] w-auto object-contain -ml-16 md:-ml-28" />
        </div>

        {/* Marketplace Links */}
        <div className="relative z-20 flex gap-6 md:gap-16 items-center justify-center mb-24">
          <a href="#" className="flex flex-col items-center gap-4 group transition-transform hover:scale-105">
            <div className="relative w-32 md:w-64 h-[42px] md:h-[72px] block">
              <Image src="/logo_tokpedgray.webp" alt="Tokopedia" width={992} height={1070} unoptimized loading="eager" decoding="auto" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" draggable={false} />
              <Image src="/logo_tokped.webp" alt="Tokopedia Colored" width={1008} height={1049} unoptimized loading="eager" decoding="auto" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(3,172,14,0.6)]" draggable={false} />
            </div>
            <span className="font-sans text-[12px] md:text-[17px] text-white font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center">Tokopedia - Kalceros</span>
          </a>
          <a href="#" className="flex flex-col items-center gap-4 group transition-transform hover:scale-105">
            <div className="relative w-32 md:w-64 h-[42px] md:h-[72px] block">
              <Image src="/logo_shopeegray.webp" alt="Shopee" width={1008} height={1043} unoptimized loading="eager" decoding="auto" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" draggable={false} />
              <Image src="/logo_shopee.webp" alt="Shopee Colored" width={1053} height={1024} unoptimized loading="eager" decoding="auto" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(238,77,45,0.6)]" draggable={false} />
            </div>
            <span className="font-sans text-[12px] md:text-[17px] text-white font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center">Shopee - Kalcres</span>
          </a>
        </div>
      </section>

      {/* ── Section 5: Find More ── */}
      <section className="relative w-full min-h-[90vh] bg-[#050a14] flex flex-col items-center justify-center py-20 z-50 border-t border-slate-900 overflow-hidden">
        
        {/* Ambient Blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[30%] w-[30vw] h-[30vw] rounded-full blur-[120px] bg-[#00FFFF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[20%] right-[30%] w-[40vw] h-[40vw] rounded-full blur-[140px] bg-[#FF00FF]" />
        </div>

        {/* Prince Rupert's Drop Assembly */}
        <PrinceRupertDrop />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          
          {/* Left Column: Typography */}
          <div className="relative flex flex-col items-center md:items-start justify-center text-center md:text-left p-4 order-2 md:order-1">
            <GoldenDust />
            <div className="relative z-10">
              <motion.h2 
                animate={isMobile ? { opacity: 1 } : { opacity: [0.3, 1, 0.3] }}
                transition={isMobile ? { duration: 0 } : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-6 font-mono text-center md:text-left"
              >
                FIND MORE
              </motion.h2>
              <p className="font-sans text-gray-300 text-sm md:text-lg max-w-md text-center md:text-left leading-relaxed px-4 md:px-0">
                Wahib embut keren banget wowowowow. Kalceria is the ultimate destination for automotive euphoria.
              </p>

              {/* Social Media Icon List - Horizontal Style on Mobile */}
              <div className="flex flex-row md:flex-col gap-6 mt-8 items-center justify-center md:items-start w-full">
                {/* Instagram Icon */}
                <a 
                  href="https://www.instagram.com/kalceria/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex flex-col md:flex-row items-center gap-2 md:gap-4 group cursor-pointer"
                >
                  <div className={`relative shrink-0 flex items-center justify-center ${isMobile ? "w-10 h-10" : "w-8 md:w-10 h-8 md:h-10"}`}>
                    <Image
                      src="/ig_gray.webp" 
                      alt="Instagram" 
                      width={1077}
                      height={976}
                      unoptimized
                      loading="eager"
                      decoding="auto"
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0 scale-[1.4]" 
                      draggable={false}
                    />
                    <Image
                      src="/ig.webp" 
                      alt="Instagram Colored" 
                      width={1077}
                      height={976}
                      unoptimized
                      loading="eager"
                      decoding="auto"
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(225,48,108,0.3)] scale-[1.4]" 
                      draggable={false}
                    />
                  </div>
                  <span className={`font-sans text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center ${isMobile ? "text-[13px]" : "text-[11px] md:text-sm"}`}>
                    Instagram - kalceria
                  </span>
                </a>

                {/* TikTok Icon */}
                <a 
                  href="https://www.tiktok.com/@gallerykalceria" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex flex-col md:flex-row items-center gap-2 md:gap-4 group cursor-pointer"
                >
                  <div className={`relative shrink-0 ${isMobile ? "w-10 h-10" : "w-8 md:w-10 h-8 md:h-10"}`}>
                    <Image
                      src="/tiktok_gray.webp" 
                      alt="TikTok" 
                      width={944}
                      height={1117}
                      unoptimized
                      loading="eager"
                      decoding="auto"
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" 
                      draggable={false}
                    />
                    <Image
                      src="/tiktok.webp" 
                      alt="TikTok Colored" 
                      width={944}
                      height={1117}
                      unoptimized
                      loading="eager"
                      decoding="auto"
                      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                      draggable={false}
                    />
                  </div>
                  <span className={`font-sans text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center ${isMobile ? "text-[13px]" : "text-[11px] md:text-sm"}`}>
                    tiktok kalceria
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: TikTok Feed Container */}
          <div className="relative flex items-center justify-center md:justify-start ml-0 md:-ml-[20%] py-10 order-1 md:order-2 w-full">
            <GoldenDust />
            {/* Clean, minimalist video container (shrunk 20% on mobile) */}
            <div className={`relative w-full ${isMobile ? "max-w-[210px] aspect-[9/16]" : "max-w-[289px] aspect-[340/680]"} group z-10 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl`}>
              <FindMoreSlider />
            </div>
          </div>

        </div>

        {/* Floating Mobile Mascot Background */}
        {isMobile && (
          <motion.div 
            animate={{ y: [-10, 10, -10], rotate: [-2, 2, -2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[5%] right-[25%] w-96 h-auto opacity-90 pointer-events-none z-[1]"
          >
            <Image src="/hp/kalcer_man_hp.webp" alt="Kalcer Mascot HP" width={2048} height={2048} unoptimized loading="eager" decoding="auto" className="w-full h-auto object-contain" />
          </motion.div>
        )}

        {/* Looping 8-Bit Mascot (Fixed Corner Position) */}
        <div className="hidden md:block absolute bottom-0 right-0 w-56 md:w-80 z-20 pointer-events-none">
          {/* Hat placed above the head */}
          <Image
            src="/kalcer_hat.webp" 
            alt="Kalcer Hat" 
            width={1408}
            height={768}
            unoptimized
            loading="eager"
            decoding="auto"
            className="absolute top-[-30%] left-1/2 -translate-x-[56%] w-[185%] h-auto z-30 drop-shadow-[0_15px_10px_rgba(0,0,0,0.5)]"
          />
          
          <Image
            src={mascotFrame === 1 ? "/kalcer_man.webp" : "/kalcer_man2.webp"} 
            alt="Kalcer Mascot" 
            width={912}
            height={1181}
            unoptimized
            loading="eager"
            decoding="auto"
            className="relative z-10 w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(255,0,255,0.3)]"
          />

          {/* Static Favicon Overlay to cover Gemini Logo in the absolute corner */}
          <Image
            src="/favicon.webp"
            alt="Favicon"
            width={771}
            height={681}
            unoptimized
            loading="eager"
            decoding="auto"
            className="absolute bottom-1 right-1 w-6 md:w-8 h-auto z-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          />
        </div>
      </section>

      {/* ── Section 6: Need Help? ── */}
      <section className="relative w-full min-h-[107vh] bg-white flex flex-col items-center justify-center py-32 z-50 overflow-hidden">
        
        {/* Solid Section Divider */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#050a14] z-[70]" />

        {/* Layer 1: Subtle geometry background (Dark dots for white base) */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none z-0">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
        </div>

        {/* Dynamic Aggressive Blobs (Magenta & Gold) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1], 
              x: ["-15%", "25%", "-15%"], 
              y: ["-10%", "15%", "-10%"]
            }} 
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-0 left-0 w-[70vw] h-[70vw] rounded-full blur-[140px] bg-[#D946EF] opacity-40 mix-blend-multiply" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1.6, 1.2], 
              x: ["20%", "-20%", "20%"], 
              y: ["20%", "-5%", "20%"]
            }} 
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} 
            className="absolute bottom-0 right-0 w-[65vw] h-[65vw] rounded-full blur-[150px] bg-[#FACC15] opacity-40 mix-blend-multiply" 
          />
        </div>

        {/* Layer 2: Rolling Film Rolls (Strict Global Layering to prevent any cutting) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Bottom Layer: All White Lanes */}
          <div className="absolute inset-0 z-10">
            <FilmLane rotation={15} top="15%" left="-10%" />
            <FilmLane rotation={-3} top="48%" left="-10%" />
            <FilmLane rotation={6} top="75%" left="-10%" />
            <FilmLane rotation={-55} top="100%" left="15%" height="h-20 md:h-32" />
          </div>

          {/* Top Layer: All Scrolling Film Strips */}
          <div className="absolute inset-0 z-20">
            <FilmStrip rotation={15} top="15%" left="-10%" speed={50} />
            <FilmStrip rotation={-3} top="48%" left="-10%" speed={60} />
            <FilmStrip rotation={6} top="75%" left="-10%" speed={45} />
            <FilmStrip rotation={-55} top="100%" left="15%" speed={55} height="h-20 md:h-32" />
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 flex flex-col items-center justify-center w-full h-full"
        >
          {/* Shrunk square box, centered perfectly with Moto photographers (Dark translucent for white bg) */}
          <div className="relative bg-black/[0.08] border border-black/10 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 aspect-square w-full max-w-[290px] md:max-w-[420px] flex flex-col items-center justify-center shadow-[0_40px_100px_rgba(0,0,0,0.1)]">
             
             {/* Moto Figures: Locked tightly to box edges using wrappers for perfect alignment */}
             
             {/* TOP (Normal, 0deg) */}
             <div className="hidden md:block absolute inset-0 pointer-events-none z-20">
               <motion.img 
                 src="/moto_1.webp" 
                 alt="Moto 1"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* Mobile Cokineed HP on top of the box in the middle top */}
             {isMobile && (
               <div className="absolute inset-0 pointer-events-none z-20">
                 <motion.img 
                   src="/hp/cokineed_hp.webp" 
                   alt="Cokineed HP" 
                   animate={{ rotate: [-6, 6, -6], y: [0, -4, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute bottom-full left-1/2 -translate-x-1/2 w-28 h-auto object-contain origin-bottom select-none"
                   draggable={false}
                 />
               </div>
             )}

             {/* RIGHT (90deg) */}
             <div className="hidden md:block absolute inset-0 rotate-90 pointer-events-none z-20">
               <motion.img 
                 src="/moto_2.webp" 
                 alt="Moto 2"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* BOTTOM (180deg) */}
             <div className="hidden md:block absolute inset-0 rotate-180 pointer-events-none z-20">
               <motion.img 
                 src="/moto_3.webp" 
                 alt="Moto 3"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-44 md:h-60 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             {/* LEFT (-90deg) */}
             <div className="hidden md:block absolute inset-0 -rotate-90 pointer-events-none z-20">
               <motion.img 
                 src="/moto_4.webp" 
                 alt="Moto 4"
                 className="absolute bottom-full left-1/2 -translate-x-1/2 h-48 md:h-64 w-auto object-contain origin-bottom"
                 initial={{ opacity: 0, scale: 0.8 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true }}
               />
             </div>

             <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white mb-8 md:mb-10 text-center leading-none" style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}>
               Need Our Help?
             </h2>
             
             <motion.button
               onClick={() => setShowServiceModal(true)}
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="relative px-8 md:px-12 py-3 md:py-4 font-sans font-black uppercase tracking-tighter text-sm md:text-base text-black bg-white group cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.2)]"
               style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
             >
               <span className="relative z-10">APPLY A REQUEST</span>
               <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
             </motion.button>
          </div>
        </motion.div>

        {isMobile && (
          <div className="absolute bottom-0 left-0 w-full h-48 pointer-events-none z-30 overflow-visible">
            {/* Camera HP: Centered at the middle bottom and scaled 75% bigger */}
            <Image
              src="/hp/camera_hp.webp" 
              alt="Camera HP" 
              width={1210}
              height={864}
              unoptimized
              loading="eager"
              decoding="auto"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[196px] h-auto object-contain select-none translate-y-[2px]" 
              draggable={false}
            />
          </div>
        )}
      </section>

      <ClosingSections isMobile={isMobile} onOpenIdeaModal={openIdeaModal} />

      <AnimatePresence>
        {showServiceModal && (
          <ServiceRequestModal
            onClose={() => setShowServiceModal(false)}
            onRequireAuth={() => {
              setShowServiceModal(false);
              onNavigateAuth?.();
            }}
          />
        )}
        {showLogoutConfirm && (
          <LogoutConfirmModal 
            onConfirm={handleLogout} 
            onCancel={() => setShowLogoutConfirm(false)} 
          />
        )}
        {showIdeaModal && (
          <IdeaCommentModal onClose={closeIdeaModal} />
        )}
      </AnimatePresence>

    </motion.div>
  );
}
