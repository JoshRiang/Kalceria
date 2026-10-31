"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MapWalkthroughTooltip({ show = true }) {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem("kalceria_map_hint_seen", "true");
    } catch {
      // Ignore storage errors in private browsing modes
    }
  }, []);

  useEffect(() => {
    if (!show) return;

    try {
      if (localStorage.getItem("kalceria_map_hint_seen") === "true") {
        return;
      }
    } catch {
      // Proceed if localStorage is inaccessible
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Show the initial tooltip once startup finishes
    setVisible(true);

    const autoDismissTimer = setTimeout(() => {
      dismiss();
    }, 2800);

    const onUserInteraction = () => {
      dismiss();
    };

    window.addEventListener("pointerdown", onUserInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", onUserInteraction, { once: true, passive: true });
    window.addEventListener("wheel", onUserInteraction, { once: true, passive: true });
    window.addEventListener("keydown", onUserInteraction, { once: true, passive: true });

    return () => {
      clearTimeout(autoDismissTimer);
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
      window.removeEventListener("wheel", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, [show, dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed top-20 md:top-24 left-1/2 -translate-x-1/2 z-[45] pointer-events-none select-none"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#050a14]/90 border border-fuchsia-500/50 backdrop-blur-md shadow-[0_0_25px_rgba(217,70,239,0.45)] text-white font-mono text-[11px] sm:text-xs tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping inline-block" />
            <span className="text-gray-200">Drag & Zoom to uncover Kalcerians</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

