"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePhoenixAurora } from "@/hooks/usePhoenixAurora";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FULL TIMER-DRIVEN TIMELINE (no isBackendReady dependency):
//
//  t = 0.0s  → Golden spiral threads emerge from left edge
//  t = 1.0s  → KALCERIA logo fades in
//  t = 2.5s  → Subtitle + Gears fade in (threads still flowing)
//  t = 5.5s  → Gears have shown for 3s → Laser grid begins (FILL phase)
//  t = 7.5s  → HOLD + epilepsy flicker (0.5s)
//  t = 8.0s  → PWM DRAIN blackout (1.0s)
//  t = 9.0s  → Pure black hold (0.2s)
//  t = 9.2s  → onComplete()
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

function StaticGears({ visible, isMobile }) {
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
        style={{ 
          filter: "drop-shadow(0 4px 18px rgba(180,120,0,0.7))",
          transform: isMobile ? "scale(0.85)" : "none",
          transformOrigin: "center center"
        }}
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

function LaserGrid({ active }) {
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

    // Phases (ms from laser activation):
    // 0–2000   : FILL
    // 2000–2500: HOLD + epilepsy
    // 2500–3500: PWM DRAIN
    // 3500–3700: BLACK
    const FILL_END  = 2000;
    const HOLD_END  = 2500;
    const DRAIN_END = 3500;
    const BLACK_END = 3700;

    let start = null;

    const draw = (ts) => {
      if (!start) start = ts;
      const el = ts - start;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      for (const ln of lines) {
        let alpha = 0;

        if (el < FILL_END) {
          if (el >= ln.delay) alpha = Math.min((el - ln.delay) / 300, 1) * 0.9;
        } else if (el < HOLD_END) {
          alpha = 0.9 * (0.72 + Math.random() * 0.28); // flicker
        } else if (el < DRAIN_END) {
          const drainEl = el - HOLD_END;
          alpha = drainEl < ln.drainDelay
            ? 0.9
            : Math.max(0, 0.9 - (drainEl - ln.drainDelay) / 250);
        }
        // else: alpha stays 0 (black)

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
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, W, H);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

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
      className="mt-4 flex relative w-fit justify-center" 
      style={{ 
        color: "rgba(255,255,255,0.7)", 
        fontFamily: "'Inter', sans-serif",
        fontSize: "8px",
        letterSpacing: "0.7em",
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
function MCUVideoGridCanvas({ active, isMobile }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set high-res canvas
    const ctx = canvas.getContext("2d");
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Dynamic video sources: Collaborate HP + Public files when on mobile!
    const sources = isMobile 
      ? [
          "/hp/vid_login_hp.mp4",
          "/hp/vid_login_hp2.mp4",
          "/hp/vid_login_hp3.mp4",
          "/vid_login1.mp4",
          "/vid_login2.mp4",
          "/vid_login3.mp4"
        ]
      : [
          "/vid_login1.mp4",
          "/vid_login2.mp4",
          "/vid_login3.mp4"
        ];

    // Load all videos into memory
    const videos = sources.map(src => {
      const v = document.createElement("video");
      v.src = src;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.play().catch(() => {});
      return v;
    });

    let raf;
    const cols = window.innerWidth > 768 ? 7 : 2;
    const rows = window.innerWidth > 768 ? 6 : 5;
    const totalCells = cols * rows;

    // Randomize initial assignments
    const cellAssignments = Array.from({ length: totalCells }).map(() => Math.floor(Math.random() * videos.length));

    // Dynamic MCU flip effect
    const switchInterval = setInterval(() => {
      // Flip up to 6 cells every 150ms
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
          // Fallback if the assigned video is not ready
          if (!v || v.readyState < 2) {
            v = videos.find(vid => vid && vid.readyState >= 2);
          }

          // Draw video scaled down into cell if it has enough data
          if (v) {
            ctx.drawImage(v, c * cellW, r * cellH, cellW, cellH);
          }
          
          // Draw border
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
  }, [active, isMobile]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 bg-black/50" 
      style={{ zIndex: 1 }} // Stacking context fix: guarantees canvas remains below central logo container
    />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IntroPreloader — fully timer-driven, no isBackendReady
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function IntroPreloader({ onComplete }) {
  const [showLogo,     setShowLogo]     = useState(false);
  const [laserActive,  setLaserActive]  = useState(false);
  const [done,         setDone]         = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);

  // Responsive device check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // t = 0.5s → start logo fade in
    const t1 = setTimeout(() => setShowLogo(true), 500);

    let t2, t3, t4;

    // t = 3.0s → start logo fade out (fades out over 1.0s, completely gone by t = 4.0s)
    t2 = setTimeout(() => {
      setShowLogo(false);
    }, 3000);

    // Fire lasers at t = 4.0s
    const fireLasers = () => {
      setLaserActive(true);
      t4 = setTimeout(() => {
        setDone(true);
        onComplete?.();
      }, 3900); // 3.9s after laser fires
    };

    t3 = setTimeout(() => {
      fireLasers();
    }, 4000);

    return () => { 
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [onComplete]);

  if (done) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000", // Pure black for the ultimate premium minimalist feel
        zIndex: 9999,
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ── Laser grid (PWM exit) ── */}
      <LaserGrid active={laserActive} />

      {/* ── Central content — logo only, lot bigger, centered perfectly ── */}
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
          width: isMobile ? "90%" : "600px",
        }}
      >
        <motion.img
          src={isMobile ? "/hp/logointro_hp.png" : "/logointofadein.png"}
          alt="KALCERIA"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: showLogo ? 1 : 0, scale: showLogo ? 1 : 0.95 }}
          transition={{ duration: 1.0, ease: "easeInOut" }} // Highly optimized 1.0s smooth transition for fade-in and fade-out
          style={{ 
            width: isMobile ? "310px" : "480px", // A LOT bigger!
            pointerEvents: "none", 
            display: "block", 
            filter: "drop-shadow(0 0 35px rgba(255, 255, 255, 0.12))", // Subtle premium white glow
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
