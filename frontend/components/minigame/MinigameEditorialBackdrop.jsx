"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getMinigameBaseBgUrls, MINIGAME_ELEMENTS } from "@/lib/pageBgAssets";
import { MINIGAME_DOT_CONTOURS } from "@/lib/minigameDotContours";
import { computeMinigameElementSlots } from "@/lib/pageBgLayout";
import { buildHermesWireGraph } from "@/lib/minigameHermesWires";
import { useResponsiveBgFamily } from "@/hooks/useResponsiveBgFamily";

const SLOT_START_DELAY = {
  book: 0.1,
  compass: 0.22,
  lantern: 0.34,
  globe: 0.46,
  cards: 0.58,
};

function wireStrokeColor(mode, tone, gradId) {
  if (tone === "mix") return `url(#${gradId})`;
  if (mode === "light") {
    return tone === "A" ? "rgba(18, 76, 198, 0.34)" : "rgba(204, 138, 10, 0.38)";
  }
  return tone === "A" ? "rgba(255, 58, 154, 0.42)" : "rgba(255, 214, 64, 0.44)";
}

/**
 * Converts a precomputed dot contour point array into a single smooth closed SVG path
 * plus exact inter-dot arc spacing. Replaces ~100 animated <circle> DOM nodes per element
 * with 1 GPU-friendly <path> (99% fewer animated SVG nodes during Minigame intro).
 */
function buildContourPathData(dots) {
  if (!Array.isArray(dots) || dots.length < 3) {
    return { d: "", step: 12 };
  }
  let perimeter = 0;
  const parts = [`M ${dots[0][0]} ${dots[0][1]}`];
  for (let i = 1; i < dots.length; i++) {
    const dx = dots[i][0] - dots[i - 1][0];
    const dy = dots[i][1] - dots[i - 1][1];
    perimeter += Math.hypot(dx, dy);
    parts.push(`L ${dots[i][0]} ${dots[i][1]}`);
  }
  perimeter += Math.hypot(
    dots[0][0] - dots[dots.length - 1][0],
    dots[0][1] - dots[dots.length - 1][1]
  );
  parts.push("Z");
  const step = Math.max(6.5, perimeter / dots.length);
  return { d: parts.join(" "), step: Number(step.toFixed(2)) };
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
      className="absolute inset-0 z-0 w-full h-full pointer-events-none"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? "rgba(18,76,198,0.36)" : "rgba(255,58,154,0.44)"} />
          <stop offset="100%" stopColor={isLight ? "rgba(204,138,10,0.38)" : "rgba(255,214,64,0.44)"} />
        </linearGradient>
      </defs>

      {/* Pure CSS GPU-friendly path draw-in for Light mode (5 sequential segments, Point A -> Point A); Dark pre-drawn */}
      {graph.wires.map((w) =>
        isLight ? (
          <path
            key={w.id}
            data-wire-segment={w.segment}
            d={w.d}
            pathLength={1}
            fill="none"
            stroke={wireStrokeColor(mode, w.tone, gradId)}
            strokeWidth={w.weight}
            strokeLinecap="round"
            className="mg-hermes-wire"
            style={{ "--wire-delay": `${w.delay}s` }}
          />
        ) : (
          <path
            key={w.id}
            data-wire-segment={w.segment}
            d={w.d}
            fill="none"
            stroke={wireStrokeColor(mode, w.tone, gradId)}
            strokeWidth={w.weight}
            strokeLinecap="round"
          />
        )
      )}
    </svg>
  );
}

function ProgressiveMicroDotContour({ slotId, contour, pathData, mode, activePulse }) {
  const { width, height, dotRadius } = contour;
  const r = Math.max(2.2, Number(dotRadius) || 2.6);
  const strokeW = Number((r * 2).toFixed(2));
  const baseDelay = SLOT_START_DELAY[slotId] ?? 0.2;
  const gradId = `mg-dot-grad-${mode}-${slotId}`;
  const maskId = `mg-dot-mask-${mode}-${slotId}`;
  const isLight = mode === "light";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-micro-dot-ring={slotId}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? "#124cc6" : "#ff3a9a"} />
          <stop offset="50%" stopColor={isLight ? "#d08c0a" : "#ffd640"} />
          <stop offset="100%" stopColor={isLight ? "#124cc6" : "#ff3a9a"} />
        </linearGradient>
        {isLight && (
          <mask id={maskId}>
            <path
              d={pathData.d}
              pathLength={100}
              fill="none"
              stroke="#ffffff"
              strokeWidth={strokeW + 8}
              strokeLinecap="round"
              className="mg-dot-reveal-mask"
              style={{ "--dot-ring-delay": `${baseDelay}s` }}
            />
          </mask>
        )}
      </defs>

      <path
        d={pathData.d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`0.01 ${pathData.step}`}
        mask={isLight ? `url(#${maskId})` : undefined}
        className={activePulse ? "mg-micro-dot-ring mg-micro-dot-pulse" : "mg-micro-dot-ring"}
      />
    </svg>
  );
}

/**
 * Dual-Scheme Hermes-Wired Responsive Editorial Backdrop (V6.1 Optimized):
 * - 2 continuous closed-loop Hermes wires pass smoothly behind all 5 artifacts (Point A -> Point A, zero endpoint dots).
 * - Single-path masked micro-dot contours reduce animated SVG DOM nodes by 99% (~1000 -> 10) for instant intro paint.
 * - Dark layer assets pre-warm lazily after initial Light paint so intro network & main-thread load stays ultra-light.
 */
export function MinigameEditorialBackdrop({ isPlayDarkTheme }) {
  const { width, height, family } = useResponsiveBgFamily();
  const [darkLayerReady, setDarkLayerReady] = useState(Boolean(isPlayDarkTheme));

  useEffect(() => {
    if (isPlayDarkTheme) {
      setDarkLayerReady(true);
      return;
    }
    if (darkLayerReady) return;
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setDarkLayerReady(true);
    };
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 1400 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }
    const timer = setTimeout(enable, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isPlayDarkTheme, darkLayerReady]);

  const elementAspects = useMemo(() => {
    const out = {};
    for (const [id, data] of Object.entries(MINIGAME_DOT_CONTOURS)) {
      out[id] = data.aspect;
    }
    return out;
  }, []);

  const contourPaths = useMemo(() => {
    const out = {};
    for (const [id, data] of Object.entries(MINIGAME_DOT_CONTOURS)) {
      out[id] = buildContourPathData(data.dots);
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
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes kalceriaWireDraw {
          0% { stroke-dashoffset: 1; opacity: 0.12; }
          15% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes kalceriaDotOrbitPulse {
          0%, 100% { opacity: 0.94; }
          50% { opacity: 0.56; }
        }
        .mg-dot-reveal-mask {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: kalceriaDotDrawIn 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: var(--dot-ring-delay, 0s);
        }
        .mg-hermes-wire {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          opacity: 0;
          animation: kalceriaWireDraw 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: var(--wire-delay, 0.42s);
        }
        .mg-micro-dot-ring {
          opacity: 0.94;
        }
        .mg-micro-dot-pulse {
          animation: kalceriaDotOrbitPulse 2.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .mg-dot-reveal-mask,
          .mg-hermes-wire,
          .mg-micro-dot-pulse {
            animation: none !important;
            stroke-dashoffset: 0 !important;
            opacity: 0.94 !important;
          }
        }
      `}</style>

      {/* Playing Layer: Obsidian Base + Pink/Gold Closed-Loop Wires + Copperplate Engravings + Micro-Dots (idle-deferred) */}
      {darkLayerReady && (
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
            loading="lazy"
            fetchPriority="low"
            decoding="async"
            onError={swapFallback(baseUrls.localDark)}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <HermesWireSvg graph={wireGraph} width={width} height={height} mode="dark" />
          {slots.map((slot) => {
            const asset = MINIGAME_ELEMENTS[slot.id];
            const contour = MINIGAME_DOT_CONTOURS[slot.id];
            const pathData = contourPaths[slot.id];
            if (!asset || !contour || !pathData) return null;
            return (
              <div
                key={`dark-${slot.id}`}
                data-mg-slot={slot.id}
                className="absolute z-10"
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
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                  onError={swapFallback(asset.localDark)}
                  className="w-full h-full object-contain select-none"
                />
                <ProgressiveMicroDotContour
                  slotId={slot.id}
                  contour={contour}
                  pathData={pathData}
                  mode="dark"
                  activePulse={isPlayDarkTheme}
                />
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Idle Layer: Crisp White Base + Blue/Gold Closed-Loop Wires (behind artifacts) + Engravings + Micro-Dots */}
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
          decoding="async"
          onError={swapFallback(baseUrls.localLight)}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <HermesWireSvg graph={wireGraph} width={width} height={height} mode="light" />
        {slots.map((slot) => {
          const asset = MINIGAME_ELEMENTS[slot.id];
          const contour = MINIGAME_DOT_CONTOURS[slot.id];
          const pathData = contourPaths[slot.id];
          if (!asset || !contour || !pathData) return null;
          return (
            <div
              key={`light-${slot.id}`}
              data-mg-slot={slot.id}
              className="absolute z-10"
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
                pathData={pathData}
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
