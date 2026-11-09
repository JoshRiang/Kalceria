"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CameraBottomControls,
  CameraCaptionBox,
  CameraViewport,
  bakePhotoCropAndRotation,
  computeVideoTrimFragment,
} from "./cameraCapture";
import { useCameraDeviceStream } from "./cameraCapture/useCameraDeviceStream";
import { useCameraMediaRecorder } from "./cameraCapture/useCameraMediaRecorder";

export function CameraCaptureModal({
  isOpen,
  onClose,
  onSendMedia, // ({ url, blob, type, isViewOnce, rotation, caption })
  isMapDark = true,
  onPermissionNeeded,
}) {
  const onPermissionNeededRef = useRef(onPermissionNeeded);
  onPermissionNeededRef.current = onPermissionNeeded;

  const [previewMedia, setPreviewMedia] = useState(null); // { type: "photo" | "video", url, blob, duration }
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [photoRotation, setPhotoRotation] = useState(0); // 0, 90, 180, 270
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState({ left: 0, top: 0, right: 1, bottom: 1 });
  const [caption, setCaption] = useState("");
  const [showCameraGuide, setShowCameraGuide] = useState(true);

  // Video duration crop (trimming)
  const [trimStart, setTrimStart] = useState(0); // 0 to 1
  const [trimEnd, setTrimEnd] = useState(1);     // 0 to 1
  const [activeTrimHandle, setActiveTrimHandle] = useState(null); // "start" | "end" | null
  const previewVideoRef = useRef(null);
  const previewViewportRef = useRef(null);
  const trimmerTrackRef = useRef(null);

  const hasPreview = Boolean(previewMedia);

  const {
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
  } = useCameraDeviceStream({
    isOpen,
    hasPreview,
    onPermissionNeededRef,
  });

  const {
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
  } = useCameraMediaRecorder({
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
  });

  const cleanupCamera = useCallback(() => {
    cleanupRecorder();
    cleanupCameraStream();
  }, [cleanupRecorder, cleanupCameraStream]);

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
  }, [isOpen, cleanupCamera, setCameraError, setZoomLevel, setIsRecordingVideo, setRecordingSeconds, setVideoTrueDuration]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, [cleanupCamera]);

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
