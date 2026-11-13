/**
 * popupFeedDeletePrompt.js
 * Modular helper for Feed Deletion Confirmation Overlay on Event Card & Broadcast Box.
 *
 * Rules:
 * - Reply Icon replaced with Trashcan Icon (same 13x13 size, theme stroke).
 * - On tap, the media box transitions into a fade-in blur layer.
 * - Typography: Arial non-bold, not all capital (like Allow Camera, smaller size).
 *   - "Erase" is Bold Red (#ef4444).
 *   - "this Feed by" is normal weight.
 *   - "<X>" is user display name in Bold.
 * - "Yes" and "No" buttons with zero outer box, inheriting Allow Camera / Allow Mic behavior.
 */

export function getTrashIconSvg(isMapDark) {
  const stroke = isMapDark ? "#ffffff" : "#000000";
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
}

export function getReplyIconSvg(isMapDark) {
  const stroke = isMapDark ? "#ffffff" : "#000000";
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>`;
}

export function showFeedDeletePrompt({
  targetBoxEl,
  isMapDark = true,
  authorDisplayName = "You",
  onConfirm,
  onCancel,
}) {
  if (!targetBoxEl || typeof document === "undefined") return;

  hideFeedDeletePrompt(targetBoxEl);

  const prevPosition = targetBoxEl.style.position;
  if (!prevPosition || prevPosition === "static") {
    targetBoxEl.style.position = "relative";
  }

  const overlay = document.createElement("div");
  overlay.setAttribute("data-feed-delete-overlay", "true");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.zIndex = "60";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.borderRadius = "8px";
  overlay.style.overflow = "hidden";
  overlay.style.backdropFilter = "blur(14px)";
  overlay.style.webkitBackdropFilter = "blur(14px)";
  overlay.style.background = isMapDark ? "rgba(0, 0, 0, 0.72)" : "rgba(255, 255, 255, 0.82)";
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 200ms ease";
  overlay.style.pointerEvents = "auto";
  overlay.style.userSelect = "none";

  overlay.onpointerdown = (e) => e.stopPropagation();
  overlay.onclick = (e) => e.stopPropagation();

  const textColor = isMapDark ? "#ffffff" : "#000000";
  const nameColor = isMapDark ? "#ffffff" : "#000000";
  const safeName = String(authorDisplayName || "You")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  overlay.innerHTML = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; font-weight: normal; color: ${textColor}; text-align: center; padding: 0 16px; margin-bottom: 14px; line-height: 1.35; text-transform: none; pointer-events: none; text-shadow: ${isMapDark ? "0 2px 10px rgba(0,0,0,0.85)" : "0 1px 6px rgba(255,255,255,0.9)"};">
      <strong style="color: #ef4444; font-weight: 700;">Erase</strong> this Feed by <strong style="color: ${nameColor}; font-weight: 700;">${safeName}</strong>?
    </div>
    <div style="display: flex; align-items: center; justify-content: center; gap: 32px; pointer-events: auto;">
      <button
        type="button"
        data-action="yes"
        style="background: transparent; border: none; padding: 4px 10px; cursor: pointer; outline: none; font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: normal; color: #ef4444; transition: transform 0.16s ease, color 0.16s ease; text-shadow: ${isMapDark ? "0 2px 10px rgba(0,0,0,0.8)" : "0 1px 6px rgba(255,255,255,0.9)"};"
      >
        Yes
      </button>
      <button
        type="button"
        data-action="no"
        style="background: transparent; border: none; padding: 4px 10px; cursor: pointer; outline: none; font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; font-weight: normal; color: ${textColor}; transition: transform 0.16s ease, color 0.16s ease; text-shadow: ${isMapDark ? "0 2px 10px rgba(0,0,0,0.8)" : "0 1px 6px rgba(255,255,255,0.9)"};"
      >
        No
      </button>
    </div>
  `;

  const yesBtn = overlay.querySelector('[data-action="yes"]');
  const noBtn = overlay.querySelector('[data-action="no"]');

  [yesBtn, noBtn].forEach((btn) => {
    if (!btn) return;
    btn.onmouseenter = () => {
      btn.style.transform = "scale(1.12)";
    };
    btn.onmouseleave = () => {
      btn.style.transform = "scale(1)";
    };
    btn.onmousedown = () => {
      btn.style.transform = "scale(0.95)";
    };
  });

  if (noBtn) {
    noBtn.onclick = (e) => {
      e.stopPropagation();
      noBtn.style.transform = "scale(1.22)";
      setTimeout(() => {
        hideFeedDeletePrompt(targetBoxEl);
        onCancel?.();
      }, 160);
    };
  }

  if (yesBtn) {
    yesBtn.onclick = (e) => {
      e.stopPropagation();
      yesBtn.style.transform = "scale(1.22)";
      setTimeout(() => {
        hideFeedDeletePrompt(targetBoxEl);
        onConfirm?.();
      }, 160);
    };
  }

  targetBoxEl.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });
}

export function hideFeedDeletePrompt(targetBoxEl) {
  if (!targetBoxEl || typeof targetBoxEl.querySelector !== "function") return;
  const existing = targetBoxEl.querySelector('[data-feed-delete-overlay]');
  if (existing) {
    existing.style.opacity = "0";
    setTimeout(() => {
      existing.remove();
    }, 200);
  }
}
