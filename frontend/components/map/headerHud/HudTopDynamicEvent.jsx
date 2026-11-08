"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getEventCategory } from "../EventIcon";
import { CategoryIcon } from "../panel/PanelIcons";

export const HudTopDynamicEvent = memo(function HudTopDynamicEvent({
  topDynamicEvent,
  hasTopDynamicEventNotif,
  onTopDynamicEventClick,
  setActionMenuOpen,
  setMenuOpen,
  isMapDark,
}) {
  return (
    <AnimatePresence>
      {topDynamicEvent && (
        <motion.button
          key={`top-dynamic-event-${topDynamicEvent.id || "own"}`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActionMenuOpen(false);
            setMenuOpen(false);
            onTopDynamicEventClick?.();
          }}
          aria-label={`Open ${topDynamicEvent.title || "Active Event"}`}
          title={
            hasTopDynamicEventNotif
              ? `${topDynamicEvent.title || "Event"} (New notification)`
              : topDynamicEvent.title || "My Active Event"
          }
          className="relative p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer group flex items-center justify-center"
        >
          <CategoryIcon
            category={getEventCategory(topDynamicEvent)}
            isMapDark={isMapDark}
            className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 overflow-visible"
          />
          {hasTopDynamicEventNotif && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full border-none shadow-none ring-0 pointer-events-none" />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
});
