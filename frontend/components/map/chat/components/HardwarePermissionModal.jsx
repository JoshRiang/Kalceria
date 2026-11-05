"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function HardwarePermissionModal({
  isOpen,
  type = "mic", // "mic" | "camera"
  isMapDark = true,
  onGrant,
  onCancel,
  errorMessage = null,
}) {
  if (!isOpen) return null;

  const isCam = type === "camera" || type === "camera_mic";
  const imageSrc = isCam ? "/ForChat/Josh_AllowCamera.png" : "/ForChat/Josh_AllowMic.png";
  const hardwareWord = isCam ? "Camera" : "Microphone";

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
          onClick={onCancel}
        />

        {/* Middle Center Floating Container */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none max-w-[420px] w-full"
        >
          {/* Josh Mascot Floating Static Animation ("very tipis tipis") */}
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
            className={`font-sans tracking-tight text-xl sm:text-2xl md:text-3xl font-normal mb-6 text-center ${
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

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <button
              type="button"
              onClick={onCancel}
              className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border transition-all cursor-pointer ${
                isMapDark
                  ? "border-white/30 text-white hover:bg-white/10"
                  : "border-black/40 text-black hover:bg-black/5"
              }`}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onGrant}
              className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-lg shadow-[#ef4444]/35 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Izinkan Akses
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
