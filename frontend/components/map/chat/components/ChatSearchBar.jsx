"use client";

import { motion, AnimatePresence } from "framer-motion";

export function ChatSearchBar({
  searchOpen,
  messageSearchQuery,
  setMessageSearchQuery,
  isMapDark,
}) {
  return (
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
  );
}
