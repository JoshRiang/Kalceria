import {
  applyCardGeometry,
  computeCardGeometryForMedia,
} from "./popupGeometry";
import {
  getTrashIconSvg,
  getReplyIconSvg,
  hideFeedDeletePrompt,
} from "./popupFeedDeletePrompt";

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
  const isBroadcast = Boolean(state.cardEl?.classList?.contains("broadcast-popup-box"));
  applyCardGeometry(state, computeCardGeometryForMedia(width, height, { isBroadcast }));
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

export function syncActionRow(state, incomingEl) {
  if (!state || !incomingEl) return;
  try {
    const cardEl =
      state.containerEl?.closest?.(`[data-event-card-id="${state.safeId}"]`) ||
      (typeof document !== "undefined"
        ? document.querySelector(`[data-event-card-id="${state.safeId}"]`)
        : null);
    if (!cardEl) return;

    // Clean up any pending delete prompt overlay on slide transition
    hideFeedDeletePrompt(cardEl.querySelector(".popup-video"));

    const avatarEl = cardEl.querySelector(`[data-media-author-avatar="${state.safeId}"]`);
    if (avatarEl && incomingEl.dataset.authorAvatar) {
      avatarEl.src = incomingEl.dataset.authorAvatar;
      if (incomingEl.dataset.authorName) {
        avatarEl.alt = incomingEl.dataset.authorName;
        const wrapEl = cardEl.querySelector(`[data-media-author-avatar-wrap="${state.safeId}"]`);
        if (wrapEl) wrapEl.title = incomingEl.dataset.authorName;
      }
    }

    const countEl = cardEl.querySelector(`[data-media-view-count]`);
    if (countEl && incomingEl.dataset.clipId) {
      countEl.setAttribute("data-media-view-count", incomingEl.dataset.clipId);
      if (incomingEl.dataset.viewCount != null) {
        countEl.textContent = incomingEl.dataset.viewCount;
      }
    }

    const replyBtn = cardEl.querySelector(`[data-media-reply-btn="${state.safeId}"]`);
    if (replyBtn) {
      const currentUserId =
        cardEl.dataset?.currentUserId ||
        (typeof window !== "undefined" ? window.__kalceriaCurrentUserId : "") ||
        "";
      const slideAuthorId = incomingEl.dataset?.authorId || "";
      const isSelfAuthor = Boolean(
        currentUserId && slideAuthorId && String(currentUserId) === String(slideAuthorId)
      );
      const isMapDark = cardEl.classList.contains("event-card-dark");
      const clipIdx = Number(incomingEl.dataset.carouselSlide) || 0;
      const clipId = incomingEl.dataset.clipId;

      replyBtn.style.display = "flex";
      replyBtn.title = isSelfAuthor ? "Hapus feed media ini" : "Balas feed media ini";
      replyBtn.innerHTML = isSelfAuthor ? getTrashIconSvg(isMapDark) : getReplyIconSvg(isMapDark);
      if (clipId) {
        replyBtn.onclick = (e) => {
          e.stopPropagation();
          window.__kalceriaHandleMediaAction?.(state.safeId, clipId, clipIdx);
        };
      }
    }
  } catch (_) {}
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
    syncActionRow(state, incomingEl);
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

  syncActionRow(state, incomingEl);

  state.hideOutgoingTimerId = setTimeout(() => {
    if (state.destroyed) return;
    hideSlide(outgoingEl);
  }, SLIDE_TRANSITION_MS + 30);
}
