"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { stopCallRingtone } from "@/lib/soundEngine";

export function HardwarePermissionModal({
  isOpen,
  type = "mic", // "mic" | "camera"
  isMapDark = true,
  onGrant,
  onCancel,
  errorMessage = null,
  keepRingtonePlaying = false,
}) {
  const [choice, setChoice] = useState(null); // "batal" | "izinkan"

  if (!isOpen) return null;

  const isCam = type === "camera" || type === "camera_mic";
  const imageSrc = isCam ? "/ForChat/Josh_AllowCamera.png" : "/ForChat/Josh_AllowMic.png";
  const hardwareWord = isCam ? "Camera" : "Microphone";

  const handleBatalClick = () => {
    setChoice("batal");
    if (!keepRingtonePlaying) {
      stopCallRingtone();
    }
    setTimeout(() => {
      setChoice(null);
      onCancel?.();
    }, 160);
  };

  const handleGrantClick = () => {
    setChoice("izinkan");
    setTimeout(() => {
      setChoice(null);
      onGrant?.();
    }, 180);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2200] flex items-center justify-center p-6 select-none pointer-events-auto">
        {/* Whole Map Screen Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`absolute inset-0 backdrop-blur-md transition-colors duration-300 ${
            isMapDark ? "bg-black/55" : "bg-black/35"
          }`}
          onClick={handleBatalClick}
        />

        {/* Middle Center Floating Container */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none max-w-[420px] w-full"
        >
          {/* Josh Mascot Floating Static Animation */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-44 h-44 sm:w-52 sm:h-52 mb-5 flex items-center justify-center drop-shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
          >
            <Image
              src={imageSrc}
              alt={`Allow ${hardwareWord}`}
              width={220}
              height={220}
              className="w-full h-full object-contain"
              priority
            />
          </motion.div>

          {/* Title: Same font of 'Quit the map' but smaller 18%, not all-caps, not bold except the red hardware name */}
          <h3
            className={`font-sans tracking-tight text-xl sm:text-2xl md:text-3xl font-normal mb-8 text-center ${
              isMapDark ? "text-white" : "text-black"
            }`}
            style={{
              textShadow: isMapDark
                ? "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)"
                : "0 2px 14px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.9)",
            }}
          >
            Enable access for the{" "}
            <span className="font-bold text-[#ef4444]">{hardwareWord}</span>
          </h3>

          {/* Action Buttons: Exact Behavior, Font, and Style matching No/Yes on Quit the map */}
          <div className="relative z-10 flex items-center justify-center gap-6 sm:gap-10">
            {/* Batal: Warna Hitam */}
            <button
              type="button"
              onClick={handleBatalClick}
              className="group relative cursor-pointer outline-none rounded-full px-7 py-2.5 bg-black text-white hover:bg-black/85 shadow-lg border border-black/30 transition-all"
            >
              <motion.span
                animate={choice === "batal" ? { scale: 1.25 } : {}}
                transition={{ duration: 0.18 }}
                className="block font-sans text-base sm:text-lg font-normal transition-all duration-200 group-hover:scale-110 active:scale-95"
              >
                Batal
              </motion.span>
            </button>

            {/* Izinkan Akses: Warna Merah */}
            <button
              type="button"
              onClick={handleGrantClick}
              className="group relative cursor-pointer outline-none rounded-full px-7 py-2.5 bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-lg shadow-[#ef4444]/35 transition-all"
            >
              <motion.span
                animate={choice === "izinkan" ? { scale: 1.25 } : {}}
                transition={{ duration: 0.18 }}
                className="block font-sans text-base sm:text-lg font-normal transition-all duration-200 group-hover:scale-110 active:scale-95"
              >
                Izinkan Akses
              </motion.span>
            </button>
          </div>

          {/* Optional Detailed Error Banner */}
          {errorMessage && (
            <p
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
              className="mt-4 text-xs text-red-500 max-w-xs text-center"
            >
              {errorMessage}
            </p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
