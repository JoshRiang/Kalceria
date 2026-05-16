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
  const rollingPhotos = [...photos, ...photos];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#050a14]">
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
    const colors = ["#ef4444", "#fbbf24", "#22c55e"];
    setGlowColor(colors[Math.floor(Math.random() * colors.length)]);
  }, [src]);

  const handleEnded = () => {
    const others = allVids.filter(v => v !== src);
    const next = others[Math.floor(Math.random() * others.length)];
    setSrc(next);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 border border-white/10">
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
      <div className="absolute inset-0 opacity-40 mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#FF00FF]/20 via-[#00FFFF]/10 to-[#FF00FF]/20" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 w-full h-full gap-1 opacity-60">
        {initialGrid.map((src, i) => (
          <VideoCell key={i} index={i} initialSrc={src} allVids={vids.current} />
        ))}
      </div>
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

function FloatingQuote({ quote }) {
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
        opacity: { duration: 1.5 },
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
        setTimeout(() => {
          setActiveQuotes(prev => prev.filter(q => q.id !== quoteId));
          availableIndicesRef.current.push(quoteIdx);
        }, 8000);
      }
      spawnTimer = setTimeout(spawnNext, 1500 + Math.random() * 1000);
    };
    spawnNext();
    return () => clearTimeout(spawnTimer);
  }, []);

  return (
    <div className="absolute inset-0 z-[60] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {activeQuotes.map(q => <FloatingQuote key={q.id} quote={q} />)}
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
      const duration = Math.random() * 6 + 10;
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
            times: [0, 0.2, 0.8, 1]
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
        <motion.img 
          src={phase === 'angry' ? "/dy_02.png" : "/dy_01.png"}
          alt="DY"
          animate={{ rotate: [0, 15, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        />
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

export default function AboutUs() {
  const [showEntry, setShowEntry] = useState(false);
  const [entryDone, setEntryDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [hoverMentor, setHoverMentor] = useState(false);
  const [hoverRei, setHoverRei] = useState(false);
  const [hoverJosh, setHoverJosh] = useState(false);
  const [hoverOtniel, setHoverOtniel] = useState(false);
  
  const handleEntryComplete = useCallback(() => {
    setShowEntry(false);
    setEntryDone(true);
  }, []);
  
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMouseLeave = () => { setMousePos({ x: -1000, y: -1000 }); };

  const [masterFaqOpen, setMasterFaqOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [imgToggle, setImgToggle] = useState(false);
  useEffect(() => {
    const itv = setInterval(() => setImgToggle(prev => !prev), 1000);
    return () => clearInterval(itv);
  }, []);

  if (!mounted) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full min-h-screen bg-[#050a14] text-white overflow-x-hidden selection:bg-[#FFD700] selection:text-black"
    >
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-8 py-32 overflow-hidden z-10">
        <VideoCollage />
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#00FFFF]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[10%] right-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FF00FF]" />
        </div>
        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">
          <motion.h1 initial={{ y: -100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: "easeOut" }} className="text-6xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-2xl mb-6 font-mono">ABOUT US</motion.h1>
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }} viewport={{ once: true }} className="text-3xl md:text-5xl italic font-medium tracking-wide text-slate-300 font-serif mb-16">De bello <span className="block mt-2 text-slate-500 text-lg md:text-xl tracking-widest">(About)</span></motion.h2>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.8 }} className="text-left w-full max-w-2xl bg-black/40 p-10 shadow-2xl backdrop-blur-md relative border-l-4 border-slate-700 font-serif">
            <h2 className="text-4xl font-bold mb-2 tracking-tight text-slate-100">Kalceria</h2>
            <p className="text-[#FFD700] italic mb-6 font-medium text-lg tracking-wide">noun. /kal·ce·ri·a/</p>
            <ol className="list-decimal pl-6 space-y-5 text-slate-300 leading-relaxed text-lg">
              <li className="pl-3 min-h-[3em]"><StaticTypewriter text="A state of transcendent automotive euphoria; the intersection where mechanical precision meets high-fidelity aesthetic design." speed={15} delay={1200} /></li>
              <li className="pl-3 min-h-[3em]"><StaticTypewriter text="A clandestine movement of enthusiasts dedicated to preserving the visceral experience of the drive in a digital age." speed={15} delay={3000} /></li>
            </ol>
          </motion.div>
        </div>
      </section>

      <div className="w-full h-[1px] bg-cyan-500/50 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_#00FFFF] relative z-40" />

      <section className="relative w-full py-40 flex flex-col items-center overflow-hidden z-20 bg-[#050a14]">
        <PhotoCollage />
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FFD700]" />
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#00FFFF]" />
        </div>
        <div className="relative z-10 mb-20 text-center px-4 flex flex-col items-center pointer-events-none">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="text-4xl md:text-6xl lg:text-7xl font-mono font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-100 to-slate-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">MAN BEHIND THE SCENE</motion.h2>
          <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.4, ease: "circOut" }} className="h-[1px] w-full max-w-md bg-gradient-to-r from-transparent via-[#FFD700] to-transparent my-6 origin-center" />
          <div className="text-slate-400 font-mono text-xs md:text-sm tracking-widest max-w-2xl min-h-[2em]">
            <StaticTypewriter text="Reyhan Batara, also known as Coki, was a revolutionary car enthusiast. He spent his life blending mechanical engineering with digital innovation to create the most stunning automotive experiences. His vision remains the driving force behind every project we undertake." speed={20} delay={1000} highlights={[{ start: 0, end: 12 }, { start: 29, end: 32 }]} />
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, delay: 0.2 }} ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="relative z-10 w-[75%] max-w-4xl aspect-video md:aspect-[21/9] bg-[#0c1528] overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.6)] cursor-crosshair group" style={{ clipPath: "polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)" }}>
          <img src="/man.png" alt="The Team" className="absolute inset-0 w-full h-full object-cover filter grayscale opacity-40 transition-all duration-500" draggable={false} />
          <div className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ WebkitMaskImage: `radial-gradient(ellipse 20% 70% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)`, maskImage: `radial-gradient(ellipse 20% 70% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)` }}>
            <img src="/man.png" className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 brightness-110" draggable={false} />
            <motion.img src="/man.png" animate={{ x: [-1, -2, -1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" style={{ filter: "sepia(1) saturate(10) hue-rotate(280deg) brightness(1.1)" }} draggable={false} />
            <motion.img src="/man.png" animate={{ x: [1, 2, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50" style={{ filter: "sepia(1) saturate(10) hue-rotate(15deg) brightness(1.1)" }} draggable={false} />
          </div>
          <motion.div className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300" animate={{ opacity: mousePos.x === -1000 ? 0 : 1 }} style={{ WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`, maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)` }}>
            <img src="/man.png" alt="The Team Color" className="w-full h-full object-cover contrast-110 saturate-110" draggable={false} />
          </motion.div>
        </motion.div>
      </section>

      <div className="w-full h-[1px] bg-cyan-500/50 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_15px_#00FFFF] relative z-40" />

      <motion.section onViewportEnter={() => { if (!entryDone && !showEntry) setShowEntry(true); }} className="relative w-full min-h-[150vh] flex flex-col items-center justify-center overflow-hidden z-25 border-t border-slate-900">
        <AnimatePresence>{showEntry && <WebDevEntrySequence onComplete={handleEntryComplete} />}</AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-black to-[#050000]" />
        <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen">
          <motion.div animate={{ x: ["-10%", "30%", "10%", "-10%"], y: ["-20%", "20%", "40%", "-20%"], scale: [1, 1.4, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#f59e0b]/30" />
          <motion.div animate={{ x: ["40%", "-20%", "0%", "40%"], y: ["10%", "-10%", "-40%", "10%"], scale: [1.2, 1, 1.3, 1.2] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-1/4 right-1/4 w-[65vw] h-[65vw] rounded-full blur-[160px] bg-[#fbbf24]/30" />
          <motion.div animate={{ x: ["0%", "50%", "-30%", "0%"], y: ["50%", "0%", "50%", "50%"], scale: [0.8, 1.5, 1, 0.8] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] rounded-full blur-[180px] bg-[#ea580c]/25" />
        </div>
        <GoldenAmbientSparks />
        <div className="relative z-[10] w-full max-w-6xl mx-auto flex flex-col items-center text-center px-4">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] via-[#fbbf24] to-[#ea580c] mb-12 drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>THE GOLDEN CORE</motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full mt-20">
            {[
              { id: 'mentor', label: 'THE MENTOR', name: 'Wahib Embut', img: '/wahibfo.jpeg', hover: hoverMentor, setHover: setHoverMentor },
              { id: 'rei', label: 'THE VISIONARY', name: 'Reinathan Ezkhiel K.', img: '/reifo.jpeg', hover: hoverRei, setHover: setHoverRei },
              { id: 'josh', label: 'THE ARCHITECT', name: 'Joshua Riang', img: '/joshfo.jpeg', hover: hoverJosh, setHover: setHoverJosh },
              { id: 'otniel', label: 'THE GUARD', name: 'Otniel Putro', img: '/otnielfo.jpeg', hover: hoverOtniel, setHover: setHoverOtniel }
            ].map((char) => (
              <motion.div key={char.id} onMouseEnter={() => char.setHover(true)} onMouseLeave={() => char.setHover(false)} className="relative group">
                <div className="relative aspect-[3/4] bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden group-hover:border-[#FFD700]/30 transition-all duration-500 shadow-2xl">
                  <img src={char.img} alt={char.name} className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-6 left-6 text-left">
                    <p className="text-[10px] font-black tracking-widest text-[#FFD700] mb-1">{char.label}</p>
                    <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Times New Roman', Times, serif" }}>{char.name}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
