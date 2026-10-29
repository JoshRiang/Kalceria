"use client";

import { useEffect, useState } from "react";

/**
 * Observes a section ref and reports whether it is within `rootMargin` of the viewport.
 * Used to pause off-screen video decoders and timers while preserving 100% of DOM layout
 * and animation layers when visible or approaching the viewport.
 */
export function useViewportActivity(targetRef, { rootMargin = "350px 0px", initialActive = false } = {}) {
  const [isActive, setIsActive] = useState(initialActive);

  useEffect(() => {
    const node = targetRef?.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsActive(entry.isIntersecting);
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [targetRef, rootMargin]);

  return isActive;
}

