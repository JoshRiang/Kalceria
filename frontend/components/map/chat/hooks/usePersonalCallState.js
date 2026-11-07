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
  const targetUserId = String(targetUser?.id || "");
  const mode = callState?.mode || "voice";
  const isIncomingAnswer = Boolean(callState?.isIncoming);
  const incomingOfferSdp = callState?.offerSdp || null;

  const [status, setStatus] = useState(isIncomingAnswer ? "connected" : "calling"); // "calling" | "ringing" | "connected" | "ended"
  const [seconds, setSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isBadConnection, setIsBadConnection] = useState(false);
  const [safetyCode, setSafetyCode] = useState("");
  const [showSafetyTooltip, setShowSafetyTooltip] = useState(false);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pcRef = useRef(null);
  const callCtrlChannelRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const secondsRef = useRef(0);
  const activeCallIdRef = useRef(callState?.callId || `call_${Date.now()}`);
  const pollTimerRef = useRef(null);
  const isHungUpRef = useRef(false);
  const isCamOffRef = useRef(isCamOff);
  const statusRef = useRef(status);
  const camMountSyncedRef = useRef(false);
  isCamOffRef.current = isCamOff;
  statusRef.current = status;

  const targetUserRef = useRef(targetUser);
  const onEndCallRef = useRef(onEndCall);
  const onPermissionNeededRef = useRef(onPermissionNeeded);
  targetUserRef.current = targetUser;
  onEndCallRef.current = onEndCall;
  onPermissionNeededRef.current = onPermissionNeeded;

  // Teardown WebRTC and Media Hardware
  const teardownCall = useCallback(() => {
    isHungUpRef.current = true;
    stopCallRingtone();
    pendingIceCandidatesRef.current = [];

    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (callCtrlChannelRef.current) {
      try {
        callCtrlChannelRef.current.close();
      } catch {}
      callCtrlChannelRef.current = null;
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

    remoteStreamRef.current = null;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setHasLocalStream(false);
    setHasRemoteStream(false);
    setIsRemoteCamOff(false);
  }, []);

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
    generateSafetyCode(currentUser?.id || "me", targetUserId).then((code) => {
      if (active) setSafetyCode(code);
    });
    return () => {
      active = false;
    };
  }, [targetUserId, currentUser?.id]);

  // Main Call Lifecycle and WebRTC Pipeline
  useEffect(() => {
    if (!targetUserId) return;
    isHungUpRef.current = false;
    secondsRef.current = 0;
    pendingIceCandidatesRef.current = [];
    let cancelled = false;

    const flushPendingIceCandidates = async (pcInstance) => {
      if (!pcInstance || !pcInstance.remoteDescription) return;
      const queued = pendingIceCandidatesRef.current.splice(0);
      for (const cand of queued) {
        try {
          await pcInstance.addIceCandidate(new RTCIceCandidate(cand));
        } catch {}
      }
    };

    async function initCall() {
      // 1. Safe Hardware Acquisition FIRST (Mic only for voice, Mic + Camera for video)
      // Do NOT start outgoing ringtone before hardware permission is confirmed!
      let stream = null;
      try {
        if (mode === "video") {
          try {
            stream = await acquireCameraStream({ facingMode: "user" }, true);
          } catch (camErr) {
            if (camErr?.code === "PERMISSION_DENIED") {
              throw camErr;
            }
            // Camera unavailable or busy: fall back to microphone-only so video call still connects cleanly with camera-off state
            stream = await acquireMicrophoneStream();
            isCamOffRef.current = true;
            setIsCamOff(true);
          }
        } else {
          stream = await acquireMicrophoneStream();
        }
      } catch (hardwareErr) {
        stopCallRingtone();
        if (cancelled) return;
        if (hardwareErr.code === "PERMISSION_DENIED" && onPermissionNeededRef.current) {
          onPermissionNeededRef.current(mode === "video" ? "camera" : "mic");
          return;
        }
        // Device not found, busy, or denied: immediately cancel call & abort stuck state
        setStatus("ended");
        teardownCall();
        onEndCallRef.current?.({ mode, seconds: 0 });
        return;
      }

      if (cancelled) {
        if (stream) stopMediaStream(stream);
        return;
      }

      // 2. Hardware acquired cleanly — now start Outgoing Ringtone if initiating call
      if (!isIncomingAnswer) {
        setStatus("calling");
        startOutgoingRingtone();
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
      const attachControlDataChannel = (dc) => {
        if (!dc) return;
        callCtrlChannelRef.current = dc;
        dc.onopen = () => {
          try {
            dc.send(
              JSON.stringify({
                type: "cam_state",
                isCamOff: Boolean(isCamOffRef.current),
                ts: Date.now(),
              })
            );
          } catch {}
        };
        dc.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(ev.data);
            if (parsed?.type === "cam_state") {
              setIsRemoteCamOff(Boolean(parsed.isCamOff));
            } else if (parsed?.type === "hangup" && !isHungUpRef.current) {
              stopCallRingtone();
              setStatus("ended");
              const callDuration = secondsRef.current;
              setTimeout(() => {
                teardownCall();
                onEndCallRef.current?.({ mode, seconds: callDuration });
              }, 500);
            }
          } catch {}
        };
      };

      if (typeof RTCPeerConnection !== "undefined") {
        try {
          pc = new RTCPeerConnection(RTC_CONFIG);
          pcRef.current = pc;

          if (!isIncomingAnswer) {
            try {
              const ctrlDc = pc.createDataChannel("kalceria_call_ctrl", { ordered: true });
              attachControlDataChannel(ctrlDc);
            } catch {}
          } else {
            pc.ondatachannel = (ev) => {
              if (ev.channel?.label === "kalceria_call_ctrl") {
                attachControlDataChannel(ev.channel);
              }
            };
          }

          if (stream) {
            stream.getTracks().forEach((track) => {
              pc.addTrack(track, stream);
            });
          }

          // Network Stack Monitor: detect lost or degraded VoIP connection
          pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            if (state === "disconnected" || state === "failed") {
              setIsBadConnection(true);
            } else if (state === "connected" || state === "completed") {
              setIsBadConnection(false);
            }
          };

          pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === "disconnected" || state === "failed") {
              setIsBadConnection(true);
            } else if (state === "connected") {
              setIsBadConnection(false);
            }
          };

          // Remote stream receiver: store & attach live WebRTC media directly to players
          pc.ontrack = (event) => {
            let incomingStream = event.streams?.[0];
            if (!incomingStream) {
              if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
              }
              remoteStreamRef.current.addTrack(event.track);
              incomingStream = remoteStreamRef.current;
            } else {
              remoteStreamRef.current = incomingStream;
            }

            const hasVideoTrack = incomingStream.getVideoTracks().length > 0;
            setHasRemoteStream(mode === "video" ? hasVideoTrack : true);
            if (remoteVideoRef.current && mode === "video" && hasVideoTrack) {
              remoteVideoRef.current.srcObject = incomingStream;
              remoteVideoRef.current.play?.().catch(() => {});
            }
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = incomingStream;
              remoteAudioRef.current.play?.().catch(() => {});
            }
          };

          // ICE Candidate forwarder
          pc.onicecandidate = (event) => {
            if (event.candidate && targetUserId) {
              postCallSignal(targetUserId, {
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
            await flushPendingIceCandidates(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            postCallSignal(targetUserId, {
              callId: activeCallIdRef.current,
              callMode: mode,
              signalType: "answer",
              nonce: generateCryptoNonce(),
              encryptedPayload: JSON.stringify(answer),
            }).catch(() => {});

            if (isCamOffRef.current && mode === "video") {
              postCallSignal(targetUserId, {
                callId: activeCallIdRef.current,
                callMode: mode,
                signalType: "cam_state",
                nonce: generateCryptoNonce(),
                encryptedPayload: JSON.stringify({ isCamOff: true }),
              }).catch(() => {});
            }
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
        postCallSignal(targetUserId, {
          callId,
          callMode: mode,
          signalType: "offer",
          nonce: generateCryptoNonce(),
          encryptedPayload: offerSdpString || btoa(JSON.stringify({ sdpType: "e2ee_offer", mode, ts: Date.now() })),
        }).catch(() => {});

        // Transition from Calling to Ringing once offer is dispatched
        setTimeout(() => {
          if (!cancelled && !isHungUpRef.current) {
            setStatus((prev) => (prev === "calling" ? "ringing" : prev));
          }
        }, 750);
      }

      // 5. Adaptive Polling Loop for Peer Signals (Ringing / Answer / ICE / CamState / Hangup)
      // Fast 450ms handshake during call establishment; relaxes to 1000ms once connected
      const runSignalPoll = async () => {
        if (cancelled || isHungUpRef.current) return;
        try {
          const res = await fetchCallSignals({ clear: "true" });
          const signals = res?.signals || [];

          for (const sig of signals) {
            if (sig.callId && sig.callId !== activeCallIdRef.current) continue;

            if (sig.signalType === "hangup") {
              stopCallRingtone();
              setStatus("ended");
              const callDuration = secondsRef.current;
              setTimeout(() => {
                teardownCall();
                onEndCallRef.current?.({ mode, seconds: callDuration });
              }, 700);
              return;
            }

            if (sig.signalType === "cam_state" && sig.encryptedPayload) {
              try {
                const camPayload = JSON.parse(sig.encryptedPayload);
                setIsRemoteCamOff(Boolean(camPayload?.isCamOff));
              } catch {}
            }

            if (sig.signalType === "ringing" && !isIncomingAnswer) {
              setStatus((prev) => (prev === "calling" ? "ringing" : prev));
            }

            if (sig.signalType === "answer" && !isIncomingAnswer) {
              stopCallRingtone();
              setStatus("connected");
              if (pcRef.current && sig.encryptedPayload) {
                try {
                  const answerDesc = JSON.parse(sig.encryptedPayload);
                  await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerDesc));
                  await flushPendingIceCandidates(pcRef.current);
                } catch {}
              }
            }

            if (sig.signalType === "ice" && pcRef.current && sig.encryptedPayload) {
              try {
                const candidateObj = JSON.parse(sig.encryptedPayload);
                if (pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(candidateObj));
                } else {
                  pendingIceCandidatesRef.current.push(candidateObj);
                }
              } catch {}
            }
          }
        } catch {}

        if (!cancelled && !isHungUpRef.current) {
          const nextDelay = statusRef.current === "connected" ? 1000 : 450;
          pollTimerRef.current = setTimeout(runSignalPoll, nextDelay);
        }
      };

      pollTimerRef.current = setTimeout(runSignalPoll, 350);
    }

    initCall();

    return () => {
      cancelled = true;
      teardownCall();
    };
  }, [
    targetUserId,
    mode,
    isIncomingAnswer,
    incomingOfferSdp,
    teardownCall,
  ]);

  // Toggle Speaker: update mute on remote media elements
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  // Toggle Microphone Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMicMuted;
      });
    }
  }, [isMicMuted]);

  // Toggle Camera Mute + Real-Time Peer Camera State Sync (DataChannel + Signal Queue Fallback)
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isCamOff;
      });
    }

    const dc = callCtrlChannelRef.current;
    if (dc && dc.readyState === "open") {
      try {
        dc.send(JSON.stringify({ type: "cam_state", isCamOff: Boolean(isCamOff), ts: Date.now() }));
      } catch {}
    }

    if (!camMountSyncedRef.current) {
      camMountSyncedRef.current = true;
      if (!isCamOff) return;
    }

    if (mode === "video" && targetUserId && !isHungUpRef.current) {
      postCallSignal(targetUserId, {
        callId: activeCallIdRef.current,
        callMode: mode,
        signalType: "cam_state",
        nonce: generateCryptoNonce(),
        encryptedPayload: JSON.stringify({ isCamOff: Boolean(isCamOff) }),
      }).catch(() => {});
    }
  }, [isCamOff, mode, targetUserId]);

  // Reactive binding: ensure local & remote media elements play stream as soon as elements mount
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && mode === "video" && !isCamOff) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play?.().catch(() => {});
      }
    }
  }, [hasLocalStream, isCamOff, mode, status]);

  useEffect(() => {
    if (remoteStreamRef.current) {
      if (remoteVideoRef.current && mode === "video") {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        if (!isRemoteCamOff) {
          remoteVideoRef.current.play?.().catch(() => {});
        }
      }
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStreamRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.play?.().catch(() => {});
        }
      }
    }
  }, [hasRemoteStream, isRemoteCamOff, mode, status]);

  const handleHangup = useCallback(() => {
    stopCallRingtone();
    setStatus("ended");
    const dc = callCtrlChannelRef.current;
    if (dc && dc.readyState === "open") {
      try {
        dc.send(JSON.stringify({ type: "hangup", ts: Date.now() }));
      } catch {}
    }
    if (targetUserId) {
      postCallSignal(targetUserId, {
        callId: activeCallIdRef.current,
        callMode: mode,
        signalType: "hangup",
        nonce: generateCryptoNonce(),
      }).catch(() => {});
    }
    const finalSeconds = secondsRef.current;
    setTimeout(() => {
      teardownCall();
      onEndCallRef.current?.({ mode, seconds: finalSeconds });
    }, 750);
  }, [targetUserId, mode, teardownCall]);

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
    isRemoteCamOff,
    hasLocalStream,
    hasRemoteStream,
    isBadConnection,
    safetyCode,
    showSafetyTooltip,
    setShowSafetyTooltip,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    handleHangup,
  };
}
