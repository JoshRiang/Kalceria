"use client";

import { motion, AnimatePresence } from "framer-motion";

export const RANDOM_INNER_COLORS = [
  { bg: "#3b82f6", lightBg: "rgba(59, 130, 246, 0.20)", darkBg: "rgba(37, 99, 235, 0.38)", border: "#2563eb" }, // Blue
  { bg: "#10b981", lightBg: "rgba(16, 185, 129, 0.20)", darkBg: "rgba(5, 150, 105, 0.38)", border: "#059669" }, // Emerald
  { bg: "#f59e0b", lightBg: "rgba(245, 158, 11, 0.22)", darkBg: "rgba(217, 119, 6, 0.38)", border: "#d97706" }, // Amber
  { bg: "#8b5cf6", lightBg: "rgba(139, 92, 246, 0.20)", darkBg: "rgba(124, 58, 237, 0.38)", border: "#7c3aed" }, // Violet
  { bg: "#ec4899", lightBg: "rgba(236, 72, 153, 0.20)", darkBg: "rgba(219, 39, 119, 0.38)", border: "#db2777" }, // Pink
  { bg: "#06b6d4", lightBg: "rgba(6, 182, 212, 0.20)", darkBg: "rgba(8, 145, 178, 0.38)", border: "#0891b2" }, // Cyan
  { bg: "#f97316", lightBg: "rgba(249, 115, 22, 0.22)", darkBg: "rgba(234, 88, 12, 0.38)", border: "#ea580c" }, // Orange
  { bg: "#14b8a6", lightBg: "rgba(20, 184, 166, 0.20)", darkBg: "rgba(13, 148, 136, 0.38)", border: "#0d9488" }, // Teal
];

export function CollabRequestsModal({
  show,
  onClose,
  isModalDark,
  viewingRequestsEvent,
  currentRequestsList = [],
  onAcceptCollabRequest,
  onDeclineCollabRequest,
}) {
  return (
    <AnimatePresence>
      {show && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-3 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm select-none"
          onClick={onClose}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className={`relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[20px] sm:rounded-[26px] shadow-2xl overflow-hidden transition-colors duration-300 ${
              isModalDark
                ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc]"
                : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 relative z-10 flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 border-none">
              <div className="flex flex-col">
                <h2
                  className={`font-sans font-bold text-base sm:text-lg tracking-tight ${
                    isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
                  }`}
                >
                  Event Collab Requests
                </h2>
                {viewingRequestsEvent?.title && (
                  <span
                    className={`text-[11px] font-semibold mt-0.5 truncate max-w-[300px] ${
                      isModalDark ? "text-white/60" : "text-black/60"
                    }`}
                  >
                    {viewingRequestsEvent.title}
                  </span>
                )}
              </div>
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

            {/* Inner Box with Scrollbar & Random Colors (except black/white) */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[380px] custom-scrollbar flex flex-col gap-3">
              {currentRequestsList.length > 0 ? (
                currentRequestsList.map((req, idx) => {
                  const colorScheme = RANDOM_INNER_COLORS[idx % RANDOM_INNER_COLORS.length];
                  const cardBg = isModalDark ? colorScheme.darkBg : colorScheme.lightBg;
                  return (
                    <div
                      key={req.id || idx}
                      style={{
                        background: cardBg,
                        borderColor: colorScheme.border,
                      }}
                      className="relative rounded-2xl p-3.5 sm:p-4 border-[1.5px] transition-all flex flex-col gap-2 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {/* Top-left Tiny Profile Icon */}
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              req.user?.profilePicture ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                req.user?.nickname || req.user?.name || "anon"
                              )}`
                            }
                            alt={req.user?.nickname || "User"}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-[1.5px] ${
                              isModalDark ? "border-white/40" : "border-black/30"
                            }`}
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white dark:border-black rounded-full" />
                        </div>

                        {/* Requestor Info & Message */}
                        <div className="flex-1 min-w-0">
                          <p
                            style={{
                              color: isModalDark ? "#ffffff" : "#000000",
                              fontWeight: 800,
                            }}
                            className="text-xs sm:text-[13px] font-sans leading-snug break-words"
                          >
                            <strong>{req.user?.name || req.user?.nickname || "Kalcerian"}</strong> Request for Collab in <strong>{viewingRequestsEvent?.title || req.eventTitle || "Event"}</strong>
                          </p>

                          {req.message && req.message !== "Wants to collaborate on this event" && (
                            <p
                              style={{
                                color: isModalDark ? "#ffffff" : "#000000",
                                fontWeight: 700,
                                opacity: 0.88,
                              }}
                              className="text-[11px] sm:text-xs font-sans italic mt-1 break-words"
                            >
                              &quot;{req.message}&quot;
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/15 dark:border-white/15">
                            <span
                              style={{
                                color: isModalDark ? "#ffffff" : "#000000",
                                fontWeight: 700,
                              }}
                              className="text-[10px] opacity-80 font-sans"
                            >
                              {new Date(req.createdAt || Date.now()).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {/* Yes (Thumbs Up) and No (Thumbs Down) Buttons */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onAcceptCollabRequest?.(req.id, viewingRequestsEvent?.id)}
                                title="Yes (Accept Collab)"
                                style={{
                                  backgroundColor: isModalDark ? "#ffffff" : "#000000",
                                  color: isModalDark ? "#000000" : "#ffffff",
                                  borderColor: isModalDark ? "#000000" : "#ffffff",
                                }}
                                className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] transition-transform hover:scale-108 active:scale-95 cursor-pointer shadow-sm select-none"
                              >
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                                </svg>
                                <span className="text-[11px] font-bold font-sans">Yes</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeclineCollabRequest?.(req.id, viewingRequestsEvent?.id)}
                                title="No (Decline Collab)"
                                style={{
                                  backgroundColor: isModalDark ? "#ffffff" : "#000000",
                                  color: isModalDark ? "#000000" : "#ffffff",
                                  borderColor: isModalDark ? "#000000" : "#ffffff",
                                }}
                                className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] transition-transform hover:scale-108 active:scale-95 cursor-pointer shadow-sm select-none"
                              >
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
                                </svg>
                                <span className="text-[11px] font-bold font-sans">No</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    background: isModalDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.12)",
                    borderColor: "#3b82f6",
                  }}
                  className="rounded-2xl p-6 text-center border-[1.5px] flex flex-col items-center justify-center gap-2"
                >
                  <strong
                    style={{ color: isModalDark ? "#ffffff" : "#000000", fontWeight: 800 }}
                    className="text-sm font-sans"
                  >
                    No Collab Requests Yet
                  </strong>
                  <p
                    style={{ color: isModalDark ? "#ffffff" : "#000000", fontWeight: 700 }}
                    className="text-xs font-sans max-w-[260px]"
                  >
                    When fellow Kalcerians tap the Request icon on your event card, they will appear here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
