"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Simple Static Typewriter for long text ───
function StaticTypewriter({ text, speed = 20, delay = 0, highlights = [] }) {
  const [started, setStarted] = useState(false);

  const getStyle = (i) => {
    for (const h of highlights) {
      if (i >= h.start && i <= h.end) return "font-bold underline text-slate-100";
    }
    return "";
  };

  return (
    <motion.span
      initial={{ opacity: 1 }}
      whileInView={{ opacity: 1 }}
      onViewportEnter={() => {
        setTimeout(() => setStarted(true), delay);
      }}
      viewport={{ once: true }}
      className="inline-block"
    >
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={started ? { opacity: 1 } : { opacity: 0 }}
          transition={{ 
            duration: 0.1, 
            delay: i * (speed / 1000),
            ease: "easeOut"
          }}
          className={getStyle(i)}
        >
          {char}
        </motion.span>
      ))}
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

// ─── Golden Ambient Sparks (Free Floating) ────
function GoldenAmbientSparks() {
  const [sparks, setSparks] = useState([]);
  
  useEffect(() => {
    const generated = [];
    for (let i = 0; i < 18; i++) {
      const size = Math.random() * 4 + 2; 
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const duration = Math.random() * 6 + 10; // Even slower
      const delay = Math.random() * 12;
      const driftX = (Math.random() - 0.5) * 150;
      const driftY = (Math.random() - 0.5) * 150;
      generated.push({ id: i, size, top, left, duration, delay, driftX, driftY });
    }
    setSparks(generated);
  }, []);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {sparks.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 0.7, 0.7, 0],
            scale: [0.3, 1, 1, 0.3],
            x: [0, s.driftX * 0.5, s.driftX, s.driftX * 0.5, 0],
            y: [0, s.driftY * 0.5, s.driftY, s.driftY * 0.5, 0],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: -s.delay,
            times: [0, 0.2, 0.8, 1] // Spends 60% of time fully visible
          }}
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            top: `${s.top}%`,
            left: `${s.left}%`,
            backgroundColor: '#FFD700',
            willChange: "transform, opacity",
            boxShadow: `0 0 ${s.size * 3}px #FFD700, 0 0 ${s.size * 6}px rgba(255, 215, 0, 0.4)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Dangling Symbols Component ───
function DanglingSymbols({ char, color, side = "left", configs = [] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {configs.map((s, i) => (
        <motion.div
          key={i}
          animate={{ 
            y: [0, -20, 0],
            rotate: [s.rotate || 0, (s.rotate || 0) + 12, (s.rotate || 0) - 6, s.rotate || 0]
          }}
          transition={{ 
            duration: 3.5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: s.delay || 0
          }}
          className="absolute text-5xl md:text-7xl font-mono font-black uppercase tracking-tighter select-none z-[60]"
          style={{ 
            color: color, 
            top: s.top,
            [side === "left" ? "left" : "right"]: `${s.offset}px`,
            textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
            filter: `drop-shadow(0 0 25px ${color}aa)`,
            opacity: 0.95
          }}
        >
          {char}
        </motion.div>
      ))}
    </div>
  );
}

// ─── WebDev Section Entry Sequence ────
const FULL_TEXT1 = `"Kalian Kelompok 5 SBD kan, sama Gw kan ya?"`;
const FULL_TEXT2 = `"Kerjain Web-nya Woi!"`;

function WebDevEntrySequence({ onComplete }) {
  const [phase, setPhase] = useState('typing1'); 
  const [text, setText] = useState('');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let i = 0;
    let interval;
    const targetText = phase === 'typing1' ? FULL_TEXT1 : FULL_TEXT2;

    interval = setInterval(() => {
      setText(targetText.slice(0, i + 1));
      i++;
      if (i >= targetText.length) {
        clearInterval(interval);
        if (phase === 'typing1') {
          setTimeout(() => {
            setPhase('angry');
            setText('');
          }, 1000);
        } else {
          setTimeout(() => onCompleteRef.current(), 2000);
        }
      }
    }, 70); 
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Character */}
        <motion.img 
          src={phase === 'angry' ? "/dy_02.png" : "/dy_01.png"}
          alt="DY"
          animate={{ rotate: [0, 15, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        />

        {/* Typing/Angry Text */}
        <div className="h-20 mt-6 text-center px-6">
          <motion.h3 
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xl md:text-3xl font-normal tracking-tight ${phase === 'angry' ? 'text-red-500 scale-110 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-white'}`}
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {text}
          </motion.h3>
        </div>
      </div>
    </motion.div>
  );
}

// ─── THE CORE SECTION COMPONENT ────
export default function AboutUs() {
  const [showEntry, setShowEntry] = useState(false);
  const [entryDone, setEntryDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  
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
          <img 
            src="/man.png" 
            alt="The Team" 
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
            <img 
              src="/man.png" 
              className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 brightness-110" 
              draggable={false}
            />

            {/* Magenta Shifted Layer (Reduced offset) */}
            <motion.img 
              src="/man.png" 
              animate={{ x: [-1, -2, -1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" 
              style={{ filter: "sepia(1) saturate(10) hue-rotate(280deg) brightness(1.1)" }} 
              draggable={false}
            />
            {/* Golden Shifted Layer (Reduced offset) */}
            <motion.img 
              src="/man.png" 
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

      {/* ── SECTION: THE GOLDEN CORE ── */}
      <motion.section 
        onViewportEnter={() => {
          if (!entryDone && !showEntry) {
            setShowEntry(true);
          }
        }}
        className="relative w-full min-h-[150vh] flex flex-col items-center justify-center overflow-hidden z-25 border-t border-slate-900"
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
             style={{ bottom: "-25vh" }}
             onMouseEnter={() => setHoverRei(true)}
             onMouseLeave={() => setHoverRei(false)}
           >
             <img 
               src="/rei.png" 
               alt="Rei" 
               className="h-full w-auto object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.2)] cursor-help"
             />
             <AnimatePresence>
                {hoverRei && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="absolute bottom-[68%] left-[70%] p-5 bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max rounded-[2rem] flex flex-col items-start"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {/* Photo Box */}
                    <div className="w-[136px] h-[136px] rounded-[1rem] overflow-hidden mb-4 border border-white/10 bg-black/20">
                      <img src="/reifo.jpeg" alt="Rei Photo" className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                    <p className="text-white text-sm md:text-base font-normal leading-relaxed relative z-10">
                      <span className="underline font-bold">Our beloved friend,</span><br />
                      Reinathan Ezkhiel K.
                    </p>
                  </motion.div>
                )}
             </AnimatePresence>
           </div>

           {/* Josh - Left Upper Layer */}
           <div 
             className="absolute bottom-0 left-[25%] -translate-x-1/2 h-[63vh] w-auto z-[2] pointer-events-auto"
             onMouseEnter={() => setHoverJosh(true)}
             onMouseLeave={() => setHoverJosh(false)}
           >
             <img 
               src="/josh.png" 
               alt="Josh" 
               className="h-full w-auto object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-help"
             />
             <AnimatePresence>
                {hoverJosh && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                    className="absolute top-[40%] right-[85%] p-5 bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max rounded-[2rem] flex flex-col items-start"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {/* Photo Box */}
                    <div className="w-[136px] h-[136px] rounded-[1rem] overflow-hidden mb-4 border border-white/10 bg-black/20">
                      <img src="/jofo.jpeg" alt="Josh Photo" className="w-full h-full object-cover" />
                    </div>

                    <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                    <p className="text-white text-sm md:text-base font-normal leading-relaxed relative z-10">
                      <span className="underline font-bold">Our beloved friend,</span><br />
                      Joshua Ricardo R.
                    </p>
                  </motion.div>
                )}
             </AnimatePresence>
           </div>

           {/* Otniel - Right Upper Layer */}
           <div 
             className="absolute left-[75%] -translate-x-1/2 h-[63vh] w-auto z-[2] pointer-events-auto"
             style={{ bottom: "-8vh" }}
             onMouseEnter={() => setHoverOtniel(true)}
             onMouseLeave={() => setHoverOtniel(false)}
           >
             <img 
               src="/otniel.png" 
               alt="Otniel" 
               className="h-full w-auto object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-help"
             />
             <AnimatePresence>
                {hoverOtniel && (
                  <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.9 }}
                    className="absolute top-[25%] left-[95%] p-5 bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] w-max rounded-[2rem] flex flex-col items-start"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {/* Photo Box */}
                    <div className="w-[136px] h-[136px] rounded-[1rem] overflow-hidden mb-4 border border-white/10 bg-black/20">
                      <img src="/ofo.jpeg" alt="Otniel Photo" className="w-full h-full object-cover" />
                    </div>

                    <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                    <p className="text-white text-sm md:text-base font-normal leading-relaxed relative z-10">
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
          <img 
            src="/plateau.webp" 
            alt="Plateau" 
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
            className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-[179%] z-[20] w-[232px] md:w-[323px] h-auto drop-shadow-[0_0_50px_rgba(255,215,0,0.6)]"
            style={{ 
              rotate: "0deg",
              willChange: "transform" // Performance optimization
            }}
          >
            <img 
              src="/logolden.png" 
              alt="Golden Logo" 
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
          className="absolute top-[12.5rem] left-[29%] md:left-[32%] max-w-[220px] md:max-w-[280px] text-slate-300 text-base md:text-lg font-normal leading-relaxed pointer-events-none z-20 text-justify"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Kalceria used to be a Final Project, now it is becoming a legacy of digital craftsmanship and automotive passion. It stands as a testament to the boundary-pushing creativity of our development team.
        </p>
        
        {/* dy_3 image at the right half of under the Webdev Team title */}
        <div 
          className="absolute top-[5.88rem] left-[50.4%] z-20"
          onMouseEnter={() => setHoverMentor(true)}
          onMouseLeave={() => setHoverMentor(false)}
        >
          <img 
            src="/dy_3.png" 
            alt="DY 3"
            className="w-44 h-44 md:w-[18.6rem] md:h-[18.6rem] object-contain pointer-events-auto opacity-80 cursor-help"
            style={{ rotate: "-10.5deg" }}
          />
          
          <AnimatePresence>
            {hoverMentor && (
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                className="absolute top-[20%] left-[95%] p-6 bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[30] min-w-[200px] rounded-[2rem]"
                style={{ 
                  fontFamily: "'Times New Roman', Times, serif"
                }}
              >
                {/* Black Blob effect inside */}
                <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                
                <p className="text-white text-lg md:text-xl font-normal leading-tight relative z-10">
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

            {/* Dangling ? Symbols beside Left Reii (on its right side) */}
            <DanglingSymbols 
              char="?" 
              color="#FFD700" 
              side="left" 
              configs={[
                { delay: 0, rotate: -15, top: "-15%", offset: 145 }, // Upper: another 10% lefter
                { delay: 0.8, rotate: 10, top: "35%", offset: 200 }  // Lower: another 5% righter
              ]} 
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

            {/* Dangling ! Symbols beside Right Reii2 (on its left side) */}
            <DanglingSymbols 
              char="!" 
              color="#00FFFF" 
              side="right" 
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
