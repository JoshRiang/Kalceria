"use client";

import { useEffect, useRef } from "react";

export const MODAL_GENIE_BACKDROP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export const MODAL_GENIE_SURFACE = {
  initial: { opacity: 0, scale: 0.78, y: 28 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.19, 1, 0.22, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.82,
    y: 24,
    transition: { duration: 0.2, ease: [0.32, 0, 0.15, 1] },
  },
};

const activeModalStack = [];

export function useModalBackClose(active, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const sentinelId = `kalceria_modal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let hasSentinel = false;
    let isClosingViaHistory = false;

    activeModalStack.push(sentinelId);

    try {
      const nextState = {
        ...(window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {}),
        __kalceriaModalSentinel: sentinelId,
      };
      window.history.pushState(nextState, "", window.location.href);
      hasSentinel = true;
    } catch {
      hasSentinel = false;
    }

    const isTopModal = () =>
      activeModalStack.length > 0 &&
      activeModalStack[activeModalStack.length - 1] === sentinelId;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isTopModal()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        onCloseRef.current?.();
      }
    };

    const handlePopState = () => {
      if (!hasSentinel || !isTopModal()) return;
      if (window.history.state?.__kalceriaModalSentinel === sentinelId) return;
      hasSentinel = false;
      isClosingViaHistory = true;
      onCloseRef.current?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", handlePopState);

      const idx = activeModalStack.lastIndexOf(sentinelId);
      if (idx !== -1) {
        activeModalStack.splice(idx, 1);
      }

      if (
        hasSentinel &&
        !isClosingViaHistory &&
        window.history.state?.__kalceriaModalSentinel === sentinelId
      ) {
        hasSentinel = false;
        try {
          window.history.back();
        } catch {}
      }
    };
  }, [active]);
}
