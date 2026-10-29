import { useEffect, useRef } from "react";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";

// ─── Golden Spiral Silk Threads — Tight Cluster ───────────────────────────────
// ALL threads spawn from a tight point at middle-left (within ±20px of center).
// They fan out as they travel right via amplitude/freq differences.
// Colors: white, magenta, gold — per thread.
// On reaching right edge: thread completely dissolves (full fade to 0).

export function usePhoenixAurora(canvasRef, active, duration = 5000) {
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const TOTAL_MS = duration;
    const FADE_IN_MS = 600;
    const FADE_OUT_START = duration - 1400;

    function globalEnv(el) {
      if (el < FADE_IN_MS) return el / FADE_IN_MS;
      if (el < FADE_OUT_START) return 1.0;
      return Math.max(0, 1 - (el - FADE_OUT_START) / (TOTAL_MS - FADE_OUT_START));
    }

    const PALETTES = {
      gold: { tail: "140,90,0", mid: "218,165,32", head: "255,240,160" },
      magenta: { tail: "100,0,80", mid: "220,0,180", head: "255,180,255" },
      white: { tail: "80,80,100", mid: "200,200,220", head: "255,255,255" },
    };

    const random = createRuntimeSeededRandom("phoenix-aurora-threads-v1");

    function buildThreads(W, H) {
      const CY = H * 0.5;
      const R = () => random() * Math.PI * 2;

      const left = [
        { dir: 1, yBase: CY, amp: H * 0.035, freq: 5.2, phase: R(), speed: 0.72, thick: 2.2, delay: 0, pal: "gold" },
        { dir: 1, yBase: CY, amp: H * 0.042, freq: 4.5, phase: R(), speed: 0.55, thick: 2.0, delay: 120, pal: "magenta" },
        { dir: 1, yBase: CY, amp: H * 0.028, freq: 6.1, phase: R(), speed: 0.88, thick: 1.8, delay: 60, pal: "white" },
        { dir: 1, yBase: CY, amp: H * 0.050, freq: 3.8, phase: R(), speed: 0.38, thick: 1.6, delay: 300, pal: "gold" },
        { dir: 1, yBase: CY, amp: H * 0.045, freq: 3.5, phase: R(), speed: 0.25, thick: 1.5, delay: 480, pal: "magenta" },
        { dir: 1, yBase: CY, amp: H * 0.018, freq: 9.8, phase: R(), speed: 1.10, thick: 0.9, delay: 20, pal: "white" },
        { dir: 1, yBase: CY, amp: H * 0.022, freq: 8.5, phase: R(), speed: 0.95, thick: 0.8, delay: 80, pal: "gold" },
        { dir: 1, yBase: CY, amp: H * 0.020, freq: 10.2, phase: R(), speed: 1.20, thick: 0.7, delay: 0, pal: "magenta" },
        { dir: 1, yBase: CY, amp: H * 0.060, freq: 2.9, phase: R(), speed: 0.18, thick: 1.3, delay: 600, pal: "white" },
        { dir: 1, yBase: CY, amp: H * 0.055, freq: 3.1, phase: R(), speed: 0.20, thick: 1.2, delay: 700, pal: "gold" },
        { dir: 1, yBase: CY, amp: H * 0.016, freq: 12.0, phase: R(), speed: 1.40, thick: 0.6, delay: 10, pal: "white" },
      ];

      const right = [
        { dir: -1, yBase: CY, amp: H * 0.045, freq: 6.5, phase: R(), speed: 0.68, thick: 2.2, delay: 50, pal: "white" },
        { dir: -1, yBase: CY, amp: H * 0.052, freq: 5.5, phase: R(), speed: 0.50, thick: 2.0, delay: 150, pal: "gold" },
        { dir: -1, yBase: CY, amp: H * 0.035, freq: 7.2, phase: R(), speed: 0.85, thick: 1.8, delay: 100, pal: "magenta" },
        { dir: -1, yBase: CY, amp: H * 0.060, freq: 4.2, phase: R(), speed: 0.35, thick: 1.6, delay: 280, pal: "white" },
        { dir: -1, yBase: CY, amp: H * 0.055, freq: 4.8, phase: R(), speed: 0.22, thick: 1.5, delay: 520, pal: "gold" },
        { dir: -1, yBase: CY, amp: H * 0.025, freq: 11.5, phase: R(), speed: 1.15, thick: 0.9, delay: 10, pal: "magenta" },
        { dir: -1, yBase: CY, amp: H * 0.030, freq: 9.5, phase: R(), speed: 0.90, thick: 0.8, delay: 90, pal: "white" },
        { dir: -1, yBase: CY, amp: H * 0.075, freq: 3.2, phase: R(), speed: 0.15, thick: 1.3, delay: 650, pal: "gold" },
        { dir: -1, yBase: CY, amp: H * 0.020, freq: 13.0, phase: R(), speed: 1.35, thick: 0.6, delay: 30, pal: "magenta" },
      ];

      return [...left, ...right].map((t) => ({ ...t, progress: 0 }));
    }

    const threads = buildThreads(canvas.width, canvas.height);
    const SEG = 96;
    const ptsX = new Float32Array(SEG + 1);
    const ptsY = new Float32Array(SEG + 1);

    function drawThread(th, gEnv, el) {
      const { dir, yBase, amp, freq, phase, progress, thick, pal } = th;
      if (progress <= 0.005) return;

      const p = PALETTES[pal];
      const W = canvas.width;
      const headDist = Math.min(progress * W, W);
      const timeFlow = el / 5000;

      const reachFade = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.15) : 1.0;
      const env = gEnv * reachFade;
      if (env < 0.005) return;

      for (let i = 0; i <= SEG; i++) {
        const dist = (i / SEG) * headDist;
        const x = dir === 1 ? dist : W - dist;
        ptsX[i] = x;
        ptsY[i] = yBase + amp * Math.sin(freq * (x / W) * Math.PI * 2 + phase + timeFlow * 1.2);
      }

      const tailX = dir === 1 ? 0 : W;
      const headX = dir === 1 ? headDist : W - headDist;

      const tracePolyline = () => {
        ctx.beginPath();
        ctx.moveTo(ptsX[0], ptsY[0]);
        for (let i = 1; i <= SEG; i++) ctx.lineTo(ptsX[i], ptsY[i]);
      };

      // Additive glow halo pass (replaces expensive CPU software shadowBlur)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = thick * 5.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const glow = ctx.createLinearGradient(tailX, 0, headX, 0);
      glow.addColorStop(0, `rgba(${p.tail},0)`);
      glow.addColorStop(0.12, `rgba(${p.mid},${env * 0.16})`);
      glow.addColorStop(0.70, `rgba(${p.mid},${env * 0.28})`);
      glow.addColorStop(0.92, `rgba(${p.head},${env * 0.56})`);
      glow.addColorStop(1, "rgba(255,255,255,0)");

      ctx.strokeStyle = glow;
      tracePolyline();
      ctx.stroke();

      // Crisp main thread pass
      ctx.lineWidth = thick;
      const main = ctx.createLinearGradient(tailX, 0, headX, 0);
      main.addColorStop(0, `rgba(${p.tail},0)`);
      main.addColorStop(0.08, `rgba(${p.mid},${env * 0.38})`);
      main.addColorStop(0.60, `rgba(${p.mid},${env * 0.84})`);
      main.addColorStop(0.88, `rgba(${p.head},${env * 0.96})`);
      main.addColorStop(1, "rgba(255,255,255,0)");

      ctx.strokeStyle = main;
      tracePolyline();
      ctx.stroke();

      if (progress < 0.92) {
        const hx = ptsX[SEG];
        const hy = ptsY[SEG];
        const sr = thick * 3.5;
        const srd = ctx.createRadialGradient(hx, hy, 0, hx, hy, sr);
        srd.addColorStop(0, `rgba(255,255,255,${env})`);
        srd.addColorStop(0.4, `rgba(${p.head},${env * 0.7})`);
        srd.addColorStop(1, `rgba(${p.mid},0)`);
        ctx.fillStyle = srd;
        ctx.beginPath();
        ctx.arc(hx, hy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    let startTs = null;
    let lastTs = null;
    let cancelled = false;

    function draw(ts) {
      if (cancelled) return;
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
      lastTs = ts;

      if (elapsed > TOTAL_MS + 300) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gEnv = globalEnv(elapsed);

      for (const th of threads) {
        const threadElapsed = Math.max(0, elapsed - th.delay);
        if (threadElapsed <= 0) continue;
        if (th.progress < 1.0) {
          th.progress = Math.min(th.progress + th.speed * (dt / 1000), 1.0);
        }
        drawThread(th, gEnv, elapsed);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    // Yield first paint frame so LCP & hydration commit without contention
    const kickTimer = setTimeout(() => {
      if (!cancelled) {
        rafRef.current = requestAnimationFrame(draw);
      }
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(kickTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      startTs = null;
      lastTs = null;
    };
  }, [active, duration, canvasRef]);
}
