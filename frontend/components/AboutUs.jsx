"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Simple Static Typewriter for long text ───
function StaticTypewriter({ text, speed = 20, delay = 0 }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let t;
    if (started) {
      let i = 0;
      t = setInterval(() => {
        setDisplayed(text.substring(0, i));
        i++;
        if (i > text.length) clearInterval(t);
      }, speed);
    }
    return () => clearInterval(t);
  }, [text, speed, started]);

  return (
    <motion.span
      initial={{ opacity: 1 }}
      whileInView={{ opacity: 1 }}
      onViewportEnter={() => {
        setTimeout(() => setStarted(true), delay);
      }}
      viewport={{ once: true }}
    >
      {displayed}
    </motion.span>
  );
}

// ─── Photo Collage Background (Section 2) ───
function PhotoCollage() {
  const photos = Array.from({ length: 20 }, (_, i) => `/foto_abt${i + 1}.jpeg`);
  // Double the photos for seamless rolling
  const rollingPhotos = [...photos, ...photos];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]">
      {/* Background Glows */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-[#FFD700]/15 via-[#00FFFF]/10 to-[#FFD700]/15" />
      </div>

      <motion.div 
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full h-full"
      >
        <div 
          className="flex h-full animate-[roll_80s_linear_infinite]"
          style={{ width: "200%" }}
        >
          {/* Each "half" is a 5x4 grid */}
          {[0, 1].map((setIndex) => (
            <div key={setIndex} className="grid grid-cols-5 w-1/2 h-full gap-1">
              {photos.map((src, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden bg-slate-900 border border-white/5">
                  <img 
                    src={src} 
                    alt="Background" 
                    className="w-full h-full object-cover filter grayscale contrast-125 brightness-75 opacity-80" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-transparent to-[#050a14]" />
      
      <style jsx>{`
        @keyframes roll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Individual Video Cell ───
function VideoCell({ initialSrc, allVids, index }) {
  const [src, setSrc] = useState(initialSrc);
  const [glowColor, setGlowColor] = useState("#fbbf24");
  const videoRef = useRef(null);

  useEffect(() => {
    const colors = ["#ef4444", "#fbbf24", "#22c55e"]; // Red, Yellow, Green
    setGlowColor(colors[Math.floor(Math.random() * colors.length)]);
  }, [src]);

  const handleEnded = () => {
    const others = allVids.filter(v => v !== src);
    const next = others[Math.floor(Math.random() * others.length)];
    setSrc(next);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 border border-white/10">
      {/* Randomized Traffic Light Glow (Fills empty transition slots) */}
      <motion.div 
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 z-0 blur-[30px]"
        style={{ backgroundColor: glowColor }}
      />

      <video 
        ref={videoRef}
        src={src} 
        autoPlay 
        muted 
        playsInline 
        onEnded={handleEnded}
        className="relative z-10 w-full h-full object-cover opacity-90"
      />
    </div>
  );
}

// ─── Video Collage Background (Section 1) ───
function VideoCollage() {
  const [initialGrid, setInitialGrid] = useState([]);
  const vids = useRef(Array.from({ length: 8 }, (_, i) => `/vid_abt${i + 1}.mp4`));
  
  useEffect(() => {
    // Reduced grid size from 20 to 12 for performance optimization
    const base = Array.from({ length: 12 }, (_, i) => vids.current[i % vids.current.length]);
    setInitialGrid(base.sort(() => Math.random() - 0.5));
  }, []);

  if (initialGrid.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, ease: "easeOut" }}
      className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]"
    >
      {/* Background Glow to fill gaps */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FF00FF]/20 via-[#00FFFF]/10 to-[#FF00FF]/20" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 w-full h-full gap-1 opacity-60">
        {initialGrid.map((src, i) => (
          <VideoCell 
            key={i} 
            index={i} 
            initialSrc={src} 
            allVids={vids.current} 
          />
        ))}
      </div>
      
      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-transparent to-[#050a14] opacity-80" />
    </motion.div>
  );
}

// ─── Floating Bohemian Quotes Background (Section 3) ───
const COMMUNITY_QUOTES = [
  "Bro, Kalceria keren ga si?", "Bro, Wahib Embut gimana?", "Kalceria, kece tuhh.",
  "CokiGakDisini sedang disini.", "Woy, Adnannn!!!!", "Halo, ada yang bisa saya bantu?",
  "Pilih Tekkom atau Fisip?", "Mending Brio atau Harrier?", "Kapan terakhir lu ******?",
  "Apaansi, Cok, Apaansi, Cok?", "Hi, aku Joshua, kamu siapa?", "Gw Otniel. Pendekar Volley.",
  "Iya Nil, Gw tau Nielll!", "Hayoooo, Besok Kelas ga ya??", "Hah, makan di F I A ga sieh?"
];

function FloatingQuote({ quote, onComplete }) {
  // quote contains: { id, text, style, pos }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, x: 0, y: 0 }}
      animate={{ 
        opacity: 0.7, 
        scale: 1, 
        x: quote.pos.dx, 
        y: quote.pos.dy 
      }}
      exit={{ opacity: 0, scale: 1.1, y: -20 }}
      transition={{ 
        duration: 8, 
        ease: "linear",
        opacity: { duration: 1.5 }, // Smooth fade in/out
      }}
      onAnimationComplete={(definition) => {
        // If we wanted to trigger on end of 'animate', but we use a timer in Layer for lifespan
      }}
      className={`absolute z-[60] pointer-events-none text-white/70 whitespace-nowrap text-xl md:text-3xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${quote.style}`}
      style={{ left: `${quote.pos.x}%`, top: `${quote.pos.y}%` }}
    >
      "{quote.text}"
    </motion.div>
  );
}

function FloatingQuotesLayer() {
  const [activeQuotes, setActiveQuotes] = useState([]);
  const availableIndicesRef = useRef(Array.from({ length: COMMUNITY_QUOTES.length }, (_, i) => i));
  const idCounter = useRef(0);

  useEffect(() => {
    let spawnTimer;
    
    const spawnNext = () => {
      if (availableIndicesRef.current.length > 0) {
        const rndIdxIdx = Math.floor(Math.random() * availableIndicesRef.current.length);
        const quoteIdx = availableIndicesRef.current[rndIdxIdx];
        
        // Lock this quote: remove from available
        availableIndicesRef.current.splice(rndIdxIdx, 1);

        const text = COMMUNITY_QUOTES[quoteIdx];
        const fontStyles = ["font-serif italic", "font-sans font-black uppercase tracking-tighter", "font-mono font-bold tracking-widest", "font-serif underline font-medium"];
        const style = fontStyles[Math.floor(Math.random() * fontStyles.length)];
        
        const quoteId = idCounter.current++;
        const newQuote = {
          id: quoteId,
          quoteIdx,
          text,
          style,
          pos: {
            x: Math.random() * 70 + 15,
            y: Math.random() * 70 + 15,
            dx: (Math.random() - 0.5) * 150,
            dy: (Math.random() - 0.5) * 150
          }
        };

        setActiveQuotes(prev => [...prev, newQuote]);

        // Lifespan of 8 seconds before removing
        setTimeout(() => {
          setActiveQuotes(prev => prev.filter(q => q.id !== quoteId));
          // Unlock quote: return index to available pool
          availableIndicesRef.current.push(quoteIdx);
        }, 8000);
      }

      // Rhythmic majestic spawning
      spawnTimer = setTimeout(spawnNext, 1500 + Math.random() * 1000);
    };

    spawnNext();
    return () => clearTimeout(spawnTimer);
  }, []);

  return (
    <div className="absolute inset-0 z-[60] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {activeQuotes.map(q => (
          <FloatingQuote key={q.id} quote={q} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function AboutUs() {
  const [mounted, setMounted] = useState(false);
  
  // ─── Mouse Tracking for Masking ───
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <VideoCollage />

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
        <PhotoCollage />

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
            <StaticTypewriter text="LOREM IPSUM DOLOR SIT AMET, CONSECTETUR ADIPISCING ELIT. THE ARCHITECTS OF MOTION AND LUXURY. WE DO NOT JUST DRIVE, WE ENGINEER THE EXPERIENCE." speed={20} delay={1000} />
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
          <img 
            src="/man.png" 
            alt="The Team" 
            className="absolute inset-0 w-full h-full object-cover filter grayscale opacity-40 transition-all duration-500" 
            draggable={false}
          />
          
          {/* Reveal Layer: Full Color with Dynamic Mask via Mouse */}
          <motion.div 
            className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
            animate={{ opacity: mousePos.x === -1000 ? 0 : 1 }}
            style={{
              WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`,
              maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`
            }}
          >
            <img 
              src="/man.png" 
              alt="The Team Color" 
              className="w-full h-full object-cover contrast-110 saturate-110" 
              draggable={false}
            />
          </motion.div>
        </motion.div>
      </section>

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
          <div className="absolute -bottom-40 right-[95%] md:right-full mr-0 md:mr-6 pointer-events-none flex items-end justify-center z-10">
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
            <img 
              src={imgToggle ? "/reii2.png" : "/reii.png"} 
              alt="Reii Left" 
              className="w-[12rem] md:w-[17.25rem] max-w-none relative z-10 opacity-90" 
            />
          </div>

          {/* 3. RIGHT REII IMAGE (Shrunken by 25%, Magenta-Cyan Glow) */}
          <div className="absolute -bottom-40 left-[95%] md:left-full ml-0 md:ml-6 pointer-events-none flex items-end justify-center z-10">
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
            <img 
              src={imgToggle ? "/reii3.png" : "/reii2.png"} 
              alt="Reii Right" 
              className="w-[12rem] md:w-[17.25rem] max-w-none relative z-10 opacity-90" 
            />
          </div>

          {/* 3. CONTENT LAYER (Text and buttons) */}
          <div className="relative z-20 flex flex-col w-full h-full transition-all duration-300">
            <button 
              onClick={() => setMasterFaqOpen(!masterFaqOpen)}
              className="w-full px-8 py-10 text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none"
            >
              <span className="font-mono font-black uppercase tracking-tighter text-3xl md:text-5xl text-white transition-colors drop-shadow-2xl">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <span className="font-mono text-4xl text-white transition-transform duration-300" style={{ transform: masterFaqOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
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
                  <div className="p-4 md:p-8 flex flex-col gap-4">
                    
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
                          className="w-full px-6 py-6 text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none"
                        >
                          <span className="font-mono font-black uppercase tracking-tighter text-base md:text-xl text-slate-300 group-hover:text-white transition-colors pr-8">
                            {faq.q}
                          </span>
                          <span className="font-mono text-2xl text-white transition-colors flex-shrink-0">
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
                              <div className="px-6 py-6 font-sans text-slate-400 text-sm md:text-base leading-relaxed bg-[#060c18]">
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
