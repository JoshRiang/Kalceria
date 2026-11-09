"use client";

import { useState, useEffect, useRef } from "react";
import { generateSafetyCode } from "@/lib/chatCrypto";

export function useCallTimerAndSecurity({ status, targetUserId, currentUserId }) {
  const [seconds, setSeconds] = useState(0);
  const [safetyCode, setSafetyCode] = useState("");
  const [showSafetyTooltip, setShowSafetyTooltip] = useState(false);
  const secondsRef = useRef(0);

  // Connected Call Timer
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        secondsRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Generate E2EE safety verification code
  useEffect(() => {
    if (!targetUserId) return;
    let active = true;
    generateSafetyCode(currentUserId || "me", targetUserId).then((code) => {
      if (active) setSafetyCode(code);
    });
    return () => {
      active = false;
    };
  }, [targetUserId, currentUserId]);

  return {
    seconds,
    setSeconds,
    secondsRef,
    safetyCode,
    showSafetyTooltip,
    setShowSafetyTooltip,
  };
}
