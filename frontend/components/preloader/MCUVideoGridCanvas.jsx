"use client";

import { useEffect, useRef } from "react";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import {
  ensureIntroVideoPool,
  subscribeIntroVideoPool,
  releaseIntroVideoPoolSubscriber,
} from "./videoPool";

export function MCUVideoGridCanvas({ active, seedSalt = "base" }) {
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

    subscribeIntroVideoPool();
    const videos = ensureIntroVideoPool();

    let raf;
    const cols = window.innerWidth > 768 ? 7 : 6;
    const rows = window.innerWidth > 768 ? 6 : 7;
    const totalCells = cols * rows;
    const random = createRuntimeSeededRandom(`intro-video-grid-v1-${seedSalt}`);

    const cellAssignments = Array.from({ length: totalCells }).map((_, idx) =>
      videos.length > 0 ? (idx + Math.floor(random() * videos.length)) % videos.length : 0
    );

    const switchInterval = setInterval(() => {
      if (!videos.length) return;
      const flips = Math.floor(random() * 6) + 1;
      for (let i = 0; i < flips; i++) {
        const cellIdx = Math.floor(random() * totalCells);
        cellAssignments[cellIdx] = Math.floor(random() * videos.length);
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
            v = videos.find((vid) => vid && vid.readyState >= 2);
          } else if (v.paused) {
            v.play().catch(() => {});
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
