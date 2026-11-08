// Imperative controller for Event Card popups (Live Media Feed):
// - every clip plays for its own real duration (photos default to 3s) and drives its own progress line
// - natural advance slides in from the right once the next clip is decoded (no blank/white flash);
//   a user tap/jump goes straight to the chosen clip
// - the card elongates / narrows to the clip's real aspect ratio (see popupGeometry.js)
// - Instagram-Story gestures: left third = previous, middle/right = next, hold = pause
// - the feed reports when it has finished so the idle auto-close only fires after the last clip

import {
  applyCardGeometry,
  cancelPopupLayoutTracking,
  computeCardGeometryForMedia,
} from "./popupGeometry";
import { attachFeedGestures } from "./popupGestures";

export { computeCardGeometryForMedia };

export const FEED_ENDED_EVENT = "kalceria:event-feed-ended";
export const FEED_INTERACTION_EVENT = "kalceria:event-feed-interaction";

const DEFAULT_IMAGE_SECONDS = 3;
const SLIDE_TRANSITION_MS = 320;
const READY_WAIT_MAX_MS = 1500;
const STALL_SKIP_MS = 7000;
const RESUME_MAX_AGE_MS = 4000;

const activeCarousels = new Map();
const resumeSnapshots = new Map();

function readNumberAttr(el, name) {
  const value = Number(el?.getAttribute?.(name));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getSlideNaturalDimensions(slideEl) {
  if (!slideEl) return { width: null, height: null };
  const vid = slideEl.querySelector("video");
  if (vid && vid.videoWidth > 0 && vid.videoHeight > 0) {
    return { width: vid.videoWidth, height: vid.videoHeight };
  }
  const img = slideEl.querySelector("img");
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    return { width: img.naturalWidth, height: img.naturalHeight };
  }
  return {
    width: readNumberAttr(slideEl, "data-media-w"),
    height: readNumberAttr(slideEl, "data-media-h"),
  };
}

function syncGeometry(state, slideEl) {
  if (!state || state.destroyed || !slideEl) return;
  const { width, height } = getSlideNaturalDimensions(slideEl);
  if (!width || !height) return;
  applyCardGeometry(state, computeCardGeometryForMedia(width, height));
}

function setFeedState(state, value) {
  if (!state) return;
  state.feedState = value;
  if (state.containerEl) state.containerEl.dataset.feedState = value;
}

function emitWindowEvent(name, detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function clearClipRuntime(state) {
  if (!state) return;
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  [state.hideOutgoingTimerId, state.skipTimerId].forEach((id) => id && clearTimeout(id));
  state.hideOutgoingTimerId = null;
  state.skipTimerId = null;
  state.clipCleanup.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
  state.clipCleanup = [];
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

function paintIndicators(state, activeIdx, activeProgress = 0) {
  state.fills.forEach((fill, idx) => {
    fill.style.transition = "none";
    if (idx < activeIdx) {
      fill.style.transform = "scaleX(1)";
    } else if (idx === activeIdx) {
      fill.style.transform = `scaleX(${Math.min(1, Math.max(0, activeProgress))})`;
    } else {
      fill.style.transform = "scaleX(0)";
    }
  });
}

function setFillProgress(state, idx, progress) {
  const fill = state.fills[idx];
  if (fill) fill.style.transform = `scaleX(${Math.min(1, Math.max(0, progress)).toFixed(4)})`;
}

function isSlideReady(slideEl) {
  const vid = slideEl.querySelector("video");
  if (vid) return vid.readyState >= 2;
  const img = slideEl.querySelector("img");
  if (img) return img.complete;
  return true;
}

function whenSlideReady(state, slideEl, gen, callback) {
  if (isSlideReady(slideEl)) {
    callback();
    return;
  }
  const target = slideEl.querySelector("video") || slideEl.querySelector("img");
  if (!target) {
    callback();
    return;
  }
  const events = target.tagName === "VIDEO" ? ["loadeddata", "canplay", "error"] : ["load", "error"];
  let done = false;
  let timer = null;
  const detach = () => {
    events.forEach((name) => target.removeEventListener(name, finish));
    if (timer) clearTimeout(timer);
  };
  function finish() {
    if (done) return;
    done = true;
    detach();
    if (!state.destroyed && state.genId === gen) callback();
  }
  events.forEach((name) => target.addEventListener(name, finish, { once: true }));
  timer = setTimeout(finish, READY_WAIT_MAX_MS);
  state.clipCleanup.push(() => {
    done = true;
    detach();
  });
}

function preloadNeighbor(state, idx) {
  const slideEl = state.slides[idx];
  const vid = slideEl?.querySelector("video");
  if (vid && vid.preload !== "auto") vid.preload = "auto";
  if (vid && vid.readyState === 0 && vid.networkState === 0) {
    try {
      vid.load();
    } catch {}
  }
}

function positionSlides(state, incomingEl, outgoingEl, { animate, direction }) {
  const hideSlide = (el) => {
    el.style.transition = "none";
    el.style.visibility = "hidden";
    el.style.zIndex = "1";
    el.style.transform = "translateX(100%)";
    el.style.pointerEvents = "none";
  };

  if (!animate || !outgoingEl) {
    state.slides.forEach((slideEl) => {
      if (slideEl === incomingEl) {
        slideEl.style.transition = "none";
        slideEl.style.visibility = "visible";
        slideEl.style.zIndex = "4";
        slideEl.style.transform = "translateX(0%)";
        slideEl.style.pointerEvents = "auto";
      } else {
        hideSlide(slideEl);
      }
    });
    return;
  }

  const enterFrom = direction === "prev" ? "-100%" : "100%";
  const exitTo = direction === "prev" ? "100%" : "-100%";

  state.slides.forEach((slideEl) => {
    if (slideEl !== incomingEl && slideEl !== outgoingEl) hideSlide(slideEl);
  });

  outgoingEl.style.transition = "none";
  outgoingEl.style.visibility = "visible";
  outgoingEl.style.zIndex = "3";
  outgoingEl.style.transform = "translateX(0%)";

  incomingEl.style.transition = "none";
  incomingEl.style.visibility = "visible";
  incomingEl.style.zIndex = "4";
  incomingEl.style.transform = `translateX(${enterFrom})`;
  incomingEl.style.pointerEvents = "auto";

  void incomingEl.offsetWidth;

  const ease = `transform ${SLIDE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  outgoingEl.style.transition = ease;
  incomingEl.style.transition = ease;
  outgoingEl.style.transform = `translateX(${exitTo})`;
  incomingEl.style.transform = "translateX(0%)";

  state.hideOutgoingTimerId = setTimeout(() => {
    if (state.destroyed) return;
    hideSlide(outgoingEl);
  }, SLIDE_TRANSITION_MS + 30);
}

function finishFeed(state) {
  if (state.destroyed) return;
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

function startVideoClip(state, gen, slideEl, vid, idx, resumeSeconds) {
  vid.loop = false;
  vid.removeAttribute("loop");
  vid.muted = true;
  vid.defaultMuted = true;
  vid.playsInline = true;
  vid.preload = "auto";
  vid.setAttribute("muted", "");
  vid.setAttribute("playsinline", "");
  vid.setAttribute("webkit-playsinline", "");

  if (vid.readyState === 0) {
    try {
      vid.load();
    } catch {}
  }

  const hintedDuration = readNumberAttr(slideEl, "data-media-duration");
  const onMeta = () => {
    if (state.destroyed || state.genId !== gen) return;
    syncGeometry(state, slideEl);
  };
  vid.addEventListener("loadedmetadata", onMeta);
  vid.addEventListener("resize", onMeta);
  state.clipCleanup.push(() => {
    vid.removeEventListener("loadedmetadata", onMeta);
    vid.removeEventListener("resize", onMeta);
  });

  try {
    vid.currentTime = Math.max(0, resumeSeconds || 0);
  } catch {}

  vid.onended = () => completeClip(state, gen);
  vid.onerror = () => {
    if (state.destroyed || state.genId !== gen) return;
    state.skipTimerId = setTimeout(() => completeClip(state, gen), 800);
  };

  const playPromise = vid.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      if (!state.destroyed && state.genId === gen) setFeedState(state, "stalled");
    });
  }

  let lastTime = vid.currentTime;
  let lastAdvanceAt = performance.now();
  const startedAt = performance.now();

  const tick = (now) => {
    if (state.destroyed || state.genId !== gen) return;
    state.rafId = requestAnimationFrame(tick);

    const current = vid.currentTime;
    state.currentSeconds = current;

    const realDuration = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 0;
    const duration = realDuration || hintedDuration || 0;
    let progress;
    if (duration > 0) {
      progress = current / duration;
      if (!vid.ended) progress = Math.min(progress, 0.995);
    } else {
      const elapsed = (now - startedAt) / 1000;
      progress = Math.min(0.92, (elapsed / (elapsed + 4)) * 0.96);
    }
    setFillProgress(state, idx, progress);

    if (current !== lastTime) {
      lastTime = current;
      lastAdvanceAt = now;
      if (state.feedState !== "playing" && !state.holdPaused && !vid.paused) {
        setFeedState(state, "playing");
      }
    } else if (!state.holdPaused && now - lastAdvanceAt > STALL_SKIP_MS) {
      completeClip(state, gen);
    }
  };
  state.rafId = requestAnimationFrame(tick);
}

function startImageClip(state, gen, slideEl, idx, resumeSeconds) {
  const img = slideEl.querySelector("img");
  const durationMs = (readNumberAttr(slideEl, "data-media-duration") || DEFAULT_IMAGE_SECONDS) * 1000;
  let elapsedMs = Math.max(0, (resumeSeconds || 0) * 1000);
  let lastTick = performance.now();

  if (img && !img.complete) {
    const onLoad = () => {
      if (state.destroyed || state.genId !== gen) return;
      syncGeometry(state, slideEl);
    };
    img.addEventListener("load", onLoad, { once: true });
    state.clipCleanup.push(() => img.removeEventListener("load", onLoad));
  }

  const tick = (now) => {
    if (state.destroyed || state.genId !== gen) return;
    state.rafId = requestAnimationFrame(tick);

    const dt = Math.min(100, now - lastTick);
    lastTick = now;
    const loaded = !img || img.complete;
    if (loaded && !state.holdPaused) {
      elapsedMs += dt;
      if (state.feedState !== "playing") setFeedState(state, "playing");
    }
    state.currentSeconds = elapsedMs / 1000;
    setFillProgress(state, idx, elapsedMs / durationMs);
    if (elapsedMs >= durationMs) completeClip(state, gen);
  };
  state.rafId = requestAnimationFrame(tick);
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
      startVideoClip(state, gen, incomingEl, vid, idx, resumeSeconds);
    } else {
      startImageClip(state, gen, incomingEl, idx, resumeSeconds);
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
