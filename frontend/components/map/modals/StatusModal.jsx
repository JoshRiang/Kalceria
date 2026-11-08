"use client";

import { AnimatePresence, motion } from "framer-motion";
import { getInstantMapBgUrl } from "@/lib/mapBgCache";
import { ActionArcSpinner } from "./ActionArcSpinner";
import {
  MODAL_GENIE_BACKDROP,
  MODAL_GENIE_SURFACE,
  useModalBackClose,
} from "./modalMotion";

const BROADCAST_FORM_BG_DARK = "/BG_IMPROVE_FOR_MAP/BG_Broadcast_Dark.webp";
const BROADCAST_FORM_BG_LIGHT = "/BG_IMPROVE_FOR_MAP/BG_Broadcast_Light.webp";

export function StatusModal({
  show,
  onClose,
  isModalDark,
  saveBroadcast,
  statusText,
  setStatusText,
  busy,
}) {
  useModalBackClose(Boolean(show), onClose);

  const isBroadcastValid = Boolean((statusText || "").trim());
  const resolvedBgUrl = getInstantMapBgUrl(
    isModalDark ? BROADCAST_FORM_BG_DARK : BROADCAST_FORM_BG_LIGHT
  );

  // 2-Piece Smooth-Trimmed Mask (3 : 1 Top-to-Bottom Proportion with Tight Gap):
  // - 0% -> 16%: strictly transparent so "Update Status" header stays 100% uncontaminated
  // - Top Segment (~54% span: 18.5% -> 72.5% midpoint-to-midpoint) = 3 parts
  // - Tight Smooth Gap (75% -> 79%, narrower than Create Mini Event)
  // - Bottom Segment (~18% span: 81% -> 99% midpoint-to-midpoint) = 1 part (54% : 18% = 3 : 1)
  const smoothTwoBandMask =
    "linear-gradient(to bottom, transparent 0%, transparent 16%, black 21%, black 71%, transparent 75%, transparent 79%, black 83%, black 100%)";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="status-modal-backdrop"
          {...MODAL_GENIE_BACKDROP}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm select-none"
          onClick={onClose}
        >
          <motion.div
            key="status-modal-surface"
            {...MODAL_GENIE_SURFACE}
            className={`relative w-full max-w-[420px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[20px] sm:rounded-[24px] shadow-2xl overflow-hidden transition-colors duration-300 ${
              isModalDark
                ? "bg-[#010101] border border-[#30363d] text-[#f0f6fc]"
                : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
        {/* 2-Piece (3 : 1) Smooth-Trimmed Broadcast Background Layer */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
          style={{
            backgroundColor: isModalDark ? "#010101" : "#ffffff",
            maskImage: smoothTwoBandMask,
            WebkitMaskImage: smoothTwoBandMask,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("${resolvedBgUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: isModalDark ? 0.45 : 0.58,
            }}
          />
        </div>

        {/* Header (Solid #010101 / #ffffff, 100% uncontaminated by background) */}
        <div
          className={`shrink-0 relative z-10 flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 border-none ${
            isModalDark ? "bg-[#010101]" : "bg-[#ffffff]"
          }`}
        >
          <h2
            className={`font-sans font-bold text-base sm:text-lg tracking-tight ${
              isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
            }`}
          >
            Update Status
          </h2>
          <button
            type="button"
            className={`text-2xl leading-none relative z-10 transition-colors p-1 cursor-pointer ${
              isModalDark
                ? "text-[#8b949e] hover:text-[#f0f6fc]"
                : "text-[#57606a] hover:text-[#1f2328]"
            }`}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            if (!isBroadcastValid) {
              e.preventDefault();
              return;
            }
            saveBroadcast(e);
          }}
          className="relative z-10 p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-4 sm:gap-5 custom-scrollbar"
        >
          <p
            className={`text-xs sm:text-sm leading-relaxed tracking-normal ${
              isModalDark ? "text-[#8b949e]" : "text-[#57606a]"
            }`}
          >
            Share your current activity with other Kalcerians for 24h.
          </p>

          <div className="flex flex-col gap-2">
            <label
              className={`text-xs font-semibold tracking-wider ${
                isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Broadcast <span className="text-[#ef4444]">*</span>
            </label>
            <textarea
              className={`w-full border rounded-lg p-3 sm:p-4 text-xs sm:text-sm outline-none min-h-[90px] sm:min-h-[120px] transition-all resize-none ${
                isModalDark
                  ? "bg-[#0a0c10]/90 border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  : "bg-[#f6f8fa]/94 border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
              }`}
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="OTW FM..."
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-2 shrink-0">
            <button
              type="submit"
              className={`w-full min-h-[40px] flex items-center justify-center py-3 sm:py-3.5 border text-xs font-bold tracking-wider rounded-xl transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
                isModalDark
                  ? "bg-[#ffffff] text-[#000000] border-[#ffffff] hover:bg-[#f0f6fc] shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
                  : "bg-[#000000] text-[#ffffff] border-[#000000] hover:bg-[#1f2328] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              }`}
              disabled={busy || !isBroadcastValid}
            >
              {busy ? (
                <ActionArcSpinner className="w-4 h-4" label="Posting status" />
              ) : (
                "Post"
              )}
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
