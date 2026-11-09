import {
  applyCardGeometry,
  computeCardGeometryForMedia,
} from "./popupGeometry";

export const SLIDE_TRANSITION_MS = 320;

export function readNumberAttr(el, name) {
  const value = Number(el?.getAttribute?.(name));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function getSlideNaturalDimensions(slideEl) {
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

export function syncGeometry(state, slideEl) {
  if (!state || state.destroyed || !slideEl) return;
  const { width, height } = getSlideNaturalDimensions(slideEl);
  if (!width || !height) return;
  applyCardGeometry(state, computeCardGeometryForMedia(width, height));
}

export function paintIndicators(state, activeIdx, activeProgress = 0) {
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

export function setFillProgress(state, idx, progress) {
  const fill = state.fills[idx];
  if (fill) fill.style.transform = `scaleX(${Math.min(1, Math.max(0, progress)).toFixed(4)})`;
}

export function positionSlides(state, incomingEl, outgoingEl, { animate, direction }) {
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
