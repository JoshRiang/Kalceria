"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { acquireCameraStream, stopMediaStream } from "@/lib/mediaHardware";

export function CameraCaptureModal({
  isOpen,
  onClose,
  onSendMedia, // ({ url, blob, type, isViewOnce, rotation })
  isMapDark = true,
  onPermissionNeeded,
}) {
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [hasStream, setHasStream] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewMedia, setPreviewMedia] = useState(null); // { type: "photo", url, blob }
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 or 2
  const [canFlipCamera, setCanFlipCamera] = useState(false);
  const [isSpinningFlip, setIsSpinningFlip] = useState(false);
  const [photoRotation, setPhotoRotation] = useState(0); // 0, 90, 180, 270
  const [isCropping, setIsCropping] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    setHasStream(false);
  }, []);

  // Teardown when closing modal
  useEffect(() => {
    if (!isOpen) {
      cleanupCamera();
      setPreviewMedia(null);
      setCameraError("");
      setIsViewOnce(false);
      setZoomLevel(1);
      setPhotoRotation(0);
      setIsCropping(false);
    }
  }, [isOpen, cleanupCamera]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, [cleanupCamera]);

  // Start Camera Stream
  const startCamera = useCallback(async (facing = "user") => {
    cleanupCamera();
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
  }, [cleanupCamera, onPermissionNeeded]);

  // Re-start camera when modal opens or facingMode changes
  useEffect(() => {
    if (isOpen && !previewMedia) {
      startCamera(facingMode);
    } else {
      cleanupCamera();
    }
  }, [isOpen, facingMode, previewMedia, startCamera, cleanupCamera]);

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
  const handleTakePhoto = () => {
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
          cleanupCamera();
        },
        "image/jpeg",
        0.92
      );
    } catch {
      setCameraError("Gagal mengambil foto.");
    }
  };

  const handleFlipCamera = () => {
    if (!canFlipCamera) return;
    setIsSpinningFlip(true);
    setTimeout(() => setIsSpinningFlip(false), 360);
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleToggleZoom = () => {
    setZoomLevel((z) => (z === 1 ? 2 : 1));
  };

  const handleRotatePhoto = () => {
    setPhotoRotation((r) => (r + 90) % 360);
  };

  const handleConfirmSend = () => {
    if (!previewMedia) return;
    onSendMedia?.({
      ...previewMedia,
      isViewOnce,
      rotation: photoRotation,
    });
    onClose();
  };

  const handleRetake = () => {
    if (previewMedia?.url) {
      try {
        URL.revokeObjectURL(previewMedia.url);
      } catch {}
    }
    setPreviewMedia(null);
    setPhotoRotation(0);
    setIsCropping(false);
    setCameraError("");
    startCamera(facingMode);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-[340px] sm:max-w-[360px] aspect-[3/4] rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col justify-between select-none"
        >
          {/* Top Close Button: No outer box, clean black X */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-30 text-black hover:text-black/70 font-sans font-bold text-base cursor-pointer select-none transition-transform active:scale-90"
            title="Tutup Kamera"
          >
            ✕
          </button>

          {/* Optional Camera Error Alert */}
          {cameraError && (
            <div
              style={{ fontFamily: "Arial, sans-serif" }}
              className="absolute top-12 left-3 right-3 z-30 p-2 rounded-lg bg-red-600/90 text-white text-[11px] leading-tight text-center shadow"
            >
              {cameraError}
            </div>
          )}

          {/* MAIN VIEWPORT (Upper ~3/4): Live Viewfinder or Captured Photo Preview */}
          <div className="relative w-full flex-1 overflow-hidden bg-black flex items-center justify-center">
            {previewMedia ? (
              // Clean photo preview box while editing
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <div
                  style={{
                    transform: `rotate(${photoRotation}deg)`,
                    transition: "transform 0.25s ease-out",
                  }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewMedia.url}
                    alt="Captured"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>

                {/* 3x3 Cropping Grid Overlay when editing */}
                {isCropping && (
                  <div className="absolute inset-4 pointer-events-none border border-white/60 grid grid-cols-3 grid-rows-3 z-10 animate-fade-in">
                    <div className="border-r border-b border-white/35" />
                    <div className="border-r border-b border-white/35" />
                    <div className="border-b border-white/35" />
                    <div className="border-r border-b border-white/35" />
                    <div className="border-r border-b border-white/35" />
                    <div className="border-b border-white/35" />
                    <div className="border-r border-white/35" />
                    <div className="border-r border-white/35" />
                    <div />
                  </div>
                )}
              </div>
            ) : hasStream ? (
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
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3" />
                <p className="text-xs text-white/75 font-sans">Mempersiapkan kamera...</p>
              </div>
            )}
          </div>

          {/* BOTTOM ~1/4 PANEL: Shadowed layer giving space for photo controls */}
          <div className="relative z-20 w-full h-[88px] bg-gradient-to-t from-black via-black/95 to-black/75 shadow-[0_-12px_28px_rgba(0,0,0,0.7)] flex items-center justify-between px-6">
            {previewMedia ? (
              /* PHOTO EDIT / PREVIEW FOOTER: All icons full flat white, no outer box, no text */
              <>
                {/* ULANG: reload icon only, full white, no outer box, no text */}
                <button
                  type="button"
                  onClick={handleRetake}
                  className="p-2 text-white hover:text-white/80 transition-transform active:scale-90 cursor-pointer"
                  title="Ulangi Foto"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>

                {/* EDIT / ROTATE ICON: Tapping toggles crop grid & switches to rotate icon */}
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
                    /* Rotate icon when cropping is active */
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  ) : (
                    /* Clean Pencil Icon */
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  )}
                </button>

                {/* VIEW ONCE: Flat full white, no glow, no outer box */}
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
                    <text
                      x="12"
                      y="16"
                      textAnchor="middle"
                      fill="currentColor"
                      stroke="none"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      1
                    </text>
                  </svg>
                </button>

                {/* KIRIM: send triangle icon only, full white, no outer box, no text */}
                <button
                  type="button"
                  onClick={handleConfirmSend}
                  className="p-2 text-white hover:text-white/80 transition-transform active:scale-90 cursor-pointer"
                  title="Kirim Foto"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </>
            ) : (
              /* LIVE CAMERA SHUTTER FOOTER: No outer boxes on icons */
              <>
                {/* VIEW ONCE: flat white, no glow, no outer box */}
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
                    <text
                      x="12"
                      y="16"
                      textAnchor="middle"
                      fill="currentColor"
                      stroke="none"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      1
                    </text>
                  </svg>
                </button>

                {/* SHUTTER BUTTON: Center white circle */}
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  title="Ambil Foto"
                  className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center p-1 cursor-pointer transition-transform hover:scale-105 active:scale-90 select-none shadow-lg"
                >
                  <span className="w-11 h-11 rounded-full bg-white block" />
                </button>

                {/* ZOOM CONTROL: flat white text 1x/2x, no outer box */}
                <button
                  type="button"
                  onClick={handleToggleZoom}
                  title={`Zoom ${zoomLevel === 1 ? "2x" : "1x"}`}
                  className="p-2 text-white font-sans font-bold text-xs cursor-pointer select-none transition-transform active:scale-90"
                >
                  {zoomLevel}x
                </button>

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
    </AnimatePresence>
  );
}
