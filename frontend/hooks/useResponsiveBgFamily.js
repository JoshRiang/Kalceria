"use client";

import { useSyncExternalStore } from "react";
import {
  resolveResponsiveBgFamily,
  resolveMinigameLayoutProfile,
} from "@/lib/pageBgLayout";

const SERVER_VIEWPORT = {
  width: 1280,
  height: 720,
  family: "desktop",
  minigameProfile: "desktop",
};

let cachedViewport = SERVER_VIEWPORT;

function subscribeToViewport(callback) {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

function getViewportSnapshot() {
  const width = window.innerWidth || 1280;
  const height = window.innerHeight || 720;
  if (cachedViewport.width === width && cachedViewport.height === height) {
    return cachedViewport;
  }
  cachedViewport = {
    width,
    height,
    family: resolveResponsiveBgFamily(width, height),
    minigameProfile: resolveMinigameLayoutProfile(width, height),
  };
  return cachedViewport;
}

function getServerSnapshot() {
  return SERVER_VIEWPORT;
}

/**
 * Tracks exact viewport dimensions and canonical 4-family responsive background bucket
 * ('mobile' | 'tablet' | 'half' | 'desktop') across all device families with zero zombie listeners.
 */
export function useResponsiveBgFamily() {
  return useSyncExternalStore(subscribeToViewport, getViewportSnapshot, getServerSnapshot);
}

