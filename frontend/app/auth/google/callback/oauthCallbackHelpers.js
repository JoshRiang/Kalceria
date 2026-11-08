"use client";

export const OAUTH_PENDING_KEY = "kalceria_google_oauth_pending";
export const OAUTH_HANDOFF_KEY = "kalceria_google_oauth_handoff";
export const OAUTH_CHANNEL_NAME = "kalceria_google_oauth";
export const FORCE_LOAD_PAUSE_MS = 700;

export function closeCurrentWindow() {
  if (typeof window === "undefined") return;
  try {
    window.close();
  } catch {}
  try {
    window.open("", "_self", "");
    window.close();
  } catch {}
}

export function detectIsOAuthPopupWindow() {
  if (typeof window === "undefined") return false;
  try {
    const rawPending = localStorage.getItem(OAUTH_PENDING_KEY);
    if (rawPending) {
      const parsed = JSON.parse(rawPending);
      if (parsed?.ts && Date.now() - parsed.ts < 5 * 60 * 1000) {
        if (parsed.mode === "popup") return true;
        if (parsed.mode === "redirect") return false;
      }
    }
  } catch {}

  if (window.opener && !window.opener.closed) return true;
  if (window.name === OAUTH_CHANNEL_NAME) return true;
  if (window.innerWidth <= 760 && window.innerHeight <= 880) return true;

  const isMobileUa =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return !isMobileUa;
}

export function clearPendingOAuthMode() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OAUTH_PENDING_KEY);
  } catch {}
}

export function dispatchOAuthHandoffResult(result) {
  if (typeof window === "undefined") return;

  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(OAUTH_CHANNEL_NAME);
      bc.postMessage(result);
      bc.close();
    }
  } catch {}

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(result, window.location.origin);
    }
  } catch {}

  try {
    localStorage.setItem(
      OAUTH_HANDOFF_KEY,
      JSON.stringify({ ...result, ts: Date.now() })
    );
  } catch {}
}

