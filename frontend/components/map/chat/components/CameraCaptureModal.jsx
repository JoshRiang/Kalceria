"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  acquireCameraStream,
  stopMediaStream,
  probeVideoDeviceCapabilities,
  applyCameraTorch,
} from "@/lib/mediaHardware";
import {
  CameraBottomControls,
  CameraCaptionBox,
  CameraViewport,
  bakePhotoCropAndRotation,
  computeVideoTrimFragment,
} from "./cameraCapture";

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
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
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
      applyCameraTorch(streamRef.current, false).catch(() => {});
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    activeStreamFacingRef.current = null;
    setHasStream(false);
    setHasFlash(false);
    setIsFlashOn(false);
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
      await applyCameraTorch(streamRef.current, false).catch(() => {});
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    activeStreamFacingRef.current = null;
    setCameraError("");
    setIsFlashOn(false);
    setHasFlash(false);

    try {
      const stream = await acquireCameraStream({ facingMode: facing }, false);
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
  }, [hasStream, facingMode, zoomLevel, isFlashOn]);

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
        if (streamRef.current) {
          applyCameraTorch(streamRef.current, false).catch(() => {});
          setIsFlashOn(false);
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

  // Rotate photo 90 degrees in edit mode
  const handleRotatePhoto = () => {
    setPhotoRotation((prev) => (prev + 90) % 360);
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

    if (previewMedia.type === "photo") {
      const baked = await bakePhotoCropAndRotation(
        previewMedia,
        photoRotation,
        cropRect,
        previewViewportRef
      );
      if (baked?.blob) {
        finalBlob = baked.blob;
        finalUrl = baked.url;
      }
    } else if (previewMedia.type === "video") {
      trimFragment = computeVideoTrimFragment(trimStart, trimEnd, dur);
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
            {/* VIEWPORT & ERROR ALERT */}
            <CameraViewport
              cameraError={cameraError}
              previewMedia={previewMedia}
              previewViewportRef={previewViewportRef}
              photoRotation={photoRotation}
              previewVideoRef={previewVideoRef}
              setVideoTrueDuration={setVideoTrueDuration}
              handlePreviewVideoTimeUpdate={handlePreviewVideoTimeUpdate}
              isCropping={isCropping}
              cropRect={cropRect}
              setCropRect={setCropRect}
              isMapDark={isMapDark}
              trimmerTrackRef={trimmerTrackRef}
              getActiveVideoDur={getActiveVideoDur}
              activeTrimHandle={activeTrimHandle}
              setActiveTrimHandle={setActiveTrimHandle}
              trimStart={trimStart}
              setTrimStart={setTrimStart}
              trimEnd={trimEnd}
              setTrimEnd={setTrimEnd}
              hasStream={hasStream}
              videoRef={videoRef}
              facingMode={facingMode}
              zoomLevel={zoomLevel}
              showCameraGuide={showCameraGuide}
              isRecordingVideo={isRecordingVideo}
            />

          {/* BOTTOM CONTROLS FOOTER: Height adjusted to 66px, semi-shadow rather than pitch black */}
          <CameraBottomControls
            previewMedia={previewMedia}
            handleRetake={handleRetake}
            isCropping={isCropping}
            setIsCropping={setIsCropping}
            handleRotatePhoto={handleRotatePhoto}
            isViewOnce={isViewOnce}
            setIsViewOnce={setIsViewOnce}
            zoomLevel={zoomLevel}
            handleToggleZoom={handleToggleZoom}
            handleShutterPointerDown={handleShutterPointerDown}
            handleShutterPointerUp={handleShutterPointerUp}
            isRecordingVideo={isRecordingVideo}
            recordingSeconds={recordingSeconds}
            hasFlash={hasFlash}
            isFlashOn={isFlashOn}
            handleToggleFlash={handleToggleFlash}
            canFlipCamera={canFlipCamera}
            handleFlipCamera={handleFlipCamera}
            isSpinningFlip={isSpinningFlip}
          />
        </motion.div>
      </div>

        {/* BOX 2: SEPARATE FILL INPUT BOX DIRECTLY BELOW MEDIA BOX (PART 2 ONLY) */}
        {previewMedia && (
          <CameraCaptionBox
            caption={caption}
            setCaption={setCaption}
            handleConfirmSend={handleConfirmSend}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
