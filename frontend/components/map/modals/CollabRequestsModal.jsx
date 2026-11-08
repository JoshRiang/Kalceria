"use client";

import { motion, AnimatePresence } from "framer-motion";
import { toSmartTitleCase } from "@/lib/titleCase";

// Subtle yet pekat/solid fill colors (not semi-hollow)
export const SUB_BOX_COLORS = [
  { lightBg: "#bfdbfe", darkBg: "#1e3a8a" }, // Rich Blue
  { lightBg: "#bbf7d0", darkBg: "#064e3b" }, // Rich Green
  { lightBg: "#fed7aa", darkBg: "#7c2d12" }, // Rich Orange/Amber
  { lightBg: "#ddd6fe", darkBg: "#4c1d95" }, // Rich Purple
  { lightBg: "#fbcfe8", darkBg: "#831843" }, // Rich Pink
  { lightBg: "#99f6e4", darkBg: "#134e4a" }, // Rich Teal
];

// Preserving legacy alias so external references don't break
export const RANDOM_INNER_COLORS = SUB_BOX_COLORS;

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-2.5 xs:p-4 select-none bg-black/35 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Pop-out Box: Jin In / Out smooth spring animated card */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 15 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              transition: { duration: 0.42, ease: [0.19, 1, 0.22, 1] },
            }}
            exit={{
              scale: 0.88,
              opacity: 0,
              y: 15,
              transition: { duration: 0.32, ease: [0.32, 0, 0.15, 1] },
            }}
            className={`relative z-10 w-full max-w-[315px] xs:max-w-[335px] sm:max-w-[350px] max-h-[85vh] flex flex-col items-stretch rounded-[22px] shadow-2xl overflow-hidden ${
              isModalDark
                ? "bg-[#161b22] border border-[#30363d] text-[#f0f6fc]"
                : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Right Close (X) Button positioned cleanly with balanced corner padding */}
            <button
              type="button"
              className={`absolute top-2 right-2.5 xs:top-2.5 xs:right-3 z-30 w-7 h-7 flex items-center justify-center text-2xl leading-none transition-colors rounded-full cursor-pointer ${
                isModalDark
                  ? "text-[#8b949e] hover:text-[#f0f6fc]"
                  : "text-[#57606a] hover:text-[#1f2328]"
              }`}
              onClick={onClose}
              title="Close"
            >
              ×
            </button>

            {/* Sub Request Box List: shifted down with pt-8 / xs:pt-8.5 so inner box starts below X line with balanced spacing */}
            <div className="pt-8 xs:pt-8.5 pb-3.5 px-3.5 xs:px-4 xs:pb-4 flex-1 min-w-0 overflow-y-auto max-h-[380px] custom-scrollbar flex flex-col gap-3">
              {currentRequestsList.length > 0 ? (
                currentRequestsList.map((req, idx) => {
                  const colorScheme = SUB_BOX_COLORS[idx % SUB_BOX_COLORS.length];
                  const cardBg = isModalDark ? colorScheme.darkBg : colorScheme.lightBg;
                  const cardBorderColor = isModalDark ? "#ffffff" : "#000000";
                  const textColor = isModalDark ? "#ffffff" : "#000000";
                  const formattedEventTitle = toSmartTitleCase(
                    viewingRequestsEvent?.title || req.eventTitle || "this event"
                  );

                  return (
                    <div
                      key={req.id || idx}
                      style={{
                        background: cardBg,
                        borderColor: cardBorderColor,
                      }}
                      className="relative rounded-2xl p-3 xs:p-3.5 sm:p-4 border-[1.5px] transition-all flex flex-col gap-2.5 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {/* Tiny Profile Icon */}
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
                              isModalDark ? "border-white/50" : "border-black/40"
                            }`}
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white dark:border-black rounded-full" />
                        </div>

                        {/* Requestor Info: Username is bold, 'request collab for' is normal, Event Title is bold & italic */}
                        <div className="flex-1 min-w-0">
                          <p
                            style={{ color: textColor }}
                            className="text-xs sm:text-[13px] font-sans leading-snug break-words"
                          >
                            <span className="font-bold">
                              {req.user?.name || req.user?.nickname || "Kalcerian"}
                            </span>
                            <span className="font-normal"> request collab for </span>
                            <span className="font-bold italic">
                              {formattedEventTitle}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Time and Yes/No buttons, NO divider line, NO thumbs icons */}
                      <div className="flex items-center justify-between mt-0.5">
                        <span
                          style={{ color: textColor }}
                          className="text-[10.5px] font-bold font-sans opacity-85"
                        >
                          {new Date(req.createdAt || Date.now()).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {/* Only Yes and No Buttons (No thumbs up or down) */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAcceptCollabRequest?.(req.id, viewingRequestsEvent?.id)}
                            title="Yes"
                            style={{
                              backgroundColor: isModalDark ? "#ffffff" : "#000000",
                              color: isModalDark ? "#000000" : "#ffffff",
                              borderColor: isModalDark ? "#ffffff" : "#000000",
                            }}
                            className="px-3.5 py-1 rounded-full border-[1.5px] font-sans font-bold text-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm select-none"
                          >
                            Yes
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeclineCollabRequest?.(req.id, viewingRequestsEvent?.id)}
                            title="No"
                            style={{
                              backgroundColor: isModalDark ? "#ffffff" : "#000000",
                              color: isModalDark ? "#000000" : "#ffffff",
                              borderColor: isModalDark ? "#ffffff" : "#000000",
                            }}
                            className="px-3.5 py-1 rounded-full border-[1.5px] font-sans font-bold text-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm select-none"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    background: isModalDark ? "#000000" : "#ffffff",
                    borderColor: isModalDark ? "#ffffff" : "#000000",
                  }}
                  className="rounded-2xl p-4 xs:p-5 min-h-[168px] text-center border-[1.5px] flex flex-col items-center justify-center gap-2"
                >
                  <strong
                    style={{ color: isModalDark ? "#ffffff" : "#000000", fontWeight: 800 }}
                    className="text-sm font-sans"
                  >
                    No Collab Requests Yet
                  </strong>
                  <p
                    style={{ color: isModalDark ? "#ffffff" : "#000000" }}
                    className="text-xs font-sans font-normal max-w-[225px] leading-relaxed"
                  >
                    When <strong className="font-bold">fellow Kalcerians</strong> tap the Request icon on your event card, they will appear here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
