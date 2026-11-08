"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CameraCropOverlay } from "./CameraCropOverlay";
import { CameraTrimmerBar } from "./CameraTrimmerBar";

export const CameraViewport = memo(function CameraViewport({
  cameraError,
  previewMedia,
  previewViewportRef,
  photoRotation,
  previewVideoRef,
  setVideoTrueDuration,
  handlePreviewVideoTimeUpdate,
  isCropping,
  cropRect,
  setCropRect,
  isMapDark,
  trimmerTrackRef,
  getActiveVideoDur,
  activeTrimHandle,
  setActiveTrimHandle,
  trimStart,
  setTrimStart,
  trimEnd,
  setTrimEnd,
  hasStream,
  videoRef,
  facingMode,
  zoomLevel,
  showCameraGuide,
  isRecordingVideo,
}) {
  return (
    <>
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

            {/* Interactive 3x3 Cropping Grid Overlay */}
            {isCropping && (
              <CameraCropOverlay
                cropRect={cropRect}
                setCropRect={setCropRect}
                previewViewportRef={previewViewportRef}
                isMapDark={isMapDark}
              />
            )}

            {/* Video Duration Trimming Panel: Located below video crop layer */}
            {previewMedia.type === "video" && (
              <CameraTrimmerBar
                trimmerTrackRef={trimmerTrackRef}
                getActiveVideoDur={getActiveVideoDur}
                activeTrimHandle={activeTrimHandle}
                setActiveTrimHandle={setActiveTrimHandle}
                trimStart={trimStart}
                setTrimStart={setTrimStart}
                trimEnd={trimEnd}
                setTrimEnd={setTrimEnd}
                previewVideoRef={previewVideoRef}
              />
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
    </>
  );
});
