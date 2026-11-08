"use client";

import { memo } from "react";
import { motion } from "framer-motion";

export const CameraBottomControls = memo(function CameraBottomControls({
  previewMedia,
  handleRetake,
  isCropping,
  setIsCropping,
  handleRotatePhoto,
  isViewOnce,
  setIsViewOnce,
  zoomLevel,
  handleToggleZoom,
  handleShutterPointerDown,
  handleShutterPointerUp,
  isRecordingVideo,
  recordingSeconds,
  hasFlash,
  isFlashOn,
  handleToggleFlash,
  canFlipCamera,
  handleFlipCamera,
  isSpinningFlip,
}) {
  return (
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
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" />
                <polyline points="21 3 21 8 16 8" />
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
        /* PART 1 FOOTER: Live Viewfinder (Zoom left, Shutter dead center, Flash + Flip Camera right) */
        <>
          {/* ZOOM CONTROL: flat white text 1x/2x, no outer box */}
          <div className="w-16 flex items-center justify-start">
            <button
              type="button"
              onClick={handleToggleZoom}
              title={`Zoom ${zoomLevel === 1 ? "2x" : "1x"}`}
              className="p-2 text-white font-sans font-bold text-xs cursor-pointer select-none transition-transform active:scale-90"
            >
              {zoomLevel}x
            </button>
          </div>

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

          {/* RIGHT HARDWARE CONTROLS: Monochrome Torch (left) + Turn Camera / Flip (right) */}
          <div className="w-16 flex items-center justify-end gap-1">
            <button
              type="button"
              disabled={!hasFlash}
              onClick={handleToggleFlash}
              className={`p-1.5 transition-all ${
                hasFlash
                  ? isFlashOn
                    ? "text-white opacity-100 active:scale-90 cursor-pointer drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]"
                    : "text-white opacity-75 hover:opacity-100 active:scale-90 cursor-pointer"
                  : "text-white opacity-25 cursor-not-allowed pointer-events-none"
              }`}
              title={
                !hasFlash
                  ? "Flashlight tidak tersedia pada kamera ini"
                  : isFlashOn
                  ? "Matikan Flashlight"
                  : "Nyalakan Flashlight"
              }
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-white"
                fill={hasFlash && isFlashOn ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </button>

            <motion.button
              type="button"
              disabled={!canFlipCamera}
              onClick={handleFlipCamera}
              animate={isSpinningFlip ? { rotate: 360 } : { rotate: 0 }}
              transition={{ duration: 0.36, ease: "easeOut" }}
              className={`p-1.5 transition-all ${
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
          </div>
        </>
      )}
    </div>
  );
});
