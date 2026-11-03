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

        {/* Bottom Bar: Cancel, Rotate Icon, Done (All white, no outer box, no outer circle, no glowing) */}
        <div className="w-full max-w-md px-6 py-5 sm:py-6 flex items-center justify-between shrink-0 z-10 pb-8 sm:pb-6">
          {/* Cancel Text (White, No outer box, No glowing) */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="text-white hover:text-white/80 font-bold text-sm tracking-wider cursor-pointer transition-opacity bg-transparent border-none p-2 outline-none disabled:opacity-50"
          >
            Cancel
          </button>

          {/* Picture 2 WhatsApp Rotate Icon (No outer circle, clean 26x26 SVG) */}
          <button
            type="button"
            onClick={handleRotate}
            disabled={isProcessing}
            title="Rotate photo 90°"
            aria-label="Rotate photo"
            className="p-2 flex items-center justify-center text-white hover:text-white/80 transition-all active:scale-85 active:-rotate-45 cursor-pointer bg-transparent border-none outline-none"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M 12 6.5 L 17.5 12 L 12 17.5 L 6.5 12 Z" />
              <path d="M 19 12 A 8 8 0 0 0 8 4.8 L 5 7" />
              <polyline points="4.5 3 5 7 9 7.5" />
            </svg>
          </button>

          {/* Done Text (White, No outer box, No glowing) */}
          <button
            type="button"
            onClick={handleDone}
            disabled={isProcessing}
            className="text-white hover:text-white/80 font-bold text-sm tracking-wider cursor-pointer transition-opacity bg-transparent border-none p-2 outline-none disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Done"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

