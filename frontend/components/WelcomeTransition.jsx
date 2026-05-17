"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Gear Components ─────────────────────────────────────────────────────────
function GearShape({ id, cx, cy, pitchR, toothH, teeth, angleOffset = 0, duration = 4, spinDir = 1 }) {
  const outerR = pitchR + toothH;
  const innerR = pitchR - toothH * 0.45;
  const hubR = pitchR * 0.30;
  const boreR = pitchR * 0.11;
  const toothArc = (2 * Math.PI) / teeth;
  const toothHalf = toothArc * 0.38;

  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const base = (i / teeth) * Math.PI * 2 + angleOffset;
    pts.push(
      `${cx + Math.cos(base - toothHalf * 1.5) * innerR},${cy + Math.sin(base - toothHalf * 1.5) * innerR}`,
      `${cx + Math.cos(base - toothHalf * 0.9) * pitchR},${cy + Math.sin(base - toothHalf * 0.9) * pitchR}`,
      `${cx + Math.cos(base - toothHalf * 0.52) * outerR},${cy + Math.sin(base - toothHalf * 0.52) * outerR}`,
      `${cx + Math.cos(base + toothHalf * 0.52) * outerR},${cy + Math.sin(base + toothHalf * 0.52) * outerR}`,
      `${cx + Math.cos(base + toothHalf * 0.9) * pitchR},${cy + Math.sin(base + toothHalf * 0.9) * pitchR}`,
      `${cx + Math.cos(base + toothHalf * 1.5) * innerR},${cy + Math.sin(base + toothHalf * 1.5) * innerR}`
    );
  }
  const ptStr = pts.join(" ");
  const bId = `gb${id}`, fId = `gf${id}`, sId = `gs${id}`;

  return (
    <g>
      <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${spinDir * 360} ${cx} ${cy}`} dur={`${duration}s`} repeatCount="indefinite" />
      <defs>
        <radialGradient id={bId} cx="32%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#d4af37" />
          <stop offset="40%"  stopColor="#8B6914" />
          <stop offset="100%" stopColor="#2a1f00" />
        </radialGradient>
        <radialGradient id={fId} cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor="#6b4f12" />
          <stop offset="100%" stopColor="#0d0900" />
        </radialGradient>
        <radialGradient id={sId} cx="28%" cy="22%" r="52%">
          <stop offset="0%"   stopColor="rgba(255,220,80,0.65)" />
          <stop offset="65%"  stopColor="rgba(255,180,0,0.06)" />
          <stop offset="100%" stopColor="rgba(255,180,0,0)" />
        </radialGradient>
      </defs>
      <polygon points={ptStr} fill="#000" opacity={0.45} transform="translate(2,3)" />
      <polygon points={ptStr} fill={`url(#${bId})`} />
      <circle  cx={cx} cy={cy} r={pitchR * 0.86} fill={`url(#${fId})`} />
      {[0,1,2,3].map(i => {
        const a = (i / 4) * Math.PI * 2 + angleOffset;
        return <line key={i} x1={cx + Math.cos(a) * boreR * 2.2} y1={cy + Math.sin(a) * boreR * 2.2} x2={cx + Math.cos(a) * hubR * 0.8} y2={cy + Math.sin(a) * hubR * 0.8} stroke="#6b4f12" strokeWidth="1.3" />;
      })}
      <circle cx={cx} cy={cy} r={hubR} fill="#1a1000" stroke="#c8a020" strokeWidth="1.1" />
      <circle cx={cx - hubR*0.22} cy={cy - hubR*0.22} r={hubR*0.48} fill="none" stroke="rgba(255,210,60,0.25)" strokeWidth="0.9" />
      <circle cx={cx} cy={cy} r={boreR} fill="#050300" />
      <polygon points={ptStr} fill={`url(#${sId})`} opacity={0.85} />
      <polygon points={ptStr} fill="none" stroke="rgba(255,200,50,0.22)" strokeWidth="0.8" />
    </g>
  );
}

function StaticGears({ visible }) {
  const p1 = 36, p2 = Math.round(36 * 0.618), p3 = Math.round(36 * 0.618 * 0.618);
  const h1 = 9, h2 = Math.round(9 * 0.618), h3 = Math.max(3, Math.round(h2 * 0.618));
  const cx1 = 50, cy1 = 50;
  const a12 = Math.PI * 0.15;
  const d12 = p1 + p2;
  const cx2 = cx1 + Math.cos(a12) * d12;
  const cy2 = cy1 + Math.sin(a12) * d12;
  const a23 = Math.PI * -0.25;
  const d23 = p2 + p3;
  const cx3 = cx2 + Math.cos(a23) * d23;
  const cy3 = cy2 + Math.sin(a23) * d23;
  const svgW = cx3 + p3 + h3 + 15;
  const svgH = Math.max(cy1 + p1 + h1, cy2 + p2 + h2, cy3 + p3 + h3) + 15;

  return (
    <div className="h-[120px] flex flex-col items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: visible ? 1 : 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ filter: "drop-shadow(0 4px 18px rgba(180,120,0,0.7))", transform: "scale(1.1)" }}>
          <GearShape id="WA" cx={cx1} cy={cy1} pitchR={p1} toothH={h1} teeth={18} duration={4} spinDir={1} />
          <GearShape id="WB" cx={cx2} cy={cy2} pitchR={p2} toothH={h2} teeth={Math.round(18*p2/p1)} duration={4*(p2/p1)} spinDir={-1} />
          <GearShape id="WC" cx={cx3} cy={cy3} pitchR={p3} toothH={h3} teeth={Math.round(18*p3/p1)} duration={4*(p3/p1)} spinDir={1} />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Typewriter Component (Slower & Smoother) ──────────────────────────────
function Typewriter({ text, speed = 120, delay = 0, dir = "ltr" }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) {
          if (dir === "ltr") {
            setDisplayed(text.slice(0, i));
          } else {
            setDisplayed(text.slice(text.length - i));
          }
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay, dir]);

  return <span>{displayed}</span>;
}

// ─── RedirectText Component ─────────────────────────────────────────────────
function RedirectText() {
  const [text, setText] = useState("");
  const fullText = "REDIRECTING";
  const [showDots, setShowDots] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setShowDots(true);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showDots) return;
    let count = 1;
    const interval = setInterval(() => {
      setDots(".".repeat(count));
      count = (count % 3) + 1;
    }, 400);
    return () => clearInterval(interval);
  }, [showDots]);

  return (
    <div className="flex relative w-fit mx-auto" style={{ 
      color: "rgba(255,255,255,0.7)", 
      fontFamily: "'Inter', sans-serif",
      fontSize: "9px", 
      letterSpacing: "0.8em",
      textTransform: "uppercase",
      fontWeight: 300,
    }}>
      <span>{text}</span>
      <span style={{ position: "absolute", left: "100%", whiteSpace: "pre" }}>
        {showDots ? dots : ""}
      </span>
    </div>
  );
}

// ─── Background Blobs ───────────────────────────────────────────────────────
function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        animate={{
          x: [0, 500, -300, 200, 0],
          y: [0, -300, 400, -200, 0],
          scale: [1, 1.8, 0.7, 1.4, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full filter blur-[150px] opacity-5"
        style={{ backgroundColor: "rgba(217, 70, 239, 0.6)" }}
      />
      <motion.div
        animate={{
          x: [0, -400, 300, -150, 0],
          y: [0, 400, -300, 250, 0],
          scale: [1, 1.4, 1.8, 0.8, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -right-40 w-[800px] h-[800px] rounded-full filter blur-[150px] opacity-5"
        style={{ backgroundColor: "rgba(0, 255, 255, 0.6)" }}
      />
    </div>
  );
}

// ─── Domino Chevrons ──────────────────────────────────────────────────────────
function DominoChevrons({ active, isMobile }) {
  const colors = ["#facc15", "#f59e0b", "#f97316", "#ea580c", "#dc2626", "#991b1b"];
  const chevronCount = isMobile ? 12 : 18;
  
  if (isMobile) {
    // Upward vertical sweep from bottom to top spanning full horizontal width for HP design
    return (
      <div 
        className="absolute pointer-events-none z-[5] overflow-hidden flex items-center mix-blend-screen"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "center center",
          width: "100vh",
          height: "100vw",
          left: "50%",
          top: "50%",
          marginLeft: "-50vh",
          marginTop: "-50vw",
        }}
      >
        {active && Array.from({ length: chevronCount }).map((_, i) => {
          const colorIndex = Math.floor((i / chevronCount) * colors.length);
          const color = colors[colorIndex];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: "-100%" }}
              animate={{ 
                opacity: [0, 0.6, 0],
                x: ["-100%", "0%", "100%"],
              }}
              transition={{ 
                duration: 2.2, 
                delay: i * 0.12, 
                ease: "circOut" 
              }}
              className="h-[100vh] -ml-[10vw] flex-shrink-0"
              style={{ width: "22vw" }}
            >
              <svg viewBox="0 0 24 24" preserveAspectRatio="none" className="w-full h-full" style={{ color }}>
                <path d="M 0 0 L 12 12 L 0 24 L 8 24 L 20 12 L 8 0 Z" fill="currentColor" />
              </svg>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Desktop horizontal sweep
  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden flex items-center mix-blend-screen">
      {active && Array.from({ length: chevronCount }).map((_, i) => {
        const colorIndex = Math.floor((i / chevronCount) * colors.length);
        const color = colors[colorIndex];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -100 }}
            animate={{ 
              opacity: [0, 0.6, 0],
              x: [-100, 0, 100],
            }}
            transition={{ 
              duration: 2.2, 
              delay: i * 0.1, 
              ease: "circOut" 
            }}
            className="h-[100vh] -ml-[10vw] flex-shrink-0"
            style={{ width: "22vw" }}
          >
            <svg viewBox="0 0 24 24" preserveAspectRatio="none" className="w-full h-full" style={{ color }}>
              <path d="M 0 0 L 12 12 L 0 24 L 8 24 L 20 12 L 8 0 Z" fill="currentColor" />
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── WelcomeTransition Main ──────────────────────────────────────────────────
export default function WelcomeTransition({ username, onComplete }) {
  const [showGears, setShowGears] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const tGears = setTimeout(() => setShowGears(true), 2500);
    
    // Start exit animation slightly before calling onComplete
    const tExit = setTimeout(() => setIsExiting(true), 6500);
    const tEnd = setTimeout(() => onComplete(), 7500);
    
    return () => { 
      clearTimeout(tGears); 
      clearTimeout(tExit);
      clearTimeout(tEnd); 
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1, filter: "blur(0px)" }}
      animate={{ 
        opacity: isExiting ? 0 : 1,
        filter: isExiting ? "blur(40px)" : "blur(0px)",
        scale: isExiting ? 1.1 : 1
      }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className={`fixed inset-0 ${isMobile ? "bg-black" : "bg-[#010204]"} z-[9999] overflow-hidden flex flex-col items-center justify-center`}
    >
      {!isMobile && <BackgroundBlobs />}
      <DominoChevrons active={showGears && !isExiting} isMobile={isMobile} />
      
      <div className="relative z-20 flex flex-col items-center w-full">
        {/* Main Text Container - Fixed Vertical Area to avoid jumping */}
        <div className="h-[120px] flex flex-row items-center justify-center gap-x-2 sm:gap-x-4 font-sans font-black tracking-tighter w-full px-2 sm:px-4 whitespace-nowrap overflow-hidden">
          <h1 className="text-[34px] xs:text-[42px] md:text-5xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-[#FF4D00] via-[#FFD700] to-[#FFCC00] drop-shadow-[0_0_20px_rgba(255,140,0,0.3)]">
            <Typewriter text="Welcome Back," delay={800} speed={130} />
          </h1>
          <h1 className="text-[34px] xs:text-[42px] md:text-5xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-[#D946EF] to-[#EC4899] drop-shadow-[0_0_20px_rgba(217,70,239,0.3)]">
             <Typewriter text={`${username} !`} delay={800} speed={130} dir="ltr" />
          </h1>
        </div>
        
        {/* Gears & Redirect Status - Fixed Height Container */}
        {!isMobile && (
          <div className="flex flex-col items-center mt-12 h-[160px] justify-start">
            <StaticGears visible={showGears} />
            <div className="h-8">
              {showGears && <RedirectText />}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
