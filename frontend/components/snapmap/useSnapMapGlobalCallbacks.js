"use client";

import { useEffect } from "react";

export function useSnapMapGlobalCallbacks({
  events,
  onEditEvent,
  onRequestCollab,
  onPromptCancelRequest,
  onOpenRequests,
  onCollaboratorUpload,
  isSelfOffline = false,
}) {
  // Wire global event popup callbacks (edit, collab request, cancel request, open requests — suppressed when self is offline)
  useEffect(() => {
    window.__kalceriaEditEvent = (id) => {
      if (isSelfOffline) return;
      const target = (events || []).find((e) => String(e.id) === String(id));
      if (target && onEditEvent) onEditEvent(target);
    };
    window.__kalceriaRequestCollab = (id) => {
      if (isSelfOffline) return;
      onRequestCollab?.(id);
    };
    window.__kalceriaPromptCancelRequest = (id, title) => {
      if (isSelfOffline) return;
      onPromptCancelRequest?.(id, title);
    };
    window.__kalceriaOpenRequests = (id) => {
      if (isSelfOffline) return;
      onOpenRequests?.(id);
    };
    window.__kalceriaCollaboratorUpload = (id) => {
      if (isSelfOffline) return;
      onCollaboratorUpload?.(id);
    };

    const activeCarouselTimers = new Map();

    const initCarousel = (safeId) => {
      if (typeof document === "undefined") return;
      const container = document.getElementById(`event-carousel-${safeId}`);
      if (!container) return;

      const slides = Array.from(container.querySelectorAll("[data-carousel-slide]"));
      const fills = Array.from(container.querySelectorAll("[data-carousel-fill]"));
      if (slides.length === 0) return;

      // Avoid double initialization if already active
      if (container.dataset.initialized === "true" && container.__kalceriaShowSlide) {
        return;
      }
      container.dataset.initialized = "true";

      let currentIndex = 0;

      const clearTimer = () => {
        const existingTimer = activeCarouselTimers.get(safeId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          activeCarouselTimers.delete(safeId);
        }
      };

      const showSlide = (targetIdx) => {
        clearTimer();
        const N = slides.length;
        const normalizedIdx = ((targetIdx % N) + N) % N;
        currentIndex = normalizedIdx;

        // Adapt aspect ratio to frame
        const frameBox = container.closest(".popup-video");
        const adaptAspect = (w, h) => {
          if (!frameBox || !w || !h) return;
          const ratio = w / h;
          frameBox.style.transition = "height 0.32s cubic-bezier(0.4, 0, 0.2, 1)";
          if (ratio >= 1.25) {
            frameBox.style.height = "164px";
          } else {
            frameBox.style.height = "134px";
          }
        };

        slides.forEach((slide, sIdx) => {
          const isCurrent = sIdx === normalizedIdx;
          slide.style.opacity = isCurrent ? "1" : "0";
          slide.style.zIndex = isCurrent ? "5" : "1";
          slide.style.pointerEvents = isCurrent ? "auto" : "none";

          const vid = slide.querySelector("video");
          if (vid) {
            if (isCurrent) {
              try {
                vid.currentTime = 0;
                vid.play().catch(() => {});
              } catch {}
            } else {
              try {
                vid.pause();
              } catch {}
            }
          }
        });

        // Set static state for inactive fills
        fills.forEach((fill, fIdx) => {
          if (fIdx < normalizedIdx) {
            fill.style.transition = "none";
            fill.style.width = "100%";
            fill.style.opacity = "1";
          } else if (fIdx > normalizedIdx) {
            fill.style.transition = "none";
            fill.style.width = "0%";
            fill.style.opacity = "0.35";
          }
        });

        const activeSlide = slides[normalizedIdx];
        const activeFill = fills[normalizedIdx];
        if (!activeSlide || !activeFill) return;

        // Reset current fill before starting transition
        activeFill.style.transition = "none";
        activeFill.style.width = "0%";
        activeFill.style.opacity = "1";

        const vid = activeSlide.querySelector("video");
        const img = activeSlide.querySelector("img");

        if (vid) {
          let hasStartedProgress = false;

          const startVideoProgress = (force = false) => {
            const hasRealDuration = vid.duration && isFinite(vid.duration) && vid.duration > 0.5;
            if (!hasRealDuration && !force) {
              return;
            }
            if (hasStartedProgress && !force) return;
            hasStartedProgress = true;

            const duration = hasRealDuration ? vid.duration : 4.0;

            if (vid.videoWidth && vid.videoHeight) {
              adaptAspect(vid.videoWidth, vid.videoHeight);
            }

            // Always reset fill to 0% first with transition none to guarantee clean animation restart
            activeFill.style.transition = "none";
            activeFill.style.width = "0%";
            activeFill.style.opacity = "1";
            void activeFill.offsetWidth;

            // Trigger linear CSS fill transition matching actual video duration
            activeFill.style.transition = `width ${duration}s linear`;
            activeFill.style.width = "100%";

            clearTimer();
            const timer = setTimeout(() => {
              if (N > 1) {
                showSlide(normalizedIdx + 1);
              } else {
                showSlide(0);
              }
            }, duration * 1000);
            activeCarouselTimers.set(safeId, timer);
          };

          // Attach listeners to catch actual video duration as soon as available
          vid.onloadedmetadata = () => startVideoProgress();
          vid.ondurationchange = () => startVideoProgress();
          vid.oncanplay = () => startVideoProgress();
          vid.onplaying = () => startVideoProgress();

          if (vid.readyState >= 1 && vid.duration && isFinite(vid.duration) && vid.duration > 0.5) {
            startVideoProgress();
          } else {
            clearTimer();
            const fallbackTimer = setTimeout(() => {
              startVideoProgress(true);
            }, 3500);
            activeCarouselTimers.set(safeId, fallbackTimer);
          }

          vid.onended = () => {
            clearTimer();
            if (N > 1) {
              showSlide(normalizedIdx + 1);
            } else {
              showSlide(0);
            }
          };
        } else {
          // Photo duration: strictly 3 seconds
          if (img && img.naturalWidth && img.naturalHeight) {
            adaptAspect(img.naturalWidth, img.naturalHeight);
          } else if (img) {
            img.onload = () => adaptAspect(img.naturalWidth, img.naturalHeight);
          }

          const photoDuration = 3.0; // 3 seconds
          void activeFill.offsetWidth;
          activeFill.style.transition = `width ${photoDuration}s linear`;
          activeFill.style.width = "100%";

          clearTimer();
          const timer = setTimeout(() => {
            if (N > 1) {
              showSlide(normalizedIdx + 1);
            } else {
              showSlide(0);
            }
          }, photoDuration * 1000);
          activeCarouselTimers.set(safeId, timer);
        }
      };

      container.__kalceriaShowSlide = showSlide;
      container.__kalceriaPrev = () => {
        showSlide(currentIndex - 1);
      };
      container.__kalceriaNext = () => {
        showSlide(currentIndex + 1);
      };

      // Auto start on first slide
      showSlide(0);
    };

    window.__kalceriaInitEventCarousel = (safeId) => {
      initCarousel(safeId);
    };

    window.__kalceriaSwitchEventMedia = (safeId, targetIdx) => {
      if (typeof document === "undefined") return;
      const container = document.getElementById(`event-carousel-${safeId}`);
      if (container?.__kalceriaShowSlide) {
        container.__kalceriaShowSlide(Number(targetIdx));
      } else {
        initCarousel(safeId);
        setTimeout(() => {
          document.getElementById(`event-carousel-${safeId}`)?.__kalceriaShowSlide?.(Number(targetIdx));
        }, 50);
      }
    };

    window.__kalceriaPrevEventMedia = (safeId) => {
      const container = document.getElementById(`event-carousel-${safeId}`);
      if (container?.__kalceriaPrev) {
        container.__kalceriaPrev();
      } else {
        initCarousel(safeId);
      }
    };

    window.__kalceriaNextEventMedia = (safeId) => {
      const container = document.getElementById(`event-carousel-${safeId}`);
      if (container?.__kalceriaNext) {
        container.__kalceriaNext();
      } else {
        initCarousel(safeId);
      }
    };
    return () => {
      activeCarouselTimers.forEach((timer) => clearTimeout(timer));
      activeCarouselTimers.clear();
      delete window.__kalceriaEditEvent;
      delete window.__kalceriaRequestCollab;
      delete window.__kalceriaPromptCancelRequest;
      delete window.__kalceriaOpenRequests;
      delete window.__kalceriaCollaboratorUpload;
      delete window.__kalceriaInitEventCarousel;
      delete window.__kalceriaSwitchEventMedia;
      delete window.__kalceriaPrevEventMedia;
      delete window.__kalceriaNextEventMedia;
    };
  }, [
    events,
    onEditEvent,
    onRequestCollab,
    onPromptCancelRequest,
    onOpenRequests,
    onCollaboratorUpload,
    isSelfOffline,
  ]);
}
