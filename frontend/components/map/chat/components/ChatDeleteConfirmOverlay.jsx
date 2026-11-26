"use client";

import { motion, AnimatePresence } from "framer-motion";

export function ChatDeleteConfirmOverlay({
  isOpen,
  mode = "delete", // "delete" | "block" | "unblock"
  displayName,
  isMapDark = false,
  isDeleting = false,
  onCancel,
  onConfirm,
}) {
  const renderPrompt = () => {
    if (mode === "block") {
      return (
        <>
          Do you wish to <span className="font-bold text-[#ef4444]">block</span>{" "}
          <span className="font-bold">{displayName}</span>?
        </>
      );
    }
    if (mode === "unblock") {
      return (
        <>
          Do you wish to <span className="font-bold text-[#22c55e]">unblock</span>{" "}
          <span className="font-bold">{displayName}</span>?
        </>
      );
    }
    return (
      <>
        Do you wish to <span className="font-bold text-[#ef4444]">delete</span> your chat with{" "}
        <span className="font-bold">{displayName}</span>?
      </>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={`chat-confirm-overlay-${mode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`absolute inset-0 z-40 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-md ${
            isMapDark ? "bg-black/55" : "bg-white/65"
          }`}
          onClick={() => !isDeleting && onCancel?.()}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-col items-center justify-center max-w-[290px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`font-sans tracking-tight text-lg sm:text-xl font-normal leading-snug mb-7 text-center ${
                isMapDark ? "text-white" : "text-black"
              }`}
              style={{
                textShadow: isMapDark
                  ? "0 2px 14px rgba(0,0,0,0.85)"
                  : "0 1px 10px rgba(255,255,255,0.95)",
              }}
            >
              {renderPrompt()}
            </h3>

            <div className="flex items-center justify-center gap-10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onCancel}
                className={`font-sans text-base sm:text-lg font-normal px-2 py-1 cursor-pointer outline-none transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 ${
                  isMapDark ? "text-white hover:text-white/80" : "text-black hover:text-black/80"
                }`}
              >
                No
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirm}
                className={`font-sans text-base sm:text-lg font-normal px-2 py-1 cursor-pointer outline-none transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 ${
                  mode === "unblock"
                    ? "text-[#22c55e] hover:text-[#16a34a]"
                    : "text-[#ef4444] hover:text-[#dc2626]"
                }`}
              >
                {isDeleting ? "Processing..." : "Yes"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
