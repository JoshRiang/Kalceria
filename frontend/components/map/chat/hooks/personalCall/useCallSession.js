"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateSafetyCode, generateCryptoNonce } from "@/lib/chatCrypto";
import { postCallSignal, fetchCallSignals, fetchLiveKitCallToken } from "@/lib/api";
import { startOutgoingRingtone, stopCallRingtone } from "@/lib/soundEngine";
import { RTC_CONFIG } from "./callHelpers";

export function useCallSession({
  targetUserId,
  mode,
  isIncomingAnswer,
  incomingOfferSdp,
  callId = null,
  currentUser,
  onPermissionNeeded,
  onEndCall,
  hardware,
}) {
  const [status, setStatus] = useState(isIncomingAnswer ? "connected" : "calling"); // "calling" | "ringing" | "connected" | "ended"
  const [seconds, setSeconds] = useState(0);
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [isBadConnection, setIsBadConnection] = useState(false);
  const [safetyCode, setSafetyCode] = useState("");
  const [showSafetyTooltip, setShowSafetyTooltip] = useState(false);

  const pcRef = useRef(null);
  const callCtrlChannelRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const secondsRef = useRef(0);
  const activeCallIdRef = useRef(callId || `call_${Date.now()}`);
  const pollTimerRef = useRef(null);
  const isHungUpRef = useRef(false);
  const statusRef = useRef(status);
  const camMountSyncedRef = useRef(false);
  const livekitSessionRef = useRef(null);
  statusRef.current = status;

  const hardwareRef = useRef(hardware);
  hardwareRef.current = hardware;

  const onEndCallRef = useRef(onEndCall);
  const onPermissionNeededRef = useRef(onPermissionNeeded);
  onEndCallRef.current = onEndCall;
  onPermissionNeededRef.current = onPermissionNeeded;

  // Teardown WebRTC and Media Hardware (stable ref, never invalidates call lifecycle)
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

    hardwareRef.current?.teardownHardware?.();
    setIsRemoteCamOff(false);
    livekitSessionRef.current = null;
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
      const hw = hardwareRef.current;
      if (isIncomingAnswer && callId) {
        activeCallIdRef.current = callId;
      }

      fetchLiveKitCallToken(targetUserId, { callId: activeCallIdRef.current }).then((res) => {
        if (res?.livekitEnabled && !cancelled) {
          livekitSessionRef.current = res;
        }
      }).catch(() => {});

      // 1. Safe Hardware Acquisition FIRST
      let stream = null;
      try {
        stream = await hw.acquireHardware(mode);
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
        if (stream) hw.teardownHardware();
        return;
      }

      // 2. Hardware acquired cleanly — now start Outgoing Ringtone if initiating call
      if (!isIncomingAnswer) {
        setStatus("calling");
        startOutgoingRingtone();
      }

      if (stream) {
        hw.localStreamRef.current = stream;
        hw.setHasLocalStream(true);
        if (hw.localVideoRef.current && mode === "video") {
          hw.localVideoRef.current.srcObject = stream;
          hw.localVideoRef.current.play?.().catch(() => {});
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
                isCamOff: Boolean(hardwareRef.current.isCamOffRef.current),
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
            const activeHw = hardwareRef.current;
            let incomingStream = event.streams?.[0];
            if (!incomingStream) {
              if (!activeHw.remoteStreamRef.current) {
                activeHw.remoteStreamRef.current = new MediaStream();
              }
              activeHw.remoteStreamRef.current.addTrack(event.track);
              incomingStream = activeHw.remoteStreamRef.current;
            } else {
              activeHw.remoteStreamRef.current = incomingStream;
            }

            const hasVideoTrack = incomingStream.getVideoTracks().length > 0;
            activeHw.setHasRemoteStream(mode === "video" ? hasVideoTrack : true);
            if (activeHw.remoteVideoRef.current && mode === "video" && hasVideoTrack) {
              activeHw.remoteVideoRef.current.srcObject = incomingStream;
              activeHw.remoteVideoRef.current.play?.().catch(() => {});
            }
            if (activeHw.remoteAudioRef.current) {
              activeHw.remoteAudioRef.current.srcObject = incomingStream;
              activeHw.remoteAudioRef.current.play?.().catch(() => {});
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
            }).then((res) => {
              if (res?.livekit && !cancelled) {
                livekitSessionRef.current = res.livekit;
              }
            }).catch(() => {});

            if (hardwareRef.current.isCamOffRef.current && mode === "video") {
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
        const generatedCallId = `call_${generateCryptoNonce().slice(0, 12)}`;
        activeCallIdRef.current = generatedCallId;

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
          callId: generatedCallId,
          callMode: mode,
          signalType: "offer",
          nonce: generateCryptoNonce(),
          encryptedPayload: offerSdpString || btoa(JSON.stringify({ sdpType: "e2ee_offer", mode, ts: Date.now() })),
        }).then((res) => {
          if (res?.livekit && !cancelled) {
            livekitSessionRef.current = res.livekit;
          }
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

            if (sig.livekit && !cancelled) {
              livekitSessionRef.current = sig.livekit;
            }

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
    callId,
    teardownCall,
  ]);

  // Reactive binding: ensure local & remote media elements play stream as soon as elements mount / status updates
  useEffect(() => {
    if (
      hardware.localVideoRef.current &&
      hardware.localStreamRef.current &&
      mode === "video" &&
      !hardware.isCamOff
    ) {
      if (hardware.localVideoRef.current.srcObject !== hardware.localStreamRef.current) {
        hardware.localVideoRef.current.srcObject = hardware.localStreamRef.current;
        hardware.localVideoRef.current.play?.().catch(() => {});
      }
    }
  }, [
    hardware.hasLocalStream,
    hardware.isCamOff,
    mode,
    status,
    hardware.localVideoRef,
    hardware.localStreamRef,
  ]);

  useEffect(() => {
    if (hardware.remoteStreamRef.current) {
      if (hardware.remoteVideoRef.current && mode === "video") {
        if (hardware.remoteVideoRef.current.srcObject !== hardware.remoteStreamRef.current) {
          hardware.remoteVideoRef.current.srcObject = hardware.remoteStreamRef.current;
        }
        if (!isRemoteCamOff) {
          hardware.remoteVideoRef.current.play?.().catch(() => {});
        }
      }
      if (hardware.remoteAudioRef.current) {
        if (hardware.remoteAudioRef.current.srcObject !== hardware.remoteStreamRef.current) {
          hardware.remoteAudioRef.current.srcObject = hardware.remoteStreamRef.current;
          hardware.remoteAudioRef.current.play?.().catch(() => {});
        }
      }
    }
  }, [
    hardware.hasRemoteStream,
    isRemoteCamOff,
    mode,
    status,
    hardware.remoteStreamRef,
    hardware.remoteVideoRef,
    hardware.remoteAudioRef,
  ]);

  // Toggle Camera Mute + Real-Time Peer Camera State Sync (DataChannel + Signal Queue Fallback)
  useEffect(() => {
    const isCamOff = hardware.isCamOff;
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
  }, [hardware.isCamOff, mode, targetUserId]);

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
    status,
    seconds,
    isRemoteCamOff,
    isBadConnection,
    safetyCode,
    showSafetyTooltip,
    setShowSafetyTooltip,
    handleHangup,
    teardownCall,
    livekitSession: livekitSessionRef.current,
  };
}
