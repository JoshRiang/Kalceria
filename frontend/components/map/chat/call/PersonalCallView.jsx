"use client";

import { motion } from "framer-motion";
import { usePersonalCallState, isAhmadDummyUser } from "../hooks/usePersonalCallState";
import { CallMediaStage } from "./CallMediaStage";
import { CallControlsBar } from "./CallControlsBar";

export { isAhmadDummyUser };

export function PersonalCallView({
  callState,
  currentUser,
  isMapDark,
  avatarUrl,
  onSwitchMode,
  onEndCall,
  onPermissionNeeded,
}) {
  const {
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
    localStreamRef,
    remoteVideoRef,
    remoteAudioRef,
    remoteStreamRef,
    handleHangup,
  } = usePersonalCallState({
    callState,
    currentUser,
    onEndCall,
    onPermissionNeeded,
  });

  if (!targetUser) return null;

  return (
    <motion.div
      key={`call-view-${mode}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`absolute inset-0 z-40 flex flex-col justify-between overflow-hidden select-none ${
        isMapDark ? "bg-[#0d1418] text-white" : "bg-white text-black"
      }`}
    >
      <CallMediaStage
        targetUser={targetUser}
        currentUser={currentUser}
        mode={mode}
        status={status}
        seconds={seconds}
        isMapDark={isMapDark}
        avatarUrl={avatarUrl}
        isMicMuted={isMicMuted}
        isSpeakerOn={isSpeakerOn}
        isCamOff={isCamOff}
        isRemoteCamOff={isRemoteCamOff}
        hasLocalStream={hasLocalStream}
        hasRemoteStream={hasRemoteStream}
        isBadConnection={isBadConnection}
        safetyCode={safetyCode}
        showSafetyTooltip={showSafetyTooltip}
        setShowSafetyTooltip={setShowSafetyTooltip}
        localVideoRef={localVideoRef}
        localStreamRef={localStreamRef}
        remoteVideoRef={remoteVideoRef}
        remoteAudioRef={remoteAudioRef}
        remoteStreamRef={remoteStreamRef}
      />

      <CallControlsBar
        mode={mode}
        isMapDark={isMapDark}
        isSpeakerOn={isSpeakerOn}
        setIsSpeakerOn={setIsSpeakerOn}
        isCamOff={isCamOff}
        setIsCamOff={setIsCamOff}
        isMicMuted={isMicMuted}
        setIsMicMuted={setIsMicMuted}
        onSwitchMode={onSwitchMode}
        handleHangup={handleHangup}
      />
    </motion.div>
  );
}
