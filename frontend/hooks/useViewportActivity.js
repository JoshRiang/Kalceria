"use client";

import { useEffect, useState } from "react";

/**
 * Observes a section ref and reports whether it is within `rootMargin` of the viewport
 * and actively visible on the client screen.
 * Automatically halts background GPU decoders, timers, and data downloads when
 * off-screen or when the tab/phone is minimized/locked.
 */
export function useViewportActivity(targetRef, { rootMargin = "350px 0px", initialActive = false } = {}) {
  const [isActive, setIsActive] = useState(initialActive);

  useEffect(() => {
    let isIntersecting = initialActive;

    const updateState = () => {
      const isDocVisible = typeof document !== "undefined" ? document.visibilityState !== "hidden" : true;
      setIsActive(isIntersecting && isDocVisible);
    };

    const handleVisibilityChange = () => {
      updateState();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });
    }

    const node = targetRef?.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      updateState();
      return () => {
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isIntersecting = entry.isIntersecting;
        }
        updateState();
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [targetRef, rootMargin, initialActive]);

  return isActive;
}

