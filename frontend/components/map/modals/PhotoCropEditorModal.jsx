"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_CROP_RECT = { left: 0, top: 0, right: 1, bottom: 1 };

export function PhotoCropEditorModal({
  show,
  isOpen,
  rawImage,
  imageSrc,
  onDone,
  onCancel,
}) {
  const isModalOpen = Boolean(show ?? isOpen);
  const sourceImage = rawImage || imageSrc || null;

  const [rotation, setRotation] = useState(0);
  const [cropRect, setCropRect] = useState(INITIAL_CROP_RECT);
  const [isProcessing, setIsProcessing] = useState(false);
  const stageRef = useRef(null);
  const cropRectRef = useRef(INITIAL_CROP_RECT);
  cropRectRef.current = cropRect;

  // Reset crop & rotation whenever a new photo is opened
  useEffect(() => {
    if (isModalOpen && sourceImage) {
      setRotation(0);
      setCropRect(INITIAL_CROP_RECT);
      setIsProcessing(false);
    }
  }, [isModalOpen, sourceImage]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Interactive crop drag handler matching CameraCaptureModal (move, n, s, w, e, nw, ne, sw, se)
  const handleCropPointerDown = useCallback((e, mode) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initial = { ...cropRectRef.current };
    const minSize = 0.18;

    const onPointerMove = (ev) => {
      if (ev.cancelable) ev.preventDefault();
      const dx = (ev.clientX - startX) / rect.width;
      const dy = (ev.clientY - startY) / rect.height;

      setCropRect(() => {
        let { left, top, right, bottom } = initial;
        if (mode === "move") {
          const w = right - left;
          const h = bottom - top;
          left = Math.max(0, Math.min(1 - w, left + dx));
          top = Math.max(0, Math.min(1 - h, top + dy));
          right = left + w;
          bottom = top + h;
        } else {
          if (mode.includes("w")) {
            left = Math.max(0, Math.min(right - minSize, left + dx));
          }
          if (mode.includes("e")) {
            right = Math.min(1, Math.max(left + minSize, right + dx));
          }
          if (mode.includes("n")) {
            top = Math.max(0, Math.min(bottom - minSize, top + dy));
          }
          if (mode.includes("s")) {
            bottom = Math.min(1, Math.max(top + minSize, bottom + dy));
          }
        }
        return { left, top, right, bottom };
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }, []);

  const handleDone = useCallback(() => {
    if (isProcessing || !sourceImage) return;
    setIsProcessing(true);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const srcW = img.naturalWidth || 640;
        const srcH = img.naturalHeight || 640;

        // 1. Render rotated object-cover stage matching on-screen square viewport 1:1
        const vpRect = stageRef.current?.getBoundingClientRect();
        const stageSize = Math.min(960, Math.max(512, Math.round((vpRect?.width || 360) * 2)));
        const stageCanvas = document.createElement("canvas");
        stageCanvas.width = stageSize;
        stageCanvas.height = stageSize;
        const stageCtx = stageCanvas.getContext("2d");
        if (!stageCtx) {
          onDone?.(sourceImage);
          setIsProcessing(false);
          return;
        }

        const rad = ((rotation % 360) * Math.PI) / 180;
        stageCtx.save();
        stageCtx.translate(stageSize / 2, stageSize / 2);
        stageCtx.rotate(rad);

        const scale = Math.max(stageSize / srcW, stageSize / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        stageCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        stageCtx.restore();

        // 2. Extract exact user-dragged cropRect region
        const activeCrop = cropRectRef.current;
        const cropX = Math.round(stageSize * activeCrop.left);
        const cropY = Math.round(stageSize * activeCrop.top);
        const cropW = Math.max(48, Math.round(stageSize * (activeCrop.right - activeCrop.left)));
        const cropH = Math.max(48, Math.round(stageSize * (activeCrop.bottom - activeCrop.top)));

        // Cap output dimension to crisp 640px max so avatar payload stays compact & fast
        const maxOut = 640;
        const outScale = Math.min(1, maxOut / Math.max(cropW, cropH));
        const outW = Math.max(48, Math.round(cropW * outScale));
        const outH = Math.max(48, Math.round(cropH * outScale));

        const outCanvas = document.createElement("canvas");
        outCanvas.width = outW;
        outCanvas.height = outH;
        const outCtx = outCanvas.getContext("2d");
        if (!outCtx) {
          onDone?.(sourceImage);
          setIsProcessing(false);
          return;
        }

        outCtx.drawImage(stageCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
        const croppedDataUrl = outCanvas.toDataURL("image/jpeg", 0.9);
        onDone?.(croppedDataUrl);
      } catch (err) {
        console.error("Canvas export failed:", err);
        onDone?.(sourceImage);
      } finally {
        setIsProcessing(false);
      }
    };
    img.onerror = () => {
      setIsProcessing(false);
      onDone?.(sourceImage);
    };
    img.src = sourceImage;
  }, [isProcessing, sourceImage, rotation, onDone]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isModalOpen && sourceImage && (
        <motion.div
          key="kalceria-photo-crop-editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[2500] bg-black/85 backdrop-blur-md flex flex-col justify-between items-center select-none overflow-hidden safe-area-inset"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Spacer */}
          <div className="w-full h-12 sm:h-16 shrink-0 flex items-center justify-center pointer-events-none" />

          {/* Center Interactive Crop Stage: CameraCaptureModal-identical edges & zero dimming when uncropped */}
          <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden relative">
            <div
              ref={stageRef}
              className="relative w-full max-w-[84vw] sm:max-w-[380px] max-h-[62vh] sm:max-h-[65vh] aspect-square flex items-center justify-center rounded-t-2xl rounded-b-none overflow-hidden bg-black shadow-2xl touch-none"
            >
              {/* Photo Layer: Always 100% bright inside cropRect */}
              <div
                className="w-full h-full flex items-center justify-center overflow-hidden opacity-100"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.25s ease-out",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourceImage}
                  alt="Crop preview"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              </div>

              {/* Interactive 3x3 Cropping Overlay (Identical to CameraCaptureModal Picture 2) */}
              <div className="absolute inset-0 z-15 pointer-events-none select-none touch-none">
                {/* 4 Outer Mask Strips (0% size when uncropped 0..1 -> zero dimming on full photo!) */}
                <div
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${cropRect.top * 100}%`,
                  }}
                  className="absolute bg-black/55 pointer-events-none"
                />
                <div
                  style={{
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${(1 - cropRect.bottom) * 100}%`,
                  }}
                  className="absolute bg-black/55 pointer-events-none"
                />
                <div
                  style={{
                    top: `${cropRect.top * 100}%`,
                    height: `${(cropRect.bottom - cropRect.top) * 100}%`,
                    left: 0,
                    width: `${cropRect.left * 100}%`,
                  }}
                  className="absolute bg-black/55 pointer-events-none"
                />
                <div
                  style={{
                    top: `${cropRect.top * 100}%`,
                    height: `${(cropRect.bottom - cropRect.top) * 100}%`,
                    right: 0,
                    width: `${(1 - cropRect.right) * 100}%`,
                  }}
                  className="absolute bg-black/55 pointer-events-none"
                />

                {/* Draggable Crop Box */}
                <div
                  onPointerDown={(e) => handleCropPointerDown(e, "move")}
                  style={{
                    left: `${cropRect.left * 100}%`,
                    top: `${cropRect.top * 100}%`,
                    width: `${(cropRect.right - cropRect.left) * 100}%`,
                    height: `${(cropRect.bottom - cropRect.top) * 100}%`,
                  }}
                  className="absolute pointer-events-auto cursor-move touch-none"
                >
                  {/* 3x3 Grid Lines */}
                  <div className="w-full h-full border border-white/45 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div />
                  </div>

                  {/* Edge Drag Handles (N, S, W, E) */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "n")}
                    className="absolute -top-2.5 left-6 right-6 h-5 cursor-ns-resize z-20 touch-none"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "s")}
                    className="absolute -bottom-2.5 left-6 right-6 h-5 cursor-ns-resize z-20 touch-none"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "w")}
                    className="absolute top-6 bottom-6 -left-2.5 w-5 cursor-ew-resize z-20 touch-none"
                  />
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "e")}
                    className="absolute top-6 bottom-6 -right-2.5 w-5 cursor-ew-resize z-20 touch-none"
                  />

                  {/* Top-Left Corner Bracket & Drag Handle: Round Bevel (CameraCaptureModal Picture 2) */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "nw")}
                    className={`absolute top-0 left-0 w-7 h-7 border-t-[4px] border-l-[4px] border-white cursor-nwse-resize z-30 touch-none ${
                      cropRect.top < 0.02 && cropRect.left < 0.02 ? "rounded-tl-2xl" : "rounded-tl-md"
                    }`}
                  />
                  {/* Top-Right Corner Bracket & Drag Handle: Round Bevel (CameraCaptureModal Picture 2) */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "ne")}
                    className={`absolute top-0 right-0 w-7 h-7 border-t-[4px] border-r-[4px] border-white cursor-nesw-resize z-30 touch-none ${
                      cropRect.top < 0.02 && cropRect.right > 0.98 ? "rounded-tr-2xl" : "rounded-tr-md"
                    }`}
                  />
                  {/* Bottom-Left Corner Bracket & Drag Handle: Sharp Edge (CameraCaptureModal Picture 2) */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "sw")}
                    className="absolute bottom-0 left-0 w-7 h-7 border-b-[4px] border-l-[4px] border-white rounded-none cursor-nesw-resize z-30 touch-none"
                  />
                  {/* Bottom-Right Corner Bracket & Drag Handle: Sharp Edge (CameraCaptureModal Picture 2) */}
                  <div
                    onPointerDown={(e) => handleCropPointerDown(e, "se")}
                    className="absolute bottom-0 right-0 w-7 h-7 border-b-[4px] border-r-[4px] border-white rounded-none cursor-nwse-resize z-30 touch-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Cancel, Camera Rotate Icon (Picture 4), Done */}
          <div className="w-full max-w-md px-6 py-5 sm:py-6 flex items-center justify-between shrink-0 z-10 pb-8 sm:pb-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="text-white hover:text-white/80 font-bold text-sm tracking-wider cursor-pointer transition-opacity bg-transparent border-none p-2 outline-none disabled:opacity-50"
            >
              Cancel
            </button>

            {/* Exact CameraCaptureModal Rotate Icon (Picture 4) */}
            <button
              type="button"
              onClick={handleRotate}
              disabled={isProcessing}
              title="Rotate photo 90°"
              aria-label="Rotate photo"
              className="p-2 flex items-center justify-center text-white hover:text-white/80 transition-transform active:scale-90 cursor-pointer bg-transparent border-none outline-none disabled:opacity-50"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8" />
                <polyline points="21 3 21 8 16 8" />
                <rect x="8.5" y="8.5" width="7" height="7" rx="1.5" strokeWidth="1.8" />
              </svg>
            </button>

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
      )}
    </AnimatePresence>,
    document.body
  );
}
