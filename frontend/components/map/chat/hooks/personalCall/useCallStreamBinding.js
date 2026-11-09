"use client";

import { useEffect } from "react";

export function useCallStreamBinding({
  hardware,
  mode,
  status,
  isRemoteCamOff,
}) {
  // Reactive binding: ensure local media elements play stream as soon as elements mount / status updates
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

  // Reactive binding: ensure remote media elements play stream as soon as elements mount / status updates
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
}
