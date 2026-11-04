// frontend/lib/soundEngine.js
// Safe, hardware-protected notification sound engine with Web Audio API synthesis and audio file fallback.

const STORAGE_KEY = "kalceria_sound_muted";
let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundMuted() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
    window.dispatchEvent(new CustomEvent("kalceria:sound-mute-changed", { detail: { muted: Boolean(muted) } }));
  } catch {}
}

export function toggleSoundMuted() {
  const current = isSoundMuted();
  const next = !current;
  setSoundMuted(next);
  if (!next) {
    // Soft confirmation chime when unmuting
    playConfirmationPip();
  }
  return next;
}

// ─── Sound 1: Event Collaboration Notification (Futuristic Ascending Tactical Chime) ───
export function playEventCollabSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state !== "closed") {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.32, now);
      masterGain.connect(ctx.destination);

      // Notes: C5 (523.25Hz), E5 (659.25Hz), C6 (1046.50Hz)
      const notes = [
        { freq: 523.25, start: 0.0, dur: 0.28, gain: 0.35 },
        { freq: 659.25, start: 0.08, dur: 0.32, gain: 0.4 },
        { freq: 1046.5, start: 0.17, dur: 0.38, gain: 0.5 },
      ];

      notes.forEach(({ freq, start, dur, gain }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        // Envelope
        noteGain.gain.setValueAtTime(0.001, now + start);
        noteGain.gain.exponentialRampToValueAtTime(gain, now + start + 0.015);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
      return;
    }
  } catch {}

  // Audio element fallback
  playAudioFileFallback("/sounds/event_collab.wav");
}

// ─── Sound 2: Chat Notification (Crisp Modern Double-Ping / Droplet) ───
export function playChatMessageSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state !== "closed") {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.35, now);
      masterGain.connect(ctx.destination);

      // Notes: A5 (880Hz), E6 (1318.51Hz)
      const pops = [
        { freq: 880.0, start: 0.0, dur: 0.16, gain: 0.45 },
        { freq: 1318.51, start: 0.09, dur: 0.26, gain: 0.55 },
      ];

      pops.forEach(({ freq, start, dur, gain }) => {
        const osc = ctx.createOscillator();
        const popGain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + start);

        popGain.gain.setValueAtTime(0.001, now + start);
        popGain.gain.exponentialRampToValueAtTime(gain, now + start + 0.01);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

        osc.connect(popGain);
        popGain.connect(masterGain);

        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      });
      return;
    }
  } catch {}

  playAudioFileFallback("/sounds/chat_incoming.wav");
}

// Subtle un-mute confirmation
function playConfirmationPip() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state !== "closed") {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now); // B5
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {}
}

function playAudioFileFallback(url) {
  try {
    const audio = new Audio(url);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch {}
}

// ─── Central Notification Dispatcher ───
// Strict policy: Sound on Live Map ONLY activates for:
// 1. Personal Chat ("chat", "personal_chat", "chat_message", "message")
// 2. Event Group Chat ("group_chat", "event_chat", "group_chat_event" — only when user is creator or collaborator)
// 3. Envelope / Collab Request ("envelope", "collab_request", "event_envelope")
const ALLOWED_CHAT_TYPES = new Set(["chat", "personal_chat", "chat_message", "message"]);
const ALLOWED_GROUP_CHAT_TYPES = new Set(["group_chat", "event_chat", "group_chat_event"]);
const ALLOWED_ENVELOPE_TYPES = new Set(["envelope", "collab_request", "event_envelope"]);

export function playNotificationSound(type = "envelope", options = {}) {
  const normalized = String(type || "").toLowerCase().trim();

  if (ALLOWED_CHAT_TYPES.has(normalized)) {
    playChatMessageSound();
    return;
  }

  if (ALLOWED_GROUP_CHAT_TYPES.has(normalized)) {
    // Only play if user is a member/collaborator/owner of the event
    if (options && options.isMember === false) return;
    playChatMessageSound();
    return;
  }

  if (ALLOWED_ENVELOPE_TYPES.has(normalized)) {
    playEventCollabSound();
  }
}

// Register global window event listener for seamless triggering
if (typeof window !== "undefined") {
  window.__kalceriaPlaySound = playNotificationSound;
  window.addEventListener("kalceria:notification", (e) => {
    playNotificationSound(e?.detail?.type || "envelope", e?.detail || {});
  });
}

