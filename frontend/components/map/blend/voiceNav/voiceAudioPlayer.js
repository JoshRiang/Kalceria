"use client";

/**
 * AI Voice Navigation Hardware Audio Player & Ducking Coordinator (Iteration 5/5).
 *
 * Dual-Engine Speech Playback:
 * 1. Primary : Copyright-free MIT Piper Neural WAV via `/api/map/voice-nav/speak` (48-entry client Blob cache)
 * 2. Fallback: Instant natural Indonesian browser `window.speechSynthesis` (`id-ID`)
 *
 * Syncs ducking state with `soundEngine.js` via `window.__kalceriaVoiceNavSpeaking` so
 * chat pings softly attenuate (28%) while the AI Voice Co-Pilot speaks road maneuvers.
 */

import { requestVoiceNavSpeak } from "@/lib/api";
import { isSoundMuted } from "@/lib/soundEngine";

const CLIENT_WAV_CACHE = new Map();
const CLIENT_WAV_CACHE_MAX = 48;

let activeAudioEl = null;
let activeAudioCtx = null;
let activeSpeechId = 0;

function setSpeakingFlag(speaking) {
  if (typeof window === "undefined") return;
  window.__kalceriaVoiceNavSpeaking = Boolean(speaking);
  window.dispatchEvent(
    new CustomEvent("kalceria:voice-nav-speaking", { detail: { speaking: Boolean(speaking) } })
  );
}

function getSharedAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!activeAudioCtx) activeAudioCtx = new Ctx();
  if (activeAudioCtx.state === "suspended") {
    activeAudioCtx.resume().catch(() => {});
  }
  return activeAudioCtx;
}

/**
 * Unlocks WebAudio + SpeechSynthesis on mobile Chrome/Safari inside a real user gesture.
 */
export function unlockVoiceNavAudio() {
  try {
    getSharedAudioContext();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  } catch {}
}

/**
 * Soft 65ms tactical pre-chime before urgent/alert road maneuvers.
 */
function playUrgentCuePip() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx || ctx.state === "closed") return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(784.0, now); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.055); // C6
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  } catch {}
}

export function stopVoiceNavPlayback() {
  activeSpeechId += 1;
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch {}
    activeAudioEl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  setSpeakingFlag(false);
}

function pickIndonesianSpeechVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  const idVoices = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("id"));
  if (idVoices.length === 0) return null;
  // Prefer Google Bahasa Indonesia / Microsoft Gadis / Damayanti natural voices
  const preferred = idVoices.find((v) => /google|gadis|ardi|damayanti|natural/i.test(v.name));
  return preferred || idVoices[0];
}

function speakWithBrowserFallback({ text, prosodyRate = 1.0, speechId, onEnd }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "id-ID";
    utter.rate = Math.max(0.85, Math.min(1.22, Number(prosodyRate) || 1.0));
    utter.pitch = 1.0;
    utter.volume = 1.0;
    const idVoice = pickIndonesianSpeechVoice();
    if (idVoice) utter.voice = idVoice;

    utter.onstart = () => {
      if (speechId === activeSpeechId) setSpeakingFlag(true);
    };
    utter.onend = () => {
      if (speechId === activeSpeechId) {
        setSpeakingFlag(false);
        onEnd?.();
      }
    };
    utter.onerror = () => {
      if (speechId === activeSpeechId) {
        setSpeakingFlag(false);
        onEnd?.();
      }
    };

    setSpeakingFlag(true);
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    setSpeakingFlag(false);
    onEnd?.();
    return false;
  }
}

function playCachedBlobUrl(blobUrl, speechId, onEnd) {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(blobUrl);
      audio.volume = 1.0;
      activeAudioEl = audio;
      setSpeakingFlag(true);

      const finish = (ok) => {
        if (activeAudioEl === audio) activeAudioEl = null;
        if (speechId === activeSpeechId) {
          setSpeakingFlag(false);
          onEnd?.();
        }
        resolve(ok);
      };

      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    } catch {
      setSpeakingFlag(false);
      resolve(false);
    }
  });
}

/**
 * Speaks an Indonesian navigation decision via Neural Piper MIT WAV (if available)
 * with zero-latency automatic fallback to browser `id-ID` SpeechSynthesis.
 */
export async function speakNavigationInstruction({
  text,
  prosodyRate = 1.0,
  urgency = "advisory",
  onModeResolved,
  onFinished,
} = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText || typeof window === "undefined") return;
  if (isSoundMuted()) return;

  stopVoiceNavPlayback();
  const speechId = activeSpeechId;

  if (urgency === "urgent" || urgency === "alert") {
    playUrgentCuePip();
  }

  const rateKey = `${Number(prosodyRate || 1.0).toFixed(2)}|${cleanText}`;
  const cachedBlobUrl = CLIENT_WAV_CACHE.get(rateKey);
  if (cachedBlobUrl) {
    onModeResolved?.("neural-piper-mit");
    const played = await playCachedBlobUrl(cachedBlobUrl, speechId, onFinished);
    if (played || speechId !== activeSpeechId) return;
  }

  try {
    const res = await requestVoiceNavSpeak({ text: cleanText, prosodyRate, urgency });
    if (speechId !== activeSpeechId) return;

    if (res?.mode === "neural_wav" && res.wavBuffer) {
      const blob = new Blob([res.wavBuffer], { type: "audio/wav" });
      const blobUrl = URL.createObjectURL(blob);
      CLIENT_WAV_CACHE.set(rateKey, blobUrl);
      if (CLIENT_WAV_CACHE.size > CLIENT_WAV_CACHE_MAX) {
        const oldestKey = CLIENT_WAV_CACHE.keys().next().value;
        const oldUrl = CLIENT_WAV_CACHE.get(oldestKey);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        CLIENT_WAV_CACHE.delete(oldestKey);
      }
      onModeResolved?.("neural-piper-mit");
      const played = await playCachedBlobUrl(blobUrl, speechId, onFinished);
      if (played || speechId !== activeSpeechId) return;
    }
  } catch {
    // Silent failover to browser speech
  }

  if (speechId !== activeSpeechId) return;
  onModeResolved?.("web-speech-id");
  speakWithBrowserFallback({
    text: cleanText,
    prosodyRate,
    speechId,
    onEnd: onFinished,
  });
}

