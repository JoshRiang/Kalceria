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
    window.__kalceriaSwitchEventMedia = (safeId, targetIdx) => {
      if (typeof document === "undefined") return;
      const container = document.getElementById(`event-carousel-${safeId}`);
      if (!container) return;
      const slides = container.querySelectorAll("[data-carousel-slide]");
      const fills = container.querySelectorAll("[data-carousel-fill]");
      slides.forEach((slide, idx) => {
        slide.style.animation = "none";
        slide.style.opacity = idx === Number(targetIdx) ? "1" : "0";
        slide.style.zIndex = idx === Number(targetIdx) ? "5" : "1";
        const vid = slide.querySelector("video");
        if (vid) {
          if (idx === Number(targetIdx)) {
            vid.currentTime = 0;
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        }
      });
      fills.forEach((fill, idx) => {
        fill.style.animation = "none";
        if (idx < Number(targetIdx)) {
          fill.style.width = "100%";
          fill.style.opacity = "1";
        } else if (idx === Number(targetIdx)) {
          fill.style.width = "100%";
          fill.style.opacity = "1";
        } else {
          fill.style.width = "0%";
          fill.style.opacity = "0.35";
        }
      });
    };
    return () => {
      delete window.__kalceriaEditEvent;
      delete window.__kalceriaRequestCollab;
      delete window.__kalceriaPromptCancelRequest;
      delete window.__kalceriaOpenRequests;
      delete window.__kalceriaCollaboratorUpload;
      delete window.__kalceriaSwitchEventMedia;
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
