"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  acquireMicrophoneStream,
  acquireCameraStream,
  stopMediaStream,
} from "@/lib/mediaHardware";

export function useCallHardware() {
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCamOff, setIsCamOff] = useState(false);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const isCamOffRef = useRef(isCamOff);
  isCamOffRef.current = isCamOff;

  // Acquire media streams for call
  const acquireHardware = useCallback(async (callMode) => {
    let stream = null;
    if (callMode === "video") {
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
    return stream;
  }, []);

  // Teardown media streams and clear player references
  const teardownHardware = useCallback(() => {
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
  }, []);

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

  // Toggle Camera Mute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isCamOff;
      });
    }
  }, [isCamOff]);

  return {
    isMicMuted,
    setIsMicMuted,
    isSpeakerOn,
    setIsSpeakerOn,
    isCamOff,
    setIsCamOff,
    hasLocalStream,
    setHasLocalStream,
    hasRemoteStream,
    setHasRemoteStream,
    localVideoRef,
    localStreamRef,
    remoteVideoRef,
    remoteAudioRef,
    remoteStreamRef,
    isCamOffRef,
    acquireHardware,
    teardownHardware,
  };
}
