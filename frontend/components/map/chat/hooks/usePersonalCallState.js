"use client";

import { useCallHardware } from "./personalCall/useCallHardware";
import { useCallSession } from "./personalCall/useCallSession";
import {
  DESKTOP_FLAG,
  formatCallDuration,
  isAhmadDummyUser,
} from "./personalCall/callHelpers";

export { DESKTOP_FLAG, formatCallDuration, isAhmadDummyUser };

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
  const callId = callState?.callId || null;

  // Sub-hook 1: Media hardware & audio/video tracks
  const hardware = useCallHardware();

  // Sub-hook 2: WebRTC Session, peer connection & signaling loop
  const session = useCallSession({
    targetUserId,
    mode,
    isIncomingAnswer,
    incomingOfferSdp,
    callId,
    currentUser,
    onPermissionNeeded,
    onEndCall,
    hardware,
  });

  return {
    targetUser,
    mode,
    status: session.status,
    seconds: session.seconds,
    isMicMuted: hardware.isMicMuted,
    setIsMicMuted: hardware.setIsMicMuted,
    isSpeakerOn: hardware.isSpeakerOn,
    setIsSpeakerOn: hardware.setIsSpeakerOn,
    isCamOff: hardware.isCamOff,
    setIsCamOff: hardware.setIsCamOff,
    isRemoteCamOff: session.isRemoteCamOff,
    hasLocalStream: hardware.hasLocalStream,
    hasRemoteStream: hardware.hasRemoteStream,
    isBadConnection: session.isBadConnection,
    safetyCode: session.safetyCode,
    showSafetyTooltip: session.showSafetyTooltip,
    setShowSafetyTooltip: session.setShowSafetyTooltip,
    localVideoRef: hardware.localVideoRef,
    localStreamRef: hardware.localStreamRef,
    remoteVideoRef: hardware.remoteVideoRef,
    remoteAudioRef: hardware.remoteAudioRef,
    remoteStreamRef: hardware.remoteStreamRef,
    handleHangup: session.handleHangup,
    livekitSession: session.livekitSession,
  };
}
