"use client";

import { motion } from "framer-motion";

export function StatusModal({
  show,
  onClose,
  isModalDark,
  saveBroadcast,
  statusText,
  setStatusText,
  busy,
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-3 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 select-none"
      onClick={onClose}
    >
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className={`relative w-full max-w-[420px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[20px] sm:rounded-[24px] shadow-2xl overflow-hidden transition-colors duration-300 ${
          isModalDark
            ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc]"
            : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 relative z-10 flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 border-none">
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
          onSubmit={saveBroadcast}
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
              Broadcast
            </label>
            <textarea
              className={`w-full border rounded-lg p-3 sm:p-4 text-xs sm:text-sm outline-none min-h-[90px] sm:min-h-[120px] transition-all resize-none ${
                isModalDark
                  ? "bg-[#0d1117] border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  : "bg-[#f6f8fa] border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
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
              className={`w-full py-3 sm:py-3.5 border text-xs font-bold tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
                isModalDark
                  ? "bg-[#ffffff] text-[#000000] border-[#ffffff] hover:bg-[#f0f6fc] shadow-[0_2px_8px_rgba(255,255,255,0.15)]"
                  : "bg-[#000000] text-[#ffffff] border-[#000000] hover:bg-[#1f2328] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              }`}
              disabled={busy}
            >
              {busy ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
