"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getMinigameBaseBgUrls, MINIGAME_ELEMENTS } from "@/lib/pageBgAssets";
import { MINIGAME_DOT_CONTOURS } from "@/lib/minigameDotContours";
import { computeMinigameElementSlots } from "@/lib/pageBgLayout";
import { buildHermesWireGraph } from "@/lib/minigameHermesWires";
import { useResponsiveBgFamily } from "@/hooks/useResponsiveBgFamily";

const LIGHT_A = [18, 76, 198];
const LIGHT_B = [208, 140, 10];
const DARK_A = [255, 58, 154];
const DARK_B = [255, 214, 64];

const SLOT_START_DELAY = {
  book: 0.14,
  compass: 0.28,
  lantern: 0.42,
  globe: 0.56,
  cards: 0.7,
};

function lerpRgb(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function wireStrokeColor(mode, tone, gradId) {
  if (tone === "mix") return `url(#${gradId})`;
  if (mode === "light") {
    return tone === "A" ? "rgba(18, 76, 198, 0.34)" : "rgba(204, 138, 10, 0.38)";
  }
  return tone === "A" ? "rgba(255, 58, 154, 0.42)" : "rgba(255, 214, 64, 0.44)";
}

function HermesWireSvg({ graph, width, height, mode }) {
  const gradId = `hermes-wire-grad-${mode}`;
  const isLight = mode === "light";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      data-hermes-wires={mode}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? "rgba(18,76,198,0.34)" : "rgba(255,58,154,0.44)"} />
          <stop offset="100%" stopColor={isLight ? "rgba(204,138,10,0.36)" : "rgba(255,214,64,0.44)"} />
        </linearGradient>
      </defs>

      {graph.wires.map((w) => (
        <motion.path
          key={w.id}
          d={w.d}
          fill="none"
          stroke={wireStrokeColor(mode, w.tone, gradId)}
          strokeWidth={w.weight}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.05, delay: w.delay, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}

      {graph.junctions.map((pt, i) => (
        <motion.circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r={pt.subtle ? 2 : 2.6}
          fill={isLight ? (pt.tone === "B" ? "#cc8a0a" : "#124cc6") : (pt.tone === "B" ? "#ffd640" : "#ff3a9a")}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: pt.subtle ? 0.48 : 0.72, scale: 1 }}
          transition={{ duration: 0.35, delay: pt.delay + 0.55 }}
        />
      ))}
    </svg>
  );
}

function ProgressiveMicroDotContour({ slotId, contour, mode, activePulse }) {
  const { width, height, dotRadius, dots } = contour;
  const colA = mode === "light" ? LIGHT_A : DARK_A;
  const colB = mode === "light" ? LIGHT_B : DARK_B;
  const total = dots.length || 1;
  const r = Math.max(2.2, Number(dotRadius) || 2.6);
  const baseDelay = SLOT_START_DELAY[slotId] ?? 0.2;
  const drawDuration = 1.1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-micro-dot-ring={slotId}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    >
      {dots.map(([x, y], idx) => {
        const frac = idx / total;
        const phase = 0.5 + 0.5 * Math.sin(frac * Math.PI * 2);
        const fill = lerpRgb(colA, colB, phase);
        const drawDelay = (baseDelay + frac * drawDuration).toFixed(3);
        const pulseDelay = (frac * 2.6).toFixed(2);
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={r}
            fill={fill}
            className={activePulse ? "mg-micro-dot mg-micro-dot-pulse" : "mg-micro-dot"}
            style={{
              "--dot-draw-delay": `${drawDelay}s`,
              "--dot-pulse-delay": `${pulseDelay}s`,
            }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Dual-Scheme Hermes-Wired Responsive Editorial Backdrop (V6.0):
 * - 5 uncropped copperplate artifacts connected into one unified schematic via curved Hermes wires.
 * - Dense half-size micro-dots progressively draw around every artifact (. .. ... -> closed loop).
 * - Bespoke base & layout topologies across HP, iPad/Tablet, Half-Desktop, Desktop & Ultrawide.
 */
export function MinigameEditorialBackdrop({ isPlayDarkTheme }) {
  const { width, height, family } = useResponsiveBgFamily();

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

  const wireGraph = useMemo(
    () => buildHermesWireGraph(slots, width, height),
    [slots, width, height]
  );

  const baseUrls = useMemo(() => getMinigameBaseBgUrls(family), [family]);

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
        @keyframes kalceriaDotDrawIn {
          0% { opacity: 0; transform: scale(0.15); }
          65% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.94; transform: scale(1); }
        }
        @keyframes kalceriaDotOrbitPulse {
          0%, 100% { opacity: 0.96; }
          50% { opacity: 0.44; }
        }
        .mg-micro-dot {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: kalceriaDotDrawIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: var(--dot-draw-delay, 0s);
        }
        .mg-micro-dot-pulse {
          animation:
            kalceriaDotDrawIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards var(--dot-draw-delay, 0s),
            kalceriaDotOrbitPulse 2.6s ease-in-out infinite var(--dot-pulse-delay, 0s);
        }
        @media (prefers-reduced-motion: reduce) {
          .mg-micro-dot,
          .mg-micro-dot-pulse {
            animation: none !important;
            opacity: 0.92 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Playing Layer: Obsidian Base + Pink/Gold Hermes Wires + Copperplate Engravings + Micro-Dots */}
      <motion.div
        initial={false}
        animate={{
          opacity: isPlayDarkTheme ? 0.95 : 0,
          transition: { duration: 2.2, ease: "easeInOut" },
        }}
        className="absolute inset-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={baseUrls.dark}
          alt=""
          loading="eager"
          decoding="async"
          onError={swapFallback(baseUrls.localDark)}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <HermesWireSvg graph={wireGraph} width={width} height={height} mode="dark" />
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
              <ProgressiveMicroDotContour
                slotId={slot.id}
                contour={contour}
                mode="dark"
                activePulse={isPlayDarkTheme}
              />
            </div>
          );
        })}
      </motion.div>

      {/* Idle Layer: Crisp White Base + Blue/Gold Hermes Wires + Copperplate Engravings + Micro-Dots */}
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
          src={baseUrls.light}
          alt=""
          fetchPriority="high"
          decoding="sync"
          onError={swapFallback(baseUrls.localLight)}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <HermesWireSvg graph={wireGraph} width={width} height={height} mode="light" />
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
              <ProgressiveMicroDotContour
                slotId={slot.id}
                contour={contour}
                mode="light"
                activePulse={false}
              />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
