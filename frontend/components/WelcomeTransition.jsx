"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

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
  const [dots, setDots] = useState("");
  useEffect(() => {
    let count = 1;
    const interval = setInterval(() => {
      setDots(".".repeat(count));
      count = (count % 3) + 1;
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono font-black tracking-tighter uppercase flex" style={{ color: "#D946EF", fontSize: "13px", textShadow: "0 0 15px rgba(217,70,239,0.8)" }}>
      <span>REDIRECT</span>
      <span className="w-8 text-left ml-1">{dots}</span>
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
        className="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full filter blur-[150px] opacity-20"
        style={{ backgroundColor: "rgba(217, 70, 239, 0.6)" }}
      />
      <motion.div
        animate={{
          x: [0, -400, 300, -150, 0],
          y: [0, 400, -300, 250, 0],
          scale: [1, 1.4, 1.8, 0.8, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -right-40 w-[800px] h-[800px] rounded-full filter blur-[150px] opacity-20"
        style={{ backgroundColor: "rgba(0, 255, 255, 0.6)" }}
      />
    </div>
  );
}

// ─── WelcomeTransition Main ──────────────────────────────────────────────────
export default function WelcomeTransition({ username, onComplete }) {
  const canvasRef = useRef(null);
  const [showGears, setShowGears] = useState(false);

  useEffect(() => {
    const tGears = setTimeout(() => setShowGears(true), 2500);
    const tEnd = setTimeout(() => onComplete(), 7500);
    return () => { clearTimeout(tGears); clearTimeout(tEnd); };
  }, [onComplete]);

  // Thread Logic (High Fidelity)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const TOTAL_MS = 6500, FADE_IN_MS = 1000, FADE_OUT_START = 5000;
    const PALETTES = {
      cyan: { tail: "0,80,100", mid: "0,220,220", head: "180,255,255", shadow: "0,255,255" },
      purple: { tail: "60,0,100", mid: "168,85,247", head: "220,180,255", shadow: "168,85,247" },
    };
    const CY = canvas.height * 0.5, R = () => Math.random() * Math.PI * 2;
    const threadDefs = [
      { dir: 1, yBase: CY-20, amp: 22, freq: 4.8, phase: R(), speed: 0.55, thick: 2.2, pal: "cyan", delay: 0 },
      { dir: 1, yBase: CY+30, amp: 28, freq: 4.2, phase: R(), speed: 0.40, thick: 2.0, pal: "purple", delay: 200 },
      { dir: -1, yBase: CY-10, amp: 20, freq: 5.5, phase: R(), speed: 0.62, thick: 1.8, pal: "cyan", delay: 100 },
      { dir: -1, yBase: CY+25, amp: 25, freq: 3.8, phase: R(), speed: 0.35, thick: 1.6, pal: "purple", delay: 400 },
    ];
    const threads = threadDefs.map(t => ({ ...t, progress: 0 }));
    const drawThread = (th, gEnv, el) => {
      const { dir, yBase, amp, freq, phase, progress, thick, pal } = th;
      if (progress <= 0.005) return;
      const p = PALETTES[pal], W = canvas.width, headDist = Math.min(progress * W, W), timeFlow = el / 6500;
      const reachFade = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.15) : 1.0;
      const env = gEnv * reachFade;
      if (env < 0.005) return;
      const pts = []; const SEG = 180;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG, dist = t * headDist;
        const x = dir === 1 ? dist : W - dist;
        const y = yBase + amp * Math.sin(freq * (x/W) * Math.PI * 2 + phase + timeFlow * 1.2);
        pts.push([x, y]);
      }
      const tailX = dir === 1 ? 0 : W, headX = dir === 1 ? headDist : W - headDist;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = thick * 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const glow = ctx.createLinearGradient(tailX, 0, headX, 0);
      glow.addColorStop(0, `rgba(${p.tail},0)`); glow.addColorStop(0.12, `rgba(${p.mid},${env * 0.12})`); glow.addColorStop(0.7, `rgba(${p.mid},${env * 0.22})`); glow.addColorStop(0.92, `rgba(${p.head},${env * 0.5})`); glow.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.strokeStyle = glow; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = thick; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowBlur = 6; ctx.shadowColor = `rgba(${p.shadow},${env * 0.9})`;
      const main = ctx.createLinearGradient(tailX, 0, headX, 0);
      main.addColorStop(0, `rgba(${p.tail},0)`); main.addColorStop(0.08, `rgba(${p.mid},${env * 0.35})`); main.addColorStop(0.6, `rgba(${p.mid},${env * 0.8})`); main.addColorStop(0.88, `rgba(${p.head},${env * 0.95})`); main.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.strokeStyle = main; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore();
      if (progress < 0.92) {
        const hx = pts[pts.length - 1][0], hy = pts[pts.length - 1][1], sr = thick * 3.5;
        ctx.save(); ctx.globalCompositeOperation = "lighter"; const srd = ctx.createRadialGradient(hx, hy, 0, hx, hy, sr);
        srd.addColorStop(0, `rgba(255,255,255,${env})`); srd.addColorStop(0.4, `rgba(${p.head},${env * 0.7})`); srd.addColorStop(1, `rgba(${p.mid},0)`);
        ctx.fillStyle = srd; ctx.beginPath(); ctx.arc(hx, hy, sr, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    };
    let startTs = null, lastTs = null, raf;
    const draw = (ts) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs, dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
      lastTs = ts;
      if (elapsed > TOTAL_MS + 200) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gEnv = (el) => { if (el < FADE_IN_MS) return el / FADE_IN_MS; if (el < FADE_OUT_START) return 1.0; return Math.max(0, 1 - (el - FADE_OUT_START) / (TOTAL_MS - FADE_OUT_START)); };
      for (const th of threads) {
        const tElapsed = Math.max(0, elapsed - th.delay);
        if (tElapsed <= 0) continue;
        if (th.progress < 1.0) th.progress = Math.min(th.progress + th.speed * (dt / 1000), 1.0);
        drawThread(th, gEnv(elapsed), elapsed);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#050a14] z-[9999] overflow-hidden flex flex-col items-center justify-center">
      <BackgroundBlobs />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen z-10" />
      
      <div className="relative z-20 flex flex-col items-center">
        {/* Main Text Container - Fixed Vertical Area to avoid jumping */}
        <div className="h-[120px] flex flex-col md:flex-row items-center justify-center gap-x-4 gap-y-2 font-sans font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-[#D946EF] to-[#FACC15] drop-shadow-[0_0_20px_rgba(217,70,239,0.3)]">
          <h1 className="text-4xl md:text-5xl lg:text-7xl">
            <Typewriter text="Welcome Back " delay={800} speed={130} />
          </h1>
          <h1 className="text-4xl md:text-5xl lg:text-7xl min-w-[350px] text-left md:text-right">
             <Typewriter text={`${username} !`} delay={800} speed={130} dir="rtl" />
          </h1>
        </div>
        
        {/* Gears & Redirect Status - Fixed Height Container */}
        <div className="flex flex-col items-center mt-12 h-[160px] justify-start">
          <StaticGears visible={showGears} />
          <div className="h-8">
            {showGears && <RedirectText />}
          </div>
        </div>
      </div>
    </div>
  );
}
