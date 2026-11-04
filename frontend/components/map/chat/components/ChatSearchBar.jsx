"use client";

import { motion, AnimatePresence } from "framer-motion";
import KalcerianProfileCard from "../../KalcerianProfileCard";

export function ChatSearchBar({
  searchOpen,
  messageSearchQuery,
  setMessageSearchQuery,
  showContactInfo,
  setShowContactInfo,
  activeChatUser,
  isMapDark,
}) {
  return (
    <>
      {/* Inline Search Bar (Toggled by Search Icon in Header) */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-3 py-2 border-b overflow-hidden shrink-0 ${
              isMapDark ? "bg-[#182229] border-white/10" : "bg-[#f8f9fa] border-black"
            }`}
          >
            <div className="relative flex items-center">
              <input
                type="text"
                autoFocus
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                placeholder="Search in conversation..."
                className={`w-full rounded-lg py-1.5 pl-3 pr-7 text-xs outline-none border ${
                  isMapDark
                    ? "bg-[#202c33] border-white/15 text-white placeholder:text-white/40"
                    : "bg-white border-black text-black placeholder:text-black/45"
                }`}
              />
              {messageSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMessageSearchQuery("")}
                  className="absolute right-2 text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Contact Info Drawer */}
      <AnimatePresence>
        {showContactInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-b overflow-y-auto max-h-[300px] shrink-0 z-20 ${
              isMapDark ? "bg-[#161b22] border-white/15" : "bg-white border-black"
            }`}
          >
            <KalcerianProfileCard
              user={activeChatUser}
              isMapDark={isMapDark}
              showMobileClose={true}
              onClose={() => setShowContactInfo(false)}
              inline={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

