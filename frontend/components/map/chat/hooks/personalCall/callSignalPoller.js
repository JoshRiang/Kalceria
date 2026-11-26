import { fetchCallSignals } from "@/lib/api";
import { stopCallRingtone } from "@/lib/soundEngine";
import {
  handleIncomingRenegotiateOffer,
  handleIncomingRenegotiateAnswer,
} from "./callVideoUpgrade";

export async function processCallSignalsBatch({
  signals,
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
  runPendingVideoUpgrade,
  isHungUpRef,
  onEndCallRef,
  setStatus,
  setIsRemoteCamOff,
  flushPendingIceCandidates,
  pendingIceCandidatesRef,
  teardownCall,
  isCancelled,
}) {
  for (const sig of signals) {
    if (sig.callId && sig.callId !== activeCallIdRef.current) continue;

    if (sig.livekit && !isCancelled()) {
      livekitSessionRef.current = sig.livekit;
    }

    if (sig.signalType === "hangup") {
      stopCallRingtone();
      setStatus("ended");
      const callDuration = secondsRef.current;
      const finalMode = modeRef?.current || "voice";
      setTimeout(() => {
        teardownCall();
        onEndCallRef.current?.({ mode: finalMode, seconds: callDuration });
      }, 700);
      return false; // Stop loop
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
          if (pendingVideoUpgradeRef?.current) {
            pendingVideoUpgradeRef.current = false;
            runPendingVideoUpgrade?.();
          }
        } catch {}
      }
    }

    if (sig.signalType === "renegotiate_offer" && pcRef.current && sig.encryptedPayload) {
      try {
        const offerDesc = JSON.parse(sig.encryptedPayload);
        await handleIncomingRenegotiateOffer({
          offerDesc,
          callMode: sig.callMode || "video",
          pc: pcRef.current,
          hardware: hardwareRef.current,
          targetUserId,
          activeCallIdRef,
          callCtrlChannelRef,
          onSwitchModeRef,
          flushPendingIceCandidates,
          processedRenegotiateRef,
          isHungUpRef,
        });
      } catch {}
    }

    if (sig.signalType === "renegotiate_answer" && pcRef.current && sig.encryptedPayload) {
      try {
        const answerDesc = JSON.parse(sig.encryptedPayload);
        await handleIncomingRenegotiateAnswer({
          answerDesc,
          pc: pcRef.current,
          flushPendingIceCandidates,
          processedRenegotiateRef,
        });
      } catch {}
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
  return true; // Continue loop
}

export function startSignalPollingLoop(params) {
  const {
    isCancelled,
    isHungUpRef,
    statusRef,
    pollTimerRef,
  } = params;

  const runSignalPoll = async () => {
    if (isCancelled() || isHungUpRef.current) return;
    try {
      const res = await fetchCallSignals({ clear: "true" });
      const signals = res?.signals || [];
      const shouldContinue = await processCallSignalsBatch({ ...params, signals });
      if (!shouldContinue) return;
    } catch {}

    if (!isCancelled() && !isHungUpRef.current) {
      const nextDelay = statusRef.current === "connected" ? 1000 : 450;
      pollTimerRef.current = setTimeout(runSignalPoll, nextDelay);
    }
  };

  pollTimerRef.current = setTimeout(runSignalPoll, 350);
}
