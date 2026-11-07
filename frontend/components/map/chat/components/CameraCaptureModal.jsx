"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { acquireCameraStream, stopMediaStream } from "@/lib/mediaHardware";

export function CameraCaptureModal({
  isOpen,
  onClose,
  onSendMedia, // ({ url, blob, type, isViewOnce, rotation, caption })
  isMapDark = true,
  onPermissionNeeded,
}) {
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [hasStream, setHasStream] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewMedia, setPreviewMedia] = useState(null); // { type: "photo" | "video", url, blob, duration }
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 or 2
  const [canFlipCamera, setCanFlipCamera] = useState(false);
  const [isSpinningFlip, setIsSpinningFlip] = useState(false);
  const [photoRotation, setPhotoRotation] = useState(0); // 0, 90, 180, 270
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState({ left: 0, top: 0, right: 1, bottom: 1 });
  const [caption, setCaption] = useState("");
  const [showCameraGuide, setShowCameraGuide] = useState(true);

  // Video duration crop (trimming)
  const [trimStart, setTrimStart] = useState(0); // 0 to 1
  const [trimEnd, setTrimEnd] = useState(1);     // 0 to 1
  const [activeTrimHandle, setActiveTrimHandle] = useState(null); // "start" | "end" | null
  const [videoTrueDuration, setVideoTrueDuration] = useState(0);
  const previewVideoRef = useRef(null);
  const previewViewportRef = useRef(null);
  const trimmerTrackRef = useRef(null);
  const videoStartTimeRef = useRef(null);

  // Video recording on hold
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const activeStreamFacingRef = useRef(null);
  const onPermissionNeededRef = useRef(onPermissionNeeded);
  onPermissionNeededRef.current = onPermissionNeeded;
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const holdTimerRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const isHoldingShutterRef = useRef(false);

  // Hardware Camera Detection: check if multi-camera is supported
  useEffect(() => {
    async function checkCameraDevices() {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setCanFlipCamera(videoInputs.length >= 2);
        } catch {
          setCanFlipCamera(false);
        }
      } else {
        setCanFlipCamera(false);
      }
    }
    if (isOpen) {
      checkCameraDevices();
    }
  }, [isOpen]);

  const cleanupCamera = useCallback(() => {
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
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    activeStreamFacingRef.current = null;
    setHasStream(false);
    setIsRecordingVideo(false);
  }, []);

  // Teardown when closing modal + auto-fade camera guide after 2s
  useEffect(() => {
    if (!isOpen) {
      cleanupCamera();
      setPreviewMedia(null);
      setCameraError("");
      setIsViewOnce(false);
      setZoomLevel(1);
      setPhotoRotation(0);
      setIsCropping(false);
      setCropRect({ left: 0, top: 0, right: 1, bottom: 1 });
      setTrimStart(0);
      setTrimEnd(1);
      setActiveTrimHandle(null);
      setVideoTrueDuration(0);
      setCaption("");
      setIsRecordingVideo(false);
      setRecordingSeconds(0);
      setShowCameraGuide(true);
    } else {
      setShowCameraGuide(true);
      const timer = setTimeout(() => setShowCameraGuide(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, cleanupCamera]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, [cleanupCamera]);

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
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    activeStreamFacingRef.current = null;
    setCameraError("");

    try {
      const stream = await acquireCameraStream({ facingMode: facing }, false);
      streamRef.current = stream;
      activeStreamFacingRef.current = facing;
      setHasStream(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
    } catch (err) {
      setHasStream(false);
      setCameraError(err?.message || "Tidak dapat mengakses kamera.");
      if (err?.code === "PERMISSION_DENIED" && onPermissionNeededRef.current) {
        onPermissionNeededRef.current("camera");
      }
    }
  }, []);

  // Re-start camera only when modal opens, preview closes, or facingMode changes
  const hasPreview = Boolean(previewMedia);
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
  }, [hasStream, facingMode, zoomLevel]);

  // Start Video Recording on Hold (stable callback, never interrupted by timer ticks)
  const startVideoRecording = useCallback(() => {
    if (!streamRef.current || !hasStream) return;
    recordedChunksRef.current = [];
    videoStartTimeRef.current = Date.now();
    setRecordingSeconds(0);
    setVideoTrueDuration(0);
    setIsRecordingVideo(true);

    try {
      const mime =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";
      let recorder;
      try {
        recorder = new MediaRecorder(streamRef.current, {
          mimeType: mime,
          videoBitsPerSecond: 1200000,
        });
      } catch {
        recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
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
        const blob = new Blob(recordedChunksRef.current, { type: mime });
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
  }, [hasStream]);

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

  // Toggle Zoom Level 1x / 2x
  const handleToggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 2 : 1));
  };

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

  // Rotate photo 90 degrees in edit mode
  const handleRotatePhoto = () => {
    setPhotoRotation((prev) => (prev + 90) % 360);
  };

  // Interactive Photo Crop Drag (Move / Resize Corners & Edges)
  const handleCropPointerDown = (e, mode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!previewViewportRef.current) return;
    const rect = previewViewportRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initial = { ...cropRect };
    const minSize = 0.18;

    const onPointerMove = (ev) => {
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;

      setCropRect(() => {
        let { left, top, right, bottom } = initial;
        if (mode === "move") {
          const w = right - left;
          const h = bottom - top;
          left = Math.max(0, Math.min(1 - w, left + dx));
          top = Math.max(0, Math.min(1 - h, top + dy));
          right = left + w;
          bottom = top + h;
        } else {
          if (mode.includes("w")) {
            left = Math.max(0, Math.min(right - minSize, left + dx));
          }
          if (mode.includes("e")) {
            right = Math.min(1, Math.max(left + minSize, right + dx));
          }
          if (mode.includes("n")) {
            top = Math.max(0, Math.min(bottom - minSize, top + dy));
          }
          if (mode.includes("s")) {
            bottom = Math.min(1, Math.max(top + minSize, bottom + dy));
          }
        }
        return { left, top, right, bottom };
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Retake photo / video
  const handleRetake = () => {
    if (previewMedia?.url) {
      try {
        URL.revokeObjectURL(previewMedia.url);
      } catch {}
    }
    setPreviewMedia(null);
    setPhotoRotation(0);
    setIsCropping(false);
    setCropRect({ left: 0, top: 0, right: 1, bottom: 1 });
    setTrimStart(0);
    setTrimEnd(1);
    setActiveTrimHandle(null);
    setVideoTrueDuration(0);
    setCaption("");
    setCameraError("");
    setRecordingSeconds(0);
    startCamera(facingMode, false);
  };

  const getActiveVideoDur = () => {
    const vDur = previewVideoRef.current?.duration;
    if (Number.isFinite(vDur) && vDur > 0) return vDur;
    if (Number.isFinite(videoTrueDuration) && videoTrueDuration > 0) return videoTrueDuration;
    if (Number.isFinite(previewMedia?.duration) && previewMedia.duration > 0) return previewMedia.duration;
    return 1;
  };

  const formatTrimTime = (totalSec) => {
    const validSec = Number.isFinite(totalSec) && totalSec >= 0 ? Math.floor(totalSec) : 0;
    const m = Math.floor(validSec / 60);
    const s = Math.floor(validSec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Video Duration Trimming Handle Drag with zero latency
  const handleTrimmerPointerDown = (e, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    if (!trimmerTrackRef.current) return;
    setActiveTrimHandle(handleType);
    const trackRect = trimmerTrackRef.current.getBoundingClientRect();
    const dur = getActiveVideoDur();

    const onPointerMove = (ev) => {
      const clientX = ev.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width));
      if (handleType === "start") {
        setTrimStart(() => {
          const nextStart = Math.max(0, Math.min(ratio, trimEnd - 0.05));
          if (previewVideoRef.current && Number.isFinite(nextStart * dur)) {
            previewVideoRef.current.currentTime = nextStart * dur;
          }
          return nextStart;
        });
      } else {
        setTrimEnd(() => {
          const nextEnd = Math.min(1, Math.max(ratio, trimStart + 0.05));
          if (previewVideoRef.current && Number.isFinite(nextEnd * dur)) {
            previewVideoRef.current.currentTime = nextEnd * dur;
          }
          return nextEnd;
        });
      }
    };

    const onPointerUp = () => {
      setActiveTrimHandle(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Video preview playback looping between [trimStart, trimEnd]
  const handlePreviewVideoTimeUpdate = () => {
    if (!previewVideoRef.current) return;
    const dur = getActiveVideoDur();
    const startSec = trimStart * dur;
    const endSec = trimEnd * dur;
    if (previewVideoRef.current.currentTime >= endSec - 0.05 || previewVideoRef.current.currentTime < startSec) {
      previewVideoRef.current.currentTime = startSec;
    }
  };

  // Confirm Send Media with Caption, ViewOnce, and Baked Photo Crop/Rotation or Video Trim Fragment
  const handleConfirmSend = async () => {
    if (!previewMedia) return;
    const dur = getActiveVideoDur();
    const trimmedDuration = previewMedia.type === "video"
      ? Math.max(1, Math.round((trimEnd - trimStart) * dur))
      : (previewMedia.duration || null);

    let finalBlob = previewMedia.blob;
    let finalUrl = previewMedia.url;
    let trimFragment = "";

    const hasCustomCrop =
      cropRect.left > 0.005 ||
      cropRect.top > 0.005 ||
      cropRect.right < 0.995 ||
      cropRect.bottom < 0.995;

    if (previewMedia.type === "photo" && (photoRotation !== 0 || hasCustomCrop) && previewMedia.url) {
      try {
        const baked = await new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => {
            const srcW = img.naturalWidth || 640;
            const srcH = img.naturalHeight || 480;

            // 1. Rotate source onto an intermediate canvas matching the 3:4 preview viewport
            const vpRect = previewViewportRef.current?.getBoundingClientRect();
            const vpW = Math.round(vpRect?.width || 360) * 2;
            const vpH = Math.round(vpRect?.height || 480) * 2;
            const stageCanvas = document.createElement("canvas");
            stageCanvas.width = vpW;
            stageCanvas.height = vpH;
            const stageCtx = stageCanvas.getContext("2d");

            const rad = ((photoRotation % 360) * Math.PI) / 180;
            stageCtx.save();
            stageCtx.translate(vpW / 2, vpH / 2);
            stageCtx.rotate(rad);

            // Replicate CSS object-cover inside the viewport
            const scale = Math.max(vpW / srcW, vpH / srcH);
            const drawW = srcW * scale;
            const drawH = srcH * scale;
            stageCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            stageCtx.restore();

            // 2. Extract exact user-dragged cropRect from the stage canvas
            const cropX = Math.round(vpW * cropRect.left);
            const cropY = Math.round(vpH * cropRect.top);
            const cropW = Math.max(32, Math.round(vpW * (cropRect.right - cropRect.left)));
            const cropH = Math.max(32, Math.round(vpH * (cropRect.bottom - cropRect.top)));

            const outCanvas = document.createElement("canvas");
            outCanvas.width = cropW;
            outCanvas.height = cropH;
            const outCtx = outCanvas.getContext("2d");
            outCtx.drawImage(stageCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            outCanvas.toBlob(
              (b) => {
                if (b) {
                  resolve({ blob: b, url: URL.createObjectURL(b) });
                } else {
                  resolve(null);
                }
              },
              "image/jpeg",
              0.92
            );
          };
          img.onerror = () => resolve(null);
          img.src = previewMedia.url;
        });
        if (baked?.blob) {
          finalBlob = baked.blob;
          finalUrl = baked.url;
        }
      } catch {}
    } else if (previewMedia.type === "video" && (trimStart > 0.005 || trimEnd < 0.995)) {
      const startSec = Number((trimStart * dur).toFixed(2));
      const endSec = Number((trimEnd * dur).toFixed(2));
      if (endSec > startSec) {
        trimFragment = `#t=${startSec},${endSec}`;
      }
    }

    onSendMedia({
      blob: finalBlob,
      url: finalUrl ? `${finalUrl}${trimFragment}` : null,
      type: previewMedia.type,
      duration: trimmedDuration,
      trimStart,
      trimEnd,
      trimFragment,
      isViewOnce,
      rotation: photoRotation,
      caption: caption.trim(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        className="fixed inset-0 z-[1050] flex flex-col items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md select-none"
      >
        <div className="relative w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-end">
          {/* Top Close Button: OUTSIDE the box at top-right, clean bare X icon, no outer box/circle */}
          <button
            type="button"
            onClick={onClose}
            className={`mb-1.5 mr-0.5 font-sans font-normal text-xl sm:text-2xl cursor-pointer select-none transition-transform hover:scale-110 active:scale-90 p-1 ${
              isMapDark ? "text-white/90 hover:text-white" : "text-black/90 hover:text-black"
            }`}
            title="Tutup Kamera"
          >
            ✕
          </button>

          {/* BOX 1: Media Preview / Live Viewfinder Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col justify-between select-none"
          >
            {/* Optional Camera Error Alert */}
            {cameraError && (
              <div
                style={{ fontFamily: "Arial, sans-serif" }}
                className="absolute top-12 left-3 right-3 z-30 p-2 rounded-lg bg-red-600/90 text-white text-[11px] leading-tight text-center shadow"
              >
                {cameraError}
              </div>
            )}

            {/* MAIN VIEWPORT: Live Viewfinder or Captured Photo/Video Preview */}
            <div className="relative w-full flex-1 overflow-hidden bg-black flex items-center justify-center">
              {previewMedia ? (
                // Clean photo/video preview box
                <div
                  ref={previewViewportRef}
                  className="relative w-full h-full flex items-center justify-center overflow-hidden"
                >
                  {/* Rotating Photo / Video Layer: Always 100% bright inside the crop area */}
                  <div
                    style={{
                      transform: `rotate(${photoRotation}deg)`,
                      transition: "transform 0.25s ease-out",
                    }}
                    className="w-full h-full flex items-center justify-center transition-all duration-200 opacity-100"
                  >
                    {previewMedia.type === "video" ? (
                      <video
                        ref={previewVideoRef}
                        src={previewMedia.url}
                        autoPlay
                        loop
                        playsInline
                        onLoadedMetadata={(e) => {
                          const v = e.currentTarget;
                          if (v.duration === Infinity) {
                            v.currentTime = 1e101;
                            const handleDurationFix = () => {
                              v.removeEventListener("timeupdate", handleDurationFix);
                              if (Number.isFinite(v.duration) && v.duration > 0) {
                                setVideoTrueDuration(v.duration);
                              }
                              try {
                                v.currentTime = 0;
                              } catch {}
                            };
                            v.addEventListener("timeupdate", handleDurationFix);
                          } else if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
                            setVideoTrueDuration(v.duration);
                          }
                        }}
                        onTimeUpdate={handlePreviewVideoTimeUpdate}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewMedia.url}
                        alt="Captured"
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )}
                  </div>

                  {/* Interactive 3x3 Cropping Grid Overlay:
                      - Does NOT dim the image when uncropped (utuh 0..1)
                      - Only dims the outer regions outside cropRect when dragged inward
                      - Draggable corners, edges, and interior pan */}
                  {isCropping && (
                    <div className="absolute inset-0 z-15 pointer-events-none select-none touch-none">
                      {/* 4 Outer Mask Strips (Only visible when cropped inward; 0% size when full frame) */}
                      <div
                        style={{
                          top: 0,
                          left: 0,
                          right: 0,
                          height: `${cropRect.top * 100}%`,
                        }}
                        className="absolute bg-black/55 pointer-events-none"
                      />
                      <div
                        style={{
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${(1 - cropRect.bottom) * 100}%`,
                        }}
                        className="absolute bg-black/55 pointer-events-none"
                      />
                      <div
                        style={{
                          top: `${cropRect.top * 100}%`,
                          height: `${(cropRect.bottom - cropRect.top) * 100}%`,
                          left: 0,
                          width: `${cropRect.left * 100}%`,
                        }}
                        className="absolute bg-black/55 pointer-events-none"
                      />
                      <div
                        style={{
                          top: `${cropRect.top * 100}%`,
                          height: `${(cropRect.bottom - cropRect.top) * 100}%`,
                          right: 0,
                          width: `${(1 - cropRect.right) * 100}%`,
                        }}
                        className="absolute bg-black/55 pointer-events-none"
                      />

                      {/* Interactive Crop Box */}
                      <div
                        onPointerDown={(e) => handleCropPointerDown(e, "move")}
                        style={{
                          left: `${cropRect.left * 100}%`,
                          top: `${cropRect.top * 100}%`,
                          width: `${(cropRect.right - cropRect.left) * 100}%`,
                          height: `${(cropRect.bottom - cropRect.top) * 100}%`,
                        }}
                        className="absolute pointer-events-auto cursor-move touch-none"
                      >
                        {/* 3x3 Grid Lines */}
                        <div className="w-full h-full border border-white/45 grid grid-cols-3 grid-rows-3 pointer-events-none">
                          <div className="border-r border-b border-white/30" />
                          <div className="border-r border-b border-white/30" />
                          <div className="border-b border-white/30" />
                          <div className="border-r border-b border-white/30" />
                          <div className="border-r border-b border-white/30" />
                          <div className="border-b border-white/30" />
                          <div className="border-r border-b border-white/30" />
                          <div className="border-r border-b border-white/30" />
                          <div />
                        </div>

                        {/* Edge Drag Handles (N, S, W, E) */}
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "n")}
                          className="absolute -top-2 left-6 right-6 h-4 cursor-ns-resize z-20"
                        />
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "s")}
                          className="absolute -bottom-2 left-6 right-6 h-4 cursor-ns-resize z-20"
                        />
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "w")}
                          className="absolute top-6 bottom-6 -left-2 w-4 cursor-ew-resize z-20"
                        />
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "e")}
                          className="absolute top-6 bottom-6 -right-2 w-4 cursor-ew-resize z-20"
                        />

                        {/* Top-Left Corner Bracket & Drag Handle: Round Bevel */}
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "nw")}
                          className={`absolute top-0 left-0 w-7 h-7 border-t-[4px] border-l-[4px] cursor-nwse-resize z-30 ${
                            cropRect.top < 0.02 && cropRect.left < 0.02 ? "rounded-tl-2xl" : "rounded-tl-md"
                          } ${isMapDark ? "border-white" : "border-black"}`}
                        />
                        {/* Top-Right Corner Bracket & Drag Handle: Round Bevel */}
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "ne")}
                          className={`absolute top-0 right-0 w-7 h-7 border-t-[4px] border-r-[4px] cursor-nesw-resize z-30 ${
                            cropRect.top < 0.02 && cropRect.right > 0.98 ? "rounded-tr-2xl" : "rounded-tr-md"
                          } ${isMapDark ? "border-white" : "border-black"}`}
                        />
                        {/* Bottom-Left Corner Bracket & Drag Handle: Sharp Edge */}
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "sw")}
                          className={`absolute bottom-0 left-0 w-7 h-7 border-b-[4px] border-l-[4px] rounded-none cursor-nesw-resize z-30 ${
                            isMapDark ? "border-white" : "border-black"
                          }`}
                        />
                        {/* Bottom-Right Corner Bracket & Drag Handle: Sharp Edge */}
                        <div
                          onPointerDown={(e) => handleCropPointerDown(e, "se")}
                          className={`absolute bottom-0 right-0 w-7 h-7 border-b-[4px] border-r-[4px] rounded-none cursor-nwse-resize z-30 ${
                            isMapDark ? "border-white" : "border-black"
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Video Duration Trimming Panel: Located below video crop layer */}
                  {previewMedia.type === "video" && (
                    <div className="absolute bottom-2 inset-x-3 z-25 flex flex-col gap-1 select-none pointer-events-auto">
                      {/* Trimmer Track Container */}
                      <div
                        ref={trimmerTrackRef}
                        className="relative w-full h-5 flex items-center cursor-pointer select-none touch-none"
                      >
                        {/* White Outer Box Time Mark Badge (consistent with Picture 3 font & style) */}
                        {(() => {
                          const dur = getActiveVideoDur();
                          const showStartBadge = activeTrimHandle === "start" || (!activeTrimHandle && trimStart > 0.005);
                          const showEndBadge = activeTrimHandle === "end" || (!activeTrimHandle && trimStart <= 0.005);
                          const badgeRatio = showStartBadge ? trimStart : trimEnd;
                          const badgeSeconds = badgeRatio * dur;
                          const clampedPercent = Math.min(92, Math.max(8, badgeRatio * 100));
                          return (
                            <div
                              style={{
                                left: `${clampedPercent}%`,
                                transform: "translateX(-50%)",
                              }}
                              className="absolute -top-6 px-2 py-0.5 rounded-md bg-white border border-black text-black font-sans font-medium text-[10px] leading-none shadow-sm select-none pointer-events-none whitespace-nowrap z-30"
                            >
                              {formatTrimTime(badgeSeconds)}
                            </div>
                          );
                        })()}

                        {/* Base Full Track Bar */}
                        <div className="relative w-full h-[2.5px] rounded-full overflow-hidden bg-black/50 backdrop-blur-sm">
                          {/* Dimmed Left Segment (Outside boundary) */}
                          <div
                            style={{ width: `${trimStart * 100}%` }}
                            className="absolute left-0 top-0 h-full bg-white/25"
                          />

                          {/* Active Selected Segment */}
                          <div
                            style={{
                              left: `${trimStart * 100}%`,
                              width: `${(trimEnd - trimStart) * 100}%`,
                            }}
                            className="absolute top-0 h-full bg-white shadow-xs"
                          />

                          {/* Dimmed Right Segment (Outside boundary) */}
                          <div
                            style={{
                              left: `${trimEnd * 100}%`,
                              width: `${(1 - trimEnd) * 100}%`,
                            }}
                            className="absolute top-0 h-full bg-white/25"
                          />
                        </div>

                        {/* Left Vertical Boundary Handle: Thin, small, white non-glow, rounded edge */}
                        <div
                          onPointerDown={(e) => handleTrimmerPointerDown(e, "start")}
                          style={{
                            left: `${trimStart * 100}%`,
                          }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-6 flex items-center justify-center cursor-ew-resize z-10"
                          title="Batas awal"
                        >
                          <span className="w-[3px] h-4 bg-white rounded-full block shadow-md hover:scale-110 active:scale-95 transition-transform" />
                        </div>

                        {/* Right Vertical Boundary Handle: Thin, small, white non-glow, rounded edge */}
                        <div
                          onPointerDown={(e) => handleTrimmerPointerDown(e, "end")}
                          style={{
                            left: `${trimEnd * 100}%`,
                          }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-6 flex items-center justify-center cursor-ew-resize z-10"
                          title="Batas akhir"
                        >
                          <span className="w-[3px] h-4 bg-white rounded-full block shadow-md hover:scale-110 active:scale-95 transition-transform" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : hasStream ? (
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    transform: `${facingMode === "user" ? "scaleX(-1)" : "scaleX(1)"} ${
                      zoomLevel === 2 ? "scale(1.4)" : "scale(1)"
                    }`,
                    transition: "transform 0.25s ease-out",
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Centered Camera Open Prompt: Arial non-bold, firm, auto fades out after 2s or on shutter press */}
                <AnimatePresence>
                  {showCameraGuide && !isRecordingVideo && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-4"
                    >
                      <p
                        style={{ fontFamily: "Arial, sans-serif" }}
                        className="font-normal text-xs sm:text-[13px] text-center leading-relaxed select-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                      >
                        Tap to Take Photo or<br />Hold to Take Video
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3" />
                <p className="text-xs text-white/75 font-sans">Mempersiapkan kamera...</p>
              </div>
            )}
          </div>

          {/* BOTTOM CONTROLS FOOTER: Height adjusted to 66px, semi-shadow rather than pitch black */}
          <div className="relative z-20 w-full h-[66px] sm:h-[70px] bg-black/45 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.35)] flex items-center justify-between px-6">
            {previewMedia ? (
              /* PART 2 FOOTER: Ulang, Edit/Rotate, Once Icon */
              <>
                {/* ULANG: reload icon only, full white, no outer box, no text */}
                <button
                  type="button"
                  onClick={handleRetake}
                  className="p-2 text-white hover:text-white/80 transition-transform active:scale-90 cursor-pointer"
                  title="Ulangi"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>

                {/* EDIT / ROTATE ICON: Tapping toggles crop grid & switches to rotate icon without outer box */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isCropping) {
                      setIsCropping(true);
                    } else {
                      handleRotatePhoto();
                    }
                  }}
                  className="p-2 text-white hover:text-white/80 transition-transform active:scale-90 cursor-pointer"
                  title={isCropping ? "Putar Foto 90°" : "Edit / Crop Foto"}
                >
                  {isCropping ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {/* Clean circular rotation arc without messy overlap */}
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" />
                      <polyline points="21 3 21 8 16 8" />
                      {/* Centered photo frame that indicates rotating photo */}
                      <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" strokeWidth="1.8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  )}
                </button>

                {/* VIEW ONCE (PART 2 ONLY): Flat full white, no glow, no outer box */}
                <button
                  type="button"
                  onClick={() => setIsViewOnce((v) => !v)}
                  className={`p-2 transition-opacity cursor-pointer select-none ${
                    isViewOnce ? "opacity-100 text-white" : "opacity-45 hover:opacity-75 text-white"
                  }`}
                  title={isViewOnce ? "Lihat Sekali Aktif" : "Aktifkan Lihat Sekali"}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M 12 3 A 9 9 0 0 0 12 21" strokeLinecap="round" />
                    <path d="M 12 3 A 9 9 0 0 1 12 21" strokeDasharray="2 3.5" strokeLinecap="round" />
                    <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="bold">1</text>
                  </svg>
                </button>
              </>
            ) : (
              /* PART 1 FOOTER: Live Viewfinder (Zoom, Shutter [tap photo / hold video], Flip Camera) */
              <>
                {/* ZOOM CONTROL: flat white text 1x/2x, no outer box */}
                <button
                  type="button"
                  onClick={handleToggleZoom}
                  title={`Zoom ${zoomLevel === 1 ? "2x" : "1x"}`}
                  className="p-2 text-white font-sans font-bold text-xs cursor-pointer select-none transition-transform active:scale-90"
                >
                  {zoomLevel}x
                </button>

                {/* SHUTTER BUTTON: Tap for Photo, Hold for Video (Cyan-Magenta Gradient Progress) */}
                <div className="relative flex items-center justify-center">
                  <button
                    type="button"
                    onPointerDown={handleShutterPointerDown}
                    onPointerUp={handleShutterPointerUp}
                    onLostPointerCapture={handleShutterPointerUp}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    title="Ketuk untuk Foto, Tahan untuk Video"
                    className="relative w-[52px] h-[52px] flex items-center justify-center p-1 cursor-pointer select-none transition-transform active:scale-95 touch-none"
                  >
                    {/* Outer Circular Ring with Cyan-to-Magenta gradient stroke on video hold */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90" viewBox="0 0 52 52">
                      <defs>
                        <linearGradient id="shutter-hold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00f5d4" />
                          <stop offset="100%" stopColor="#ff006e" />
                        </linearGradient>
                      </defs>
                      {isRecordingVideo ? (
                        <circle
                          cx="26"
                          cy="26"
                          r="23"
                          fill="none"
                          stroke="url(#shutter-hold-gradient)"
                          strokeWidth="3.5"
                          strokeDasharray={2 * Math.PI * 23}
                          strokeDashoffset={2 * Math.PI * 23 * (1 - Math.min(1, recordingSeconds / 60))}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 0.1s linear" }}
                        />
                      ) : (
                        <circle
                          cx="26"
                          cy="26"
                          r="23"
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                        />
                      )}
                    </svg>

                    {/* Inner White Circle (shrinks slightly when held/recording) */}
                    <span
                      className={`w-9 h-9 rounded-full block bg-white transition-all duration-200 ${
                        isRecordingVideo ? "scale-[0.76] shadow-md" : "scale-100"
                      }`}
                    />
                  </button>
                </div>

                {/* TURN CAMERA (FLIP): flat white icon, no outer box */}
                <motion.button
                  type="button"
                  disabled={!canFlipCamera}
                  onClick={handleFlipCamera}
                  animate={isSpinningFlip ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.36, ease: "easeOut" }}
                  className={`p-2 transition-all ${
                    canFlipCamera
                      ? "text-white opacity-100 hover:opacity-80 active:scale-90 cursor-pointer"
                      : "text-white opacity-25 cursor-not-allowed pointer-events-none"
                  }`}
                  title={canFlipCamera ? "Ganti Kamera" : "Kamera belakang tidak tersedia"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 12a8 8 0 0 1-13.66 5.66L4 15" />
                    <polyline points="4 20 4 15 9 15" />
                    <path d="M4 12A8 8 0 0 1 17.66 6.34L20 9" />
                    <polyline points="20 4 20 9 15 9" />
                  </svg>
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>

        {/* BOX 2: SEPARATE FILL INPUT BOX DIRECTLY BELOW MEDIA BOX (PART 2 ONLY) */}
        {previewMedia && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[340px] sm:max-w-[360px] mt-2.5 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-xl z-30"
          >
            {/* Smiley Emoji Icon */}
            <span className="text-white/80 select-none shrink-0">
              <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </span>

            {/* Caption Input Field */}
            <input
              type="text"
              value={caption}
              maxLength={50}
              onChange={(e) => setCaption(e.target.value.slice(0, 50))}
              placeholder="Ketik deskripsi..."
              style={{ fontFamily: "Arial, sans-serif" }}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-white/50 outline-none min-w-0"
            />

            {/* 0/50 Character Counter: Arial non-bold, mini, consistent */}
            <span
              style={{ fontFamily: "Arial, sans-serif" }}
              className="text-[10px] font-normal text-white/70 shrink-0 select-none"
            >
              {caption.length}/50
            </span>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleConfirmSend}
              className="p-1 text-white hover:text-white/80 transition-transform active:scale-90 cursor-pointer shrink-0"
              title="Kirim Foto / Video"
            >
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
