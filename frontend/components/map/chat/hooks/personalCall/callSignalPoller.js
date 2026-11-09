import { fetchCallSignals } from "@/lib/api";
import { stopCallRingtone } from "@/lib/soundEngine";

export async function processCallSignalsBatch({
  signals,
  activeCallIdRef,
  livekitSessionRef,
  isIncomingAnswer,
  pcRef,
  secondsRef,
  mode,
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
      setTimeout(() => {
        teardownCall();
        onEndCallRef.current?.({ mode, seconds: callDuration });
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
