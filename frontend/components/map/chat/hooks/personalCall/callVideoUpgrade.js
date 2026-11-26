import { acquireCameraStream } from "@/lib/mediaHardware";
import { generateCryptoNonce } from "@/lib/chatCrypto";
import { postCallSignal } from "@/lib/api";

function sendCtrlPacket(dc, payload) {
  if (dc && dc.readyState === "open") {
    try {
      dc.send(JSON.stringify(payload));
      return true;
    } catch {}
  }
  return false;
}

function attachVideoTrackToLocalStream(hardware, videoTrack) {
  const existingAudio = hardware.localStreamRef.current
    ? hardware.localStreamRef.current.getAudioTracks()
    : [];
  const existingVideo = hardware.localStreamRef.current
    ? hardware.localStreamRef.current.getVideoTracks()
    : [];
  existingVideo.forEach((t) => {
    if (t !== videoTrack) {
      try {
        t.stop();
      } catch {}
    }
  });

  const unifiedStream = new MediaStream([...existingAudio, videoTrack]);
  hardware.localStreamRef.current = unifiedStream;
  hardware.setHasLocalStream(true);
  hardware.isCamOffRef.current = false;
  hardware.setIsCamOff(false);
  if (hardware.localVideoRef.current) {
    hardware.localVideoRef.current.srcObject = unifiedStream;
    hardware.localVideoRef.current.play?.().catch(() => {});
  }
  return unifiedStream;
}

async function ensureLocalVideoTrackOnPc(pc, hardware) {
  const existingLiveVideo = hardware.localStreamRef.current
    ?.getVideoTracks()
    ?.find((t) => t.readyState === "live");

  if (existingLiveVideo) {
    existingLiveVideo.enabled = true;
    hardware.isCamOffRef.current = false;
    hardware.setIsCamOff(false);
    return { ok: true, stream: hardware.localStreamRef.current };
  }

  try {
    // Video-only acquisition keeps the active microphone track 100% uninterrupted
    const camStream = await acquireCameraStream({ facingMode: "user" }, false);
    const videoTrack = camStream?.getVideoTracks?.()[0];
    if (!videoTrack) throw new Error("NO_VIDEO_TRACK");

    const unifiedStream = attachVideoTrackToLocalStream(hardware, videoTrack);
    if (pc) {
      const videoSender = pc
        .getSenders?.()
        .find((s) => s.track?.kind === "video" || s.dtmf === null && !s.track);
      if (videoSender && typeof videoSender.replaceTrack === "function" && videoSender.track?.kind === "video") {
        await videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, unifiedStream);
      }
    }
    return { ok: true, stream: unifiedStream };
  } catch (err) {
    hardware.isCamOffRef.current = true;
    hardware.setIsCamOff(true);
    return { ok: false, error: err };
  }
}

/**
 * Seamlessly upgrades an active Voice Call into a Video Call in-place on BOTH sides
 * without tearing down RTCPeerConnection, dropping audio, resetting the timer, or re-ringing.
 */
export async function upgradeVoiceCallToVideo({
  pc,
  hardware,
  targetUserId,
  activeCallIdRef,
  callCtrlChannelRef,
  onSwitchModeRef,
  isHungUpRef,
  pendingVideoUpgradeRef,
}) {
  if (isHungUpRef.current) return;

  // Immediately promote local UI into Video mode on the exact same call session
  onSwitchModeRef.current?.("video");

  const { ok: hasCam } = await ensureLocalVideoTrackOnPc(pc, hardware);
  if (isHungUpRef.current) return;

  // If peer connection is not stable yet (e.g. upgraded while still connecting), queue renegotiation
  if (!pc || pc.signalingState !== "stable") {
    if (pendingVideoUpgradeRef) pendingVideoUpgradeRef.current = true;
    sendCtrlPacket(callCtrlChannelRef.current, {
      type: "cam_state",
      isCamOff: !hasCam,
      ts: Date.now(),
    });
    return;
  }

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const offerStr = JSON.stringify(offer);

    sendCtrlPacket(callCtrlChannelRef.current, {
      type: "renegotiate_offer",
      callId: activeCallIdRef.current,
      callMode: "video",
      sdp: offer,
      isCamOff: !hasCam,
      ts: Date.now(),
    });

    if (targetUserId) {
      postCallSignal(targetUserId, {
        callId: activeCallIdRef.current,
        callMode: "video",
        signalType: "renegotiate_offer",
        nonce: generateCryptoNonce(),
        encryptedPayload: offerStr,
      }).catch(() => {});
    }
  } catch {}
}

/**
 * Handles an incoming mid-call renegotiation offer on the peer device:
 * promotes the peer directly into Video mode (zero ringing), attaches peer's camera track
 * onto the SAME RTCPeerConnection, and returns a renegotiation SDP answer.
 */
export async function handleIncomingRenegotiateOffer({
  offerDesc,
  callMode,
  pc,
  hardware,
  targetUserId,
  activeCallIdRef,
  callCtrlChannelRef,
  onSwitchModeRef,
  flushPendingIceCandidates,
  processedRenegotiateRef,
  isHungUpRef,
}) {
  if (!offerDesc || !pc || isHungUpRef.current) return;
  const sigKey = `offer:${String(offerDesc.sdp || "").slice(0, 140)}`;
  if (processedRenegotiateRef?.current?.has(sigKey)) return;
  processedRenegotiateRef?.current?.add(sigKey);

  // Immediately direct peer into unified Video Call UI (zero ringing, same timer)
  if (callMode === "video") {
    onSwitchModeRef.current?.("video");
  }

  try {
    // Handle SDP glare safely if both sides clicked video at the exact same millisecond
    if (pc.signalingState !== "stable") {
      try {
        await pc.setLocalDescription({ type: "rollback" });
      } catch {}
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
    await flushPendingIceCandidates(pc);

    // Acquire peer's own camera video track so BOTH sides become full 2-way video seamlessly
    let peerHasCam = true;
    if (callMode === "video") {
      const res = await ensureLocalVideoTrackOnPc(pc, hardware);
      peerHasCam = res.ok;
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const answerStr = JSON.stringify(answer);

    sendCtrlPacket(callCtrlChannelRef.current, {
      type: "renegotiate_answer",
      callId: activeCallIdRef.current,
      callMode: callMode || "video",
      sdp: answer,
      isCamOff: !peerHasCam,
      ts: Date.now(),
    });

    if (targetUserId) {
      postCallSignal(targetUserId, {
        callId: activeCallIdRef.current,
        callMode: callMode || "video",
        signalType: "renegotiate_answer",
        nonce: generateCryptoNonce(),
        encryptedPayload: answerStr,
      }).catch(() => {});

      if (!peerHasCam) {
        postCallSignal(targetUserId, {
          callId: activeCallIdRef.current,
          callMode: "video",
          signalType: "cam_state",
          nonce: generateCryptoNonce(),
          encryptedPayload: JSON.stringify({ isCamOff: true }),
        }).catch(() => {});
      }
    }
  } catch {}
}

/**
 * Applies the peer's mid-call renegotiation SDP answer on the initiating side.
 */
export async function handleIncomingRenegotiateAnswer({
  answerDesc,
  pc,
  flushPendingIceCandidates,
  processedRenegotiateRef,
}) {
  if (!answerDesc || !pc) return;
  const sigKey = `answer:${String(answerDesc.sdp || "").slice(0, 140)}`;
  if (processedRenegotiateRef?.current?.has(sigKey)) return;
  processedRenegotiateRef?.current?.add(sigKey);

  if (pc.signalingState !== "have-local-offer") return;
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
    await flushPendingIceCandidates(pc);
  } catch {}
}

/**
 * Dispatches incoming kalceria_call_ctrl P2P DataChannel control messages
 * (cam_state, mid-call renegotiate_offer / renegotiate_answer, hangup).
 */
export function handleCallControlChannelMessage(rawData, ctx) {
  try {
    const parsed = JSON.parse(rawData);
    if (parsed?.type === "cam_state") {
      ctx.setIsRemoteCamOff(Boolean(parsed.isCamOff));
    } else if (parsed?.type === "renegotiate_offer" && parsed.sdp && ctx.pcRef.current) {
      if (typeof parsed.isCamOff === "boolean") ctx.setIsRemoteCamOff(parsed.isCamOff);
      handleIncomingRenegotiateOffer({
        offerDesc: parsed.sdp,
        callMode: parsed.callMode || "video",
        pc: ctx.pcRef.current,
        hardware: ctx.hardwareRef.current,
        targetUserId: ctx.targetUserId,
        activeCallIdRef: ctx.activeCallIdRef,
        callCtrlChannelRef: ctx.callCtrlChannelRef,
        onSwitchModeRef: ctx.onSwitchModeRef,
        flushPendingIceCandidates: ctx.flushPendingIceCandidates,
        processedRenegotiateRef: ctx.processedRenegotiateRef,
        isHungUpRef: ctx.isHungUpRef,
      });
    } else if (parsed?.type === "renegotiate_answer" && parsed.sdp && ctx.pcRef.current) {
      if (typeof parsed.isCamOff === "boolean") ctx.setIsRemoteCamOff(parsed.isCamOff);
      handleIncomingRenegotiateAnswer({
        answerDesc: parsed.sdp,
        pc: ctx.pcRef.current,
        flushPendingIceCandidates: ctx.flushPendingIceCandidates,
        processedRenegotiateRef: ctx.processedRenegotiateRef,
      });
    } else if (parsed?.type === "hangup" && !ctx.isHungUpRef.current) {
      ctx.onRemoteHangup();
    }
  } catch {}
}

/**
 * Merges incoming remote WebRTC tracks (including mid-call added video tracks)
 * and binds them cleanly to remote video/audio elements.
 */
export function handleRemotePeerTrack(event, { hardwareRef, modeRef, onSwitchModeRef }) {
  const activeHw = hardwareRef.current;
  let incomingStream = event.streams?.[0];
  if (!incomingStream) {
    if (!activeHw.remoteStreamRef.current) {
      activeHw.remoteStreamRef.current = new MediaStream();
    }
    activeHw.remoteStreamRef.current.addTrack(event.track);
    incomingStream = activeHw.remoteStreamRef.current;
  } else {
    if (activeHw.remoteStreamRef.current && activeHw.remoteStreamRef.current !== incomingStream) {
      const merged = new MediaStream([...activeHw.remoteStreamRef.current.getTracks()]);
      incomingStream.getTracks().forEach((t) => {
        if (!merged.getTracks().some((m) => m.id === t.id)) merged.addTrack(t);
      });
      incomingStream = merged;
    }
    activeHw.remoteStreamRef.current = incomingStream;
  }

  const hasVideoTrack = event.track?.kind === "video" || incomingStream.getVideoTracks().length > 0;
  if (hasVideoTrack && modeRef.current !== "video") {
    onSwitchModeRef.current?.("video");
  }
  activeHw.setHasRemoteStream(modeRef.current === "video" || hasVideoTrack ? hasVideoTrack : true);
  if (activeHw.remoteVideoRef.current && hasVideoTrack) {
    activeHw.remoteVideoRef.current.srcObject = incomingStream;
    activeHw.remoteVideoRef.current.play?.().catch(() => {});
  }
  if (activeHw.remoteAudioRef.current) {
    activeHw.remoteAudioRef.current.srcObject = incomingStream;
    activeHw.remoteAudioRef.current.play?.().catch(() => {});
  }
}
