"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EMOJI_CATEGORIES, searchEmojis } from "@/lib/emojiDatabase";

export function EmojiPickerPopover({
  isOpen,
  onClose,
  onSelectEmoji,
  isMapDark = true,
}) {
  const [query, setQuery] = useState("");

  const filteredEmojis = useMemo(() => {
    return searchEmojis(query);
  }, [query]);

  // Group filtered emojis by category
  const groupedCategories = useMemo(() => {
    if (query.trim()) {
      return [{ id: "search_results", name: "Search Results", items: filteredEmojis }];
    }
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      items: filteredEmojis.filter((e) => e.category === cat.id),
    })).filter((c) => c.items.length > 0);
  }, [query, filteredEmojis]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className={`z-[1020] flex flex-col overflow-hidden shadow-2xl rounded-2xl border select-none
          /* Desktop / Laptop Layout: Anchored cleanly to the right side of the chat box */
          min-[861px]:absolute min-[861px]:left-[calc(100%+10px)] min-[861px]:bottom-0 min-[861px]:w-[310px] min-[861px]:h-[385px]
          /* Mobile Layout: Anchored right above composer within natural bounds */
          max-[860px]:absolute max-[860px]:bottom-14 max-[860px]:left-2 max-[860px]:right-2 max-[860px]:h-[240px]
          ${
            isMapDark
              ? "bg-[#161b22] border-white/20 text-[#f0f6fc] shadow-[0_16px_40px_rgba(0,0,0,0.85)]"
              : "bg-white border-black text-[#1f2328] shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
          }`}
      >
        {/* Header & Search Bar (Arial Font style & behavior like 'Find other Kalcerians' search bar) */}
        <div
          className={`p-2.5 border-b shrink-0 flex items-center gap-2 ${
            isMapDark ? "bg-[#202c33] border-white/10" : "bg-white border-black"
          }`}
        >
          <div
            className={`flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
              isMapDark
                ? "bg-[#2a3942] border-white/15 text-white"
                : "bg-[#f0f2f5] border-black text-black"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 opacity-60 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.2" y2="16.2" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emoji (e.g. cry, car, fire)..."
              style={{ fontFamily: "Arial, sans-serif" }}
              className={`flex-1 bg-transparent text-xs outline-none min-w-0 ${
                isMapDark ? "placeholder:text-white/45" : "placeholder:text-black/45"
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-current/10 cursor-pointer text-xs shrink-0"
            title="Close emoji box"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Categories & Emojis Grid */}
        <div className="flex-1 overflow-y-auto p-2 modern-kalcerian-scrollbar overscroll-contain">
          {groupedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center opacity-60 text-xs">
              <p>No emoji found for &quot;{query}&quot;</p>
            </div>
          ) : (
            groupedCategories.map((group) => (
              <div key={group.id} className="mb-3">
                {/* Family Category Title: Arial Bold, tiny, not all capital */}
                <h4
                  style={{ fontFamily: "Arial, sans-serif" }}
                  className={`text-[11px] font-bold px-1.5 py-0.5 mb-1 tracking-tight ${
                    isMapDark ? "text-white/80" : "text-black/80"
                  }`}
                >
                  {group.name}
                </h4>

                <div className="grid grid-cols-8 gap-1">
                  {group.items.map((em, idx) => (
                    <button
                      key={`${group.id}-${em.char}-${idx}`}
                      type="button"
                      onClick={() => onSelectEmoji(em.char)}
                      title={em.name}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:scale-125 transition-transform active:scale-95 cursor-pointer hover:bg-current/10"
                    >
                      {em.char}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

