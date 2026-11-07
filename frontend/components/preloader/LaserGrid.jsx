"use client";

import { useEffect, useRef } from "react";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";

const LASER_PALETTE = [
  ...Array(30).fill("#FFD700"),
  ...Array(30).fill("#FF00FF"),
  ...Array(20).fill("#FF8C00"),
  ...Array(10).fill("#FFFFFF"),
  ...Array(10).fill("#C0C0C0"),
];

export function LaserGrid({ active, bgColor = "#050a14" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const random = createRuntimeSeededRandom("intro-laser-grid-v1");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width;
    const H = canvas.height;

    const COUNT = 140;
    const lines = Array.from({ length: COUNT }, (_, i) => {
      const horiz = random() > 0.5;
      return {
        horiz,
        delay: (i / COUNT) * 1800,
        drainDelay: ((COUNT - 1 - i) / COUNT) * 900,
        color: LASER_PALETTE[Math.floor(random() * LASER_PALETTE.length)],
        pos: horiz ? random() * H : random() * W,
        thick: random() < 0.15 ? 2.5 : 1,
      };
    });

    const FILL_END = 2000;
    const HOLD_END = 2500;
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
          alpha =
            drainEl < ln.drainDelay
              ? 0.9
              : Math.max(0, 0.9 - (drainEl - ln.drainDelay) / 250);
        }

        if (alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = ln.color;
        ctx.lineWidth = ln.thick;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ln.color;
        ctx.beginPath();
        if (ln.horiz) {
          ctx.moveTo(0, ln.pos);
          ctx.lineTo(W, ln.pos);
        } else {
          ctx.moveTo(ln.pos, 0);
          ctx.lineTo(ln.pos, H);
        }
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
