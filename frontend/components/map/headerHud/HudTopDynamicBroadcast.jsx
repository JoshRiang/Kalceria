"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BroadcastLineIcon } from "../panel/PanelIcons";

export const HudTopDynamicBroadcast = memo(function HudTopDynamicBroadcast({
  hasActiveOwnBroadcast,
  onTopDynamicBroadcastClick,
  setActionMenuOpen,
  setMenuOpen,
  isMapDark,
}) {
  return (
    <AnimatePresence>
      {hasActiveOwnBroadcast && (
        <motion.button
          key="top-dynamic-broadcast-own"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActionMenuOpen?.(false);
            setMenuOpen?.(false);
            onTopDynamicBroadcastClick?.();
          }}
          aria-label="Open My Active Broadcast"
          title="My Active Broadcast"
          className="relative p-1.5 transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer group flex items-center justify-center"
        >
          <BroadcastLineIcon
            isMapDark={isMapDark}
            className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 overflow-visible"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
});
