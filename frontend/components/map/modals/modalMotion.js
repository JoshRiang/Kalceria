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

const SENTINEL_KEY = "__kalceriaModalSentinel";
const SENTINEL_RELEASE_DELAY_MS = 60;

const modalStack = [];
let sentinelActive = false;
let ignoredPopStates = 0;
let releaseTimerId = null;
let listenersAttached = false;

function pushSentinel() {
  if (typeof window === "undefined") return;
  try {
    const base =
      window.history.state && typeof window.history.state === "object"
        ? window.history.state
        : {};
    // Ensure base state has __NA: true so Next.js app-router never reloads on popstate traversal
    if (!base.__NA && window.history.replaceState) {
      window.history.replaceState({ ...base, __NA: true }, "", window.location.href);
    }
    window.history.pushState(
      { ...base, __NA: true, [SENTINEL_KEY]: true },
      "",
      window.location.href
    );
    sentinelActive = true;
  } catch {
    sentinelActive = false;
  }
}

function releaseSentinelIfIdle() {
  releaseTimerId = null;
  if (modalStack.length > 0 || !sentinelActive) return;
  sentinelActive = false;
  if (window.history.state && window.history.state[SENTINEL_KEY]) {
    try {
      const cleanState = { ...window.history.state, __NA: true };
      delete cleanState[SENTINEL_KEY];
      if (window.history.replaceState) {
        window.history.replaceState(cleanState, "", window.location.href);
      }
    } catch {
      // fallback
    }
  }
}

function scheduleSentinelRelease() {
  if (releaseTimerId !== null) clearTimeout(releaseTimerId);
  releaseTimerId = setTimeout(releaseSentinelIfIdle, SENTINEL_RELEASE_DELAY_MS);
}

function handleKeyDown(e) {
  if (e.key !== "Escape" || modalStack.length === 0) return;
  const top = modalStack[modalStack.length - 1];
  e.preventDefault();
  e.stopPropagation();
  top.closeRef.current?.();
}

function handlePopState() {
  if (ignoredPopStates > 0) {
    ignoredPopStates -= 1;
    return;
  }
  if (!sentinelActive) return;
  sentinelActive = false;
  const top = modalStack[modalStack.length - 1];
  if (!top) return;
  top.closeRef.current?.();
  if (modalStack.length > 1) {
    pushSentinel();
  }
}

function attachListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("popstate", handlePopState);
  listenersAttached = true;
}

function detachListenersIfIdle() {
  if (!listenersAttached || modalStack.length > 0) return;
  window.removeEventListener("keydown", handleKeyDown, true);
  window.removeEventListener("popstate", handlePopState);
  listenersAttached = false;
}

export function useModalBackClose(active, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const entry = { closeRef };
    modalStack.push(entry);
    attachListeners();

    if (releaseTimerId !== null) {
      clearTimeout(releaseTimerId);
      releaseTimerId = null;
    }
    if (!sentinelActive) pushSentinel();

    return () => {
      const idx = modalStack.indexOf(entry);
      if (idx !== -1) modalStack.splice(idx, 1);
      if (modalStack.length === 0) {
        scheduleSentinelRelease();
        setTimeout(detachListenersIfIdle, SENTINEL_RELEASE_DELAY_MS + 20);
      }
    };
  }, [active]);
}
