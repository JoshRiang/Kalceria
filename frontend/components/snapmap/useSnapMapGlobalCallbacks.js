"use client";

import { useEffect, useRef } from "react";
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
  const latestRef = useRef({});
  latestRef.current = {
    events,
    onEditEvent,
    onRequestCollab,
    onPromptCancelRequest,
    onOpenRequests,
    onCollaboratorUpload,
    isSelfOffline,
  };

  // Wire global event popup callbacks with stable window delegation (never unbinds across polling updates)
  useEffect(() => {
    window.__kalceriaEditEvent = (id) => {
      const { isSelfOffline, events, onEditEvent } = latestRef.current;
      if (isSelfOffline) return;
      const target = (events || []).find((e) => String(e.id) === String(id));
      if (target && onEditEvent) onEditEvent(target);
    };
    window.__kalceriaRequestCollab = (id) => {
      const { isSelfOffline, onRequestCollab } = latestRef.current;
      if (isSelfOffline) return;
      onRequestCollab?.(id);
    };
    window.__kalceriaPromptCancelRequest = (id, title) => {
      const { isSelfOffline, onPromptCancelRequest } = latestRef.current;
      if (isSelfOffline) return;
      onPromptCancelRequest?.(id, title);
    };
    window.__kalceriaOpenRequests = (id) => {
      const { isSelfOffline, onOpenRequests } = latestRef.current;
      if (isSelfOffline) return;
      onOpenRequests?.(id);
    };
    window.__kalceriaCollaboratorUpload = (id) => {
      const { isSelfOffline, onCollaboratorUpload } = latestRef.current;
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
  }, []);
}
