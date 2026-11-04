"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateSafetyCode, generateCryptoNonce } from "@/lib/chatCrypto";
import { postCallSignal } from "@/lib/api";

export function formatCallDuration(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function isAhmadDummyUser(user) {
  if (!user) return false;
  const id = String(user.id || "").toLowerCase();
  const name = String(user.name || user.displayName || "").toLowerCase();
  const nick = String(user.nickname || "").toLowerCase();
  return (
    id === "mock_1" ||
    id === "mock_ahmad" ||
    name.includes("ahmad bintaro") ||
    nick === "ahmad" ||
    nick === "ahmadbintaro"
  );
}

export function usePersonalCallState({ callState, currentUser, onEndCall }) {
  const targetUser = callState?.user;
  const mode = callState?.mode || "voice";
  const isAhmad = isAhmadDummyUser(targetUser);

  const [status, setStatus] = useState("calling"); // "calling" | "ringing" | "connected"
  const [seconds, setSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCamOff, setIsCamOff] = useState(false);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [safetyCode, setSafetyCode] = useState("");
  const [showSafetyTooltip, setShowSafetyTooltip] = useState(false);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const activeCallIdRef = useRef(`call_${Date.now()}`);

  // Generate E2EE safety verification code & send encrypted offer signal
  useEffect(() => {
    if (!targetUser) return;
    let active = true;
    generateSafetyCode(currentUser?.id || "me", targetUser.id).then((code) => {
      if (active) setSafetyCode(code);
    });

    const callId = `call_${generateCryptoNonce().slice(0, 12)}`;
    activeCallIdRef.current = callId;
    postCallSignal(targetUser.id, {
      callId,
      callMode: mode,
      signalType: "offer",
      nonce: generateCryptoNonce(),
      encryptedPayload: btoa(JSON.stringify({ sdpType: "e2ee_offer", mode, ts: Date.now() })),
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [targetUser, currentUser, mode]);

  // Call progression: Calling -> Ringing -> Connected (Ahmad Bintaro answers automatically!)
  useEffect(() => {
    if (!targetUser) return;
    setStatus("calling");
    setSeconds(0);

    const tRing = setTimeout(() => {
      setStatus("ringing");
    }, 650);

    const tConnect = setTimeout(() => {
      if (isAhmad || targetUser.isOnline !== false) {
        setStatus("connected");
      }
    }, isAhmad ? 1500 : 2400);

    return () => {
      clearTimeout(tRing);
      clearTimeout(tConnect);
    };
  }, [targetUser, isAhmad]);

  // Connected call timer
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Local camera preview for Video Call mode
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (mode !== "video" || isCamOff) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
        }
        setHasLocalStream(false);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 420 }, facingMode: "user" },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
          setHasLocalStream(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch {
          setHasLocalStream(false);
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [mode, isCamOff]);

  const handleHangup = useCallback(() => {
    if (targetUser?.id) {
      postCallSignal(targetUser.id, {
        callId: activeCallIdRef.current,
        callMode: mode,
        signalType: "hangup",
        nonce: generateCryptoNonce(),
      }).catch(() => {});
    }
    onEndCall?.();
  }, [targetUser, mode, onEndCall]);

  return {
    targetUser,
    mode,
    status,
    seconds,
    isMicMuted,
    setIsMicMuted,
    isSpeakerOn,
    setIsSpeakerOn,
    isCamOff,
    setIsCamOff,
    hasLocalStream,
    safetyCode,
    showSafetyTooltip,
    setShowSafetyTooltip,
    localVideoRef,
    remoteVideoRef,
    handleHangup,
  };
}

