// Imperative controller for Event Card popups:
// - Adaptive 9:16 portrait vs 16:9 landscape framing (zero cropping, object-fit: contain)
// - Full natural video duration playback (never cut off early on initial open or indicator tap)
// - Smooth X-axis slide transitions without white screen flashes

const IMAGE_SLIDE_DURATION_MS = 3200;
const SLIDE_TRANSITION_MS = 280;

const activeCarousels = new Map();

export function computeCardGeometryForMedia(width, height) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    const defaultW = Math.min(292, Math.max(248, vw - 32));
    return { cardWidth: defaultW, frameHeight: 158, orientation: "default" };
  }

  const ratio = w / h;

  // Landscape (e.g. 16:9) -> widen card smoothly and match horizontal frame ratio
  if (ratio >= 1.15) {
    const cardWidth = Math.min(392, Math.max(292, vw - 32));
    const innerW = Math.max(240, cardWidth - 24);
    const clampedRatio = Math.min(2.05, Math.max(1.15, ratio));
    const maxFrameH = Math.min(246, Math.max(150, Math.round(vh * 0.35)));
    const frameHeight = Math.max(154, Math.min(maxFrameH, Math.round(innerW / clampedRatio)));
    return { cardWidth, frameHeight, orientation: "landscape" };
  }

  // Portrait (e.g. 9:16) -> compact width + tall viewport-bounded frame
  if (ratio < 0.92) {
    const cardWidth = Math.min(292, Math.max(248, vw - 32));
    const frameHeight = Math.min(365, Math.max(228, Math.round(vh * 0.42)));
    return { cardWidth, frameHeight, orientation: "portrait" };
  }

  // Square (~1:1)
  const cardWidth = Math.min(292, Math.max(248, vw - 32));
  const innerW = Math.max(220, cardWidth - 24);
  const frameHeight = Math.min(280, Math.max(200, Math.round(innerW)));
  return { cardWidth, frameHeight, orientation: "square" };
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
  const attrW = Number(slideEl.getAttribute("data-media-w"));
  const attrH = Number(slideEl.getAttribute("data-media-h"));
  if (Number.isFinite(attrW) && attrW > 0 && Number.isFinite(attrH) && attrH > 0) {
    return { width: attrW, height: attrH };
  }
  return { width: null, height: null };
}

function applyOrientationSizing(state, slideEl) {
  if (!state || state.destroyed || !state.cardEl || !state.frameEl) return;
  const { width, height } = getSlideNaturalDimensions(slideEl);
  if (!width || !height) return;

  const { cardWidth, frameHeight } = computeCardGeometryForMedia(width, height);
  const prevCardW = parseInt(state.cardEl.style.width || "0", 10);
  const prevFrameH = parseInt(state.frameEl.style.height || "0", 10);

  if (Math.abs(prevCardW - cardWidth) >= 2 || Math.abs(prevFrameH - frameHeight) >= 2) {
    state.cardEl.style.width = `${cardWidth}px`;
    state.frameEl.style.height = `${frameHeight}px`;

    if (state.popupInstance && typeof state.popupInstance.update === "function") {
      if (state.popupUpdateRaf) cancelAnimationFrame(state.popupUpdateRaf);
      state.popupUpdateRaf = requestAnimationFrame(() => {
        state.popupUpdateRaf = null;
        if (!state.destroyed) {
          try {
            state.popupInstance.update();
          } catch {}
        }
      });
    }
  }
}

function clearPlaybackTimers(state) {
  if (!state) return;
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  if (state.slideTimerId) {
    clearTimeout(state.slideTimerId);
    state.slideTimerId = null;
  }
  if (state.hideOutgoingTimerId) {
    clearTimeout(state.hideOutgoingTimerId);
    state.hideOutgoingTimerId = null;
  }
  if (state.fallbackTimerId) {
    clearTimeout(state.fallbackTimerId);
    state.fallbackTimerId = null;
  }
}

function destroyCarouselState(safeId) {
  const existing = activeCarousels.get(safeId);
  if (!existing) return;
  existing.destroyed = true;
  existing.genId += 1;
  clearPlaybackTimers(existing);
  if (existing.popupUpdateRaf) {
    cancelAnimationFrame(existing.popupUpdateRaf);
    existing.popupUpdateRaf = null;
  }
  existing.cleanupCallbacks.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
  existing.cleanupCallbacks = [];
  existing.slides.forEach((slideEl) => {
    const vid = slideEl.querySelector("video");
    if (vid) {
      try {
        vid.pause();
      } catch {}
    }
  });
  activeCarousels.delete(safeId);
}

function setIndicatorStates(state, activeIdx) {
  state.fills.forEach((fill, idx) => {
    fill.style.transition = "none";
    fill.style.animation = "none";
    if (idx < activeIdx) {
      fill.style.width = "100%";
      fill.style.opacity = "1";
    } else if (idx === activeIdx) {
      fill.style.width = "0%";
      fill.style.opacity = "1";
    } else {
      fill.style.width = "0%";
      fill.style.opacity = "0.35";
    }
  });
}

function runSlide(state, targetIdx, direction = "next", immediate = false) {
  if (!state || state.destroyed || !state.slides.length) return;
  const N = state.slides.length;
  const normalizedIdx = ((Number(targetIdx) % N) + N) % N;
  const gen = ++state.genId;

  clearPlaybackTimers(state);

  const prevIdx = state.activeIdx;
  const incomingEl = state.slides[normalizedIdx];
  const outgoingEl =
    prevIdx !== null && prevIdx !== normalizedIdx ? state.slides[prevIdx] : null;
  state.activeIdx = normalizedIdx;

  // Pause non-active videos first
  state.slides.forEach((slideEl, idx) => {
    const v = slideEl.querySelector("video");
    if (v && idx !== normalizedIdx) {
      try {
        v.pause();
        v.onended = null;
        v.onerror = null;
      } catch {}
    }
  });

  // Slide-right / slide-left positioning without white flash
  if (immediate || !outgoingEl) {
    state.slides.forEach((slideEl, idx) => {
      slideEl.style.transition = "none";
      if (idx === normalizedIdx) {
        slideEl.style.visibility = "visible";
        slideEl.style.zIndex = "4";
        slideEl.style.transform = "translateX(0%)";
        slideEl.style.pointerEvents = "auto";
      } else {
        slideEl.style.visibility = "hidden";
        slideEl.style.zIndex = "1";
        slideEl.style.transform = "translateX(100%)";
        slideEl.style.pointerEvents = "none";
      }
    });
  } else {
    const enterFrom = direction === "prev" ? "-100%" : "100%";
    const exitTo = direction === "prev" ? "100%" : "-100%";

    state.slides.forEach((slideEl, idx) => {
      if (idx !== normalizedIdx && idx !== prevIdx) {
        slideEl.style.transition = "none";
        slideEl.style.visibility = "hidden";
        slideEl.style.zIndex = "1";
        slideEl.style.transform = "translateX(100%)";
        slideEl.style.pointerEvents = "none";
      }
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

    // Commit starting transform before animating
    void incomingEl.offsetWidth;

    const ease = `transform ${SLIDE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    outgoingEl.style.transition = ease;
    incomingEl.style.transition = ease;
    outgoingEl.style.transform = `translateX(${exitTo})`;
    incomingEl.style.transform = "translateX(0%)";

    state.hideOutgoingTimerId = setTimeout(() => {
      if (state.destroyed || state.genId !== gen) return;
      outgoingEl.style.transition = "none";
      outgoingEl.style.visibility = "hidden";
      outgoingEl.style.zIndex = "1";
      outgoingEl.style.pointerEvents = "none";
    }, SLIDE_TRANSITION_MS + 20);
  }

  setIndicatorStates(state, normalizedIdx);
  applyOrientationSizing(state, incomingEl);

  const activeFill = state.fills[normalizedIdx] || null;
  const vid = incomingEl.querySelector("video");

  if (vid) {
    if (N > 1) {
      vid.removeAttribute("loop");
      vid.loop = false;
    } else {
      vid.loop = true;
    }
    vid.muted = true;
    vid.playsInline = true;
    vid.dataset.completedOnePass = "0";

    const hintedDur = Number(incomingEl.getAttribute("data-media-duration"));
    const onMeta = () => {
      if (state.destroyed || state.genId !== gen) return;
      applyOrientationSizing(state, incomingEl);
    };
    vid.addEventListener("loadedmetadata", onMeta, { once: true });
    state.cleanupCallbacks.push(() => vid.removeEventListener("loadedmetadata", onMeta));

    try {
      vid.currentTime = 0;
    } catch {}

    const startedAt = performance.now();

    const tickVideoProgress = () => {
      if (state.destroyed || state.genId !== gen) return;
      if (activeFill) {
        const dur =
          Number.isFinite(vid.duration) && vid.duration > 0
            ? vid.duration
            : Number.isFinite(hintedDur) && hintedDur > 0
            ? hintedDur
            : 0;
        if (dur > 0) {
          const pct = Math.min(100, Math.max(0, (vid.currentTime / dur) * 100));
          activeFill.style.width = `${pct.toFixed(2)}%`;
        } else if (!vid.paused && !vid.ended) {
          const elapsedSec = (performance.now() - startedAt) / 1000;
          const approxPct = Math.min(92, (elapsedSec / (elapsedSec + 4)) * 96);
          activeFill.style.width = `${approxPct.toFixed(2)}%`;
        }
      }
      if (!vid.ended && !state.destroyed && state.genId === gen) {
        state.rafId = requestAnimationFrame(tickVideoProgress);
      }
    };

    vid.onended = () => {
      if (state.destroyed || state.genId !== gen) return;
      vid.dataset.completedOnePass = "1";
      if (activeFill) activeFill.style.width = "100%";
      if (N > 1) {
        runSlide(state, normalizedIdx + 1, "next", false);
      } else {
        try {
          vid.currentTime = 0;
          vid.play().catch(() => {});
          state.rafId = requestAnimationFrame(tickVideoProgress);
        } catch {}
      }
    };

    vid.onerror = () => {
      if (state.destroyed || state.genId !== gen) return;
      vid.dataset.completedOnePass = "1";
      if (N > 1) {
        state.fallbackTimerId = setTimeout(() => {
          if (!state.destroyed && state.genId === gen) {
            runSlide(state, normalizedIdx + 1, "next", false);
          }
        }, 2500);
      }
    };

    vid.play().catch(() => {
      if (N > 1) {
        state.fallbackTimerId = setTimeout(() => {
          if (!state.destroyed && state.genId === gen && vid.paused) {
            runSlide(state, normalizedIdx + 1, "next", false);
          }
        }, 3500);
      }
    });

    state.rafId = requestAnimationFrame(tickVideoProgress);
    return;
  }

  // Image / GIF slide
  const img = incomingEl.querySelector("img");
  if (img && !img.complete) {
    const onImgLoad = () => {
      if (!state.destroyed && state.genId === gen) {
        applyOrientationSizing(state, incomingEl);
      }
    };
    img.addEventListener("load", onImgLoad, { once: true });
    state.cleanupCallbacks.push(() => img.removeEventListener("load", onImgLoad));
  }

  if (N === 1) return;

  const startMs = performance.now();
  const tickImage = (nowMs) => {
    if (state.destroyed || state.genId !== gen) return;
    const elapsed = nowMs - startMs;
    const pct = Math.min(100, Math.max(0, (elapsed / IMAGE_SLIDE_DURATION_MS) * 100));
    if (activeFill) {
      activeFill.style.width = `${pct.toFixed(2)}%`;
    }
    if (elapsed >= IMAGE_SLIDE_DURATION_MS) {
      if (activeFill) activeFill.style.width = "100%";
      runSlide(state, normalizedIdx + 1, "next", false);
      return;
    }
    state.rafId = requestAnimationFrame(tickImage);
  };
  state.rafId = requestAnimationFrame(tickImage);
}

export function initEventPopupCarouselsFromRoot(rootEl, popupInstance = null) {
  if (!rootEl || typeof document === "undefined") return;
  const containers = rootEl.querySelectorAll("[data-carousel-container]");
  containers.forEach((containerEl) => {
    const safeId = containerEl.getAttribute("data-carousel-container");
    if (!safeId) return;

    destroyCarouselState(safeId);

    const cardEl = containerEl.closest(".event-card");
    const frameEl = containerEl.closest(".popup-video");
    const slides = Array.from(containerEl.querySelectorAll("[data-carousel-slide]"));
    const fills = Array.from(containerEl.querySelectorAll("[data-carousel-fill]"));

    if (slides.length === 0) return;

    const state = {
      safeId,
      genId: 0,
      rafId: null,
      slideTimerId: null,
      hideOutgoingTimerId: null,
      fallbackTimerId: null,
      popupUpdateRaf: null,
      activeIdx: null,
      slides,
      fills,
      cardEl,
      frameEl,
      popupInstance,
      cleanupCallbacks: [],
      destroyed: false,
    };

    activeCarousels.set(safeId, state);
    runSlide(state, 0, "next", true);
  });
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
  if (!state || state.destroyed) {
    const fallbackEl =
      typeof document !== "undefined"
        ? document.getElementById(`event-carousel-${safeId}`)
        : null;
    if (fallbackEl) {
      initEventPopupCarouselsFromRoot(fallbackEl.parentElement || fallbackEl);
      const initialized = activeCarousels.get(safeId);
      if (initialized) {
        const dir =
          initialized.activeIdx !== null && Number(targetIdx) < initialized.activeIdx
            ? "prev"
            : "next";
        runSlide(initialized, Number(targetIdx), dir, false);
      }
    }
    return;
  }
  const N = state.slides.length;
  const normTarget = ((Number(targetIdx) % N) + N) % N;
  const direction =
    state.activeIdx !== null && normTarget < state.activeIdx ? "prev" : "next";
  runSlide(state, normTarget, direction, false);
}

export function stepEventCarouselSlide(safeId, delta) {
  const state = activeCarousels.get(safeId);
  if (!state || state.destroyed) {
    switchEventCarouselSlide(safeId, Number(delta) > 0 ? 1 : 0);
    return;
  }
  const N = state.slides.length;
  if (N <= 1) return;
  const cur = state.activeIdx ?? 0;
  const next = (((cur + Number(delta)) % N) + N) % N;
  const direction = Number(delta) < 0 ? "prev" : "next";
  runSlide(state, next, direction, false);
}

