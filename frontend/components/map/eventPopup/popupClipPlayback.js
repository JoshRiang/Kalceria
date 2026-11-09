import { readNumberAttr, syncGeometry, setFillProgress } from "./popupSlidePositioner";

export const DEFAULT_IMAGE_SECONDS = 3;
export const READY_WAIT_MAX_MS = 1500;
export const STALL_SKIP_MS = 7000;

export function clearClipRuntime(state) {
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

export function isSlideReady(slideEl) {
  const vid = slideEl.querySelector("video");
  if (vid) return vid.readyState >= 2;
  const img = slideEl.querySelector("img");
  if (img) return img.complete;
  return true;
}

export function whenSlideReady(state, slideEl, gen, callback) {
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

export function preloadNeighbor(state, idx) {
  const slideEl = state.slides[idx];
  const vid = slideEl?.querySelector("video");
  if (vid && vid.preload !== "auto") vid.preload = "auto";
  if (vid && vid.readyState === 0 && vid.networkState === 0) {
    try {
      vid.load();
    } catch {}
  }
}

export function startVideoClip(state, gen, slideEl, vid, idx, resumeSeconds, completeClip, setFeedState) {
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

  vid.onended = () => {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    completeClip(state, gen);
  };
  vid.onerror = () => {
    if (state.destroyed || state.genId !== gen) return;
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
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
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      completeClip(state, gen);
    }
  };
  state.rafId = requestAnimationFrame(tick);
}

export function startImageClip(state, gen, slideEl, idx, resumeSeconds, completeClip, setFeedState) {
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
    if (elapsedMs >= durationMs) {
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      completeClip(state, gen);
    }
  };
  state.rafId = requestAnimationFrame(tick);
}
