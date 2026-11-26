"use client";

/**
 * Focus Mode AI Voice Co-Pilot Hook (Iteration 5/5).
 *
 * Hydrates the compact 26 KB trained Pulau Jawa Vector-Attention weights once,
 * runs < 0.1 ms real-time inference on every curated GPS tick inside Focus Mode,
 * and drives the Live Subtitle Ticker + Dual-Engine Audio Playback.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchVoiceNavBundle } from "@/lib/api";
import { createClientAttentionEngine } from "./clientAttentionCore";
import {
  createClientTriggerState,
  evaluateClientNavTick,
} from "./clientTriggerMachine";
import {
  speakNavigationInstruction,
  stopVoiceNavPlayback,
  unlockVoiceNavAudio,
} from "./voiceAudioPlayer";

const VOICE_PREF_KEY = "kalceria_voice_nav_enabled";

function readInitialVoiceEnabled() {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(VOICE_PREF_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function useBlendVoiceCoPilot({ activeBlend, isFocusMode }) {
  const [voiceEnabled, setVoiceEnabled] = useState(readInitialVoiceEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEngineMode, setVoiceEngineMode] = useState("loading");
  const [liveSubtitle, setLiveSubtitle] = useState(null);
  const [upcomingStep, setUpcomingStep] = useState(null);

  const engineRef = useRef(null);
  const triggerStateRef = useRef(createClientTriggerState());
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  // Listen to hardware audio speaking state for animated HUD wave indicator
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onSpeaking = (ev) => setIsSpeaking(Boolean(ev?.detail?.speaking));
    window.addEventListener("kalceria:voice-nav-speaking", onSpeaking);
    return () => window.removeEventListener("kalceria:voice-nav-speaking", onSpeaking);
  }, []);

  // Hydrate compact 26 KB Pulau Jawa Vector-Attention bundle once when joined into Blend
  useEffect(() => {
    if (!activeBlend?.isJoined || engineRef.current) return undefined;
    let cancelled = false;
    fetchVoiceNavBundle()
      .then((bundle) => {
        if (cancelled || !bundle?.weights || !bundle?.corpus) return;
        engineRef.current = createClientAttentionEngine({
          weights: bundle.weights,
          corpus: bundle.corpus,
        });
        setVoiceEngineMode((prev) => (prev === "loading" ? "ready" : prev));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeBlend?.isJoined]);

  // Stop speech cleanly when exiting Focus Mode or leaving Blend
  useEffect(() => {
    if (!isFocusMode || !activeBlend?.isJoined) {
      stopVoiceNavPlayback();
    }
    return () => {
      stopVoiceNavPlayback();
    };
  }, [isFocusMode, activeBlend?.isJoined]);

  // Real-time road-ahead evaluation on live self coordinates & route steps
  const participants = Array.isArray(activeBlend?.participants) ? activeBlend.participants : [];
  const selfParticipant = participants.find((p) => p.isSelf) || null;
  const selfRoute = selfParticipant?.route || null;

  useEffect(() => {
    if (!isFocusMode || !activeBlend?.isJoined || !selfParticipant || !selfRoute || !engineRef.current) {
      return;
    }
    const lat = Number(selfParticipant.lat);
    const lng = Number(selfParticipant.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const { nextState, trigger, upcomingStep: nextStep } = evaluateClientNavTick({
      state: triggerStateRef.current,
      route: selfRoute,
      gps: {
        lat,
        lng,
        speed: selfParticipant.speed || 0,
        isStationary: Boolean(selfParticipant.isStationary),
      },
      destination: activeBlend.destination || null,
      eventTitle: activeBlend.destination?.title || "lokasi event",
      nowMs: Date.now(),
      engine: engineRef.current,
    });

    triggerStateRef.current = nextState;
    if (nextStep) setUpcomingStep(nextStep);

    if (trigger?.decision?.spokenText) {
      setLiveSubtitle({
        text: trigger.decision.spokenText,
        directionLock: trigger.decision.directionLock,
        urgency: trigger.decision.urgency,
        reason: trigger.reason,
        distanceMeters: trigger.distanceMeters,
        updatedAt: Date.now(),
      });

      if (voiceEnabledRef.current) {
        speakNavigationInstruction({
          text: trigger.decision.spokenText,
          prosodyRate: trigger.decision.prosodyRate,
          urgency: trigger.decision.urgency,
          onModeResolved: (m) => setVoiceEngineMode(m),
        });
      }
    }
  }, [
    isFocusMode,
    activeBlend?.isJoined,
    activeBlend?.destination,
    selfParticipant?.lat,
    selfParticipant?.lng,
    selfParticipant?.speed,
    selfParticipant?.isStationary,
    selfRoute,
  ]);

  const toggleVoice = useCallback(() => {
    unlockVoiceNavAudio();
    setVoiceEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VOICE_PREF_KEY, next ? "true" : "false");
      } catch {}
      if (!next) {
        stopVoiceNavPlayback();
      }
      return next;
    });
  }, []);

  const replayOrPreviewVoice = useCallback(() => {
    unlockVoiceNavAudio();
    const targetText =
      liveSubtitle?.text ||
      (engineRef.current && selfRoute
        ? engineRef.current.infer(
            {
              mode: selfRoute.mode || "foot",
              directionLock: upcomingStep?.directionLock || "depart",
              distanceMeters: upcomingStep?.liveDistanceMeters ?? upcomingStep?.distanceMeters ?? 150,
              roadClass: upcomingStep?.roadClass || "lokal",
              trafficState: selfRoute.trafficLevel || "FREE",
              hasRoadName: Boolean(upcomingStep?.roadName),
              speedKmh: selfParticipant?.isStationary ? 0 : (Number(selfParticipant?.speed) || 0) * 3.6,
            },
            {
              roadName: upcomingStep?.roadName || "",
              distanceMeters: upcomingStep?.liveDistanceMeters ?? upcomingStep?.distanceMeters ?? 150,
              exitNumber: upcomingStep?.exitNumber,
              eventTitle: activeBlend?.destination?.title || "lokasi event",
            }
          ).spokenText
        : `Navigasi suara Kalceria aktif menuju ${activeBlend?.destination?.title || "lokasi event"}.`);

    setLiveSubtitle((prev) => ({
      text: targetText,
      directionLock: prev?.directionLock || upcomingStep?.directionLock || "straight",
      urgency: prev?.urgency || "advisory",
      reason: "manual_preview",
      distanceMeters: upcomingStep?.liveDistanceMeters ?? prev?.distanceMeters ?? null,
      updatedAt: Date.now(),
    }));

    if (!voiceEnabledRef.current) {
      setVoiceEnabled(true);
      try {
        localStorage.setItem(VOICE_PREF_KEY, "true");
      } catch {}
    }

    speakNavigationInstruction({
      text: targetText,
      prosodyRate: 1.02,
      urgency: "advisory",
      onModeResolved: (m) => setVoiceEngineMode(m),
    });
  }, [liveSubtitle, selfRoute, upcomingStep, selfParticipant, activeBlend?.destination?.title]);

  return {
    voiceEnabled,
    isSpeaking,
    voiceEngineMode,
    liveSubtitle,
    upcomingStep,
    toggleVoice,
    replayOrPreviewVoice,
    unlockAudio: unlockVoiceNavAudio,
  };
}

