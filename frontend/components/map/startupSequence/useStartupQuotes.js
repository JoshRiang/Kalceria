"use client";

import { useState, useEffect } from "react";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import { QUOTES } from "./startupConstants";

export function useStartupQuotes({ showStartup }) {
  const [currentQuote, setCurrentQuote] = useState("Composing the map...");

  useEffect(() => {
    if (!showStartup) return;
    const random = createRuntimeSeededRandom("map-startup-quotes-v1");
    let timeoutId = null;

    const changeQuote = () => {
      setCurrentQuote((prev) => {
        const available = QUOTES.filter((q) => q !== prev);
        return available[Math.floor(random() * available.length)];
      });
      const nextDelay = 750 + random() * 950;
      timeoutId = setTimeout(changeQuote, nextDelay);
    };

    timeoutId = setTimeout(changeQuote, 900);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showStartup]);

  return { currentQuote };
}
