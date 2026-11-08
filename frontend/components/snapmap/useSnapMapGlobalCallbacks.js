"use client";

import { useEffect } from "react";
import {
  stepEventCarouselSlide,
  switchEventCarouselSlide,
} from "../map/eventPopup/popupCarouselController";

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
      switchEventCarouselSlide(safeId, targetIdx);
    };
    window.__kalceriaStepEventMedia = (safeId, delta) => {
      stepEventCarouselSlide(safeId, delta);
    };
    return () => {
      delete window.__kalceriaEditEvent;
      delete window.__kalceriaRequestCollab;
      delete window.__kalceriaPromptCancelRequest;
      delete window.__kalceriaOpenRequests;
      delete window.__kalceriaCollaboratorUpload;
      delete window.__kalceriaSwitchEventMedia;
      delete window.__kalceriaStepEventMedia;
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
