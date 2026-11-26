"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateCryptoNonce } from "@/lib/chatCrypto";
import { postCallSignal, fetchLiveKitCallToken } from "@/lib/api";
import { startOutgoingRingtone, stopCallRingtone } from "@/lib/soundEngine";
import { RTC_CONFIG } from "./callHelpers";
import { useCallTimerAndSecurity } from "./useCallTimerAndSecurity";
import { useCallStreamBinding } from "./useCallStreamBinding";
import { useCallCamStateSync } from "./useCallCamStateSync";
import { startSignalPollingLoop } from "./callSignalPoller";
import {
  upgradeVoiceCallToVideo,
  handleCallControlChannelMessage,
  handleRemotePeerTrack,
} from "./callVideoUpgrade";

export function useCallSession({
  targetUserId,
  mode,
  isIncomingAnswer,
  incomingOfferSdp,
  callId = null,
  currentUser,
  onPermissionNeeded,
  onSwitchMode,
  onEndCall,
  hardware,
}) {
  const [status, setStatus] = useState(isIncomingAnswer ? "connected" : "calling");
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [isBadConnection, setIsBadConnection] = useState(false);

  const {
    seconds,
    secondsRef,
    safetyCode,
    showSafetyTooltip,
    setShowSafetyTooltip,
  } = useCallTimerAndSecurity({
    status,
    targetUserId,
    currentUserId: currentUser?.id,
  });

  const pcRef = useRef(null);
  const callCtrlChannelRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const processedRenegotiateRef = useRef(new Set());
  const pendingVideoUpgradeRef = useRef(false);
  const activeCallIdRef = useRef(callId || `call_${Date.now()}`);
  const pollTimerRef = useRef(null);
  const isHungUpRef = useRef(false);
  const statusRef = useRef(status);
  const modeRef = useRef(mode);
  const camMountSyncedRef = useRef(false);
  const livekitSessionRef = useRef(null);
  const isCallBlockedRef = useRef(false);
  statusRef.current = status;
  modeRef.current = mode;

  const hardwareRef = useRef(hardware);
  hardwareRef.current = hardware;

  const onEndCallRef = useRef(onEndCall);
  const onPermissionNeededRef = useRef(onPermissionNeeded);
  const onSwitchModeRef = useRef(onSwitchMode);
  onEndCallRef.current = onEndCall;
  onPermissionNeededRef.current = onPermissionNeeded;
  onSwitchModeRef.current = onSwitchMode;

  const flushPendingIceCandidates = useCallback(async (pcInstance) => {
    if (!pcInstance || !pcInstance.remoteDescription) return;
    const queued = pendingIceCandidatesRef.current.splice(0);
    for (const cand of queued) {
      try {
        await pcInstance.addIceCandidate(new RTCIceCandidate(cand));
      } catch {}
    }
  }, []);

  // Teardown WebRTC and Media Hardware (stable ref, never invalidates call lifecycle)
  const teardownCall = useCallback(() => {
    isHungUpRef.current = true;
    pendingVideoUpgradeRef.current = false;
    stopCallRingtone();
    pendingIceCandidatesRef.current = [];
    processedRenegotiateRef.current.clear();

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

  // Unified in-place Voice -> Video upgrade (same RTCPeerConnection, same callId, zero ringing)
  const handleUpgradeToVideo = useCallback(() => {
    upgradeVoiceCallToVideo({
      pc: pcRef.current,
      hardware: hardwareRef.current,
      targetUserId,
      activeCallIdRef,
      callCtrlChannelRef,
      onSwitchModeRef,
      isHungUpRef,
      pendingVideoUpgradeRef,
    });
  }, [targetUserId]);

  // Main Call Lifecycle and WebRTC Pipeline (intentionally excludes `mode` so mid-call Voice->Video never tears down!)
  useEffect(() => {
    if (!targetUserId) return;
    isHungUpRef.current = false;
    isCallBlockedRef.current = false;
    pendingVideoUpgradeRef.current = false;
    secondsRef.current = 0;
    pendingIceCandidatesRef.current = [];
    processedRenegotiateRef.current.clear();
    let cancelled = false;
    const initialMode = modeRef.current || "voice";

    async function initCall() {
      const hw = hardwareRef.current;
      if (isIncomingAnswer && callId) {
        activeCallIdRef.current = callId;
      }

      fetchLiveKitCallToken(targetUserId, { callId: activeCallIdRef.current })
        .then((res) => {
          if (res?.livekitEnabled && !cancelled) livekitSessionRef.current = res;
        })
        .catch(() => {});

      // 1. Safe Hardware Acquisition FIRST
      let stream = null;
      try {
        stream = await hw.acquireHardware(initialMode);
      } catch (hardwareErr) {
        stopCallRingtone();
        if (cancelled) return;
        if (hardwareErr.code === "PERMISSION_DENIED" && onPermissionNeededRef.current) {
          onPermissionNeededRef.current(initialMode === "video" ? "camera" : "mic");
          return;
        }
        setStatus("ended");
        teardownCall();
        onEndCallRef.current?.({ mode: modeRef.current, seconds: 0 });
        return;
      }

      if (cancelled) {
        if (stream) hw.teardownHardware();
        return;
      }

      // 2. Hardware acquired cleanly — start Outgoing Ringtone if initiating call
      if (!isIncomingAnswer) {
        setStatus("calling");
        startOutgoingRingtone();
      }

      if (stream) {
        hw.localStreamRef.current = stream;
        hw.setHasLocalStream(true);
        if (hw.localVideoRef.current && modeRef.current === "video") {
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
        dc.onmessage = (ev) =>
          handleCallControlChannelMessage(ev.data, {
            pcRef,
            hardwareRef,
            targetUserId,
            activeCallIdRef,
            callCtrlChannelRef,
            onSwitchModeRef,
            flushPendingIceCandidates,
            processedRenegotiateRef,
            isHungUpRef,
            setIsRemoteCamOff,
            onRemoteHangup: () => {
              stopCallRingtone();
              setStatus("ended");
              const callDuration = secondsRef.current;
              setTimeout(() => {
                teardownCall();
                onEndCallRef.current?.({ mode: modeRef.current, seconds: callDuration });
              }, 500);
            },
          });
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
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          }

          const handleConnChange = (state) => {
            if (state === "disconnected" || state === "failed") setIsBadConnection(true);
            else if (state === "connected" || state === "completed") setIsBadConnection(false);
          };
          pc.oniceconnectionstatechange = () => handleConnChange(pc.iceConnectionState);
          pc.onconnectionstatechange = () => handleConnChange(pc.connectionState);
          pc.ontrack = (event) => handleRemotePeerTrack(event, { hardwareRef, modeRef, onSwitchModeRef });

          pc.onicecandidate = (event) => {
            if (event.candidate && targetUserId) {
              postCallSignal(targetUserId, {
                callId: activeCallIdRef.current,
                callMode: modeRef.current,
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
              callMode: initialMode,
              signalType: "answer",
              nonce: generateCryptoNonce(),
              encryptedPayload: JSON.stringify(answer),
            })
              .then((res) => {
                if (res?.livekit && !cancelled) livekitSessionRef.current = res.livekit;
              })
              .catch(() => {});

            if (hardwareRef.current.isCamOffRef.current && initialMode === "video") {
              postCallSignal(targetUserId, {
                callId: activeCallIdRef.current,
                callMode: initialMode,
                signalType: "cam_state",
                nonce: generateCryptoNonce(),
                encryptedPayload: JSON.stringify({ isCamOff: true }),
              }).catch(() => {});
            }
          } catch {}
        }
      } else {
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

        postCallSignal(targetUserId, {
          callId: generatedCallId,
          callMode: initialMode,
          signalType: "offer",
          nonce: generateCryptoNonce(),
          encryptedPayload:
            offerSdpString || btoa(JSON.stringify({ sdpType: "e2ee_offer", mode: initialMode, ts: Date.now() })),
        })
          .then((res) => {
            if (res?.isBlockedDrop || res?.packet?.isBlockedDrop) {
              isCallBlockedRef.current = true;
              if (!cancelled && !isHungUpRef.current) setStatus("calling");
            }
            if (res?.livekit && !cancelled) livekitSessionRef.current = res.livekit;
          })
          .catch(() => {});

        setTimeout(() => {
          if (!cancelled && !isHungUpRef.current && !isCallBlockedRef.current) {
            setStatus((prev) => (prev === "calling" ? "ringing" : prev));
          }
        }, 750);
      }

      // 5. Adaptive Polling Loop for Peer Signals (Ringing / Answer / Renegotiate / ICE / CamState / Hangup)
      startSignalPollingLoop({
        isCancelled: () => cancelled,
        isHungUpRef,
        statusRef,
        pollTimerRef,
        activeCallIdRef,
        livekitSessionRef,
        isIncomingAnswer,
        pcRef,
        secondsRef,
        modeRef,
        hardwareRef,
        targetUserId,
        callCtrlChannelRef,
        onSwitchModeRef,
        processedRenegotiateRef,
        pendingVideoUpgradeRef,
        runPendingVideoUpgrade: handleUpgradeToVideo,
        onEndCallRef,
        setStatus,
        setIsRemoteCamOff,
        flushPendingIceCandidates,
        pendingIceCandidatesRef,
        teardownCall,
      });
    }

    initCall();

    return () => {
      cancelled = true;
      teardownCall();
    };
  }, [
    targetUserId,
    isIncomingAnswer,
    incomingOfferSdp,
    callId,
    teardownCall,
    flushPendingIceCandidates,
    handleUpgradeToVideo,
  ]);

  useCallStreamBinding({ hardware, mode, status, isRemoteCamOff });

  useCallCamStateSync({
    hardware,
    mode,
    targetUserId,
    callCtrlChannelRef,
    activeCallIdRef,
    isHungUpRef,
    camMountSyncedRef,
  });

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
        callMode: modeRef.current,
        signalType: "hangup",
        nonce: generateCryptoNonce(),
      }).catch(() => {});
    }
    const finalSeconds = secondsRef.current;
    const finalMode = modeRef.current;
    setTimeout(() => {
      teardownCall();
      onEndCallRef.current?.({ mode: finalMode, seconds: finalSeconds });
    }, 750);
  }, [targetUserId, teardownCall]);

  return {
    status,
    seconds,
    isRemoteCamOff,
    isBadConnection,
    safetyCode,
    showSafetyTooltip,
    setShowSafetyTooltip,
    handleHangup,
    handleUpgradeToVideo,
    teardownCall,
    livekitSession: livekitSessionRef.current,
  };
}
