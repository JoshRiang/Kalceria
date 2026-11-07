"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePhoenixAurora } from "@/hooks/usePhoenixAurora";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import api from "@/lib/api";
import { hasUserSession } from "@/lib/session";
import { LaserGrid, WakingUpText, MCUVideoGridCanvas } from "./preloader";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IntroPreloader — Dynamic desktop/mobile hybrid
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function IntroPreloader({ onComplete }) {
  const mounted = useHasMounted();
  const isMobile = useIsMobileViewport();
  const [showLogo, setShowLogo] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [laserActive, setLaserActive] = useState(false);
  const [done, setDone] = useState(false);

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
    return () => {
      alive = false;
    };
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

      // t = 2.5s → subtitle + MCU video collage fade in
      t2 = setTimeout(() => {
        setShowSubtitle(true);
      }, 2500);

      // t = 9.5s → fire lasers (exactly 7.0s after subtitle appears)
      t3 = setTimeout(() => {
        setLaserActive(true);
        t4 = setTimeout(() => {
          setDone(true);
          onComplete?.();
        }, 3900); // 3.9s after laser fires (complete at t = 13.4s)
      }, 9500);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
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
            <MCUVideoGridCanvas active={true} seedSalt="outer" />
          </motion.div>

          {/* Top Layer: Peach-Magenta Gradient masked strictly to the K shape */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: showSubtitle ? 0.35 : 0, scale: showSubtitle ? 1 : 0.98 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{
              clipPath:
                "polygon(20% 0%, 32% 0%, 28.5% 45%, 70% 0%, 85% 0%, 42% 50%, 85% 100%, 70% 100%, 27.5% 55%, 24% 100%, 12% 100%)",
            }}
          >
            <MCUVideoGridCanvas active={true} seedSalt="k-mask" />
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
