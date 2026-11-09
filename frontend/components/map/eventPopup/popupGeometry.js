// Event Card geometry: the card and its inner media frame follow the real aspect ratio of the
// clip on screen. Portrait clips get a tall narrow frame, landscape clips an elongated wide card,
// and everything in between (square, 4:3, 3:4) interpolates smoothly. Header, caption and footer
// keep their fixed proportions; only the card width and the frame height change.

export const MIN_FEED_RATIO = 9 / 16;
export const MAX_FEED_RATIO = 16 / 9;
export const CARD_FRAME_MARGIN_PX = 24;
export const GEOMETRY_TRANSITION_MS = 440;
export const GEOMETRY_TRANSITION_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

const SQUARE_INNER_WIDTH = 268;
const MIN_INNER_WIDTH = 208;
const MAX_INNER_WIDTH = 404;
const EMPTY_FEED_FRAME_HEIGHT = 134;

function getViewport() {
  return {
    vw: typeof window !== "undefined" ? window.innerWidth : 1024,
    vh: typeof window !== "undefined" ? window.innerHeight : 768,
  };
}

export function classifyMediaOrientation(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return "unknown";
  const ratio = w / h;
  if (ratio >= 1.15) return "landscape";
  if (ratio < 0.92) return "portrait";
  return "square";
}

export function computeEmptyCardGeometry() {
  const { vw } = getViewport();
  const innerWidth = Math.min(SQUARE_INNER_WIDTH, Math.max(MIN_INNER_WIDTH, vw - 32 - CARD_FRAME_MARGIN_PX));
  return {
    cardWidth: innerWidth + CARD_FRAME_MARGIN_PX,
    frameHeight: EMPTY_FEED_FRAME_HEIGHT,
    orientation: "unknown",
  };
}

export function computeCardGeometryForMedia(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    const { vw } = getViewport();
    const innerWidth = Math.min(SQUARE_INNER_WIDTH, Math.max(MIN_INNER_WIDTH, vw - 32 - CARD_FRAME_MARGIN_PX));
    return {
      cardWidth: innerWidth + CARD_FRAME_MARGIN_PX,
      frameHeight: Math.round(innerWidth / (4 / 3)),
      orientation: "unknown",
    };
  }

  const { vw, vh } = getViewport();
  const ratio = Math.min(MAX_FEED_RATIO, Math.max(MIN_FEED_RATIO, w / h));
  const viewportInnerCap = Math.max(MIN_INNER_WIDTH, vw - 32 - CARD_FRAME_MARGIN_PX);
  const maxInnerWidth = Math.min(MAX_INNER_WIDTH, viewportInnerCap);
  const squareInnerWidth = Math.min(SQUARE_INNER_WIDTH, maxInnerWidth);
  const maxFrameHeight = Math.min(400, Math.max(220, Math.round(vh * 0.44)));

  let innerWidth;
  let frameHeight;

  if (ratio >= 1) {
    // Landscape side: elongate the card from square width up to the widest allowed width.
    const t = (ratio - 1) / (MAX_FEED_RATIO - 1);
    innerWidth = Math.round(squareInnerWidth + (maxInnerWidth - squareInnerWidth) * t);
    frameHeight = Math.round(innerWidth / ratio);
  } else {
    // Portrait side: keep the square width while the frame grows taller, then narrow the card.
    frameHeight = Math.min(maxFrameHeight, Math.round(squareInnerWidth / ratio));
    innerWidth = Math.round(frameHeight * ratio);
  }

  innerWidth = Math.min(maxInnerWidth, Math.max(MIN_INNER_WIDTH, innerWidth));

  return {
    cardWidth: innerWidth + CARD_FRAME_MARGIN_PX,
    frameHeight,
    orientation: classifyMediaOrientation(w, h),
  };
}

/**
 * Keeps the Leaflet popup anchored while the card width/height transitions: Leaflet measures the
 * popup only on update(), so it is refreshed every frame for the length of the transition.
 */
export function trackPopupLayoutDuringTransition(state, durationMs = GEOMETRY_TRANSITION_MS) {
  const popup = state?.popupInstance;
  if (!popup || state.destroyed) return;
  if (popup._container?.classList?.contains("popup-shrinking")) return;

  state.layoutTrackUntil = performance.now() + durationMs + 80;
  if (state.layoutTrackRaf) return;

  const repositionPopup = () => {
    try {
      if (popup._container?.classList?.contains("popup-shrinking")) return;
      if (popup._container) {
        popup._containerWidth = popup._container.offsetWidth;
      }
      if (typeof popup._updatePosition === "function") {
        popup._updatePosition();
      }
    } catch {}
  };

  const step = (now) => {
    if (state.destroyed) {
      state.layoutTrackRaf = null;
      return;
    }
    repositionPopup();
    if (now < state.layoutTrackUntil) {
      state.layoutTrackRaf = requestAnimationFrame(step);
      return;
    }
    state.layoutTrackRaf = null;
    repositionPopup();
  };
  state.layoutTrackRaf = requestAnimationFrame(step);
}

export function cancelPopupLayoutTracking(state) {
  if (!state) return;
  if (state.layoutTrackRaf) {
    cancelAnimationFrame(state.layoutTrackRaf);
    state.layoutTrackRaf = null;
  }
}

export function applyCardGeometry(state, geometry) {
  if (!state || state.destroyed || !state.cardEl || !state.frameEl) return false;
  if (state.cardEl.closest?.(".popup-shrinking")) return false;
  const key = `${geometry.cardWidth}x${geometry.frameHeight}`;
  if (state.geometryKey === key) return false;
  state.geometryKey = key;

  state.cardEl.style.width = `${geometry.cardWidth}px`;
  state.frameEl.style.height = `${geometry.frameHeight}px`;
  state.cardEl.dataset.feedOrientation = geometry.orientation;
  trackPopupLayoutDuringTransition(state);
  return true;
}

