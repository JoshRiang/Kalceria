"use client";

import { useEffect, useRef } from "react";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import {
  computeCoverCropRect,
  computeResponsiveIntroGrid,
} from "./introVideoGridLayout";
import {
  ensureIntroVideoPool,
  subscribeIntroVideoPool,
  releaseIntroVideoPoolSubscriber,
} from "./videoPool";

const TARGET_FRAME_INTERVAL_MS = 33; // Smooth ~30fps canvas video blit to keep mobile & desktop ice-cold

export function MCUVideoGridCanvas({ active, seedSalt = "base" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const random = createRuntimeSeededRandom(`intro-car-grid-v2-${seedSalt}`);
    let grid = computeResponsiveIntroGrid(window.innerWidth, window.innerHeight);

    subscribeIntroVideoPool();
    let videos = ensureIntroVideoPool(grid.activeVideoCount);

    const buildAssignments = (totalCells, videoCount) =>
      Array.from({ length: totalCells }, (_, idx) =>
        videoCount > 0 ? (idx + Math.floor(random() * videoCount)) % videoCount : 0
      );

    let cellAssignments = buildAssignments(grid.totalCells, videos.length);

    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const nextGrid = computeResponsiveIntroGrid(w, h);
      if (nextGrid.cols !== grid.cols || nextGrid.rows !== grid.rows) {
        grid = nextGrid;
        videos = ensureIntroVideoPool(grid.activeVideoCount);
        cellAssignments = buildAssignments(grid.totalCells, videos.length);
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
          // Gently swap 1-2 car nodes per beat so clips remain legible and cinematic
          const flips = Math.min(2, Math.max(1, Math.floor(random() * 2) + 1));
          for (let i = 0; i < flips; i++) {
            const cellIdx = Math.floor(random() * grid.totalCells);
            cellAssignments[cellIdx] = Math.floor(random() * videos.length);
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
            let v = videos[cellAssignments[cellIdx]];
            if (!v || v.readyState < 2) {
              v = videos.find((vid) => vid && vid.readyState >= 2);
            } else if (v.paused && !prefersReducedMotion) {
              v.play().catch(() => {});
            }

            const dx = c * cellW;
            const dy = r * cellH;

            if (v && v.videoWidth > 0 && v.videoHeight > 0) {
              const { sx, sy, sw, sh } = computeCoverCropRect(
                v.videoWidth,
                v.videoHeight,
                cellW,
                cellH
              );
              try {
                ctx.drawImage(v, sx, sy, sw, sh, dx, dy, cellW, cellH);
              } catch {
                // Skip transient decode frame cleanly
              }
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
