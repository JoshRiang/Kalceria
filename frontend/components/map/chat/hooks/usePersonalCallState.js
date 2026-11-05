"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateSafetyCode, generateCryptoNonce } from "@/lib/chatCrypto";
import { postCallSignal, fetchCallSignals } from "@/lib/api";
import { startOutgoingRingtone, stopCallRingtone } from "@/lib/soundEngine";
import {
  acquireMicrophoneStream,
  acquireCameraStream,
  stopMediaStream,
  DESKTOP_FLAG as HARDWARE_DESKTOP_FLAG,
} from "@/lib/mediaHardware";

export const DESKTOP_FLAG = HARDWARE_DESKTOP_FLAG;

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

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function usePersonalCallState({
  callState,
  currentUser,
  onEndCall,
  onPermissionNeeded,
}) {
  const targetUser = callState?.user;
  const mode = callState?.mode || "voice";
  const isIncomingAnswer = Boolean(callState?.isIncoming);
  const incomingOfferSdp = callState?.offerSdp || null;

  const [status, setStatus] = useState(isIncomingAnswer ? "connected" : "calling"); // "calling" | "ringing" | "connected" | "ended"
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
  const pcRef = useRef(null);
  const activeCallIdRef = useRef(callState?.callId || `call_${Date.now()}`);
  const pollTimerRef = useRef(null);
  const isHungUpRef = useRef(false);

  // Teardown WebRTC and Media Hardware
  const teardownCall = useCallback(() => {
    isHungUpRef.current = true;
    stopCallRingtone();

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
    }

    setHasLocalStream(false);
  }, []);

  // Connected Call Timer
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Generate E2EE safety verification code
  useEffect(() => {
    if (!targetUser) return;
    let active = true;
    generateSafetyCode(currentUser?.id || "me", targetUser.id).then((code) => {
      if (active) setSafetyCode(code);
    });
    return () => {
      active = false;
    };
  }, [targetUser, currentUser]);

  // Main Call Lifecycle and WebRTC Pipeline
  useEffect(() => {
    if (!targetUser) return;
    isHungUpRef.current = false;
    let cancelled = false;

    async function initCall() {
      // 1. Play Outgoing Ringtone if initiating call
      if (!isIncomingAnswer) {
        setStatus("calling");
        startOutgoingRingtone();
      }

      // 2. Safe Hardware Acquisition (Mic only for voice, Mic + Camera for video)
      let stream = null;
      try {
        if (mode === "video") {
          stream = await acquireCameraStream({ facingMode: "user" }, true);
        } else {
          stream = await acquireMicrophoneStream();
        }
      } catch (hardwareErr) {
        stopCallRingtone();
        if (cancelled) return;
        if (hardwareErr.code === "PERMISSION_DENIED" && onPermissionNeeded) {
          onPermissionNeeded(mode === "video" ? "camera" : "mic");
          return;
        }
        // Device not found, busy, or denied: immediately cancel call & abort stuck state
        setStatus("ended");
        teardownCall();
        onEndCall?.({ mode, seconds: 0 });
        return;
      }

      if (cancelled) {
        if (stream) stopMediaStream(stream);
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        setHasLocalStream(true);
        if (localVideoRef.current && mode === "video") {
          localVideoRef.current.srcObject = stream;
        }
      }

      // 3. WebRTC Peer Connection Setup
      let pc = null;
      if (typeof RTCPeerConnection !== "undefined") {
        try {
          pc = new RTCPeerConnection(RTC_CONFIG);
          pcRef.current = pc;

          if (stream) {
            stream.getTracks().forEach((track) => {
              pc.addTrack(track, stream);
            });
          }

          // Remote stream receiver
          pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams?.[0]) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          };

          // ICE Candidate forwarder
          pc.onicecandidate = (event) => {
            if (event.candidate && targetUser?.id) {
              postCallSignal(targetUser.id, {
                callId: activeCallIdRef.current,
                callMode: mode,
                signalType: "ice",
                nonce: generateCryptoNonce(),
                encryptedPayload: JSON.stringify(event.candidate),
              }).catch(() => {});
            }
          };
        } catch {}
      }

      // 4. Outgoing Call Offer vs Incoming Call Answer
      if (isIncomingAnswer) {
        // Callee answers caller's offer
        setStatus("connected");
        stopCallRingtone();

        if (pc && incomingOfferSdp) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(incomingOfferSdp)));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            postCallSignal(targetUser.id, {
              callId: activeCallIdRef.current,
              callMode: mode,
              signalType: "answer",
              nonce: generateCryptoNonce(),
              encryptedPayload: JSON.stringify(answer),
            }).catch(() => {});
          } catch {}
        }
      } else {
        // Caller creates and dispatches offer
        const callId = `call_${generateCryptoNonce().slice(0, 12)}`;
        activeCallIdRef.current = callId;

        let offerSdpString = null;
        if (pc) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            offerSdpString = JSON.stringify(offer);
          } catch {}
        }

        // Post offer to backend (stores in Redis, event-driven, even if peer is offline)
        postCallSignal(targetUser.id, {
          callId,
          callMode: mode,
          signalType: "offer",
          nonce: generateCryptoNonce(),
          encryptedPayload: offerSdpString || btoa(JSON.stringify({ sdpType: "e2ee_offer", mode, ts: Date.now() })),
        }).catch(() => {});

        // Transition from Calling to Ringing
        setTimeout(() => {
          if (!cancelled && !isHungUpRef.current) {
            setStatus("ringing");
          }
        }, 750);
      }

      // 5. Polling Loop for Callee Response Signals (Answer / ICE / Hangup)
      pollTimerRef.current = setInterval(async () => {
        if (cancelled || isHungUpRef.current) return;
        try {
          const res = await fetchCallSignals({ clear: "true" });
          const signals = res?.signals || [];

          for (const sig of signals) {
            if (sig.callId && sig.callId !== activeCallIdRef.current) continue;

            if (sig.signalType === "hangup") {
              stopCallRingtone();
              setStatus("ended");
              const callDuration = seconds;
              setTimeout(() => {
                teardownCall();
                onEndCall?.({ mode, seconds: callDuration });
              }, 700);
              return;
            }

            if (sig.signalType === "answer" && !isIncomingAnswer) {
              stopCallRingtone();
              setStatus("connected");
              if (pcRef.current && sig.encryptedPayload) {
                try {
                  const answerDesc = JSON.parse(sig.encryptedPayload);
                  await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerDesc));
                } catch {}
              }
            }

            if (sig.signalType === "ice" && pcRef.current && sig.encryptedPayload) {
              try {
                const candidateObj = JSON.parse(sig.encryptedPayload);
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidateObj));
              } catch {}
            }
          }
        } catch {}
      }, 1200);
    }

    initCall();

    return () => {
      cancelled = true;
      teardownCall();
    };
  }, [
    targetUser,
    mode,
    isIncomingAnswer,
    incomingOfferSdp,
    onEndCall,
    onPermissionNeeded,
    teardownCall,
  ]);

  // Toggle Microphone Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMicMuted;
      });
    }
  }, [isMicMuted]);

  // Toggle Camera Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isCamOff;
      });
    }
  }, [isCamOff]);

  // Reactive binding: ensure local video element plays stream as soon as video element mounts
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && mode === "video" && !isCamOff) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play?.().catch(() => {});
      }
    }
  }, [hasLocalStream, isCamOff, mode]);

  const handleHangup = useCallback(() => {
    stopCallRingtone();
    setStatus("ended");
    if (targetUser?.id) {
      postCallSignal(targetUser.id, {
        callId: activeCallIdRef.current,
        callMode: mode,
        signalType: "hangup",
        nonce: generateCryptoNonce(),
      }).catch(() => {});
    }
    const finalSeconds = seconds;
    setTimeout(() => {
      teardownCall();
      onEndCall?.({ mode, seconds: finalSeconds });
    }, 750);
  }, [targetUser, mode, seconds, teardownCall, onEndCall]);

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
