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

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Hardware Camera Detection: check if multi-camera is supported
  useEffect(() => {
    async function checkCameraDevices() {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          // Multi-camera enabled if >= 2 video input devices
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

      // Handle front camera mirror
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      // Handle digital zoom crop if 2x
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
          /* Popout is directly a borderless box with no decorations */
          className="relative w-full max-w-[340px] sm:max-w-[360px] aspect-[3/4] rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col justify-between select-none"
        >
          {/* Top Subtle Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur flex items-center justify-center text-xs cursor-pointer transition-all active:scale-90"
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

          {/* MAIN VIEWPORT: Live Viewfinder or Captured Photo Preview */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
            {previewMedia ? (
              // Clean photo preview box while editing
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
                  className="w-full h-full object-cover"
                />
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

          {/* TRANSPARENT FOOTER BOX (Mobile camera style gradient fade section) */}
          <div className="relative z-20 mt-auto w-full bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-10 pb-5 px-5 flex items-center justify-between">
            {previewMedia ? (
              /* PHOTO EDIT / PREVIEW FOOTER */
              <>
                {/* Retake / Discard */}
                <button
                  type="button"
                  onClick={handleRetake}
                  className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-semibold backdrop-blur flex items-center gap-1.5 cursor-pointer active:scale-90 transition-all"
                  title="Ulangi Foto"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span className="text-[11px] font-sans">Ulang</span>
                </button>

                {/* Center: Distinct Pencil Icon for Crop / Rotate */}
                <button
                  type="button"
                  onClick={handleRotatePhoto}
                  className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                  title="Rotasi / Crop Foto"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>

                {/* Right: Confirm Send Button */}
                <button
                  type="button"
                  onClick={handleConfirmSend}
                  className="px-4 py-2 rounded-full bg-white text-black font-sans font-bold text-xs hover:bg-white/90 shadow-lg cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                >
                  <span>Kirim</span>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </>
            ) : (
              /* LIVE CAMERA SHUTTER FOOTER */
              <>
                {/* LEFT: View Once Option (Picture 4) */}
                <button
                  type="button"
                  onClick={() => setIsViewOnce((v) => !v)}
                  className={`p-2 rounded-full transition-all flex items-center justify-center cursor-pointer select-none ${
                    isViewOnce
                      ? "opacity-100 text-white bg-white/25 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                      : "opacity-45 hover:opacity-75 text-white"
                  }`}
                  title={isViewOnce ? "Lihat Sekali Aktif" : "Aktifkan Lihat Sekali"}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    {/* Left solid arc */}
                    <path d="M 12 3 A 9 9 0 0 0 12 21" strokeLinecap="round" />
                    {/* Right dashed arc */}
                    <path d="M 12 3 A 9 9 0 0 1 12 21" strokeDasharray="2 3.5" strokeLinecap="round" />
                    {/* Number 1 in center */}
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

                {/* CENTER: White Shutter Button (White Inner Fill + Outer Ring Circle) */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    title="Ambil Foto"
                    className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center p-1 cursor-pointer transition-transform hover:scale-105 active:scale-90 select-none shadow-lg"
                  >
                    <span className="w-11 h-11 rounded-full bg-white block" />
                  </button>

                  {/* BESIDE SHUTTER: Zoom Control (1x / 2x) */}
                  <button
                    type="button"
                    onClick={handleToggleZoom}
                    title={`Zoom ${zoomLevel === 1 ? "2x" : "1x"}`}
                    className="w-8 h-8 rounded-full bg-black/60 border border-white/40 text-white text-[11px] font-bold flex items-center justify-center cursor-pointer transition-all hover:bg-black/80 active:scale-95 select-none backdrop-blur-md"
                  >
                    {zoomLevel}x
                  </button>
                </div>

                {/* RIGHT: Flip Camera Icon with Hardware Detection & Centrifugal Spin (Picture 5) */}
                <motion.button
                  type="button"
                  disabled={!canFlipCamera}
                  onClick={handleFlipCamera}
                  animate={isSpinningFlip ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.36, ease: "easeOut" }}
                  className={`p-2.5 rounded-full flex items-center justify-center select-none transition-all ${
                    canFlipCamera
                      ? "text-white opacity-100 hover:bg-white/10 active:scale-90 cursor-pointer"
                      : "text-white opacity-25 cursor-not-allowed pointer-events-none"
                  }`}
                  title={
                    canFlipCamera
                      ? "Ganti Kamera Depan/Belakang"
                      : "Kamera belakang tidak tersedia pada perangkat ini"
                  }
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
