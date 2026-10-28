"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { StaticTypewriter } from "./about/typewriter";
import { PhotoCollage, VideoCollage } from "./about/collage";
import { FloatingQuotesLayer } from "./about/quotes";
import { GoldenAmbientSparks, DanglingSymbols } from "./about/ambient";
import { WebDevEntrySequence } from "./about/entrySequence";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";

export default function AboutUs() {
  const [showEntry, setShowEntry] = useState(false);
  const [entryDone, setEntryDone] = useState(false);
  const mounted = useHasMounted();
  
  // Character Hover states
  const [hoverMentor, setHoverMentor] = useState(false);
  const [hoverRei, setHoverRei] = useState(false);
  const [hoverJosh, setHoverJosh] = useState(false);
  const [hoverOtniel, setHoverOtniel] = useState(false);
  
  const handleEntryComplete = useCallback(() => {
    setShowEntry(false);
    setEntryDone(true);
  }, []);
  
  // ─── Mouse Tracking for Masking ───
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef(null);

  const isMobile = useIsMobileViewport();

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  // FAQ state
  const [masterFaqOpen, setMasterFaqOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Image toggle state
  const [imgToggle, setImgToggle] = useState(false);
  useEffect(() => {
    const itv = setInterval(() => setImgToggle(prev => !prev), 1000);
    return () => clearInterval(itv);
  }, []);

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

  if (!mounted) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
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
            initial={{ y: -100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-2xl mb-6 font-mono"
          >
            ABOUT US
          </motion.h1>

          <motion.h2 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl italic font-medium tracking-wide text-slate-300 font-serif mb-16"
          >
            De bello
            <span className="block mt-2 text-slate-500 text-lg md:text-xl tracking-widest">(About)</span>
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.8 }}
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
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative z-10 w-[75%] max-w-4xl aspect-video md:aspect-[21/9] bg-[#0c1528] overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.6)] cursor-crosshair group"
          style={{ clipPath: "polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)" }}
        >
          {/* Base Layer: Grayscale ONLY (No Blur) */}
          <Image
            src="/man.webp" 
            alt="The Team" 
            width={1193}
            height={761}
            unoptimized
            loading="eager"
            decoding="auto"
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
              unoptimized
              loading="eager"
              decoding="auto"
              className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 brightness-110" 
              draggable={false}
            />

            {/* Magenta Shifted Layer (Reduced offset) */}
            <motion.img 
              src="/man.webp" 
              animate={{ x: [-1, -2, -1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" 
              style={{ filter: "sepia(1) saturate(10) hue-rotate(280deg) brightness(1.1)" }} 
              draggable={false}
            />
            {/* Golden Shifted Layer (Reduced offset) */}
            <motion.img 
              src="/man.webp" 
              animate={{ x: [1, 2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" 
              style={{ filter: "sepia(1) saturate(10) hue-rotate(15deg) brightness(1.1)" }} 
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
              alt="The Team Color" 
              width={1193}
              height={761}
              unoptimized
              loading="eager"
              decoding="auto"
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
        className={`relative w-full flex flex-col items-center justify-center overflow-hidden z-25 border-t border-slate-900 ${isMobile ? "min-h-[112.5vh]" : "min-h-[150vh]"}`}
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
           {/* Rei - Center Bottom Layer */}
           <div 
             className="absolute left-1/2 -translate-x-1/2 h-[102vh] w-auto z-[1] pointer-events-auto"
             style={{ bottom: isMobile ? "-34vh" : "-25vh" }}
             onMouseEnter={() => setHoverRei(true)}
             onMouseLeave={() => setHoverRei(false)}
           >
             <Image
               src="/rei.webp" 
               alt="Rei" 
               width={1536}
               height={2736}
               unoptimized
               loading="eager"
               decoding="auto"
               className="h-full w-auto object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.2)] cursor-help"
             />
             <AnimatePresence>
                {hoverRei && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className={`absolute bottom-[68%] left-[70%] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max flex flex-col items-start ${isMobile ? "p-3 rounded-[1rem]" : "p-5 rounded-[2rem]"}`}
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {/* Photo Box */}
                    <div className={`overflow-hidden border border-white/10 bg-black/20 ${isMobile ? "w-[80px] h-[80px] rounded-[0.5rem] mb-2" : "w-[136px] h-[136px] rounded-[1rem] mb-4"}`}>
                      <Image src="/reifo.webp" alt="Rei Photo" width={481} height={572} unoptimized loading="eager" decoding="auto" className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                    <p className={`text-white font-normal leading-relaxed relative z-10 ${isMobile ? "text-xs" : "text-sm md:text-base"}`}>
                      <span className="underline font-bold">Our beloved friend,</span><br />
                      Reinathan Ezkhiel K.
                    </p>
                  </motion.div>
                )}
             </AnimatePresence>
           </div>

           {/* Josh - Left Upper Layer */}
           <div 
             className={`absolute -translate-x-1/2 z-[2] pointer-events-auto ${isMobile ? "left-[25%] w-[34vw] h-auto bottom-0" : "left-[30%] h-[63vh] w-auto bottom-0"}`}
             onMouseEnter={() => setHoverJosh(true)}
             onMouseLeave={() => setHoverJosh(false)}
           >
             <Image
               src="/josh.webp" 
               alt="Josh" 
               width={2016}
               height={2130}
               unoptimized
               loading="eager"
               decoding="auto"
               className={`object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-help ${isMobile ? "w-full h-auto" : "h-full w-auto"}`}
             />
             <AnimatePresence>
                {hoverJosh && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                    className={`absolute bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max flex flex-col items-start ${isMobile ? "top-[30%] right-[80%] p-3 rounded-[1rem]" : "top-[40%] right-[85%] p-5 rounded-[2rem]"}`}
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {/* Photo Box */}
                    <div className={`overflow-hidden border border-white/10 bg-black/20 ${isMobile ? "w-[80px] h-[80px] rounded-[0.5rem] mb-2" : "w-[136px] h-[136px] rounded-[1rem] mb-4"}`}>
                      <Image src="/jofo.webp" alt="Josh Photo" width={433} height={416} unoptimized loading="eager" decoding="auto" className="w-full h-full object-cover" />
                    </div>

                    <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                    <p className={`text-white font-normal leading-relaxed relative z-10 ${isMobile ? "text-xs" : "text-sm md:text-base"}`}>
                      <span className="underline font-bold">Our beloved friend,</span><br />
                      Joshua Ricardo R.
                    </p>
                  </motion.div>
                )}
             </AnimatePresence>
           </div>

           {/* Otniel - Right Upper Layer */}
           <div 
             className={`absolute -translate-x-1/2 z-[2] pointer-events-auto ${isMobile ? "left-[75%] w-[28vw] h-auto" : "left-[75%] h-[63vh] w-auto"}`}
             style={{ bottom: isMobile ? "0vh" : "-18vh" }}
             onMouseEnter={() => setHoverOtniel(true)}
             onMouseLeave={() => setHoverOtniel(false)}
           >
             <Image
               src="/otniel.webp" 
               alt="Otniel" 
               width={1888}
               height={2234}
               unoptimized
               loading="eager"
               decoding="auto"
               className={`object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-help ${isMobile ? "w-full h-auto" : "h-full w-auto md:scale-[1.3] md:origin-bottom"}`}
             />
             <AnimatePresence>
                {hoverOtniel && (
                  <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.9 }}
                    className={`absolute top-[25%] left-[95%] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max flex flex-col items-start ${isMobile ? "p-3 rounded-[1rem]" : "p-5 rounded-[2rem]"}`}
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {/* Photo Box */}
                    <div className={`overflow-hidden border border-white/10 bg-black/20 ${isMobile ? "w-[80px] h-[80px] rounded-[0.5rem] mb-2" : "w-[136px] h-[136px] rounded-[1rem] mb-4"}`}>
                      <Image src="/ofo.webp" alt="Otniel Photo" width={664} height={622} unoptimized loading="eager" decoding="auto" className="w-full h-full object-cover" />
                    </div>

                    <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                    <p className={`text-white font-normal leading-relaxed relative z-10 ${isMobile ? "text-xs" : "text-sm md:text-base"}`}>
                      <span className="underline font-bold">Our beloved friend,</span><br />
                      Otniel Kristian S.
                    </p>
                  </motion.div>
                )}
             </AnimatePresence>
           </div>
        </div>

        {/* Plateau Centerpiece - Adjusted Height */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto h-auto z-[10] pointer-events-none transform translate-y-[40%]">
          <Image
            src="/plateau.webp" 
            alt="Plateau" 
            width={1050}
            height={700}
            unoptimized
            loading="eager"
            decoding="auto"
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
            className={`absolute top-0 left-1/2 -translate-x-1/2 z-[20] w-[232px] md:w-[323px] h-auto drop-shadow-[0_0_50px_rgba(255,215,0,0.6)] ${isMobile ? "translate-y-[112%]" : "translate-y-[143%]"}`}
            style={{ 
              rotate: "0deg",
              willChange: "transform" // Performance optimization
            }}
          >
            <Image
              src="/logolden.webp" 
              alt="Golden Logo" 
              width={2400}
              height={715}
              unoptimized
              loading="eager"
              decoding="auto"
              className="w-full h-auto object-contain brightness-110 contrast-125" 
            />
          </motion.div>
        </div>

        {/* Golden Ambient Sparks (Free Floating) */}
        <GoldenAmbientSparks />

        {/* Section Title at the top */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 text-center w-full px-8 flex flex-col items-center">
           <motion.h2 
             initial={{ opacity: 0, y: -30 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 1, ease: "easeOut" }}
             className="text-5xl md:text-7xl font-normal tracking-tighter text-white leading-none"
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

        {/* Static Paragraph on the left */}
        <p 
          className={`absolute top-[12.5rem] max-w-[220px] md:max-w-[280px] text-slate-300 text-base md:text-lg font-normal leading-relaxed pointer-events-none z-20 text-justify ${isMobile ? "left-[14%]" : "left-[29%] md:left-[32%]"}`}
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Kalceria used to be a Final Project, now it is becoming a legacy of digital craftsmanship and automotive passion. It stands as a testament to the boundary-pushing creativity of our development team.
        </p>
        
        {/* dy_3 image at the right half of under the Webdev Team title */}
        <div 
          className={`absolute left-[50.4%] z-20 ${isMobile ? "top-[8.38rem]" : "top-[5.88rem]"}`}
          onMouseEnter={() => setHoverMentor(true)}
          onMouseLeave={() => setHoverMentor(false)}
        >
          <Image
            src="/dy_3.webp" 
            alt="DY 3"
            width={1536}
            height={2729}
            unoptimized
            loading="eager"
            decoding="auto"
            className="object-contain pointer-events-auto opacity-80 cursor-help w-[220px] h-[220px] md:w-[23.25rem] md:h-[23.25rem]"
            style={{ rotate: "-10.5deg" }}
          />
          
          <AnimatePresence>
            {hoverMentor && (
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                className={`absolute top-[20%] left-[95%] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max rounded-[1.5rem] ${isMobile ? "px-4 py-2.5" : "px-6 py-4"}`}
                style={{ 
                  fontFamily: "'Times New Roman', Times, serif"
                }}
              >
                {/* Black Blob effect inside */}
                <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                
                <p className={`text-white font-normal leading-tight relative z-10 ${isMobile ? "text-xs" : "text-lg md:text-xl"}`}>
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
      <section className="relative w-full py-40 flex flex-col items-center overflow-hidden z-30 bg-[#050a14]">
        
        {/* Floating Bohemian Quotes Background */}
        <FloatingQuotesLayer />

        {/* Ambient Blobs: Golden & Magenta */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[10%] left-[30%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FF00FF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[10%] right-[30%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FFD700]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="relative z-10 w-[90%] max-w-4xl flex flex-col"
        >
          {/* 1. GLASS BACKGROUND LAYER (Blurs the quotes behind it) */}
          <div 
            className="absolute inset-0 border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_80px_rgba(0,0,0,0.8)] z-0 pointer-events-none" 
            style={{ clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)" }} 
          />

          {/* 2. LEFT REII IMAGE (Shrunken by 25%, Gold-Cyan Glow) */}
          <div className={`absolute -bottom-40 mr-0 md:mr-6 pointer-events-none flex items-end justify-center z-10 ${isMobile ? "right-[82%]" : "right-[95%] md:right-full"}`}>
            {/* Dynamic Gold-Cyan Glow */}
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute w-[200px] h-[200px] md:w-[300px] md:h-[300px] bg-gradient-to-tr from-[#FFD700]/40 to-cyan-500/40 blur-[70px] rounded-full z-[-1]" 
            />
            {/* Reii Image */}
            <Image
              src={imgToggle ? "/reii2.webp" : "/reii.webp"} 
              alt="Reii Left" 
              width={imgToggle ? 768 : 1792}
              height={imgToggle ? 905 : 2160}
              unoptimized
              loading="eager"
              decoding="auto"
              className={`max-w-none relative z-10 opacity-90 ${isMobile ? "w-[9.6rem]" : "w-[12rem] md:w-[17.25rem]"}`} 
            />

            {/* Dangling ? Symbols beside Left Reii (on its right side) */}
            <DanglingSymbols 
              char="?" 
              color="#FFD700" 
              side="left" 
              isMobile={isMobile}
              configs={[
                { delay: 0, rotate: -15, top: isMobile ? "5%" : "-15%", offset: 145 }, // Upper: another 10% lefter
                { delay: 0.8, rotate: 10, top: isMobile ? "55%" : "35%", offset: 200 }  // Lower: another 5% righter
              ]} 
            />
          </div>

          {/* 3. RIGHT REII IMAGE (Shrunken by 25%, Magenta-Cyan Glow) */}
          <div className={`absolute -bottom-40 ml-0 md:ml-6 pointer-events-none flex items-end justify-center z-10 ${isMobile ? "left-[82%]" : "left-[95%] md:left-full"}`}>
            {/* Dynamic Magenta-Cyan Glow */}
            <motion.div 
              animate={{ 
                scale: [1.3, 1, 1.3],
                opacity: [0.6, 0.3, 0.6]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2 // Offset delay
              }}
              className="absolute w-[200px] h-[200px] md:w-[300px] md:h-[300px] bg-gradient-to-tl from-[#FF00FF]/40 to-cyan-500/40 blur-[70px] rounded-full z-[-1]" 
            />
            {/* Reii 2 Image */}
            <Image
              src={imgToggle ? "/reii3.webp" : "/reii2.webp"} 
              alt="Reii Right" 
              width={imgToggle ? 1792 : 768}
              height={imgToggle ? 2119 : 905}
              unoptimized
              loading="eager"
              decoding="auto"
              className={`max-w-none relative z-10 opacity-90 ${isMobile ? "w-[9.6rem]" : "w-[12rem] md:w-[17.25rem]"}`} 
            />

            {/* Dangling ! Symbols beside Right Reii2 (on its left side) */}
            <DanglingSymbols 
              char="!" 
              color="#00FFFF" 
              side="right" 
              isMobile={isMobile}
              configs={[
                { delay: 0, rotate: -15, top: "-15%", offset: 145 }, // Upper: another 10% righter
                { delay: 0.8, rotate: 10, top: "30%", offset: 200 }, // Lower 1: another 5% lefter
                { delay: 1.5, rotate: -5, top: "65%", offset: 250 }  // Lower 2: another 5% lefter
              ]} 
            />
          </div>

          {/* 3. CONTENT LAYER (Text and buttons) */}
          <div className="relative z-20 flex flex-col w-full h-full transition-all duration-300">
            <button 
              onClick={() => setMasterFaqOpen(!masterFaqOpen)}
              className={`w-full text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none ${isMobile ? "px-5 py-6" : "px-8 py-10"}`}
            >
              <span className={`font-mono font-black uppercase tracking-tighter text-white transition-colors drop-shadow-2xl ${isMobile ? "text-xl" : "text-3xl md:text-5xl"}`}>
                FREQUENTLY ASKED QUESTIONS
              </span>
              <span className={`font-mono text-white transition-transform duration-300 ${isMobile ? "text-2xl" : "text-4xl"}`} style={{ transform: masterFaqOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
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
                  <div className={`flex flex-col ${isMobile ? "p-3 gap-3" : "p-4 md:p-8 gap-4"}`}>
                    
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
                          className={`w-full text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none ${isMobile ? "px-4 py-4" : "px-6 py-6"}`}
                        >
                          <span className={`font-mono font-black uppercase tracking-tighter text-slate-300 group-hover:text-white transition-colors pr-8 ${isMobile ? "text-sm" : "text-base md:text-xl"}`}>
                            {faq.q}
                          </span>
                          <span className={`font-mono text-white transition-colors flex-shrink-0 ${isMobile ? "text-lg" : "text-2xl"}`}>
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
                              <div className={`font-sans text-slate-400 leading-relaxed bg-[#060c18] ${isMobile ? "px-4 py-4 text-xs" : "px-6 py-6 text-sm md:text-base"}`}>
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
