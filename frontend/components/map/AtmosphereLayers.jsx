"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";



export function VintageLaserGrid({ active, startupProgress }) {
  const canvasRef = useRef(null);
  const progressRef = useRef(startupProgress);

  useEffect(() => {
    progressRef.current = startupProgress;
  }, [startupProgress]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let lines = [];
    const maxLines = 15; // Increased by 20% for energetic visual guidelines

    const spawnLine = () => {
      const isVertical = Math.random() > 0.5;
      const pos = isVertical ? Math.random() * canvas.width : Math.random() * canvas.height;
      const newLine = {
        id: Math.random(),
        isVertical,
        pos,
        opacity: 0,
        targetOpacity: Math.random() * 0.12 + 0.05, // Faint retro draft look
        life: 0,
        maxLife: 100 + Math.random() * 150, // 2-4 seconds
        width: Math.random() > 0.8 ? 1.5 : 0.8,
      };
      if (lines.length < maxLines) {
        lines.push(newLine);
      }
    };

    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.35) { // Spawn rate increased by 20%
        spawnLine();
      }
    }, 200);

    let animationFrame;
    const render = () => {
      const currentProgress = progressRef.current;
      const isDark = currentProgress >= 50;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ─── Faint Drafting Coordinate Grid ─────────────────────────────
      if (isDark) {
        ctx.strokeStyle = "rgba(255, 214, 10, 0.04)"; // Glowing Gold
      } else {
        ctx.strokeStyle = "rgba(128, 128, 128, 0.04)"; // Glowing Grey
      }
      ctx.lineWidth = 0.5;
      const grid = 60;
      for (let x = 0; x < canvas.width; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // ─── Spawning Laser Grid Lines (20% more density) ─────────────────
      lines.forEach((line) => {
        line.life++;
        if (line.life < 25) {
          line.opacity += (line.targetOpacity - line.opacity) * 0.1;
        } else if (line.life > line.maxLife - 25) {
          line.opacity += (0 - line.opacity) * 0.15;
        }

        if (isDark) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = "rgba(255, 195, 0, 0.5)";
          ctx.strokeStyle = `rgba(255, 214, 10, ${line.opacity * 1.6})`;
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(120, 120, 120, 0.4)";
          ctx.strokeStyle = `rgba(80, 80, 80, ${line.opacity * 1.6})`;
        }

        ctx.lineWidth = line.width;
        ctx.beginPath();

        if (line.isVertical) {
          ctx.moveTo(line.pos, 0);
          ctx.lineTo(line.pos, canvas.height);
        } else {
          ctx.moveTo(0, line.pos);
          ctx.lineTo(canvas.width, line.pos);
        }
        ctx.stroke();

        // Dual offset line simulating oscilloscope drawings
        ctx.shadowBlur = 0;
        if (isDark) {
          ctx.strokeStyle = `rgba(255, 195, 0, ${line.opacity * 0.5})`;
        } else {
          ctx.strokeStyle = `rgba(140, 140, 140, ${line.opacity * 0.5})`;
        }
        ctx.lineWidth = line.width * 0.5;
        ctx.beginPath();
        if (line.isVertical) {
          ctx.moveTo(line.pos - 2, 0);
          ctx.lineTo(line.pos - 2, canvas.height);
        } else {
          ctx.moveTo(0, line.pos - 2);
          ctx.lineTo(canvas.width, line.pos - 2);
        }
        ctx.stroke();
      });

      lines = lines.filter((l) => l.life < l.maxLife && l.opacity > 0.002);
      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearInterval(spawnInterval);
      cancelAnimationFrame(animationFrame);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1000]"
      style={{ mixBlendMode: startupProgress < 50 ? "multiply" : "screen" }}
    />
  );
}

export function DominoChevrons({ active, isDark }) {
  const lightColors = ["#000000", "#1f2937", "#4b5563", "#9ca3af", "#e5e7eb", "#ffffff"];
  const darkColors = ["#000000", "#1a0505", "#4c0505", "#991b1b", "#dc2626", "#ef4444"];
  const colors = isDark ? darkColors : lightColors;
  const chevronCount = 18;

  return (
    <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden flex items-center">
      {active && Array.from({ length: chevronCount }).map((_, i) => {
        const colorIndex = Math.floor((i / chevronCount) * colors.length);
        const color = colors[colorIndex];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -100 }}
            animate={{ 
              opacity: isDark ? [0, 0.7, 0] : [0, 0.8, 0],
              x: [-100, 0, 100],
            }}
            transition={{ 
              duration: 2.2, 
              delay: i * 0.1, 
              ease: "circOut" 
            }}
            className="h-[100vh] -ml-[10vw] flex-shrink-0"
            style={{ width: "22vw" }}
          >
            <svg viewBox="0 0 24 24" preserveAspectRatio="none" className="w-full h-full" style={{ color }}>
              <path d="M 0 0 L 12 12 L 0 24 L 8 24 L 20 12 L 8 0 Z" fill="currentColor" />
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}
