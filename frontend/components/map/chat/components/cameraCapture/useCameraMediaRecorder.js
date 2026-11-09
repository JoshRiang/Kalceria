"use client";

import { useState, useRef, useCallback } from "react";
import { pickSupportedVideoRecordingMime, applyCameraTorch } from "@/lib/mediaHardware";

export function useCameraMediaRecorder({
  streamRef,
  hasStream,
  videoRef,
  facingMode,
  zoomLevel,
  isFlashOn,
  setIsFlashOn,
  setPreviewMedia,
  setPhotoRotation,
  setIsCropping,
  setCropRect,
  setTrimStart,
  setTrimEnd,
  setActiveTrimHandle,
  setShowCameraGuide,
  setCameraError,
  previewMedia,
}) {
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [videoTrueDuration, setVideoTrueDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const holdTimerRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const isHoldingShutterRef = useRef(false);
  const videoStartTimeRef = useRef(null);

  const cleanupRecorder = useCallback(() => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    setIsRecordingVideo(false);
  }, []);

  // Take Snapshot Photo
  const handleTakePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !hasStream) return;

    try {
      const canvas = document.createElement("canvas");
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext("2d");

      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      if (zoomLevel === 2) {
        const cropW = vWidth / 1.5;
        const cropH = vHeight / 1.5;
        const cropX = (vWidth - cropW) / 2;
        const cropY = (vHeight - cropH) / 2;
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, vWidth, vHeight);
      } else {
        ctx.drawImage(video, 0, 0, vWidth, vHeight);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          if (streamRef.current && isFlashOn) {
            applyCameraTorch(streamRef.current, false).catch(() => {});
            setIsFlashOn(false);
          }
          const url = URL.createObjectURL(blob);
          setPreviewMedia({
            type: "photo",
            url,
            blob,
          });
          setPhotoRotation(0);
          setIsCropping(false);
          setCropRect({ left: 0, top: 0, right: 1, bottom: 1 });
        },
        "image/jpeg",
        0.92
      );
    } catch {
      setCameraError("Gagal mengambil foto.");
    }
  }, [hasStream, facingMode, zoomLevel, isFlashOn, videoRef, streamRef, setIsFlashOn, setPreviewMedia, setPhotoRotation, setIsCropping, setCropRect, setCameraError]);

  // Start Video Recording on Hold (stable callback, never interrupted by timer ticks)
  const startVideoRecording = useCallback(() => {
    if (!streamRef.current || !hasStream) return;
    recordedChunksRef.current = [];
    videoStartTimeRef.current = Date.now();
    setRecordingSeconds(0);
    setVideoTrueDuration(0);
    setIsRecordingVideo(true);

    try {
      const mime = pickSupportedVideoRecordingMime();
      const hasAudioTrack = streamRef.current.getAudioTracks().length > 0;
      const recorderOptions = {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: 1200000,
        ...(hasAudioTrack ? { audioBitsPerSecond: 128000 } : {}),
      };
      let recorder;
      try {
        recorder = new MediaRecorder(streamRef.current, recorderOptions);
      } catch {
        recorder = mime
          ? new MediaRecorder(streamRef.current, { mimeType: mime })
          : new MediaRecorder(streamRef.current);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (recordIntervalRef.current) {
          clearInterval(recordIntervalRef.current);
          recordIntervalRef.current = null;
        }
        if (streamRef.current) {
          applyCameraTorch(streamRef.current, false).catch(() => {});
          setIsFlashOn(false);
        }
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || mime || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const elapsedSec = videoStartTimeRef.current
          ? Math.max(1, Math.round((Date.now() - videoStartTimeRef.current) / 1000))
          : 1;

        setVideoTrueDuration(elapsedSec);
        setTrimStart(0);
        setTrimEnd(1);
        setActiveTrimHandle(null);
        setPreviewMedia({
          type: "video",
          url,
          blob,
          duration: elapsedSec,
        });
        setIsRecordingVideo(false);
      };

      recorder.start(100);

      recordIntervalRef.current = setInterval(() => {
        const elapsed = videoStartTimeRef.current
          ? (Date.now() - videoStartTimeRef.current) / 1000
          : 0;
        if (elapsed >= 60) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            try {
              mediaRecorderRef.current.stop();
            } catch {}
          }
          if (recordIntervalRef.current) {
            clearInterval(recordIntervalRef.current);
            recordIntervalRef.current = null;
          }
          setRecordingSeconds(60);
        } else {
          setRecordingSeconds(Math.min(60, Number(elapsed.toFixed(1))));
        }
      }, 100);
    } catch {
      setIsRecordingVideo(false);
    }
  }, [hasStream, streamRef, setIsFlashOn, setTrimStart, setTrimEnd, setActiveTrimHandle, setPreviewMedia]);

  // Stop Video Recording
  const stopVideoRecording = useCallback(() => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecordingVideo(false);
  }, []);

  // Shutter pointer down / up with robust pointer capture
  const handleShutterPointerDown = (e) => {
    e.preventDefault();
    if (previewMedia || !hasStream) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setShowCameraGuide(false);
    isHoldingShutterRef.current = true;

    holdTimerRef.current = setTimeout(() => {
      if (isHoldingShutterRef.current && hasStream) {
        startVideoRecording();
      }
    }, 280);
  };

  const handleShutterPointerUp = (e) => {
    e.preventDefault();
    if (!isHoldingShutterRef.current && !isRecordingVideo) return;
    try {
      if (e.currentTarget?.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const wasHolding = isHoldingShutterRef.current;
    isHoldingShutterRef.current = false;

    if (isRecordingVideo || (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording")) {
      stopVideoRecording();
    } else if (wasHolding) {
      handleTakePhoto();
    }
  };

  return {
    isRecordingVideo,
    setIsRecordingVideo,
    recordingSeconds,
    setRecordingSeconds,
    videoTrueDuration,
    setVideoTrueDuration,
    handleShutterPointerDown,
    handleShutterPointerUp,
    handleTakePhoto,
    cleanupRecorder,
  };
}
