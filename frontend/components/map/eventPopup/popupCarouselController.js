// Imperative controller for Event Card popups (Live Media Feed):
// - every clip plays for its own real duration (photos default to 3s) and drives its own progress line
// - natural advance slides in from the right once the next clip is decoded (no blank/white flash);
//   a user tap/jump goes straight to the chosen clip
// - the card elongates / narrows to the clip's real aspect ratio (see popupGeometry.js)
// - Instagram-Story gestures: left third = previous, middle/right = next, hold = pause
// - the feed reports when it has finished so the idle auto-close only fires after the last clip

import {
  cancelPopupLayoutTracking,
  computeCardGeometryForMedia,
} from "./popupGeometry";
import { attachFeedGestures } from "./popupGestures";
import {
  paintIndicators,
  positionSlides,
  setFillProgress,
  syncGeometry,
} from "./popupSlidePositioner";
import {
  clearClipRuntime,
  preloadNeighbor,
  startImageClip,
  startVideoClip,
  whenSlideReady,
} from "./popupClipPlayback";

export { computeCardGeometryForMedia };

export const FEED_ENDED_EVENT = "kalceria:event-feed-ended";
export const FEED_INTERACTION_EVENT = "kalceria:event-feed-interaction";

const RESUME_MAX_AGE_MS = 4000;

const activeCarousels = new Map();
const resumeSnapshots = new Map();

function setFeedState(state, value) {
  if (!state) return;
  state.feedState = value;
  if (state.containerEl) state.containerEl.dataset.feedState = value;
}

function emitWindowEvent(name, detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function snapshotForResume(state) {
  if (!state || state.activeIdx === null) return null;
  return {
    sig: state.sig,
    idx: state.activeIdx,
    seconds: state.currentSeconds || 0,
    feedEnded: state.feedEnded,
    at: performance.now(),
  };
}

function destroyCarouselState(safeId, { keepSnapshot = false } = {}) {
  const existing = activeCarousels.get(safeId);
  if (!existing) return;
  if (keepSnapshot) {
    const snap = snapshotForResume(existing);
    if (snap) resumeSnapshots.set(safeId, snap);
  } else {
    resumeSnapshots.delete(safeId);
  }
  existing.destroyed = true;
  existing.genId += 1;
  clearClipRuntime(existing);
  cancelPopupLayoutTracking(existing);
  existing.persistentCleanup.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
  existing.persistentCleanup = [];
  existing.slides.forEach((slideEl) => {
    const vid = slideEl.querySelector("video");
    if (vid) {
      try {
        vid.pause();
        vid.onended = null;
        vid.onerror = null;
      } catch {}
    }
  });
  setFeedState(existing, "closed");
  activeCarousels.delete(safeId);
}

function finishFeed(state) {
  if (state.destroyed) return;
  clearClipRuntime(state);
  state.feedEnded = true;
  paintIndicators(state, state.slides.length, 1);
  setFeedState(state, "ended");
  const vid = state.slides[state.activeIdx]?.querySelector("video");
  if (vid) {
    try {
      vid.pause();
    } catch {}
  }
  emitWindowEvent(FEED_ENDED_EVENT, { safeId: state.safeId });
}

function completeClip(state, gen) {
  if (state.destroyed || state.genId !== gen) return;
  const lastIdx = state.slides.length - 1;
  setFillProgress(state, state.activeIdx, 1);
  if (state.activeIdx < lastIdx) {
    startClip(state, state.activeIdx + 1, { trigger: "natural", direction: "next" });
  } else {
    finishFeed(state);
  }
}

function startClip(state, targetIdx, { trigger = "user", direction = "next", resumeSeconds = 0 } = {}) {
  if (!state || state.destroyed || !state.slides.length) return;
  const total = state.slides.length;
  const idx = ((Number(targetIdx) % total) + total) % total;
  const gen = ++state.genId;

  clearClipRuntime(state);

  const previousIdx = state.activeIdx;
  const incomingEl = state.slides[idx];
  const outgoingEl = previousIdx !== null && previousIdx !== idx ? state.slides[previousIdx] : null;

  state.holdPaused = false;
  state.feedEnded = false;
  state.currentSeconds = resumeSeconds || 0;

  state.slides.forEach((slideEl, slideIdx) => {
    const vid = slideEl.querySelector("video");
    if (vid && slideIdx !== idx) {
      try {
        vid.pause();
        vid.onended = null;
        vid.onerror = null;
      } catch {}
    }
  });

  const begin = () => {
    if (state.destroyed || state.genId !== gen) return;
    const animate = trigger === "natural" && Boolean(outgoingEl);
    state.activeIdx = idx;
    positionSlides(state, incomingEl, outgoingEl, { animate, direction });
    paintIndicators(state, idx, 0);
    setFeedState(state, "playing");
    syncGeometry(state, incomingEl);
    preloadNeighbor(state, idx + 1);

    const vid = incomingEl.querySelector("video");
    if (vid) {
      startVideoClip(state, gen, incomingEl, vid, idx, resumeSeconds, completeClip, setFeedState);
    } else {
      startImageClip(state, gen, incomingEl, idx, resumeSeconds, completeClip, setFeedState);
    }
  };

  if (trigger === "natural" && outgoingEl) {
    whenSlideReady(state, incomingEl, gen, begin);
  } else {
    begin();
  }
}

function holdPause(state) {
  if (!state || state.destroyed || state.feedEnded) return;
  state.holdPaused = true;
  setFeedState(state, "paused");
  const vid = state.slides[state.activeIdx]?.querySelector("video");
  if (vid) {
    try {
      vid.pause();
    } catch {}
  }
  emitWindowEvent(FEED_INTERACTION_EVENT, { safeId: state.safeId });
}

function holdResume(state) {
  if (!state || state.destroyed || !state.holdPaused) return;
  state.holdPaused = false;
  setFeedState(state, "playing");
  const vid = state.slides[state.activeIdx]?.querySelector("video");
  if (vid) {
    const result = vid.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  }
  emitWindowEvent(FEED_INTERACTION_EVENT, { safeId: state.safeId });
}

function stepFeed(state, delta) {
  if (!state || state.destroyed) return;
  const total = state.slides.length;
  const current = state.activeIdx ?? 0;
  emitWindowEvent(FEED_INTERACTION_EVENT, { safeId: state.safeId });

  if (delta > 0) {
    const next = current + 1 < total ? current + 1 : 0;
    startClip(state, next, { trigger: "user", direction: "next" });
    return;
  }
  const prev = current - 1 >= 0 ? current - 1 : 0;
  startClip(state, prev, { trigger: "user", direction: "prev" });
}

function jumpToClip(state, targetIdx) {
  if (!state || state.destroyed) return;
  emitWindowEvent(FEED_INTERACTION_EVENT, { safeId: state.safeId });
  const total = state.slides.length;
  const normalized = ((Number(targetIdx) % total) + total) % total;
  startClip(state, normalized, {
    trigger: "user",
    direction: normalized < (state.activeIdx ?? 0) ? "prev" : "next",
  });
}

function buildFeedSignature(slides) {
  return slides.map((slideEl) => slideEl.getAttribute("data-media-url") || "").join("|");
}

export function initEventPopupCarouselsFromRoot(rootEl, popupInstance = null) {
  if (!rootEl || typeof document === "undefined") return;
  const containers = rootEl.querySelectorAll("[data-carousel-container]");
  containers.forEach((containerEl) => {
    const safeId = containerEl.getAttribute("data-carousel-container");
    if (!safeId) return;

    // Re-initialisation after a content refresh keeps the viewer on the clip they were watching.
    destroyCarouselState(safeId, { keepSnapshot: true });

    const cardEl = containerEl.closest(".event-card");
    const frameEl = containerEl.closest(".popup-video");
    const slides = Array.from(containerEl.querySelectorAll("[data-carousel-slide]"));
    const fills = Array.from(containerEl.querySelectorAll("[data-carousel-fill]"));
    const tapLayerEl = containerEl.querySelector("[data-carousel-tap-layer]");

    if (slides.length === 0) return;

    const state = {
      safeId,
      sig: buildFeedSignature(slides),
      genId: 0,
      rafId: null,
      hideOutgoingTimerId: null,
      skipTimerId: null,
      layoutTrackRaf: null,
      layoutTrackUntil: 0,
      geometryKey: null,
      activeIdx: null,
      currentSeconds: 0,
      holdPaused: false,
      feedEnded: false,
      slides,
      fills,
      containerEl,
      cardEl,
      frameEl,
      popupInstance,
      clipCleanup: [],
      persistentCleanup: [],
      destroyed: false,
    };

    activeCarousels.set(safeId, state);

    if (tapLayerEl) {
      state.persistentCleanup.push(
        attachFeedGestures(tapLayerEl, {
          onTap: (zone) => stepFeed(state, zone === "prev" ? -1 : 1),
          onHoldStart: () => holdPause(state),
          onHoldEnd: () => holdResume(state),
        })
      );
    }

    const handleWindowResize = () => syncGeometry(state, state.slides[state.activeIdx ?? 0]);
    window.addEventListener("resize", handleWindowResize);
    state.persistentCleanup.push(() => window.removeEventListener("resize", handleWindowResize));

    const snapshot = resumeSnapshots.get(safeId);
    resumeSnapshots.delete(safeId);
    const canResume =
      snapshot &&
      snapshot.sig === state.sig &&
      performance.now() - snapshot.at < RESUME_MAX_AGE_MS &&
      snapshot.idx < slides.length;

    if (canResume && snapshot.feedEnded) {
      state.activeIdx = snapshot.idx;
      positionSlides(state, slides[snapshot.idx], null, { animate: false, direction: "next" });
      syncGeometry(state, slides[snapshot.idx]);
      finishFeedSilently(state);
    } else if (canResume) {
      startClip(state, snapshot.idx, { trigger: "resume", resumeSeconds: snapshot.seconds });
    } else {
      startClip(state, 0, { trigger: "init" });
    }
  });
}

function finishFeedSilently(state) {
  state.feedEnded = true;
  paintIndicators(state, state.slides.length, 1);
  setFeedState(state, "ended");
}

export function cleanupEventPopupCarouselsFromRoot(rootEl) {
  if (!rootEl) return;
  const containers = rootEl.querySelectorAll("[data-carousel-container]");
  containers.forEach((containerEl) => {
    const safeId = containerEl.getAttribute("data-carousel-container");
    if (safeId) destroyCarouselState(safeId);
  });
}

export function switchEventCarouselSlide(safeId, targetIdx) {
  const state = activeCarousels.get(safeId);
  if (state && !state.destroyed) {
    jumpToClip(state, targetIdx);
    return;
  }
  const fallbackEl =
    typeof document !== "undefined" ? document.getElementById(`event-carousel-${safeId}`) : null;
  if (fallbackEl) {
    initEventPopupCarouselsFromRoot(fallbackEl.parentElement || fallbackEl);
    const initialized = activeCarousels.get(safeId);
    if (initialized) jumpToClip(initialized, targetIdx);
  }
}

export function stepEventCarouselSlide(safeId, delta) {
  const state = activeCarousels.get(safeId);
  if (!state || state.destroyed) {
    switchEventCarouselSlide(safeId, Number(delta) > 0 ? 1 : 0);
    return;
  }
  stepFeed(state, Number(delta));
}
