"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export function StaticTypewriter({ text, speed = 20, delay = 0, highlights = [] }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [count, setCount] = useState(0);

  const segments = useMemo(() => {
    if (!highlights.length) {
      return [{ start: 0, end: text.length, cls: "" }];
    }
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    const out = [];
    let cursor = 0;
    for (const h of sorted) {
      const hs = Math.max(cursor, h.start);
      const he = Math.min(text.length, h.end + 1);
      if (hs > cursor) {
        out.push({ start: cursor, end: hs, cls: "" });
      }
      if (he > hs) {
        out.push({ start: hs, end: he, cls: "font-bold underline text-slate-100" });
      }
      cursor = Math.max(cursor, he);
    }
    if (cursor < text.length) {
      out.push({ start: cursor, end: text.length, cls: "" });
    }
    return out;
  }, [text, highlights]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let rafId;
    let startTs = null;
    const timer = setTimeout(() => {
      const step = (ts) => {
        if (startTs === null) startTs = ts;
        const next = Math.min(text.length, Math.floor((ts - startTs) / speed) + 1);
        setCount((prev) => (prev === next ? prev : next));
        if (next < text.length) {
          rafId = requestAnimationFrame(step);
        }
      };
      rafId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [inView, text.length, speed, delay]);

  return (
    <span ref={ref} className="inline-block whitespace-pre-wrap">
      {segments.map((seg, idx) => {
        const splitAt = Math.min(seg.end, Math.max(seg.start, count));
        const visible = text.slice(seg.start, splitAt);
        const hidden = text.slice(splitAt, seg.end);
        return (
          <span key={idx} className={seg.cls || undefined}>
            {visible}
            {hidden ? <span className="opacity-0 select-none">{hidden}</span> : null}
          </span>
        );
      })}
    </span>
  );
}
