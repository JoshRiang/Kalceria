/**
 * popupCountAnimation.js
 * Social media style slide-down / fade count up animation for Event Card & Broadcast Box.
 *
 * Behavior:
 * - Current number slides down and fades out (translateY(0%) -> translateY(100%), opacity 1 -> 0).
 * - Target number enters from the top and fades in (translateY(-100%) -> translateY(0%), opacity 0 -> 1).
 * - GPU accelerated with will-change and smooth spring easing.
 */

export function animateViewCountSlideDown(el, targetVal) {
  if (!el || typeof document === "undefined") return;

  const target = Number(targetVal);
  if (!Number.isFinite(target)) return;

  // Extract current value, resolving any pending animated span
  let currentVal = parseInt(el.textContent, 10);
  if (isNaN(currentVal) && el.querySelector) {
    const lastSpan = el.querySelector("span:last-child");
    if (lastSpan) currentVal = parseInt(lastSpan.textContent, 10);
  }
  if (isNaN(currentVal)) currentVal = 0;

  // If value hasn't increased, update text directly without animation
  if (target <= currentVal) {
    if (el._viewCountAnimTimeout) {
      clearTimeout(el._viewCountAnimTimeout);
      el._viewCountAnimTimeout = null;
    }
    el.innerHTML = "";
    el.textContent = String(target);
    return;
  }

  // Cancel any ongoing transition timer
  if (el._viewCountAnimTimeout) {
    clearTimeout(el._viewCountAnimTimeout);
    el._viewCountAnimTimeout = null;
  }

  // Ensure container layout allows smooth vertical sliding inside fixed bounds
  el.style.position = "relative";
  el.style.display = "inline-flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.overflow = "hidden";
  el.style.height = "14px";
  el.style.verticalAlign = "middle";
  el.style.minWidth = "8px";

  // Build outgoing and incoming spans
  el.innerHTML = "";

  const outgoing = document.createElement("span");
  outgoing.textContent = String(currentVal);
  outgoing.style.display = "inline-flex";
  outgoing.style.alignItems = "center";
  outgoing.style.justifyContent = "center";
  outgoing.style.transform = "translateY(0%)";
  outgoing.style.opacity = "1";
  outgoing.style.transition = "transform 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 360ms ease";
  outgoing.style.willChange = "transform, opacity";

  const incoming = document.createElement("span");
  incoming.textContent = String(target);
  incoming.style.position = "absolute";
  incoming.style.inset = "0";
  incoming.style.display = "inline-flex";
  incoming.style.alignItems = "center";
  incoming.style.justifyContent = "center";
  incoming.style.transform = "translateY(-100%)";
  incoming.style.opacity = "0";
  incoming.style.transition = "transform 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 360ms ease";
  incoming.style.willChange = "transform, opacity";

  el.appendChild(outgoing);
  el.appendChild(incoming);

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    outgoing.style.transform = "translateY(100%)";
    outgoing.style.opacity = "0";
    incoming.style.transform = "translateY(0%)";
    incoming.style.opacity = "1";
  });

  // Clean up to plain text once animation settles
  el._viewCountAnimTimeout = setTimeout(() => {
    el.innerHTML = "";
    el.textContent = String(target);
    el._viewCountAnimTimeout = null;
  }, 380);
}

