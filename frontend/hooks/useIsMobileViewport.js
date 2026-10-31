"use client";

import { useSyncExternalStore } from "react";

function subscribeToResize(callback) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getSnapshot() {
  return window.innerWidth < 768;
}

function getTabletSnapshot() {
  return window.innerWidth >= 768 && window.innerWidth < 1280;
}

function getMobileOrTabletSnapshot() {
  return window.innerWidth < 1280;
}

function getServerSnapshot() {
  return false;
}

/** Tracks the existing 768px mobile breakpoint and cleans up its resize listener. */
export function useIsMobileViewport() {
  return useSyncExternalStore(subscribeToResize, getSnapshot, getServerSnapshot);
}

/** Tracks the iPad / tablet family breakpoint (768px to 1279px). */
export function useIsTabletViewport() {
  return useSyncExternalStore(subscribeToResize, getTabletSnapshot, getServerSnapshot);
}

/** Tracks mobile and iPad / tablet family (< 1280px). */
export function useIsMobileOrTabletViewport() {
  return useSyncExternalStore(subscribeToResize, getMobileOrTabletSnapshot, getServerSnapshot);
}
