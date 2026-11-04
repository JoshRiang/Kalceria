"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

export function DeleteAccountModal({
  show,
  onClose,
  isMapDark,
}) {
  const [choice, setChoice] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  if (!show && !isDeleting) return null;

  const handleDeleteClick = () => {
    setChoice("delete");
    setTimeout(async () => {
      setIsDeleting(true);
      try {
        await api.delete("/users/me");
      } catch (err) {
        console.warn("Delete account remote call warning:", err);
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem("introPlayed", "true");
        sessionStorage.setItem("landingSeen", "true");
      } catch {}

      // Keep buffer visible briefly so user sees DELETING buffer synchronized with operation
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          window.location.href = "/?skip_intro=true";
        }, 650);
      }, 1200);
    }, 220);
  };

  const handleNoClick = () => {
    setChoice("no");
    setTimeout(() => {
      onClose();
      setChoice(null);
    }, 160);
  };

  return (
    <>
      {/* ── Main Modal View ── */}
      {!isDeleting && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-6 select-none pointer-events-auto">
          {/* Blurred Background Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`absolute inset-0 backdrop-blur-md transition-colors duration-300 ${
              isMapDark ? "bg-black/40" : "bg-black/[0.08]"
            }`}
            onClick={onClose}
          />

          {/* Floating Confirmation Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, y: [0, -5, 0] }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{
              opacity: { duration: 0.25 },
              scale: { duration: 0.25 },
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative z-10 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <h3
              className={`relative z-10 text-2xl sm:text-3xl md:text-4xl font-sans font-bold tracking-tighter ${
                isMapDark ? "text-white" : "text-black"
              }`}
              style={{
                textShadow: isMapDark
                  ? "0 4px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.8)"
                  : "0 2px 14px rgba(255,255,255,0.95), 0 0 24px rgba(255,255,255,0.9)",
              }}
            >
              <span className="text-red-500 font-bold">Delete</span> this Account?
            </h3>

            {/* Small red font subtitle with same font style: This action can't be undone */}
            <p
              className="text-red-500 text-xs sm:text-sm font-sans tracking-wide mt-2 mb-8 sm:mb-10 font-medium select-none"
              style={{
                textShadow: isMapDark
                  ? "0 2px 10px rgba(0,0,0,0.8)"
                  : "0 1px 6px rgba(255,255,255,0.8)",
              }}
            >
              This action can&apos;t be undone
            </p>

            <div className="relative z-10 flex items-center justify-center gap-10 sm:gap-16">
              {/* Delete Button: Default red, bigger on hover/click */}
              <button
                type="button"
                onClick={handleDeleteClick}
                className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 rounded-lg p-2"
              >
                <motion.span
                  animate={choice === "delete" ? { scale: 1.25 } : {}}
                  transition={{ duration: 0.2 }}
                  className="block font-sans text-xl sm:text-2xl font-normal transition-all duration-200 group-hover:scale-110 active:scale-95 text-red-500 hover:text-red-400"
                  style={{
                    textShadow: "0 0 20px rgba(239,68,68,0.6), 0 2px 10px rgba(0,0,0,0.8)",
                  }}
                >
                  Delete
                </motion.span>
              </button>

              {/* No Button: Black / matches Quit the map */}
              <button
                type="button"
                onClick={handleNoClick}
                className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg p-2"
              >
                <motion.span
                  animate={choice === "no" ? { scale: 1.25 } : {}}
                  transition={{ duration: 0.2 }}
                  className={`block font-sans text-xl sm:text-2xl font-normal transition-all duration-200 group-hover:scale-110 active:scale-95 ${
                    isMapDark
                      ? "text-white/80 group-hover:text-white"
                      : "text-black/80 group-hover:text-black"
                  }`}
                  style={{
                    textShadow: isMapDark
                      ? "0 2px 10px rgba(0,0,0,0.8)"
                      : "0 1px 6px rgba(255,255,255,0.9)",
                  }}
                >
                  No
                </motion.span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Buffer Overlay during Account Deletion (Inherited from Logging Out buffer) ── */}
      <AnimatePresence>
        {isDeleting && (
          <motion.div
            key="deleting-loading-buffer"
            initial={{ opacity: 0 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[3000] bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {/* BIG Responsive Arc Spinner matching Logging Out buffer */}
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
            {/* Responsive Typography: DELETING */}
            <p className="text-white font-sans font-black uppercase tracking-[0.4em] text-lg sm:text-2xl md:text-3xl opacity-90 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              DELETING
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

