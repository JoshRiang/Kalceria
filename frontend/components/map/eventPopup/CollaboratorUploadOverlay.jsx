"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * CollaboratorUploadOverlay
 * 
 * Full-screen dimmed overlay during collaborator media upload.
 * Inherits exact buffer shape and behavior from the Logging Out sequence,
 * with error state typography matching HardwarePermissionModal (AllowCamera).
 */
export function CollaboratorUploadOverlay({
  uploadState,
  onDismiss,
}) {
  const isVisible = Boolean(uploadState && uploadState.status);
  const status = uploadState?.status || "uploading";
  const errorMessage =
    uploadState?.errorMessage || "Upload media Gagal/Ukuran Media melebihi 10 MB";

  // Auto-dismiss error state after 2.8 seconds
  useEffect(() => {
    if (status !== "error") return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 2800);
    return () => clearTimeout(timer);
  }, [status, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="collab-upload-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto"
          onClick={() => {
            if (status === "error") {
              onDismiss?.();
            }
          }}
        >
          <AnimatePresence mode="wait">
            {status === "uploading" && (
              <motion.div
                key="uploading-buffer"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex flex-col items-center justify-center text-center select-none"
              >
                {/* Responsive Arc Spinner matching Logging Out buffer */}
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 mb-6 sm:mb-8">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeDasharray="70 200"
                        strokeLinecap="round"
                        className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                      />
                    </svg>
                  </div>
                </div>
                {/* Spaced Typography matching Logging Out buffer */}
                <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  UPLOADING MEDIA
                </p>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="upload-error-state"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none max-w-[560px] w-full"
              >
                {/* Error text matching AllowCamera typography: centered, default red (#ef4444), no outer box */}
                <h3
                  className="font-sans tracking-tight text-xl sm:text-2xl md:text-3xl font-bold text-center text-[#ef4444]"
                  style={{
                    textShadow: "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)",
                  }}
                >
                  {errorMessage}
                </h3>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

