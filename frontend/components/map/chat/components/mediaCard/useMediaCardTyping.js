"use client";

import { useState, useEffect } from "react";

export function useMediaCardTyping({
  cardRef,
  captionGraphemes,
  itemText,
  isZoomOpen,
}) {
  const [typedText, setTypedText] = useState("");
  const [hasFinishedTyping, setHasFinishedTyping] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [zoomTypedText, setZoomTypedText] = useState("");
  const [hasZoomFinishedTyping, setHasZoomFinishedTyping] = useState(false);

  // Viewport intersection observer: start typing only when user actually sees it
  useEffect(() => {
    if (!cardRef.current || hasFinishedTyping || !captionGraphemes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [hasFinishedTyping, captionGraphemes.length]);

  // Typing animation character by character on card front (codepoint-safe for emojis)
  useEffect(() => {
    if (!isInView || hasFinishedTyping || !captionGraphemes.length) {
      if (hasFinishedTyping && itemText) setTypedText(itemText);
      return;
    }

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      setTypedText(captionGraphemes.slice(0, currentIdx).join(""));
      if (currentIdx >= captionGraphemes.length) {
        clearInterval(interval);
        setHasFinishedTyping(true);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [isInView, hasFinishedTyping, captionGraphemes, itemText]);

  // Re-run character-by-character typing animation whenever Zoom-In center modal opens
  useEffect(() => {
    if (!isZoomOpen || !captionGraphemes.length) {
      setZoomTypedText("");
      setHasZoomFinishedTyping(false);
      return;
    }

    setZoomTypedText("");
    setHasZoomFinishedTyping(false);
    let currentIdx = 0;
    let intervalId = null;

    // Begin typing right as the Genie box settles toward center
    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        currentIdx++;
        setZoomTypedText(captionGraphemes.slice(0, currentIdx).join(""));
        if (currentIdx >= captionGraphemes.length) {
          clearInterval(intervalId);
          setHasZoomFinishedTyping(true);
        }
      }, 38);
    }, 160);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isZoomOpen, captionGraphemes]);

  return {
    typedText,
    hasFinishedTyping,
    zoomTypedText,
    hasZoomFinishedTyping,
  };
}
