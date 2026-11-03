// PhotoCropEditorModal.jsx
// WhatsApp-style fullscreen semi-transparent blur photo crop & rotate editor
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PhotoCropEditorModal({
  show,
  rawImage,
  onDone,
  onCancel,
  isMapDark = false,
}) {
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef(null);

  // Reset rotation whenever a new image is loaded
  useEffect(() => {
    if (show) {
      setRotation(0);
      setIsProcessing(false);
    }
  }, [show, rawImage]);

  if (!show || !rawImage) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDone = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Use square crop based on smaller dimension
        const cropSize = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - cropSize) / 2;
        const sy = (img.naturalHeight - cropSize) / 2;

        // Final output avatar resolution (max 800x800 for high quality & crispness)
        const outputSize = Math.min(cropSize, 800);
        canvas.width = outputSize;
        canvas.height = outputSize;

        // Position at center of canvas to rotate around center
        ctx.translate(outputSize / 2, outputSize / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        // Draw center-cropped square
        ctx.drawImage(
          img,
          sx,
          sy,
          cropSize,
          cropSize,
          -outputSize / 2,
          -outputSize / 2,
          outputSize,
          outputSize
        );

        const rotatedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        onDone?.(rotatedDataUrl);
      } catch (err) {
        console.error("Canvas export failed:", err);
        // Fallback to raw image if canvas manipulation fails
        onDone?.(rawImage);
      } finally {
        setIsProcessing(false);
      }
    };
    img.onerror = () => {
      setIsProcessing(false);
      onDone?.(rawImage);
    };
    img.src = rawImage;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[2300] bg-black/85 backdrop-blur-md flex flex-col justify-between items-center select-none overflow-hidden safe-area-inset"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Space / Spacing Header */}
        <div className="w-full h-12 sm:h-16 shrink-0 flex items-center justify-center pointer-events-none" />

        {/* Center Canvas: Photo with WhatsApp-Style Grid & Crop Frame (No outer box!) */}
        <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden relative">
          <div className="relative max-w-[85vw] sm:max-w-[420px] max-h-[62vh] sm:max-h-[65vh] aspect-square flex items-center justify-center">
            {/* The Photo with Smooth Rotation Transition */}
            <div
              className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: "transform 0.3s cubic-bezier(0.2, 0, 0, 1)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={rawImage}
                alt="Crop preview"
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>

            {/* WhatsApp Crop Frame & 3x3 Grid Overlay (Pointer events transparent) */}
            <div className="absolute inset-0 pointer-events-none border border-white/70 rounded-lg">
              {/* 3x3 Grid Lines */}
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />

              {/* 4 Thick Corner Brackets (WhatsApp style) */}
              <span className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-[3px] border-l-[3px] border-white" />
              <span className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-[3px] border-r-[3px] border-white" />
              <span className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-[3px] border-l-[3px] border-white" />
              <span className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-[3px] border-r-[3px] border-white" />

              {/* 4 Midpoint Edge Ticks */}
              <span className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-4 h-[3px] bg-white" />
              <span className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-4 h-[3px] bg-white" />
              <span className="absolute -left-[2px] top-1/2 -translate-y-1/2 h-4 w-[3px] bg-white" />
              <span className="absolute -right-[2px] top-1/2 -translate-y-1/2 h-4 w-[3px] bg-white" />
            </div>
          </div>
        </div>

        {/* Bottom Bar: Cancel, Rotate Icon, Done */}
        <div className="w-full max-w-md px-6 py-5 sm:py-6 flex items-center justify-between shrink-0 z-10 pb-8 sm:pb-6">
          {/* Cancel Button (styled like Create button in mini event, but more little and tight) */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 sm:px-5 py-2 sm:py-2.5 border text-xs font-bold tracking-wider rounded-xl transition-all cursor-pointer border-white/40 bg-white/10 hover:bg-white/20 text-white active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>

          {/* Picture 2 WhatsApp Rotate Icon (Static scale animation on tap) */}
          <button
            type="button"
            onClick={handleRotate}
            disabled={isProcessing}
            title="Rotate photo 90°"
            aria-label="Rotate photo"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white bg-white/15 hover:bg-white/25 border border-white/25 shadow-md transition-all active:scale-90 cursor-pointer"
          >
            {/* WhatsApp Crop Rotate SVG: tilted diamond with orbit arrow */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <rect x="7" y="7" width="10" height="10" rx="1.5" transform="rotate(45 12 12)" strokeWidth="1.7" />
              <path d="M 19.5 12 A 7.5 7.5 0 0 0 7 6.5 L 4.5 9" />
              <polyline points="4.5 4.5 4.5 9 9 9" />
            </svg>
          </button>

          {/* Done Button (styled like Create button in mini event, but more little and tight) */}
          <button
            type="button"
            onClick={handleDone}
            disabled={isProcessing}
            className="px-5 sm:px-6 py-2 sm:py-2.5 border text-xs font-bold tracking-wider rounded-xl transition-all cursor-pointer border-white bg-white hover:bg-neutral-200 text-black shadow-[0_2px_12px_rgba(255,255,255,0.25)] active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Done"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

