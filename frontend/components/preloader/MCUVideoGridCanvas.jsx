"use client";

import { useEffect, useRef } from "react";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import {
  assignUniqueNodeVideos,
  computeCoverCropRect,
  computeResponsiveIntroGrid,
  swapNodeWithUnusedVideo,
} from "./introVideoGridLayout";
import {
  ensureIntroVideoPool,
  subscribeIntroVideoPool,
  releaseIntroVideoPoolSubscriber,
} from "./videoPool";

const TARGET_FRAME_INTERVAL_MS = 33;

export function MCUVideoGridCanvas({ active, seedSalt = "base" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const random = createRuntimeSeededRandom(`intro-car-grid-v3-${seedSalt}`);
    let grid = computeResponsiveIntroGrid(window.innerWidth, window.innerHeight);

    subscribeIntroVideoPool();
    let videos = ensureIntroVideoPool(grid.activeVideoCount);
    // Strict unique per-node assignment: zero duplicate videos across cells
    let cellAssignments = assignUniqueNodeVideos(grid.totalCells, videos.length, random);

    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const nextGrid = computeResponsiveIntroGrid(w, h);
      if (nextGrid.cols !== grid.cols || nextGrid.rows !== grid.rows) {
        grid = nextGrid;
        videos = ensureIntroVideoPool(grid.activeVideoCount);
        cellAssignments = assignUniqueNodeVideos(grid.totalCells, videos.length, random);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const switchInterval = prefersReducedMotion
      ? null
      : setInterval(() => {
          if (!videos.length) return;
          const flips = Math.min(2, Math.max(1, Math.floor(random() * 2) + 1));
          for (let i = 0; i < flips; i++) {
            const cellIdx = Math.floor(random() * grid.totalCells);
            cellAssignments = swapNodeWithUnusedVideo(cellAssignments, cellIdx, videos.length, random);
          }
        }, 850);

    let raf;
    let lastDrawTime = 0;

    const draw = (now = 0) => {
      if (now - lastDrawTime >= TARGET_FRAME_INTERVAL_MS || lastDrawTime === 0) {
        lastDrawTime = now;
        const w = canvas.width;
        const h = canvas.height;
        const { cols, rows } = grid;
        const cellW = w / cols;
        const cellH = h / rows;

        ctx.fillStyle = "#050a14";
        ctx.fillRect(0, 0, w, h);

        let cellIdx = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const v = videos[cellAssignments[cellIdx]];
            const dx = c * cellW;
            const dy = r * cellH;

            if (v && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
              if (v.paused && !prefersReducedMotion) {
                v.play().catch(() => {});
              }
              const { sx, sy, sw, sh } = computeCoverCropRect(
                v.videoWidth,
                v.videoHeight,
                cellW,
                cellH
              );
              try {
                ctx.drawImage(v, sx, sy, sw, sh, dx, dy, cellW, cellH);
              } catch {}
            } else {
              // Clean dark fallback cell while this node's dedicated unique clip buffers (never duplicate another node's video)
              ctx.fillStyle = "#080f1e";
              ctx.fillRect(dx, dy, cellW, cellH);
            }

            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1;
            ctx.strokeRect(dx, dy, cellW, cellH);
            cellIdx++;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", updateSize);
      if (switchInterval) clearInterval(switchInterval);
      cancelAnimationFrame(raf);
      releaseIntroVideoPoolSubscriber();
    };
  }, [active, seedSalt]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 bg-black/50"
    />
  );
}
