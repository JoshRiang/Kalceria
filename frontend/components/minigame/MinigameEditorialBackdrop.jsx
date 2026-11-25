"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { MINIGAME_BG_THEMES, MINIGAME_ELEMENTS } from "@/lib/pageBgAssets";
import { MINIGAME_DOT_CONTOURS } from "@/lib/minigameDotContours";
import { computeMinigameElementSlots } from "@/lib/pageBgLayout";
import { useResponsiveBgFamily } from "@/hooks/useResponsiveBgFamily";

const LIGHT_DOT_A = [18, 76, 198];   // Royal Cobalt Blue
const LIGHT_DOT_B = [212, 144, 12];  // Rich Gold
const DARK_DOT_A = [255, 58, 154];   // Neon Pink
const DARK_DOT_B = [255, 214, 64];   // Luminous Gold

function lerpRgbHex(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function DottedContourOverlay({ contour, mode, activePulse }) {
  const { width, height, dotRadius, dots } = contour;
  const colA = mode === "light" ? LIGHT_DOT_A : DARK_DOT_A;
  const colB = mode === "light" ? LIGHT_DOT_B : DARK_DOT_B;
  const total = dots.length || 1;
  const r = Math.max(4.6, Number(dotRadius) || 5.4);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    >
      {dots.map(([x, y], idx) => {
        const phase = 0.5 + 0.5 * Math.sin((idx / total) * Math.PI * 2);
        const fill = lerpRgbHex(colA, colB, phase);
        const delaySec = ((idx / total) * 2.8).toFixed(2);
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={r}
            fill={fill}
            className={activePulse ? "mg-dot-shimmer" : ""}
            style={
              activePulse
                ? { animationDelay: `${delaySec}s` }
                : { opacity: mode === "light" ? 0.9 : 0.94 }
            }
          />
        );
      })}
    </svg>
  );
}

/**
 * Dual-Scheme Responsive Editorial Minigame Backdrop:
 * - Clean archival white base (Gold-Blue) fading smoothly in 2.2s into deep obsidian (Pink-Gold) on Play.
 * - All 5 iconic elements positioned mathematically with ZERO overlap across every device family
 *   (portrait HP, landscape HP, portrait iPad/Fold, half-desktop/landscape iPad, desktop, ultrawide).
 * - Each element is surrounded by its own crisp true circular dotted contour synced to the active palette.
 */
export function MinigameEditorialBackdrop({ isPlayDarkTheme }) {
  const { width, height, family } = useResponsiveBgFamily();
  const isPortraitBase = family === "mobile" || family === "tablet";

  const elementAspects = useMemo(() => {
    const out = {};
    for (const [id, data] of Object.entries(MINIGAME_DOT_CONTOURS)) {
      out[id] = data.aspect;
    }
    return out;
  }, []);

  const slots = useMemo(
    () => computeMinigameElementSlots(width, height, elementAspects),
    [width, height, elementAspects]
  );

  const darkBaseSrc = isPortraitBase ? MINIGAME_BG_THEMES.dark.mobile : MINIGAME_BG_THEMES.dark.desktop;
  const darkBaseLocal = isPortraitBase ? MINIGAME_BG_THEMES.dark.localMobile : MINIGAME_BG_THEMES.dark.localDesktop;
  const lightBaseSrc = isPortraitBase ? MINIGAME_BG_THEMES.light.mobile : MINIGAME_BG_THEMES.light.desktop;
  const lightBaseLocal = isPortraitBase ? MINIGAME_BG_THEMES.light.localMobile : MINIGAME_BG_THEMES.light.localDesktop;

  const swapFallback = (fallbackUrl) => (e) => {
    if (e.currentTarget.dataset.fallbackApplied) return;
    e.currentTarget.dataset.fallbackApplied = "1";
    e.currentTarget.src = fallbackUrl;
  };

  return (
    <div
      aria-hidden="true"
      data-minigame-bg-family={family}
      className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black"
    >
      <style>{`
        @keyframes kalceriaMgDotShimmer {
          0%, 100% { opacity: 0.96; }
          50% { opacity: 0.48; }
        }
        .mg-dot-shimmer {
          animation: kalceriaMgDotShimmer 2.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .mg-dot-shimmer { animation: none !important; opacity: 0.92; }
        }
      `}</style>

      {/* Playing Layer: Obsidian Base + Pink & Luminous Gold Elements + Synced Dotted Contours */}
      <motion.div
        initial={false}
        animate={{
          opacity: isPlayDarkTheme ? 0.94 : 0,
          transition: { duration: 2.2, ease: "easeInOut" },
        }}
        className="absolute inset-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={darkBaseSrc}
          alt=""
          loading="eager"
          decoding="async"
          onError={swapFallback(darkBaseLocal)}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {slots.map((slot) => {
          const asset = MINIGAME_ELEMENTS[slot.id];
          const contour = MINIGAME_DOT_CONTOURS[slot.id];
          if (!asset || !contour) return null;
          return (
            <div
              key={`dark-${slot.id}`}
              data-mg-slot={slot.id}
              className="absolute will-change-transform"
              style={{
                left: `${slot.leftPct}%`,
                top: `${slot.topPct}%`,
                width: `${slot.widthPct}%`,
                height: `${slot.heightPct}%`,
                transform: slot.rotateDeg ? `rotate(${slot.rotateDeg}deg)` : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.dark}
                alt=""
                loading="eager"
                decoding="async"
                onError={swapFallback(asset.localDark)}
                className="w-full h-full object-contain select-none"
              />
              <DottedContourOverlay contour={contour} mode="dark" activePulse={isPlayDarkTheme} />
            </div>
          );
        })}
      </motion.div>

      {/* Idle Layer: Crisp White Base + Gold & Royal Blue Elements + Synced Dotted Contours */}
      <motion.div
        initial={false}
        animate={{
          opacity: isPlayDarkTheme ? 0 : 1,
          transition: { duration: 2.2, ease: "easeInOut" },
        }}
        className="absolute inset-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightBaseSrc}
          alt=""
          fetchPriority="high"
          decoding="sync"
          onError={swapFallback(lightBaseLocal)}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {slots.map((slot) => {
          const asset = MINIGAME_ELEMENTS[slot.id];
          const contour = MINIGAME_DOT_CONTOURS[slot.id];
          if (!asset || !contour) return null;
          return (
            <div
              key={`light-${slot.id}`}
              data-mg-slot={slot.id}
              className="absolute will-change-transform"
              style={{
                left: `${slot.leftPct}%`,
                top: `${slot.topPct}%`,
                width: `${slot.widthPct}%`,
                height: `${slot.heightPct}%`,
                transform: slot.rotateDeg ? `rotate(${slot.rotateDeg}deg)` : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.light}
                alt=""
                fetchPriority="high"
                decoding="async"
                onError={swapFallback(asset.localLight)}
                className="w-full h-full object-contain select-none"
              />
              <DottedContourOverlay contour={contour} mode="light" activePulse={false} />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

