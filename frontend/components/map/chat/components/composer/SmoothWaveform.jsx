"use client";

import { useEffect, useRef } from "react";

const BAR_WIDTH = 1.5;
const BAR_GAP = 2.5;
const BAR_STEP = BAR_WIDTH + BAR_GAP;
const MIN_BAR_HEIGHT = 3;
const MAX_BAR_HEIGHT = 22;
const ATTACK_TAU_MS = 55;
const RELEASE_TAU_MS = 130;
const EDGE_FADE_STEPS = 3;
const MAX_TRACKED_BARS = 96;

function drawBar(ctx, x, y, w, h) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, w / 2);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, w, h);
}

/**
 * Canvas voice-note waveform that scrolls continuously (sub-pixel, 60fps) between samples
 * and eases every bar toward its target level, so new audio levels glide in instead of stepping.
 * `samples` is an array of 0-100 levels; every new array reference means one new sample was appended.
 */
export function SmoothWaveform({
  samples,
  isMapDark = true,
  sampleIntervalMs = 160,
  className = "",
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef({
    bars: [],
    lastSampleAt: 0,
    avgGapMs: 0,
    lastSamplesRef: null,
    width: 0,
    height: 0,
    dpr: 1,
  });
  const colorRef = useRef(isMapDark);
  colorRef.current = isMapDark;
  const intervalRef = useRef(sampleIntervalMs);
  intervalRef.current = sampleIntervalMs;

  useEffect(() => {
    const st = stateRef.current;
    if (!Array.isArray(samples) || samples.length === 0) {
      st.bars = [];
      st.lastSamplesRef = samples;
      return;
    }
    if (st.lastSamplesRef === samples) return;
    st.lastSamplesRef = samples;

    const value = Number(samples[samples.length - 1]);
    const target = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    st.bars.push({ target, shown: 0 });
    if (st.bars.length > MAX_TRACKED_BARS) {
      st.bars.splice(0, st.bars.length - MAX_TRACKED_BARS);
    }
    const arrivedAt = performance.now();
    if (st.lastSampleAt > 0) {
      const gap = arrivedAt - st.lastSampleAt;
      if (gap > 20 && gap < 800) {
        st.avgGapMs = st.avgGapMs ? st.avgGapMs * 0.8 + gap * 0.2 : gap;
      }
    }
    st.lastSampleAt = arrivedAt;
  }, [samples]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const st = stateRef.current;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      st.width = Math.max(1, Math.round(rect.width));
      st.height = Math.max(1, Math.round(rect.height));
      st.dpr = dpr;
      canvas.width = Math.round(st.width * dpr);
      canvas.height = Math.round(st.height * dpr);
      canvas.style.width = `${st.width}px`;
      canvas.style.height = `${st.height}px`;
    };
    resize();

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(resize);
      observer.observe(wrap);
    }

    const ctx = canvas.getContext("2d");
    let rafId = 0;
    let prevFrameAt = performance.now();

    const frame = (now) => {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(64, Math.max(1, now - prevFrameAt));
      prevFrameAt = now;
      if (!ctx || !st.width) return;

      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.width, st.height);

      const fillRgb = colorRef.current ? "255,255,255" : "0,0,0";
      const slots = Math.max(8, Math.floor((st.width + BAR_GAP) / BAR_STEP));
      const totalWidth = slots * BAR_STEP - BAR_GAP;
      const startX = (st.width - totalWidth) / 2;
      const rightX = startX + (slots - 1) * BAR_STEP;
      const centerY = st.height / 2;

      const gapMs = st.avgGapMs || intervalRef.current;
      const progress = Math.min(1, Math.max(0, (now - st.lastSampleAt) / gapMs));
      const hasLive = st.bars.length > 0;

      for (const bar of st.bars) {
        const tau = bar.target >= bar.shown ? ATTACK_TAU_MS : RELEASE_TAU_MS;
        bar.shown += (bar.target - bar.shown) * (1 - Math.exp(-dt / tau));
      }

      const maxH = Math.min(MAX_BAR_HEIGHT, st.height);
      const fadeSpan = EDGE_FADE_STEPS * BAR_STEP;

      for (let k = 0; k < slots; k += 1) {
        const barIdx = st.bars.length - 1 - k;
        const x = rightX - k * BAR_STEP - progress * BAR_STEP + BAR_STEP;
        if (x + BAR_WIDTH < startX - 1 || x > startX + totalWidth + 1) continue;

        let level = 0;
        if (barIdx >= 0) {
          level = st.bars[barIdx].shown;
        } else if (!hasLive) {
          level = 6;
        }
        const h = Math.max(MIN_BAR_HEIGHT, (level / 100) * maxH);

        const distLeft = x - startX;
        const distRight = startX + totalWidth - (x + BAR_WIDTH);
        const edge = Math.min(distLeft, distRight);
        const alpha = Math.max(0, Math.min(1, edge / fadeSpan)) * 0.8;
        if (alpha <= 0.01) continue;

        ctx.fillStyle = `rgba(${fillRgb},${alpha.toFixed(3)})`;
        drawBar(ctx, x, centerY - h / 2, BAR_WIDTH, h);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
}
