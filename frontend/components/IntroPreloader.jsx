"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePhoenixAurora } from "@/hooks/usePhoenixAurora";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useIsMobileViewport } from "@/hooks/useIsMobileViewport";
import api from "@/lib/api";
import { hasUserSession } from "@/lib/session";
import { LaserGrid, WakingUpText, MCUVideoGridCanvas } from "./preloader";

const DESKTOP_K_CLIP_PATH =
  "polygon(20% 0%, 32% 0%, 28.5% 45%, 70% 0%, 85% 0%, 42% 50%, 85% 100%, 70% 100%, 27.5% 55%, 24% 100%, 12% 100%)";
const MOBILE_K_CLIP_PATH =
  "polygon(14% 0%, 30% 0%, 26% 45%, 72% 0%, 90% 0%, 44% 50%, 90% 100%, 72% 100%, 25% 55%, 20% 100%, 6% 100%)";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IntroPreloader — Dynamic desktop/mobile hybrid
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function IntroPreloader({ onComplete }) {
  const mounted = useHasMounted();
  const isMobile = useIsMobileViewport();
  const prefersReducedMotion = useReducedMotion();
  const [logoPhase, setLogoPhase] = useState("initial"); // "initial" | "visible" | "exiting"
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [laserActive, setLaserActive] = useState(false);
  const [done, setDone] = useState(false);

  const threadsCanvasRef = useRef(null);
  usePhoenixAurora(threadsCanvasRef, mounted && !done && !isMobile, 9500);

  // Backend verification and cache warming during intro
  useEffect(() => {
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
  }, []);

  // Hybrid Timelines (Preserving exact original timings across mobile & desktop)
  useEffect(() => {
    if (!mounted) return;

    let t1, t2, t3, t4;

    if (isMobile) {
      // ── MOBILE LOGIC (Original timing + Obsidian Black + Responsive Car Collage) ──
      // t = 0.5s → start logo fade-in + Marvel 120% -> 100% center shrink + car nodes reveal
      t1 = setTimeout(() => setLogoPhase("visible"), 500);

      // t = 3.0s → start logo & collage fade out (completely gone by t = 4.0s)
      t2 = setTimeout(() => {
        setLogoPhase("exiting");
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
      // ── DESKTOP LOGIC (Fully matching the FinalJosh branch + Marvel 120% -> 100% zoom) ──
      // t = 1.0s → logo fades in while shrinking from 120% to 100% (settles at t = 2.4s)
      t1 = setTimeout(() => setLogoPhase("visible"), 1000);

      // t = 2.5s → subtitle (WAKING UP SERVER) + MCU car video collage fade in
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

  const showCollage = isMobile ? logoPhase === "visible" : showSubtitle;
  const collageActive = !laserActive && !done;
  const startScale = prefersReducedMotion ? 1 : 1.2;
  const logoOpacity = logoPhase === "visible" ? 1 : 0;
  const logoScale =
    logoPhase === "visible"
      ? 1
      : logoPhase === "exiting"
        ? prefersReducedMotion
          ? 1
          : 0.98
        : startScale;

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
      {/* ── Background Car Video Collage (Cloudflare CDN 15-Clip Pool) — All Device Families ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Base Layer: Normal B&W Car Collage outside the K shape */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: showCollage ? (isMobile ? 0.18 : 0.16) : 0,
            scale: showCollage ? 1 : 0.98,
          }}
          transition={{ duration: isMobile ? 0.9 : 2.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <MCUVideoGridCanvas active={collageActive} seedSalt="outer" />
        </motion.div>

        {/* Top Layer: Peach-Magenta Gradient masked strictly to the K shape */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: showCollage ? (isMobile ? 0.36 : 0.38) : 0,
            scale: showCollage ? 1 : 0.98,
          }}
          transition={{ duration: isMobile ? 0.9 : 2.6, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{
            clipPath: isMobile ? MOBILE_K_CLIP_PATH : DESKTOP_K_CLIP_PATH,
          }}
        >
          <MCUVideoGridCanvas active={collageActive} seedSalt="k-mask" />
          {/* Gradient Tint Overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFA500] via-[#FF4500] to-[#FF00FF] mix-blend-color opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFA500] via-[#FF4500] to-[#FF00FF] mix-blend-overlay opacity-40" />
        </motion.div>
      </div>

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

      {/* ── Central content (Dynamic Layout + Marvel 120% -> 100% Shrink-In) ── */}
      {isMobile ? (
        // Mobile Layout (Centered Logo with Marvel 120% -> 100% center shrink-in)
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
            height={270}
            fetchPriority="high"
            initial={{ opacity: 0, scale: startScale }}
            animate={{ opacity: logoOpacity, scale: logoScale }}
            transition={{
              duration: logoPhase === "exiting" ? 0.9 : 1.15,
              ease: logoPhase === "exiting" ? "easeInOut" : [0.16, 1, 0.3, 1],
            }}
            style={{
              width: "min(290px, 74vw)",
              height: "auto",
              transformOrigin: "center center",
              willChange: "transform, opacity",
              pointerEvents: "none",
              display: "block",
              filter: "drop-shadow(0 0 35px rgba(255, 255, 255, 0.14))",
            }}
            draggable={false}
          />
        </div>
      ) : (
        // Desktop Layout (Marvel 120% -> 100% center shrink-in with strict clearance above WakingUpText)
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
          {/* Dedicated centered logo frame so 120% initial scale never collides with WakingUpText */}
          <div
            style={{
              width: "100%",
              minHeight: "92px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.img
              src="/logointofadein.webp"
              alt="KALCERIA"
              width={280}
              height={84}
              fetchPriority="high"
              initial={{ opacity: 0, scale: startScale }}
              animate={{ opacity: logoOpacity, scale: logoScale }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: "280px",
                height: "auto",
                transformOrigin: "center center",
                willChange: "transform, opacity",
                pointerEvents: "none",
                display: "block",
                flexShrink: 0,
              }}
              draggable={false}
            />
          </div>

          {/* Subtitle — Guaranteed non-overlapping clearance below settled logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showSubtitle ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              marginTop: "24px",
              position: "relative",
              zIndex: 25,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {showSubtitle && !laserActive && <WakingUpText />}
          </motion.div>
        </div>
      )}
    </div>
  );
}
