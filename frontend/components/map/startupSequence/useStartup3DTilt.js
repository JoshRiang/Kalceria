"use client";

import { useEffect, useRef } from "react";

export function useStartup3DTilt({ showStartup, tiltWrapperRef }) {
  const tiltTargetRef = useRef({ x: 0, y: 0 });
  const tiltCurrentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!showStartup) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(hover: none)").matches
    ) {
      return;
    }

    let tiltRaf = null;
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      tiltTargetRef.current = {
        x: (e.clientX / innerWidth - 0.5) * 20,
        y: (e.clientY / innerHeight - 0.5) * -20,
      };
    };

    const updateTilt = () => {
      const cur = tiltCurrentRef.current;
      const dx = tiltTargetRef.current.x - cur.x;
      const dy = tiltTargetRef.current.y - cur.y;
      if (Math.abs(dx) >= 0.04 || Math.abs(dy) >= 0.04) {
        cur.x += dx * 0.14;
        cur.y += dy * 0.14;
        if (tiltWrapperRef.current) {
          tiltWrapperRef.current.style.transform = `rotateX(${cur.y.toFixed(2)}deg) rotateY(${cur.x.toFixed(2)}deg)`;
        }
      }
      tiltRaf = requestAnimationFrame(updateTilt);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    tiltRaf = requestAnimationFrame(updateTilt);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
    };
  }, [showStartup, tiltWrapperRef]);
}
