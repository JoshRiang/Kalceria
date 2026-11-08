// Instagram-Story style gestures for the Event Card feed:
// - tap in the left third  -> previous clip
// - tap anywhere else (middle & right) -> next clip
// - press & hold -> pause the current clip, release resumes (never navigates)

const HOLD_DELAY_MS = 240;
const MOVE_TOLERANCE_PX = 12;
export const PREVIOUS_ZONE_RATIO = 0.33;

export function resolveTapZone(clientX, rect) {
  if (!rect || rect.width <= 0) return "next";
  const relative = (clientX - rect.left) / rect.width;
  return relative < PREVIOUS_ZONE_RATIO ? "prev" : "next";
}

export function attachFeedGestures(layerEl, { onTap, onHoldStart, onHoldEnd }) {
  if (!layerEl) return () => {};

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let moved = false;
  let holdActive = false;
  let holdTimer = null;

  const clearHoldTimer = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  const finish = (e, allowTap) => {
    clearHoldTimer();
    const wasHolding = holdActive;
    const wasMoved = moved;
    holdActive = false;
    const pointerId = activePointerId;
    activePointerId = null;
    try {
      if (pointerId !== null && layerEl.hasPointerCapture?.(pointerId)) {
        layerEl.releasePointerCapture(pointerId);
      }
    } catch {}

    if (wasHolding) {
      onHoldEnd?.();
      return;
    }
    if (allowTap && !wasMoved && e) {
      onTap?.(resolveTapZone(e.clientX, layerEl.getBoundingClientRect()));
    }
  };

  const handleDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    if (activePointerId !== null) return;
    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    moved = false;
    holdActive = false;
    try {
      layerEl.setPointerCapture?.(e.pointerId);
    } catch {}
    clearHoldTimer();
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (activePointerId === null || moved) return;
      holdActive = true;
      onHoldStart?.();
    }, HOLD_DELAY_MS);
  };

  const handleMove = (e) => {
    if (e.pointerId !== activePointerId) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE_PX) {
      moved = true;
      if (!holdActive) clearHoldTimer();
    }
  };

  const handleUp = (e) => {
    if (e.pointerId !== activePointerId) return;
    e.stopPropagation();
    finish(e, true);
  };

  const handleCancel = (e) => {
    if (e.pointerId !== activePointerId) return;
    finish(e, false);
  };

  const swallow = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  layerEl.addEventListener("pointerdown", handleDown);
  layerEl.addEventListener("pointermove", handleMove);
  layerEl.addEventListener("pointerup", handleUp);
  layerEl.addEventListener("pointercancel", handleCancel);
  layerEl.addEventListener("click", swallow);
  layerEl.addEventListener("contextmenu", swallow);

  return () => {
    clearHoldTimer();
    if (holdActive) onHoldEnd?.();
    layerEl.removeEventListener("pointerdown", handleDown);
    layerEl.removeEventListener("pointermove", handleMove);
    layerEl.removeEventListener("pointerup", handleUp);
    layerEl.removeEventListener("pointercancel", handleCancel);
    layerEl.removeEventListener("click", swallow);
    layerEl.removeEventListener("contextmenu", swallow);
  };
}

