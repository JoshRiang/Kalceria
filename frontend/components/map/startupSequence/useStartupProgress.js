"use client";

import { useState, useEffect, useRef } from "react";
import {
  activeStartupProgress,
  activeStartupIsDark,
  activeStartupDarkTimestamp,
  setActiveStartupProgress,
  setActiveStartupIsDark,
  setActiveStartupDarkTimestamp,
  resetActiveStartupSession,
} from "./startupConstants";

export function useStartupProgress({
  showStartup,
  authReady = false,
  mapEngineReady = false,
  isReady = false,
  onComplete,
  barFillRef,
  percentTextRef,
}) {
  const [isDark, setIsDark] = useState(() => activeStartupIsDark);
  const isDarkRef = useRef(activeStartupIsDark);
  const authReadyRef = useRef(authReady);
  const mapEngineReadyRef = useRef(mapEngineReady);
  const isReadyRef = useRef(isReady);
  const onCompleteRef = useRef(onComplete);
  const progressValRef = useRef(activeStartupProgress);
  const completedRef = useRef(false);

  // Keep refs synchronized without EVER tearing down or resetting the progress loop on parent re-renders
  useEffect(() => {
    authReadyRef.current = authReady;
  }, [authReady]);

  useEffect(() => {
    mapEngineReadyRef.current = mapEngineReady;
  }, [mapEngineReady]);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Precision Monotonic Staged Progress Engine (0 -> 30 -> 60 -> 88 -> 100, Zero Jitter, Zero Reset)
  useEffect(() => {
    if (!showStartup) {
      resetActiveStartupSession();
      progressValRef.current = 0;
      isDarkRef.current = false;
      return;
    }

    let rafId = null;
    let completionTimer = null;
    let lastTime = performance.now();
    let finalSweepStartTime = null;
    let progressAtFinalSweep = 0;
    completedRef.current = false;

    // Resume from activeStartupProgress so StrictMode/hydration never drops 60% -> 0%
    progressValRef.current = activeStartupProgress;
    isDarkRef.current = activeStartupIsDark;
    if (activeStartupIsDark) {
      setIsDark(true);
    }

    const initialRatio = Math.min(1, Math.max(0, progressValRef.current / 100));
    const initialInt = Math.min(100, Math.floor(progressValRef.current + 0.0001));
    let lastPercentInt = initialInt;

    if (barFillRef.current) {
      barFillRef.current.style.transform = `scaleX(${initialRatio})`;
    }
    if (percentTextRef.current) {
      percentTextRef.current.textContent = String(initialInt);
    }

    const tick = (now) => {
      if (completedRef.current) return;
      const dt = Math.min(Math.max((now - lastTime) / 1000, 0.001), 0.05);
      lastTime = now;

      const current = progressValRef.current;
      const hasAuth = authReadyRef.current;
      const hasMapEngine = mapEngineReadyRef.current;
      const ready = isReadyRef.current;

      let computedNext = current;

      // Only enter Stage 4 (final sweep to 100%) after we have progressed through Stages 1-2 (>= 68%)
      // AND backend/map are ready. This guarantees authentic staged progression (0 -> 30 -> 60 -> 88 -> 100).
      if (ready && current >= 68) {
        if (finalSweepStartTime === null) {
          finalSweepStartTime = now;
          progressAtFinalSweep = current;
        }
        const elapsed = (now - finalSweepStartTime) / 1000;
        const sweepDuration = 0.95;
        const t = Math.min(1, elapsed / sweepDuration);
        const eased = 1 - Math.pow(1 - t, 2.2);
        computedNext = Math.min(
          100,
          progressAtFinalSweep + (100 - progressAtFinalSweep) * eased
        );
        if (computedNext < current + 18 * dt) {
          computedNext = Math.min(100, current + 18 * dt);
        }
      } else {
        // Authentic Staged Progression:
        // Stage 1: 0% -> 30% (Session & Auth Handshake)
        // Stage 2: 30% -> 60% (Map Tiles & Coki Hero Entrance at 50%)
        // Stage 3: 60% -> 88% (Live Telemetry & Kalcerians Sync; holds at ~88% during cold start)
        let speed;
        if (current < 27) {
          speed = 42; // Brisk climb 0 -> 27%
        } else if (current < 32) {
          speed = 15; // Brief, authentic stage inflection around 30%
        } else if (current < 56) {
          speed = hasAuth || hasMapEngine ? 36 : 28; // Smoothly cross 50% (Coki entrance) toward 60%
        } else if (current < 62) {
          speed = 14; // Brief, authentic stage inflection around 60%
        } else if (current < 84) {
          speed = ready ? 32 : hasMapEngine || hasAuth ? 20 : 14; // Climb 60% -> 84%
        } else {
          // Cold-start hold ceiling around 88-90% while waiting for backend telemetry
          speed = Math.max(0.2, (89.5 - current) * 0.75);
        }
        const stageCeiling = ready ? 95 : 89.5;
        computedNext = Math.min(stageCeiling, current + speed * dt);
      }

      // STRICT MONOTONIC CLAMP: Progress can NEVER decrease or jump backward
      const next = Math.min(100, Math.max(current, computedNext));
      progressValRef.current = next;
      setActiveStartupProgress(next);

      if (barFillRef.current) {
        barFillRef.current.style.transform = `scaleX(${Math.min(1, next / 100)})`;
      }
      const roundInt = Math.min(100, Math.floor(next + 0.0001));
      if (roundInt !== lastPercentInt && percentTextRef.current) {
        lastPercentInt = roundInt;
        percentTextRef.current.textContent = String(roundInt);
      }

      // Single one-way threshold at 50% for dark theme & Coki entrance (never resets to false)
      if (next >= 50 && !isDarkRef.current) {
        isDarkRef.current = true;
        setActiveStartupIsDark(true);
        if (activeStartupDarkTimestamp === null) {
          setActiveStartupDarkTimestamp(now);
        }
        setIsDark(true);
      }

      const darkElapsed =
        activeStartupDarkTimestamp !== null
          ? now - activeStartupDarkTimestamp
          : 0;

      if (ready && darkElapsed >= 1350 && next >= 99.8) {
        completedRef.current = true;
        if (barFillRef.current) barFillRef.current.style.transform = "scaleX(1)";
        if (percentTextRef.current) percentTextRef.current.textContent = "100";
        completionTimer = setTimeout(() => {
          resetActiveStartupSession();
          onCompleteRef.current?.();
        }, 120);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (completionTimer) clearTimeout(completionTimer);
    };
  }, [showStartup, barFillRef, percentTextRef]);

  return { isDark, progressValRef };
}
