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
  const [caption, setCaption] = useState("");
  const [showCameraGuide, setShowCameraGuide] = useState(true);

  // Video duration crop (trimming)
  const [trimStart, setTrimStart] = useState(0); // 0 to 1
  const [trimEnd, setTrimEnd] = useState(1);     // 0 to 1
  const previewVideoRef = useRef(null);
  const trimmerTrackRef = useRef(null);
  const videoStartTimeRef = useRef(null);

  // Video recording on hold
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
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
      setTrimStart(0);
      setTrimEnd(1);
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

  // Persistent Camera Stream initializer
  const startCamera = useCallback(async (facing = "user") => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    setCameraError("");

    try {
      const stream = await acquireCameraStream({ facingMode: facing }, false);
      streamRef.current = stream;
      setHasStream(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
    } catch (err) {
      setHasStream(false);
      setCameraError(err?.message || "Tidak dapat mengakses kamera.");
      if (err?.code === "PERMISSION_DENIED" && onPermissionNeeded) {
        onPermissionNeeded("camera");
      }
    }
  }, [onPermissionNeeded]);

  // Re-start camera when modal opens or facingMode changes
  useEffect(() => {
    if (isOpen && !previewMedia) {
      startCamera(facingMode);
    }
  }, [isOpen, facingMode, previewMedia, startCamera]);

  // Ensure video element receives stream when ready
  useEffect(() => {
    if (hasStream && streamRef.current && videoRef.current && !previewMedia) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play?.().catch(() => {});
      }
    }
  }, [hasStream, previewMedia]);

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
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      setCameraError("Gagal mengambil foto.");
    }
  }, [hasStream, facingMode, zoomLevel]);

  // Start Video Recording on Hold
  const startVideoRecording = useCallback(() => {
    if (!streamRef.current || !hasStream) return;
    recordedChunksRef.current = [];
    videoStartTimeRef.current = Date.now();
    setRecordingSeconds(0);
    setIsRecordingVideo(true);

    try {
      const mime =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
      const recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const elapsedSec = videoStartTimeRef.current
          ? Math.max(1, Math.round((Date.now() - videoStartTimeRef.current) / 1000))
          : 1;

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
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Maximum 60 seconds
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
            }
            clearInterval(recordIntervalRef.current);
            return 60;
          }
          return Math.min(60, Number((prev + 0.1).toFixed(1)));
        });
      }, 100);
    } catch {
      setIsRecordingVideo(false);
    }
  }, [hasStream, recordingSeconds]);

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
    try {
      if (e.currentTarget?.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isRecordingVideo) {
      stopVideoRecording();
    } else if (isHoldingShutterRef.current) {
      handleTakePhoto();
    }
    isHoldingShutterRef.current = false;
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
    startCamera(nextFacing);
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
    setTrimStart(0);
    setTrimEnd(1);
    setCaption("");
    setCameraError("");
    setRecordingSeconds(0);
    startCamera(facingMode);
  };

  const getActiveVideoDur = () => {
    const vDur = previewVideoRef.current?.duration;
    if (Number.isFinite(vDur) && vDur > 0) return vDur;
    if (Number.isFinite(previewMedia?.duration) && previewMedia.duration > 0) return previewMedia.duration;
    return 1;
  };

  // Video Duration Trimming Handle Drag with zero latency
  const handleTrimmerPointerDown = (e, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    if (!trimmerTrackRef.current) return;
    const trackRect = trimmerTrackRef.current.getBoundingClientRect();
    const dur = getActiveVideoDur();

    const onPointerMove = (ev) => {
      const clientX = ev.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width));
      if (handleType === "start") {
        setTrimStart((prevStart) => {
          const nextStart = Math.min(ratio, trimEnd - 0.05);
          if (previewVideoRef.current && Number.isFinite(nextStart * dur)) {
            previewVideoRef.current.currentTime = nextStart * dur;
          }
          return Math.max(0, nextStart);
        });
      } else {
        setTrimEnd((prevEnd) => {
          const nextEnd = Math.max(ratio, trimStart + 0.05);
          if (previewVideoRef.current && Number.isFinite(nextEnd * dur)) {
            previewVideoRef.current.currentTime = nextEnd * dur;
          }
          return Math.min(1, nextEnd);
        });
      }
    };

    const onPointerUp = () => {
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

  // Confirm Send Media with Caption and ViewOnce
  const handleConfirmSend = () => {
    if (!previewMedia) return;
    const dur = getActiveVideoDur();
    const trimmedDuration = previewMedia.type === "video"
      ? Math.max(1, Math.round((trimEnd - trimStart) * dur))
      : (previewMedia.duration || null);

    onSendMedia({
      blob: previewMedia.blob,
      url: previewMedia.url,
      type: previewMedia.type,
      duration: trimmedDuration,
      trimStart,
      trimEnd,
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
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  {/* Rotating Photo / Video Layer: Dims when cropping mode is active */}
                  <div
                    style={{
                      transform: `rotate(${photoRotation}deg)`,
                      transition: "transform 0.25s ease-out",
                    }}
                    className={`w-full h-full flex items-center justify-center transition-all duration-200 ${
                      isCropping ? "opacity-55 brightness-75 contrast-90" : "opacity-100"
                    }`}
                  >
                    {previewMedia.type === "video" ? (
                      <video
                        ref={previewVideoRef}
                        src={previewMedia.url}
                        autoPlay
                        loop
                        playsInline
                        onLoadedMetadata={(e) => {
                          if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
                            const realDur = Math.round(e.currentTarget.duration);
                            setPreviewMedia((prev) => prev ? { ...prev, duration: realDur } : prev);
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

                  {/* 3x3 Cropping Grid Overlay:
                      - Utuh se-box penuh sampai ke atas footer shadow (inset-0)
                      - Beroperasi di layer independen (tidak ikut berputar saat foto di-rotate)
                      - Dua sisi atas tebal: round bevel (rounded-tl-2xl, rounded-tr-2xl)
                      - Dua sisi bawah tebal: sharp edge (rounded-none)
                      - Hitam di light mode, Putih di dark mode */}
                  {isCropping && (
                    <div className="absolute inset-0 pointer-events-none z-10 animate-fade-in">
                      {/* Grid Lines */}
                      <div className="w-full h-full border border-white/30 grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div className="border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div className="border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div className="border-r border-b border-white/20" />
                        <div />
                      </div>

                      {/* Top-Left: Round Bevel */}
                      <div
                        className={`absolute top-0 left-0 w-6 h-6 border-t-[4px] border-l-[4px] rounded-tl-2xl ${
                          isMapDark ? "border-white" : "border-black"
                        }`}
                      />
                      {/* Top-Right: Round Bevel */}
                      <div
                        className={`absolute top-0 right-0 w-6 h-6 border-t-[4px] border-r-[4px] rounded-tr-2xl ${
                          isMapDark ? "border-white" : "border-black"
                        }`}
                      />
                      {/* Bottom-Left: Sharp Edge */}
                      <div
                        className={`absolute bottom-0 left-0 w-6 h-6 border-b-[4px] border-l-[4px] rounded-none ${
                          isMapDark ? "border-white" : "border-black"
                        }`}
                      />
                      {/* Bottom-Right: Sharp Edge */}
                      <div
                        className={`absolute bottom-0 right-0 w-6 h-6 border-b-[4px] border-r-[4px] rounded-none ${
                          isMapDark ? "border-white" : "border-black"
                        }`}
                      />
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
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-5 flex items-center justify-center cursor-ew-resize z-10"
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
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-5 flex items-center justify-center cursor-ew-resize z-10"
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
                    onPointerCancel={handleShutterPointerUp}
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
