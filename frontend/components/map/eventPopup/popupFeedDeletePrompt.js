/**
 * popupFeedDeletePrompt.js
 * Modular helper for Feed Deletion Confirmation Overlay on Event Card & Broadcast Box.
 *
 * Rules:
 * - Reply Icon replaced with Trashcan Icon (same 13x13 size, theme stroke).
 * - On tap, the media box transitions into a fade-in blur layer.
 * - Carousel playback (whiteline progress and video/image duration) pauses on open.
 * - Typography:
 *   - "Erase" is Bold Red (#ef4444).
 *   - "this Feed by" is normal weight.
 *   - "You" is user display identity in Bold.
 * - On "No": Fade out blur overlay, resume carousel progress line until media finishes naturally.
 * - On "Yes": Blur remains, transitions to a compact Arc Spinner buffer (Logging Out style),
 *   executes deletion, gracefully fades out with aesthetic slide motion & whiteline recalibration.
 */

function triggerCarouselHold(targetBoxEl, hold) {
  if (typeof window === "undefined" || !targetBoxEl) return;
  const safeId = resolveCarouselSafeId(targetBoxEl);
  if (safeId) {
    window.dispatchEvent(new CustomEvent("kalceria:carousel-hold", { detail: { safeId, hold } }));
  }
}

export function getTrashIconSvg(isMapDark) {
  const stroke = isMapDark ? "#ffffff" : "#000000";
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
}

export function getReplyIconSvg(isMapDark) {
  const stroke = isMapDark ? "#ffffff" : "#000000";
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>`;
}

function resolveCarouselSafeId(targetBoxEl) {
  if (!targetBoxEl || typeof targetBoxEl.querySelector !== "function") return null;
  const container =
    (targetBoxEl.getAttribute?.("data-carousel-container") || targetBoxEl.hasAttribute?.("data-carousel-container"))
      ? targetBoxEl
      : targetBoxEl.querySelector?.("[data-carousel-container]") || targetBoxEl.closest?.("[data-carousel-container]");
  return container?.getAttribute?.("data-carousel-container") || null;
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

  // Freeze carousel playback & whiteline progress while decision prompt is active
  triggerCarouselHold(targetBoxEl, true);

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
  // The creator/author deleting their own media is displayed as "You"
  const safeName = "You";

  overlay.innerHTML = `
    <style>
      @keyframes kalceriaDeleteSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    </style>
    <div data-feed-delete-content style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; transition: opacity 140ms ease, transform 140ms ease;">
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
    </div>
  `;

  const contentEl = overlay.querySelector('[data-feed-delete-content]');
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
      noBtn.style.transform = "scale(0.95)";
      overlay.style.opacity = "0";

      setTimeout(() => {
        overlay.remove();
        // Resume carousel whiteline progress until clip ends naturally
        triggerCarouselHold(targetBoxEl, false);
        onCancel?.();
      }, 180);
    };
  }

  if (yesBtn) {
    yesBtn.onclick = async (e) => {
      e.stopPropagation();
      yesBtn.style.transform = "scale(0.92)";

      // 1. Smoothly fade out confirmation text/buttons while KEEPING blur active
      if (contentEl) {
        contentEl.style.opacity = "0";
        contentEl.style.transform = "scale(0.95)";
      }

      // 2. Render small Logging Out style arc spinner buffer
      const spinnerEl = document.createElement("div");
      spinnerEl.setAttribute("data-feed-delete-spinner", "true");
      spinnerEl.style.position = "absolute";
      spinnerEl.style.inset = "0";
      spinnerEl.style.display = "flex";
      spinnerEl.style.alignItems = "center";
      spinnerEl.style.justifyContent = "center";
      spinnerEl.style.pointerEvents = "none";
      spinnerEl.style.opacity = "0";
      spinnerEl.style.transition = "opacity 160ms ease";

      spinnerEl.innerHTML = `
        <div style="width: 28px; height: 28px; position: relative; display: flex; align-items: center; justify-content: center;">
          <svg style="width: 100%; height: 100%; animation: kalceriaDeleteSpin 0.85s linear infinite; display: block;" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="${isMapDark ? "#ffffff" : "#000000"}"
              stroke-width="8"
              stroke-dasharray="70 200"
              stroke-linecap="round"
            />
          </svg>
        </div>
      `;

      overlay.appendChild(spinnerEl);
      requestAnimationFrame(() => {
        spinnerEl.style.opacity = "1";
      });

      // 3. Execute deletion and allow aesthetic slack for organic non-jitter motion
      const minSlackPromise = new Promise((resolve) => setTimeout(resolve, 360));
      const confirmPromise = Promise.resolve().then(() => onConfirm?.());

      try {
        await Promise.all([confirmPromise, minSlackPromise]);
      } catch (err) {
        console.warn("[popupFeedDeletePrompt] Deletion error:", err);
      }

      // 4. Graceful fade out and remove overlay
      overlay.style.transition = "opacity 200ms ease";
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
      }, 200);
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
