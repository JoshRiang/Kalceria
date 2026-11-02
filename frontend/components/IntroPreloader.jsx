"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePhoenixAurora } from "@/hooks/usePhoenixAurora";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import api from "@/lib/api";
import { hasUserSession } from "@/lib/session";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DYNAMIC MERGED PRELOADER (Desktop = FinalJosh branch, Mobile = Obsidian Black current logic)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
    const random = createRuntimeSeededRandom("intro-laser-grid-v1");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;

    const COUNT = 140;
    const lines = Array.from({ length: COUNT }, (_, i) => {
      const horiz = random() > 0.5;
      return {
        horiz,
        delay:      (i / COUNT) * 1800,
        drainDelay: ((COUNT - 1 - i) / COUNT) * 900,
        color:      LASER_PALETTE[Math.floor(random() * LASER_PALETTE.length)],
        pos:        horiz ? random() * H : random() * W,
        thick:      random() < 0.15 ? 2.5 : 1,
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
          alpha = 0.9 * (0.72 + random() * 0.28);
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
      className="mt-0 flex relative w-fit" 
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

// ─── Responsive Grid Dimensions for Video Collage ───────────────────
function getGridDimensions() {
  if (typeof window === "undefined") return { cols: 7, rows: 6 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  if (aspect >= 1.35) {
    return { cols: 7, rows: 6 };
  }
  // iPad & Tablet family: compute rows dynamically so nodes aren't vertically stretched
  const cols = w >= 1000 ? 6 : 5;
  const cellW = w / cols;
  const idealCellH = cellW / 1.38;
  const rows = Math.max(6, Math.round(h / idealCellH));
  return { cols, rows };
}

// ─── Tiled Video Canvas (MCU Optimization) ─────────────────────────
function MCUVideoGridCanvas({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    let { cols, rows } = getGridDimensions();
    let totalCells = cols * rows;
    const random = createRuntimeSeededRandom("intro-video-grid-v1");
    let cellAssignments = Array.from({ length: totalCells }).map(() => Math.floor(random() * 3));

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

    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const dims = getGridDimensions();
      cols = dims.cols;
      rows = dims.rows;
      totalCells = cols * rows;
      if (cellAssignments.length < totalCells) {
        const extra = Array.from({ length: totalCells - cellAssignments.length }).map(() => Math.floor(random() * videos.length));
        cellAssignments = [...cellAssignments, ...extra];
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    let raf;

    const switchInterval = setInterval(() => {
      if (totalCells <= 0) return;
      const flips = Math.floor(random() * 6) + 1;
      for (let i = 0; i < flips; i++) {
        const cellIdx = Math.floor(random() * totalCells);
        if (cellIdx < cellAssignments.length) {
          cellAssignments[cellIdx] = Math.floor(random() * videos.length);
        }
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
            const vw = v.videoWidth;
            const vh = v.videoHeight;
            if (vw && vh) {
              const videoAspect = vw / vh;
              const cellAspect = cellW / cellH;
              let sx = 0, sy = 0, sw = vw, sh = vh;
              if (videoAspect > cellAspect) {
                sw = vh * cellAspect;
                sx = (vw - sw) / 2;
              } else {
                sh = vw / cellAspect;
                sy = (vh - sh) / 2;
              }
              ctx.drawImage(v, sx, sy, sw, sh, c * cellW, r * cellH, cellW, cellH);
            } else {
              ctx.drawImage(v, c * cellW, r * cellH, cellW, cellH);
            }
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
const BASELINE_K_CLIP = "polygon(20% 0%, 32% 0%, 28.5% 45%, 70% 0%, 85% 0%, 42% 50%, 85% 100%, 70% 100%, 27.5% 55%, 24% 100%, 12% 100%)";

function getResponsiveKClipPath() {
  if (typeof window === "undefined") return BASELINE_K_CLIP;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  // Desktop widescreen baseline (aspect >= 1.35) remains 100% unchanged
  if (aspect >= 1.35) {
    return BASELINE_K_CLIP;
  }
  // iPad and tablet family: constrain vertical elongation
  const spanPercent = Math.min(94, Math.max(50, aspect * 78));
  const yMid = 48;
  const halfSpan = spanPercent / 2;
  const yTop = Math.max(0, yMid - halfSpan);
  const yBottom = Math.min(100, yMid + halfSpan);
  const yMidUpper = yMid - (yMid - yTop) * 0.10;
  const yMidLower = yMid + (yBottom - yMid) * 0.10;
  return `polygon(20% ${yTop.toFixed(2)}%, 32% ${yTop.toFixed(2)}%, 28.5% ${yMidUpper.toFixed(2)}%, 70% ${yTop.toFixed(2)}%, 85% ${yTop.toFixed(2)}%, 42% ${yMid.toFixed(2)}%, 85% ${yBottom.toFixed(2)}%, 70% ${yBottom.toFixed(2)}%, 27.5% ${yMidLower.toFixed(2)}%, 24% ${yBottom.toFixed(2)}%, 12% ${yBottom.toFixed(2)}%)`;
}

export default function IntroPreloader({ onComplete }) {
  const mounted = useHasMounted();
  const isMobile = useIsMobileViewport();
  const [showLogo,      setShowLogo]     = useState(false);
  const [showSubtitle,  setShowSubtitle] = useState(false);
  const [showGears,     setShowGears]    = useState(false);
  const [laserActive,   setLaserActive]  = useState(false);
  const [done,          setDone]         = useState(false);
  const [kClipPath,     setKClipPath]    = useState(BASELINE_K_CLIP);

  useEffect(() => {
    const updateClip = () => setKClipPath(getResponsiveKClipPath());
    updateClip();
    window.addEventListener("resize", updateClip);
    return () => window.removeEventListener("resize", updateClip);
  }, []);

  const threadsCanvasRef = useRef(null);
  usePhoenixAurora(threadsCanvasRef, mounted && !done && !isMobile, 9500);

  // Backend verification and cache warming during intro
  useEffect(() => {
    let alive = true;
    const prepareBackend = async () => {
      try {
        await Promise.allSettled([
          api.get("/events/public").catch(() => null),
          hasUserSession() ? api.get("/users/me").catch(() => null) : Promise.resolve(null),
        ]);
      } catch {
        // Intentionally silent
      }
    };
    prepareBackend();
    return () => { alive = false; };
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
            style={{ clipPath: kClipPath }}
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
            width={310}
            height={64}
            fetchPriority="high"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: showLogo ? 1 : 0, scale: showLogo ? 1 : 0.95 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            style={{ 
              width: "310px",
              height: "auto",
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
            top: "42%", // Perfectly centered vertically without the gear footprint
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
            width={280}
            height={60}
            fetchPriority="high"
            initial={{ opacity: 0 }}
            animate={{ opacity: showLogo ? 1 : 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            style={{ width: "280px", height: "auto", pointerEvents: "none", display: "block", flexShrink: 0 }}
            draggable={false}
          />

          {/* Subtitle - Tight, modern spacing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showSubtitle ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ marginTop: "16px", display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {showSubtitle && !laserActive && <WakingUpText />}
          </motion.div>
        </div>
      )}
    </div>
  );
}
