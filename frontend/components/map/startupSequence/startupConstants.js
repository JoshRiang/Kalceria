export const QUOTES = [
  "Composing the map...",
  "Adjusting the position...",
  "Wahib embut...",
  "Otniel keren banget...",
  "Connecting Kalcerians nodes...",
  "Calibrating neural markers...",
];

// Module-level monotonic state so React StrictMode double-effects or hydration remounts
// can NEVER reset progress from 60% or 80% back to 0% mid-sequence.
export let activeStartupProgress = 0;
export let activeStartupIsDark = false;
export let activeStartupDarkTimestamp = null;

export function setActiveStartupProgress(val) {
  activeStartupProgress = val;
}

export function setActiveStartupIsDark(val) {
  activeStartupIsDark = val;
}

export function setActiveStartupDarkTimestamp(val) {
  activeStartupDarkTimestamp = val;
}

export function resetActiveStartupSession() {
  activeStartupProgress = 0;
  activeStartupIsDark = false;
  activeStartupDarkTimestamp = null;
}
