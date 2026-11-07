"use client";

export function getFallbackWaveform(id, duration = 4) {
  const count = 14;
  const bars = [];
  let seed = 0;
  for (let i = 0; i < (id || "").length; i++) {
    seed += id.charCodeAt(i);
  }
  for (let i = 0; i < count; i++) {
    const val = 14 + Math.abs(Math.sin((i + seed) * 0.55) * 65) + ((i % 3) * 8);
    bars.push(Math.min(100, Math.round(val)));
  }
  return bars;
}

export function formatCallDurationTwoUnits(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `0m ${String(seconds).padStart(2, "0")}s`;
}
