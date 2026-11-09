"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  acquireCameraStream,
  acquireMicrophoneStream,
  stopMediaStream,
  probeVideoDeviceCapabilities,
  applyCameraTorch,
} from "@/lib/mediaHardware";

export function useCameraDeviceStream({
  isOpen,
  hasPreview,
  onPermissionNeededRef,
}) {
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [hasStream, setHasStream] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1); // 1 or 2
  const [canFlipCamera, setCanFlipCamera] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isSpinningFlip, setIsSpinningFlip] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const activeStreamFacingRef = useRef(null);

  // Hardware Camera Detection: inspect dual-camera flip & active track torch capability
  const syncHardwareCapabilities = useCallback(async (stream) => {
    const caps = await probeVideoDeviceCapabilities(stream);
    setCanFlipCamera(caps.canFlipCamera);
    setHasFlash(caps.hasFlash);

    if (stream && !caps.hasFlash) {
      setTimeout(async () => {
        if (streamRef.current !== stream) return;
        const retryCaps = await probeVideoDeviceCapabilities(stream);
        setCanFlipCamera(retryCaps.canFlipCamera);
        setHasFlash(retryCaps.hasFlash);
      }, 220);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      syncHardwareCapabilities(streamRef.current);
    }
  }, [isOpen, syncHardwareCapabilities]);

  const cleanupCameraStream = useCallback(() => {
    if (streamRef.current) {
      applyCameraTorch(streamRef.current, false).catch(() => {});
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    activeStreamFacingRef.current = null;
    setHasStream(false);
    setHasFlash(false);
    setIsFlashOn(false);
  }, []);

  // Persistent Camera Stream initializer (stable reference, never restarts an active matching stream)
  const startCamera = useCallback(async (facing = "user", forceRestart = false) => {
    if (
      !forceRestart &&
      streamRef.current &&
      activeStreamFacingRef.current === facing &&
      streamRef.current.getTracks?.().some((t) => t.readyState === "live")
    ) {
      setHasStream(true);
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play?.().catch(() => {});
      }
      return;
    }

    if (streamRef.current) {
      await applyCameraTorch(streamRef.current, false).catch(() => {});
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    activeStreamFacingRef.current = null;
    setCameraError("");
    setIsFlashOn(false);
    setHasFlash(false);

    try {
      const stream = await acquireCameraStream({ facingMode: facing }, true);

      // Guarantee an audio track so recorded videos always carry sound.
      if (stream.getAudioTracks().length === 0) {
        try {
          const mic = await acquireMicrophoneStream({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
          mic.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch (micErr) {
          if (micErr?.code === "PERMISSION_DENIED" && onPermissionNeededRef?.current) {
            onPermissionNeededRef.current("mic");
          }
        }
      }

      streamRef.current = stream;
      activeStreamFacingRef.current = facing;
      setHasStream(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
      syncHardwareCapabilities(stream);
    } catch (err) {
      setHasStream(false);
      setCameraError(err?.message || "Tidak dapat mengakses kamera.");
      if (err?.code === "PERMISSION_DENIED" && onPermissionNeededRef?.current) {
        onPermissionNeededRef.current("camera");
      }
    }
  }, [syncHardwareCapabilities, onPermissionNeededRef]);

  // Re-start camera only when modal opens, preview closes, or facingMode changes
  useEffect(() => {
    if (isOpen && !hasPreview) {
      startCamera(facingMode, false);
    }
  }, [isOpen, facingMode, hasPreview, startCamera]);

  // Ensure video element receives stream when ready
  useEffect(() => {
    if (hasStream && streamRef.current && videoRef.current && !hasPreview) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play?.().catch(() => {});
      }
    }
  }, [hasStream, hasPreview]);

  // Toggle Zoom Level 1x / 2x
  const handleToggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 2 : 1));
  };

  // Toggle Real Hardware Flashlight / Torch
  const handleToggleFlash = useCallback(async () => {
    if (!hasFlash || !streamRef.current) return;
    const nextEnabled = !isFlashOn;
    const res = await applyCameraTorch(streamRef.current, nextEnabled);
    setIsFlashOn(res.active);
  }, [hasFlash, isFlashOn]);

  // Flip Camera User <-> Environment with 360 Spin Animation
  const handleFlipCamera = () => {
    if (!canFlipCamera) return;
    setIsSpinningFlip(true);
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    startCamera(nextFacing, true);
    setTimeout(() => {
      setIsSpinningFlip(false);
    }, 380);
  };

  return {
    facingMode,
    setFacingMode,
    hasStream,
    setHasStream,
    cameraError,
    setCameraError,
    zoomLevel,
    setZoomLevel,
    canFlipCamera,
    hasFlash,
    isFlashOn,
    setIsFlashOn,
    isSpinningFlip,
    videoRef,
    streamRef,
    startCamera,
    cleanupCameraStream,
    handleToggleZoom,
    handleToggleFlash,
    handleFlipCamera,
  };
}
