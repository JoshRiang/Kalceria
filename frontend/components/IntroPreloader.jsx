"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePhoenixAurora } from "@/hooks/usePhoenixAurora";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DYNAMIC MERGED PRELOADER (Desktop = FinalJosh branch, Mobile = Obsidian Black current logic)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── GearShape ───────────────────────────────────────────────────────────────
function GearShape({ id, cx, cy, pitchR, toothH, teeth, angleOffset = 0, duration = 4, spinDir = 1 }) {
  const outerR    = pitchR + toothH;
  const innerR    = pitchR - toothH * 0.45;
  const hubR      = pitchR * 0.30;
  const boreR     = pitchR * 0.11;
  const toothArc  = (2 * Math.PI) / teeth;
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
      `${cx + Math.cos(base + toothHalf * 1.5) * innerR},${cy + Math.sin(base + toothHalf * 1.5) * innerR}`,
    );
  }
  const ptStr = pts.join(" ");
  const bId = `gb${id}`, fId = `gf${id}`, sId = `gs${id}`;

  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from={`0 ${cx} ${cy}`}
        to={`${spinDir * 360} ${cx} ${cy}`}
        dur={`${duration}s`}
        repeatCount="indefinite"
      />
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
        return (
          <line key={i}
            x1={cx + Math.cos(a) * boreR * 2.2} y1={cy + Math.sin(a) * boreR * 2.2}
            x2={cx + Math.cos(a) * hubR  * 0.8}  y2={cy + Math.sin(a) * hubR  * 0.8}
            stroke="#6b4f12" strokeWidth="1.3"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={hubR} fill="#1a1000" stroke="#c8a020" strokeWidth="1.1" />
      <circle cx={cx - hubR*0.22} cy={cy - hubR*0.22} r={hubR*0.48}
        fill="none" stroke="rgba(255,210,60,0.25)" strokeWidth="0.9" />
      <circle cx={cx} cy={cy} r={boreR} fill="#050300" />
      <polygon points={ptStr} fill={`url(#${sId})`} opacity={0.85} />
      <polygon points={ptStr} fill="none" stroke="rgba(255,200,50,0.22)" strokeWidth="0.8" />
    </g>
  );
}

function StaticGears({ visible }) {
  const p1 = 36, p2 = Math.round(36 * 0.618), p3 = Math.round(36 * 0.618 * 0.618);
  const h1 = 9,  h2 = Math.round(9 * 0.618),  h3 = Math.max(3, Math.round(h2 * 0.618));

  const cx1 = 50, cy1 = 50;
  const a12 = Math.PI * 0.15;
  const d12 = p1 + p2;
  const cx2 = cx1 + Math.cos(a12) * d12;
  const cy2 = cy1 + Math.sin(a12) * d12;
  const a23 = Math.PI * -0.25;
  const d23 = p2 + p3;
  const cx3 = cx2 + Math.cos(a23) * d23;
  const cy3 = cy2 + Math.sin(a23) * d23;

  const t1 = 18;
  const t2 = Math.round(t1 * p2 / p1);
  const t3 = Math.round(t1 * p3 / p1);

  const svgW = cx3 + p3 + h3 + 15;
  const svgH = Math.max(cy1 + p1 + h1, cy2 + p2 + h2, cy3 + p3 + h3) + 15;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <svg
        width={svgW} height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ filter: "drop-shadow(0 4px 18px rgba(180,120,0,0.7))" }}
      >
        <GearShape id="A" cx={cx1} cy={cy1} pitchR={p1} toothH={h1} teeth={t1} angleOffset={0}           duration={4}           spinDir={1}  />
        <GearShape id="B" cx={cx2} cy={cy2} pitchR={p2} toothH={h2} teeth={t2} angleOffset={Math.PI/t2} duration={4*(t2/t1)}  spinDir={-1} />
        <GearShape id="C" cx={cx3} cy={cy3} pitchR={p3} toothH={h3} teeth={t3} angleOffset={0}           duration={4*(t3/t1)}  spinDir={1}  />
      </svg>
    </motion.div>
  );
}

// ─── Laser Grid ───────────────────────────────────────────────────────────────
const LASER_PALETTE = [
  ...Array(30).fill("#FFD700"),
  ...Array(30).fill("#FF00FF"),
  ...Array(20).fill("#FF8C00"),
  ...Array(10).fill("#FFFFFF"),
  ...Array(10).fill("#C0C0C0"),
];

function LaserGrid({ active, bgColor = "#050a14" }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;

    const COUNT = 140;
    const lines = Array.from({ length: COUNT }, (_, i) => {
      const horiz = Math.random() > 0.5;
      return {
        horiz,
        delay:      (i / COUNT) * 1800,
        drainDelay: ((COUNT - 1 - i) / COUNT) * 900,
        color:      LASER_PALETTE[Math.floor(Math.random() * LASER_PALETTE.length)],
        pos:        horiz ? Math.random() * H : Math.random() * W,
        thick:      Math.random() < 0.15 ? 2.5 : 1,
      };
    });

    const FILL_END  = 2000;
    const HOLD_END  = 2500;
    const DRAIN_END = 3500;
    const BLACK_END = 3700;

    let start = null;

    const draw = (ts) => {
      if (!start) start = ts;
      const el = ts - start;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      for (const ln of lines) {
        let alpha = 0;

        if (el < FILL_END) {
          if (el >= ln.delay) alpha = Math.min((el - ln.delay) / 300, 1) * 0.9;
        } else if (el < HOLD_END) {
          alpha = 0.9 * (0.72 + Math.random() * 0.28);
        } else if (el < DRAIN_END) {
          const drainEl = el - HOLD_END;
          alpha = drainEl < ln.drainDelay
            ? 0.9
            : Math.max(0, 0.9 - (drainEl - ln.drainDelay) / 250);
        }

        if (alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha  = alpha;
        ctx.strokeStyle  = ln.color;
        ctx.lineWidth    = ln.thick;
        ctx.shadowBlur   = 10;
        ctx.shadowColor  = ln.color;
        ctx.beginPath();
        if (ln.horiz) { ctx.moveTo(0, ln.pos); ctx.lineTo(W, ln.pos); }
        else          { ctx.moveTo(ln.pos, 0); ctx.lineTo(ln.pos, H); }
        ctx.stroke();
        ctx.restore();
      }

      if (el < BLACK_END) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, W, H);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, bgColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 50,
        display: active ? "block" : "none",
      }}
    />
  );
}

// ─── WakingUpText ─────────────────────────────────────────────────────────────
function WakingUpText() {
  const [text, setText] = useState("");
  const fullText = "WAKING UP SERVER";
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
    let dotCount = 1;
    const dotInterval = setInterval(() => {
      setDots(".".repeat(dotCount));
      dotCount = (dotCount % 3) + 1;
    }, 400);

    return () => clearInterval(dotInterval);
  }, [showDots]);

  return (
    <div 
      className="mt-6 flex relative w-fit" 
      style={{ 
        color: "rgba(255,255,255,0.7)", 
        fontFamily: "'Inter', sans-serif",
        fontSize: "9px",
        letterSpacing: "0.8em",
        textTransform: "uppercase",
        fontWeight: 300,
      }}
    >
      <span>{text}</span>
      <span style={{ position: "absolute", left: "100%", whiteSpace: "pre" }}>
        {showDots ? dots : ""}
      </span>
    </div>
  );
}

// ─── Tiled Video Canvas (MCU Optimization) ─────────────────────────
function MCUVideoGridCanvas({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Load all 3 videos into memory
    const videos = [1, 2, 3].map(num => {
      const v = document.createElement("video");
      v.src = `/vid_login${num}.mp4`;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.play().catch(() => {});
      return v;
    });

    let raf;
    const cols = window.innerWidth > 768 ? 7 : 6;
    const rows = window.innerWidth > 768 ? 6 : 7;
    const totalCells = cols * rows;

    const cellAssignments = Array.from({ length: totalCells }).map(() => Math.floor(Math.random() * videos.length));

    const switchInterval = setInterval(() => {
      const flips = Math.floor(Math.random() * 6) + 1;
      for (let i = 0; i < flips; i++) {
        const cellIdx = Math.floor(Math.random() * totalCells);
        cellAssignments[cellIdx] = Math.floor(Math.random() * videos.length);
      }
    }, 150);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cellW = w / cols;
      const cellH = h / rows;

      ctx.clearRect(0, 0, w, h);
      
      let cellIdx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let v = videos[cellAssignments[cellIdx]];
          if (!v || v.readyState < 2) {
            v = videos.find(vid => vid && vid.readyState >= 2);
          }

          if (v) {
            ctx.drawImage(v, c * cellW, r * cellH, cellW, cellH);
          }
          
          ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
          ctx.lineWidth = 1;
          ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
          cellIdx++;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", updateSize);
      clearInterval(switchInterval);
      cancelAnimationFrame(raf);
      videos.forEach(v => {
        v.pause();
        v.src = "";
      });
    };
  }, [active]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 bg-black/50" 
    />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IntroPreloader — Dynamic desktop/mobile hybrid
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function IntroPreloader({ onComplete }) {
  const [mounted,       setMounted]      = useState(false);
  const [isMobile,      setIsMobile]     = useState(false);
  const [showLogo,      setShowLogo]     = useState(false);
  const [showSubtitle,  setShowSubtitle] = useState(false);
  const [showGears,     setShowGears]    = useState(false);
  const [laserActive,   setLaserActive]  = useState(false);
  const [done,          setDone]         = useState(false);

  const threadsCanvasRef = useRef(null);
  usePhoenixAurora(threadsCanvasRef, mounted && !done && !isMobile, 9500);

  // Responsive device check & mount indicator
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Hybrid Timelines
  useEffect(() => {
    if (!mounted) return;

    let t1, t2, t3, t4;

    if (isMobile) {
      // ── MOBILE LOGIC (Original timing + Obsidian Black) ──
      // t = 0.5s → start logo fade in
      t1 = setTimeout(() => setShowLogo(true), 500);

      // t = 3.0s → start logo fade out (completely gone by t = 4.0s)
      t2 = setTimeout(() => {
        setShowLogo(false);
      }, 3000);

      // t = 4.0s → Fire lasers
      t3 = setTimeout(() => {
        setLaserActive(true);
        t4 = setTimeout(() => {
          setDone(true);
          onComplete?.();
        }, 3900); // 3.9s after laser fires (complete at t = 7.9s)
      }, 4000);

    } else {
      // ── DESKTOP LOGIC (Fully matching the FinalJosh branch) ──
      // t = 1.0s → logo fades in
      t1 = setTimeout(() => setShowLogo(true), 1000);

      // t = 2.5s → subtitle + gears + MCU video collage fade in
      t2 = setTimeout(() => {
        setShowSubtitle(true);
        setShowGears(true);
      }, 2500);

      // t = 9.5s → fire lasers (exactly 7.0s after subtitle/gears appear)
      t3 = setTimeout(() => {
        setLaserActive(true);
        t4 = setTimeout(() => {
          setDone(true);
          onComplete?.();
        }, 3900); // 3.9s after laser fires (complete at t = 13.4s)
      }, 9500);
    }

    return () => { 
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [mounted, isMobile, onComplete]);

  // Prevent flash of plain content during hydration
  if (!mounted || done) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050a14", // Deep Prussian Navy for both desktop and mobile
        zIndex: 9999,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── Background Videos (MCU-Style Canvas Render) — Desktop Only ── */}
      {!isMobile && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Base Layer: Normal B&W Collage outside the K shape */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: showSubtitle ? 0.15 : 0, scale: showSubtitle ? 1 : 0.98 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <MCUVideoGridCanvas active={true} />
          </motion.div>

          {/* Top Layer: Peach-Magenta Gradient masked strictly to the K shape */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: showSubtitle ? 0.35 : 0, scale: showSubtitle ? 1 : 0.98 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{ clipPath: "polygon(20% 0%, 32% 0%, 28.5% 45%, 70% 0%, 85% 0%, 42% 50%, 85% 100%, 70% 100%, 27.5% 55%, 24% 100%, 12% 100%)" }}
          >
            <MCUVideoGridCanvas active={true} />
            {/* Gradient Tint Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFA500] via-[#FF4500] to-[#FF00FF] mix-blend-color opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFA500] via-[#FF4500] to-[#FF00FF] mix-blend-overlay opacity-40" />
          </motion.div>
        </div>
      )}

      {/* ── Golden spiral threads canvas — Desktop Only ── */}
      {!isMobile && (
        <canvas
          ref={threadsCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10,
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* ── Laser grid (PWM exit) ── */}
      <LaserGrid active={laserActive} bgColor="#050a14" />

      {/* ── Central content (Dynamic Layout) ── */}
      {isMobile ? (
        // Mobile Layout (Centered Logo Only)
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "90%",
          }}
        >
          <motion.img
            src="/hp/logointro_hp.webp"
            alt="KALCERIA"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: showLogo ? 1 : 0, scale: showLogo ? 1 : 0.95 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            style={{ 
              width: "310px",
              pointerEvents: "none", 
              display: "block", 
              filter: "drop-shadow(0 0 35px rgba(255, 255, 255, 0.12))",
            }}
            draggable={false}
          />
        </div>
      ) : (
        // Desktop Layout (From FinalJosh Branch)
        <div
          style={{
            position: "absolute",
            top: "35%", // Fixed top position to prevent vertical shifting
            left: "50%",
            transform: "translateX(-50%)", // Center horizontally
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "400px",
          }}
        >
          {/* KALCERIA Logo */}
          <motion.img
            src="/logointofadein.webp"
            alt="KALCERIA"
            initial={{ opacity: 0 }}
            animate={{ opacity: showLogo ? 1 : 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            style={{ width: "280px", pointerEvents: "none", display: "block", flexShrink: 0 }}
            draggable={false}
          />

          {/* Subtitle + Gears */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showSubtitle ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ marginTop: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}
          >
            <StaticGears visible={showGears} />
            {showGears && !laserActive && <WakingUpText />}
          </motion.div>
        </div>
      )}
    </div>
  );
}
