"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { acquireCameraStream, stopMediaStream } from "@/lib/mediaHardware";

export function CameraCaptureModal({
  isOpen,
  onClose,
  onSendMedia, // ({ file, url, type, duration })
  isMapDark = true,
  onPermissionNeeded,
}) {
  const [activeTab, setActiveTab] = useState("camera"); // "camera" | "upload"
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [hasStream, setHasStream] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [previewMedia, setPreviewMedia] = useState(null); // { type: "photo" | "video", url, blob, duration }
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordedVideoSeconds, setRecordedVideoSeconds] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const cleanupCamera = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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

  // Teardown when closing modal
  useEffect(() => {
    if (!isOpen) {
      cleanupCamera();
      setPreviewMedia(null);
      setCameraError("");
      setRecordedVideoSeconds(0);
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
      const stream = await acquireCameraStream({ facingMode: facing }, true);
      streamRef.current = stream;
      setHasStream(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setHasStream(false);
      setCameraError(err?.message || "Tidak dapat mengakses kamera.");
      if (err?.code === "PERMISSION_DENIED" && onPermissionNeeded) {
        onPermissionNeeded("camera");
      }
    }
  }, [cleanupCamera, onPermissionNeeded]);

  // Re-start camera when activeTab is camera or facingMode changes
  useEffect(() => {
    if (isOpen && activeTab === "camera" && !previewMedia) {
      startCamera(facingMode);
    } else {
      cleanupCamera();
    }
  }, [isOpen, activeTab, facingMode, previewMedia, startCamera, cleanupCamera]);

  // Take Snapshot Photo
  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video || !hasStream) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");

      // Mirror if user front camera
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          setPreviewMedia({
            type: "photo",
            url,
            blob,
            duration: null,
          });
          cleanupCamera();
        },
        "image/jpeg",
        0.9
      );
    } catch (err) {
      setCameraError("Gagal mengambil foto.");
    }
  };

  // Record Video (Strictly Max 60 Seconds / 1 Minute)
  const handleStartRecordVideo = () => {
    if (!streamRef.current || !hasStream) return;

    recordedChunksRef.current = [];
    setRecordedVideoSeconds(0);
    setIsRecordingVideo(true);

    const preferredMimes = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    let selectedMime = "";
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
      selectedMime = preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || "";
    }

    const recorder = new MediaRecorder(streamRef.current, selectedMime ? { mimeType: selectedMime } : {});
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const mime = recorder.mimeType || selectedMime || "video/webm";
      const blob = new Blob(recordedChunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);
      setPreviewMedia({
        type: "video",
        url,
        blob,
        duration: Math.min(60, Math.max(1, recordedVideoSeconds)),
      });
      cleanupCamera();
    };

    recorder.start(250);

    let sec = 0;
    timerRef.current = setInterval(() => {
      sec += 1;
      setRecordedVideoSeconds(sec);
      // Strictly enforce maximum 1 minute (60 seconds) video limit
      if (sec >= 60) {
        handleStopRecordVideo();
      }
    }, 1000);
  };

  const handleStopRecordVideo = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecordingVideo(false);
  };

  // File Upload Handler (Strictly verifies video <= 60 seconds)
  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError("");

    if (file.size > 15 * 1024 * 1024) {
      setCameraError("Ukuran file melebihi 15 MB.");
      return;
    }

    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);

    if (isVideo) {
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      const objectUrl = URL.createObjectURL(file);

      videoEl.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoEl.src);
        if (videoEl.duration > 60) {
          setCameraError("Durasi video melebihi batas 1 menit (maksimal 60 detik).");
          return;
        }
        setPreviewMedia({
          type: "video",
          url: objectUrl,
          blob: file,
          duration: Math.round(videoEl.duration),
        });
      };

      videoEl.onerror = () => {
        setCameraError("Gagal membaca format video.");
      };

      videoEl.src = objectUrl;
    } else {
      // Photo
      const objectUrl = URL.createObjectURL(file);
      setPreviewMedia({
        type: "photo",
        url: objectUrl,
        blob: file,
        duration: null,
      });
    }
  };

  const handleConfirmSend = () => {
    if (!previewMedia) return;
    onSendMedia?.(previewMedia);
    onClose();
  };

  const handleRetake = () => {
    if (previewMedia?.url) {
      try {
        URL.revokeObjectURL(previewMedia.url);
      } catch {}
    }
    setPreviewMedia(null);
    setCameraError("");
    setRecordedVideoSeconds(0);
    if (activeTab === "camera") {
      startCamera(facingMode);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className={`relative w-full max-w-[360px] rounded-2xl p-4 border flex flex-col overflow-hidden shadow-2xl ${
            isMapDark
              ? "bg-[#161b22] border-white/20 text-[#f0f6fc]"
              : "bg-white border-black text-[#1f2328]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-current/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff006e]" />
              <h3 className="text-sm font-bold tracking-tight">Kamera & Media</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-current/10 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Mode Switch Tabs */}
          {!previewMedia && (
            <div className="flex items-center justify-center gap-1 my-2.5 p-1 rounded-xl bg-black/10 border border-current/10">
              <button
                type="button"
                onClick={() => setActiveTab("camera")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  activeTab === "camera"
                    ? "bg-[#ff006e] text-white"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                Kamera Langsung
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("upload");
                  fileInputRef.current?.click();
                }}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  activeTab === "upload"
                    ? "bg-[#ff006e] text-white"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                Pilih File (Max 1 Menit)
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
            className="hidden"
            onChange={handleFilePicked}
          />

          {/* Error Banner */}
          {cameraError && (
            <div
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
              className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] leading-tight"
            >
              {cameraError}
            </div>
          )}

          {/* Main Stage: Live Camera or Preview */}
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black/90 flex items-center justify-center border border-current/10">
            {previewMedia ? (
              previewMedia.type === "video" ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewMedia.url}
                  alt="Captured preview"
                  className="w-full h-full object-contain"
                />
              )
            ) : activeTab === "camera" ? (
              hasStream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      facingMode === "user" ? "-scale-x-100" : ""
                    }`}
                  />
                  {isRecordingVideo && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-white text-[11px] font-mono font-bold shadow">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      REC 0:{String(recordedVideoSeconds).padStart(2, "0")} / 1:00
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <Image
                    src="/ForChat/Josh_AllowCamera.png"
                    alt="Camera permission"
                    width={90}
                    height={90}
                    className="opacity-80 mb-2"
                  />
                  <p className="text-xs text-white/80">Memuat akses kamera...</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-white/80 mb-2">Pilih foto atau video dari galeri</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#ff006e] text-white cursor-pointer"
                >
                  Pilih Media
                </button>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          {previewMedia ? (
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-current/25 hover:bg-current/10 cursor-pointer"
              >
                Ulangi
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#ff006e] text-white hover:bg-[#e00060] cursor-pointer shadow"
              >
                Kirim {previewMedia.type === "video" ? "Video" : "Foto"}
              </button>
            </div>
          ) : activeTab === "camera" && hasStream ? (
            <div className="flex items-center justify-between gap-2 mt-3 px-2">
              {/* Flip camera */}
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                title="Ganti Kamera Depan/Belakang"
                className="p-2 rounded-full border border-current/20 hover:bg-current/10 cursor-pointer text-xs"
              >
                🔄
              </button>

              {/* Photo snap */}
              {!isRecordingVideo ? (
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  title="Ambil Foto"
                  className="w-12 h-12 rounded-full border-4 border-[#ff006e] bg-white flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="w-8 h-8 rounded-full bg-[#ff006e]" />
                </button>
              ) : null}

              {/* Video Record / Stop */}
              {isRecordingVideo ? (
                <button
                  type="button"
                  onClick={handleStopRecordVideo}
                  title="Selesai Rekam (Maks 1 Menit)"
                  className="py-2 px-4 rounded-full bg-red-600 text-white font-bold text-xs cursor-pointer animate-pulse"
                >
                  ■ Stop ({60 - recordedVideoSeconds}s)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartRecordVideo}
                  title="Rekam Video (Maks 1 Menit)"
                  className="p-2 rounded-full border border-red-500/50 hover:bg-red-500/10 text-red-500 text-xs font-bold cursor-pointer"
                >
                  🔴 Video (1 min)
                </button>
              )}
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

