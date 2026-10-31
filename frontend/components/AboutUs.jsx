"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { StaticTypewriter } from "./about/typewriter";
import { PhotoCollage, VideoCollage } from "./about/collage";
import { FloatingQuotesLayer } from "./about/quotes";
import dynamic from "next/dynamic";
import { GoldenAmbientSparks, AnimatedReiiPair } from "./about/ambient";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

const WebDevEntrySequence = dynamic(() => import("./about/entrySequence").then(m => m.WebDevEntrySequence), { ssr: false });

export default function AboutUs() {
  const [showEntry, setShowEntry] = useState(false);
  const [entryDone, setEntryDone] = useState(false);
  
  // Character Hover / Tap states
  const [hoverMentor, setHoverMentor] = useState(false);
  const [activeChar, setActiveChar] = useState(null); // 'rei' | 'josh' | 'otniel' | null
  const [hoverRei, setHoverRei] = useState(false);
  const [hoverJosh, setHoverJosh] = useState(false);
  const [hoverOtniel, setHoverOtniel] = useState(false);

  const toggleChar = (char) => {
    setActiveChar((prev) => (prev === char ? null : char));
  };
  
  const handleEntryComplete = useCallback(() => {
    setShowEntry(false);
    setEntryDone(true);
  }, []);
  
  // ─── Mouse Tracking for Masking (cached rect avoids forced reflow on mousemove) ───
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef(null);
  const rectCacheRef = useRef(null);

  const isMobile = useIsMobileViewport();

  const refreshContainerRect = useCallback(() => {
    if (containerRef.current) {
      rectCacheRef.current = containerRef.current.getBoundingClientRect();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", refreshContainerRect, { passive: true });
    window.addEventListener("scroll", refreshContainerRect, { passive: true });
    return () => {
      window.removeEventListener("resize", refreshContainerRect);
      window.removeEventListener("scroll", refreshContainerRect);
    };
  }, [refreshContainerRect]);

  const handleMouseMove = (e) => {
    if (!rectCacheRef.current) refreshContainerRect();
    const rect = rectCacheRef.current;
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  // FAQ state
  const [masterFaqOpen, setMasterFaqOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: "WHAT IS THE END OF LINE CLUB?",
      a: "A clandestine automotive culture collective focused on pushing the boundaries of aesthetics and performance. We exist at the intersection of high-octane engineering and premium digital art."
    },
    {
      q: "WHO IS BEHIND KALCERIA?",
      a: "Kalceria was forged by a dedicated core team including Coki, Wahib Embut, and the rest of the crew. They serve as the architects behind the movement, continuously pushing the limits of automotive luxury and interactive media."
    },
    {
      q: "HOW TO PARTICIPATE IN FUTURE EVENTS?",
      a: "Keep an eye on our event drops. We operate on an invite-only and limited-slot basis. Ensure you are registered and frequently check the dashboard for the latest coordinates."
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0.01, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full min-h-screen bg-[#050a14] text-white overflow-x-hidden selection:bg-[#FFD700] selection:text-black"
    >
      
      {/* ── SECTION 1: ABOUT US & DICTIONARY ── */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-8 py-32 overflow-hidden z-10">
        
        {/* Video Collage Background */}
        <VideoCollage isMobile={isMobile} />

        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#00FFFF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[10%] right-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FF00FF]" />
        </div>

        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">
          
          <motion.h1 
            initial={{ y: -40, opacity: 0.01 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-2xl mb-6 font-mono"
          >
            ABOUT US
          </motion.h1>

          <motion.h2 
            initial={{ opacity: 0.01 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.9 }}
            className="text-3xl md:text-5xl italic font-medium tracking-wide text-slate-300 font-serif mb-16"
          >
            De bello
            <span className="block mt-2 text-slate-400 text-lg md:text-xl tracking-widest">(About)</span>
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0.01, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-left w-full max-w-2xl bg-black/40 p-10 shadow-2xl backdrop-blur-md relative border-l-4 border-slate-700 font-serif"
          >
            <h2 className="text-4xl font-bold mb-2 tracking-tight text-slate-100">Kalceria</h2>
            <p className="text-[#FFD700] italic mb-6 font-medium text-lg tracking-wide">noun. /kal·ce·ri·a/</p>
            <ol className="list-decimal pl-6 space-y-5 text-slate-300 leading-relaxed text-lg">
              <li className="pl-3 min-h-[3em]">
                <StaticTypewriter text="A state of transcendent automotive euphoria; the intersection where mechanical precision meets high-fidelity aesthetic design." speed={15} delay={1200} />
              </li>
              <li className="pl-3 min-h-[3em]">
                <StaticTypewriter text="A clandestine movement of enthusiasts dedicated to preserving the visceral experience of the drive in a digital age." speed={15} delay={3000} />
              </li>
            </ol>
          </motion.div>
        </div>
      </section>

      {/* Dynamic Cyan Separator Line */}
      <div className="w-full h-[1px] bg-cyan-500/50 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_#00FFFF] relative z-40" />

      {/* ── SECTION 2: MAN BEHIND THE SCENE ── */}
      <section className="relative w-full py-40 flex flex-col items-center overflow-hidden z-20 bg-[#050a14]">
        
        {/* Photo Collage Background */}
        <PhotoCollage isMobile={isMobile} />

        {/* Ambient Blobs: Golden & Cyan */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FFD700]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#00FFFF]" />
        </div>

        <div className="relative z-10 mb-20 text-center px-4 flex flex-col items-center pointer-events-none">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-mono font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-100 to-slate-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            MAN BEHIND THE SCENE
          </motion.h2>

          <motion.div 
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4, ease: "circOut" }}
            className="h-[1px] w-full max-w-md bg-gradient-to-r from-transparent via-[#FFD700] to-transparent my-6 origin-center"
          />

          <div className="text-slate-400 font-mono text-xs md:text-sm tracking-widest max-w-2xl min-h-[2em]">
            <StaticTypewriter 
              text="Reyhan Batara, also known as Coki, was a revolutionary car enthusiast. He spent his life blending mechanical engineering with digital innovation to create the most stunning automotive experiences. His vision remains the driving force behind every project we undertake." 
              speed={20} 
              delay={1000} 
              highlights={[
                { start: 0, end: 12 },  // Reyhan Batara
                { start: 29, end: 32 }  // Coki
              ]}
            />
          </div>
        </div>

        {/* Cursor Masking Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          ref={containerRef}
          onMouseEnter={refreshContainerRect}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative z-10 w-[75%] max-w-4xl aspect-video md:aspect-[21/9] bg-[#0c1528] overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.6)] cursor-crosshair group"
          style={{ clipPath: "polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)" }}
        >
          {/* Base Layer: Grayscale ONLY (No Blur) */}
          <Image
            src="/man.webp" 
            alt="Reyhan Batara and the Kalceria founding team" 
            width={1193}
            height={761}
            sizes="(max-width: 768px) 75vw, 896px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover filter grayscale opacity-40 transition-all duration-500" 
            draggable={false}
          />

          {/* OWNER HIGHLIGHT: Golden-Magenta Chromatic Aberration (Inspired by Preloader 'K') */}
          <div 
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{
              WebkitMaskImage: `radial-gradient(ellipse 20% 70% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)`,
              maskImage: `radial-gradient(ellipse 20% 70% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)`
            }}
          >
            {/* Sharp Grayscale Anchor (Ensures face clarity) */}
            <Image
              src="/man.webp" 
              alt=""
              aria-hidden="true"
              width={1193}
              height={761}
              sizes="(max-width: 768px) 75vw, 896px"
              quality={75}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 brightness-110" 
              draggable={false}
            />

            {/* Magenta Shifted Layer (Reduced offset) */}
            <motion.img 
              src="/man.webp" 
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              animate={{ x: [-1, -2, -1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" 
              style={{ filter: "sepia(1) saturate(10) hue-rotate(280deg) brightness(1.1)", willChange: "transform" }} 
              draggable={false}
            />
            {/* Golden Shifted Layer (Reduced offset) */}
            <motion.img 
              src="/man.webp" 
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              animate={{ x: [1, 2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" 
              style={{ filter: "sepia(1) saturate(10) hue-rotate(15deg) brightness(1.1)", willChange: "transform" }} 
              draggable={false}
            />
          </div>
          
          {/* Reveal Layer: Full Color with Dynamic Mask via Mouse */}
          <motion.div 
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
            animate={{ opacity: mousePos.x === -1000 ? 0 : 1 }}
            style={{
              WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`,
              maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`
            }}
          >
            <Image
              src="/man.webp" 
              alt=""
              aria-hidden="true"
              width={1193}
              height={761}
              sizes="(max-width: 768px) 75vw, 896px"
              quality={75}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover contrast-110 saturate-110" 
              draggable={false}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Dynamic Cyan Separator Line */}
      <div className="w-full h-[1px] bg-cyan-500/50 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_#00FFFF] relative z-40" />

      {/* ── SECTION: THE GOLDEN CORE ── */}
      <motion.section 
        onViewportEnter={() => {
          if (!entryDone && !showEntry) {
            setShowEntry(true);
          }
        }}
        className="relative w-full flex flex-col items-center justify-center overflow-hidden z-25 border-t border-slate-900 min-h-[112.5vh] md:min-h-[150vh]"
      >
        
        {/* Entry Sequence Overlay */}
        <AnimatePresence>
          {showEntry && (
            <WebDevEntrySequence onComplete={handleEntryComplete} />
          )}
        </AnimatePresence>

        {/* Base Background: Deep Mix of Red & Black */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-black to-[#050000]" />
        
        {/* Dynamic Random Blobs (Gold & Orange-Gold) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen">
          {/* Golden Blob */}
          <motion.div 
            animate={{ 
              x: ["-10%", "30%", "10%", "-10%"],
              y: ["-20%", "20%", "40%", "-20%"],
              scale: [1, 1.4, 1.2, 1]
            }} 
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#f59e0b]/30" 
          />
          {/* Orange-Gold Blob 1 */}
          <motion.div 
            animate={{ 
              x: ["40%", "-20%", "0%", "40%"],
              y: ["10%", "-10%", "-40%", "10%"],
              scale: [1.2, 1, 1.3, 1.2]
            }} 
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
            className="absolute bottom-1/4 right-1/4 w-[65vw] h-[65vw] rounded-full blur-[160px] bg-[#fbbf24]/30" 
          />
          {/* Orange-Gold Blob 2 (Aggressive Burnt Orange) */}
          <motion.div 
            animate={{ 
              x: ["0%", "50%", "-30%", "0%"],
              y: ["50%", "0%", "50%", "50%"],
              scale: [0.8, 1.5, 1, 0.8]
            }} 
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }} 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] rounded-full blur-[180px] bg-[#ea580c]/25" 
          />
        </div>

        {/* Golden Shine Effect - Rising from the plateau */}
        <motion.div 
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[40vh] z-[3] pointer-events-none transform translate-y-[10%]"
          style={{ 
            background: "radial-gradient(ellipse at center, rgba(255, 215, 0, 0.4) 0%, transparent 70%)",
            filter: "blur(60px)"
          }}
        />

        {/* Character Group Behind Plateau */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-auto z-[4] pointer-events-none transform translate-y-[15%]">
           
           {/* Mobile Unified Top-Center Info Box above Central Gladiator */}
           {isMobile && (
             <AnimatePresence>
               {activeChar && (
                 <motion.div
                   key={activeChar}
                   initial={{ opacity: 0, y: 15, scale: 0.9 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 15, scale: 0.9 }}
                   className="absolute bottom-[36vh] sm:bottom-[38vh] left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.85)] z-[50] w-max flex flex-col items-center p-3.5 rounded-[1.2rem] pointer-events-auto"
                   style={{ fontFamily: "'Times New Roman', Times, serif" }}
                 >
                   {/* Photo Box */}
                   <div className="overflow-hidden border border-white/15 bg-black/30 w-[84px] h-[84px] rounded-[0.6rem] mb-2 shadow-inner">
                     <Image 
                       src={activeChar === "rei" ? "/reifo.webp" : activeChar === "josh" ? "/jofo.webp" : "/ofo.webp"} 
                       alt={activeChar} 
                       width={200} 
                       height={200} 
                       sizes="84px" 
                       quality={80} 
                       className="w-full h-full object-cover" 
                     />
                   </div>
                   
                   <div className="absolute -z-10 inset-0 bg-black/60 blur-2xl rounded-full scale-75" />
                   <p className="text-white font-normal leading-relaxed relative z-10 text-xs text-center">
                     <span className="underline font-bold">Our beloved friend,</span><br />
                     {activeChar === "rei" ? "Reinathan Ezkhiel K." : activeChar === "josh" ? "Joshua Ricardo R." : "Otniel Kristian S."}
                   </p>
                 </motion.div>
               )}
             </AnimatePresence>
           )}

           {/* Rei - Center Bottom Layer (Central Gladiator) */}
           <div 
             className="absolute left-1/2 -translate-x-1/2 h-[102vh] w-auto z-[1] pointer-events-auto bottom-[-34vh] md:bottom-[-25vh]"
             onMouseEnter={() => { if (!isMobile) { setHoverRei(true); setActiveChar("rei"); } }}
             onMouseLeave={() => { if (!isMobile) { setHoverRei(false); setActiveChar(null); } }}
             onClick={() => { toggleChar("rei"); setHoverRei((p) => !p); }}
           >
             <Image
               src="/rei.webp" 
               alt="Reinathan Ezkhiel K." 
               width={1536}
               height={2736}
               sizes="(max-width: 768px) 55vw, 520px"
               quality={75}
               loading="lazy"
               decoding="async"
               className="h-full w-auto object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.2)] cursor-pointer md:cursor-help"
             />
             {!isMobile && (
               <AnimatePresence>
                  {(hoverRei || activeChar === "rei") && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      className="absolute bottom-[68%] left-[70%] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max flex flex-col items-start p-3 rounded-[1rem] md:p-5 md:rounded-[2rem]"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      {/* Photo Box */}
                      <div className="overflow-hidden border border-white/10 bg-black/20 w-[80px] h-[80px] rounded-[0.5rem] mb-2 md:w-[136px] md:h-[136px] md:rounded-[1rem] md:mb-4">
                        <Image src="/reifo.webp" alt="Reinathan photo" width={481} height={572} sizes="(max-width: 768px) 80px, 136px" quality={75} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                      <p className="text-white font-normal leading-relaxed relative z-10 text-xs md:text-base">
                        <span className="underline font-bold">Our beloved friend,</span><br />
                        Reinathan Ezkhiel K.
                      </p>
                    </motion.div>
                  )}
               </AnimatePresence>
             )}
           </div>

           {/* Josh - Left Upper Layer */}
           <div 
             className="absolute -translate-x-1/2 z-[2] pointer-events-auto bottom-0 left-[25%] w-[34vw] h-auto md:left-[30%] md:h-[63vh] md:w-auto"
             onMouseEnter={() => { if (!isMobile) { setHoverJosh(true); setActiveChar("josh"); } }}
             onMouseLeave={() => { if (!isMobile) { setHoverJosh(false); setActiveChar(null); } }}
             onClick={() => { toggleChar("josh"); setHoverJosh((p) => !p); }}
           >
             <Image
               src="/josh.webp" 
               alt="Joshua Ricardo R." 
               width={2016}
               height={2130}
               sizes="(max-width: 768px) 34vw, 560px"
               quality={75}
               loading="lazy"
               decoding="async"
               className="object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-pointer md:cursor-help w-full h-auto md:h-full md:w-auto"
             />
             {!isMobile && (
               <AnimatePresence>
                  {(hoverJosh || activeChar === "josh") && (
                    <motion.div
                      initial={{ opacity: 0, x: 20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      className="absolute bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max flex flex-col items-start top-[30%] right-[80%] p-3 rounded-[1rem] md:top-[40%] md:right-[85%] md:p-5 md:rounded-[2rem]"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      {/* Photo Box */}
                      <div className="overflow-hidden border border-white/10 bg-black/20 w-[80px] h-[80px] rounded-[0.5rem] mb-2 md:w-[136px] md:h-[136px] md:rounded-[1rem] md:mb-4">
                        <Image src="/jofo.webp" alt="Joshua photo" width={433} height={416} sizes="(max-width: 768px) 80px, 136px" quality={75} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>

                      <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                      <p className="text-white font-normal leading-relaxed relative z-10 text-xs md:text-base">
                        <span className="underline font-bold">Our beloved friend,</span><br />
                        Joshua Ricardo R.
                      </p>
                    </motion.div>
                  )}
               </AnimatePresence>
             )}
           </div>

           {/* Otniel - Right Upper Layer */}
           <div 
             className="absolute -translate-x-1/2 z-[2] pointer-events-auto left-[75%] w-[28vw] h-auto bottom-0 md:h-[63vh] md:w-auto md:bottom-[-18vh]"
             onMouseEnter={() => { if (!isMobile) { setHoverOtniel(true); setActiveChar("otniel"); } }}
             onMouseLeave={() => { if (!isMobile) { setHoverOtniel(false); setActiveChar(null); } }}
             onClick={() => { toggleChar("otniel"); setHoverOtniel((p) => !p); }}
           >
             <Image
               src="/otniel.webp" 
               alt="Otniel Kristian S." 
               width={1888}
               height={2234}
               sizes="(max-width: 768px) 28vw, 560px"
               quality={75}
               loading="lazy"
               decoding="async"
               className="object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-pointer md:cursor-help w-full h-auto md:h-full md:w-auto md:scale-[1.3] md:origin-bottom"
             />
             {!isMobile && (
               <AnimatePresence>
                  {(hoverOtniel || activeChar === "otniel") && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.9 }}
                      className="absolute top-[25%] left-[95%] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max flex flex-col items-start p-3 rounded-[1rem] md:p-5 md:rounded-[2rem]"
                      style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                      {/* Photo Box */}
                      <div className="overflow-hidden border border-white/10 bg-black/20 w-[80px] h-[80px] rounded-[0.5rem] mb-2 md:w-[136px] md:h-[136px] md:rounded-[1rem] md:mb-4">
                        <Image src="/ofo.webp" alt="Otniel photo" width={664} height={622} sizes="(max-width: 768px) 80px, 136px" quality={75} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>

                      <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                      <p className="text-white font-normal leading-relaxed relative z-10 text-xs md:text-base">
                        <span className="underline font-bold">Our beloved friend,</span><br />
                        Otniel Kristian S.
                      </p>
                    </motion.div>
                  )}
               </AnimatePresence>
             )}
           </div>
        </div>

        {/* Plateau Centerpiece - Adjusted Height */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto h-auto z-[10] pointer-events-none transform translate-y-[40%]">
          <Image
            src="/plateau.webp" 
            alt="Golden plateau" 
            width={1050}
            height={700}
            sizes="(max-width: 768px) 90vw, 1050px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="w-auto h-auto object-contain opacity-90 brightness-75 contrast-125"
            style={{ 
              maskImage: "linear-gradient(to top, black 50%, transparent 100%), radial-gradient(ellipse at center, black 80%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to top, black 50%, transparent 100%), radial-gradient(ellipse at center, black 80%, transparent 100%)"
            }}
          />

          {/* Floating Logolden - Above Plateau Layer (Tight Steady Float) */}
          <motion.div
            animate={{ 
              y: [0, -6, 0] 
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-[20] w-[232px] md:w-[323px] h-auto drop-shadow-[0_0_50px_rgba(255,215,0,0.6)] translate-y-[112%] md:translate-y-[143%]"
            style={{ 
              rotate: "0deg",
              willChange: "transform"
            }}
          >
            <Image
              src="/logolden.webp" 
              alt="Kalceria Golden Logo" 
              width={2400}
              height={715}
              sizes="(max-width: 768px) 232px, 323px"
              quality={75}
              loading="lazy"
              decoding="async"
              className="w-full h-auto object-contain brightness-110 contrast-125" 
            />
          </motion.div>
        </div>

        {/* Golden Ambient Sparks (Free Floating) */}
        <GoldenAmbientSparks />

        {/* Section Title at the top - Always visible & prominent on re-scroll */}
        <div className="absolute top-10 sm:top-14 md:top-20 left-1/2 -translate-x-1/2 z-30 text-center w-full px-6 flex flex-col items-center pointer-events-none">
           <motion.h2 
             initial={{ opacity: 1, y: 0 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="text-4xl sm:text-5xl md:text-7xl font-normal tracking-tighter text-white leading-none select-none"
             style={{ 
               fontFamily: "'Times New Roman', Times, serif",
               textShadow: `
                 1px 1px 0px #ccc,
                 2px 2px 0px #bbb,
                 3px 3px 0px #aaa,
                 4px 4px 0px #999,
                 5px 5px 0px #888,
                 6px 6px 15px rgba(0,0,0,0.5)
               `
             }}
           >
             Webdev Team
           </motion.h2>
        </div>

        {/* Static Paragraph - Centered on mobile, Left on desktop */}
        <p 
          className="absolute top-[4.6rem] sm:top-[5.5rem] md:top-[12.5rem] w-[90%] max-w-[340px] md:max-w-[280px] text-slate-200 text-xs sm:text-sm md:text-lg font-normal leading-relaxed pointer-events-none z-30 text-center md:text-justify left-1/2 -translate-x-1/2 md:left-[32%] md:translate-x-0 opacity-100"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Kalceria used to be a Final Project, now it is becoming a legacy of digital craftsmanship and automotive passion. It stands as a testament to the boundary-pushing creativity of our development team.
        </p>
        
        {/* dy_3 (Fitra Eri / Mentor) image - Not diagonal (0deg), +30% size on mobile, with white L-border */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[50.4%] z-20 top-[12rem] sm:top-[13rem] md:top-[5.88rem]"
          onMouseEnter={() => setHoverMentor(true)}
          onMouseLeave={() => setHoverMentor(false)}
          onClick={() => setHoverMentor((p) => !p)}
        >
          <div className="relative">
            <Image
              src="/dy_3.webp" 
              alt="Ditya Alif K."
              width={1536}
              height={2729}
              sizes="(max-width: 768px) 245px, 372px"
              quality={85}
              loading="lazy"
              decoding="async"
              className="object-contain pointer-events-auto opacity-95 cursor-pointer md:cursor-help w-[220px] h-[220px] xs:w-[245px] xs:h-[245px] md:w-[23.25rem] md:h-[23.25rem] transition-transform duration-300"
              style={{ rotate: isMobile ? "0deg" : "-10.5deg" }}
            />
            {/* White L-corner border at bottom for mobile (matching Coki on SeeEvent) */}
            {isMobile && (
              <>
                <div className="absolute left-0 bottom-0 w-[4px] h-[50%] bg-white z-20 shadow-[0_0_8px_white]" />
                <div className="absolute left-0 bottom-0 h-[4px] w-full bg-white z-20 shadow-[0_0_8px_white]" />
              </>
            )}
          </div>
          
          <AnimatePresence>
            {hoverMentor && (
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                className="absolute top-[20%] left-[95%] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max rounded-[1.5rem] px-4 py-2.5 md:px-6 md:py-4"
                style={{ 
                  fontFamily: "'Times New Roman', Times, serif"
                }}
              >
                {/* Black Blob effect inside */}
                <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                
                <p className="text-white font-normal leading-tight relative z-10 text-xs md:text-xl">
                  <span className="underline font-bold block mb-2">Our Mentor,</span>
                  Ditya Alif K.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Aesthetic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 pointer-events-none" />
      </motion.section>

      {/* Dynamic Cyan Separator Line */}
      <div className="w-full h-[1px] bg-cyan-500/50 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_#00FFFF] relative z-40" />

      {/* ── SECTION 3: THE FAQ ACCORDION ── */}
      <section className="relative w-full min-h-screen py-24 md:py-40 flex flex-col items-center justify-between overflow-hidden z-30 bg-[#050a14]">
        
        {/* Floating Bohemian Quotes Background */}
        <FloatingQuotesLayer />

        {/* Ambient Blobs: Golden & Magenta */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] left-[30%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FF00FF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[10%] right-[30%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FFD700]" />
        </div>

        {/* Mobile: Animated Reii Pair Sticks to Bottom Screen Corners (Outside FAQ card) */}
        {isMobile && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-between pointer-events-none px-0">
            <AnimatedReiiPair isMobile={true} />
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="relative z-10 w-[90%] max-w-4xl flex flex-col my-auto"
        >
          {/* 1. GLASS BACKGROUND LAYER (Blurs the quotes behind it) */}
          <div 
            className="absolute inset-0 border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_80px_rgba(0,0,0,0.8)] z-0 pointer-events-none" 
            style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }} 
          />

          {/* Desktop Reii Pair Flanks the Card */}
          {!isMobile && (
            <AnimatedReiiPair isMobile={false} />
          )}

          {/* 4. CONTENT LAYER (Text and buttons) */}
          <div className="relative z-20 flex flex-col w-full h-full transition-all duration-300">
            <button 
              onClick={() => setMasterFaqOpen(!masterFaqOpen)}
              className="w-full text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none px-4 py-4 md:px-8 md:py-10"
            >
              <span className="font-mono font-black uppercase tracking-tighter text-white transition-colors drop-shadow-2xl text-lg sm:text-2xl md:text-5xl">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <span className="font-mono text-white transition-transform duration-300 text-xl md:text-4xl" style={{ transform: masterFaqOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                +
              </span>
            </button>

            {/* NESTED QUESTIONS */}
            <AnimatePresence>
              {masterFaqOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="bg-transparent border-t border-white/10 overflow-hidden"
                >
                  <div className="flex flex-col p-2 sm:p-3 gap-2 sm:gap-3 md:p-8 md:gap-4">
                    
                    {faqs.map((faq, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="flex flex-col border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition-colors"
                      >
                        <button 
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          className="w-full text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none px-3.5 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6"
                        >
                          <span className="font-mono font-black uppercase tracking-tighter text-slate-300 group-hover:text-white transition-colors pr-4 text-xs sm:text-sm md:text-xl">
                            {faq.q}
                          </span>
                          <span className="font-mono text-white transition-colors flex-shrink-0 text-base md:text-2xl">
                            {openFaq === i ? "—" : "+"}
                          </span>
                        </button>

                        <AnimatePresence>
                          {openFaq === i && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="border-t border-slate-800 overflow-hidden"
                            >
                              <div className="font-sans text-slate-400 leading-relaxed bg-[#060c18] px-3.5 py-3 text-[11px] sm:text-xs md:px-6 md:py-6 md:text-base">
                                {faq.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </section>

    </motion.div>
  );
}
