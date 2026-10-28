"use client";

import { useSyncExternalStore } from "react";

function subscribeToResize(callback) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getSnapshot() {
  return window.innerWidth < 768;
}

function getServerSnapshot() {
  return false;
}

/** Tracks the existing 768px mobile breakpoint and cleans up its resize listener. */
export function useIsMobileViewport() {
  return useSyncExternalStore(subscribeToResize, getSnapshot, getServerSnapshot);
}
