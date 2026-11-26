"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ContentImage from "@/components/ui/ContentImage";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

const LOGIN_PROMPT_TEXT = "LOGIN FIRST";

export function DungeonGate() {
  // Dot indicator strictly reflects active event Due status (red when no event / Not Started, green when active)
  const [hasActiveEvent, setHasActiveEvent] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [typedChars, setTypedChars] = useState(0);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [isNavigating, setIsNavigating] = useState(false);
  const pendingTimeouts = useRef(new Set());
  const router = useRouter();

  const scheduleTimeout = (callback, delay) => {
    const timeout = setTimeout(() => {
      pendingTimeouts.current.delete(timeout);
      callback();
    }, delay);
    pendingTimeouts.current.add(timeout);
  };

  useEffect(() => {
    const handlePageShow = () => setIsNavigating(false);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      pendingTimeouts.current.forEach(clearTimeout);
      pendingTimeouts.current.clear();
    };
  }, []);

  // Poll public minigame event status (non-destructive: independent of user attempt count)
  useEffect(() => {
    let active = true;
    const syncEventDot = () => {
      api
        .get("/minigame/status")
        .then((res) => {
          if (!active) return;
          const d = res?.data;
          const eventLive =
            typeof d?.hasActiveEvent === "boolean"
              ? d.hasActiveEvent
              : Boolean(d?.targetEvent?.isWithin7Days && d?.targetEvent?.dueStatus === "COUNTDOWN");
          setHasActiveEvent(eventLive);
        })
        .catch(() => {
          if (active) setHasActiveEvent(false);
        });
    };

    syncEventDot();
    const interval = setInterval(syncEventDot, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Typing animation for "LOGIN FIRST" when guest taps the gate
  useEffect(() => {
    if (!showPopup) {
      setTypedChars(0);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) {
      setTypedChars(LOGIN_PROMPT_TEXT.length);
      return;
    }
    setTypedChars(0);
    let idx = 0;
    const timer = setInterval(() => {
      idx += 1;
      setTypedChars(idx);
      if (idx >= LOGIN_PROMPT_TEXT.length) clearInterval(timer);
    }, 55);
    return () => clearInterval(timer);
  }, [showPopup]);

  const handleGateClick = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowPopup(true);
      scheduleTimeout(() => setShowPopup(false), 4500);
      return;
    }
    sessionStorage.setItem("landingScrollTarget", "section-minigame");
    sessionStorage.setItem("landingScrollY", window.scrollY);
    setIsNavigating(true);
    scheduleTimeout(() => {
      router.push("/minigame");
    }, 1000);
    scheduleTimeout(() => {
      setIsNavigating(false);
    }, 2500);
  };

  return (
    <>
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[3000] bg-black pointer-events-auto"
          />
        )}
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-md pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 right-4 z-[100] flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {showPopup && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5 mr-1 pointer-events-auto select-none"
            >
              {/* Matches Hero LOGIN / REGISTER font exactly with crisp typing animation (no floating face) */}
              <p
                data-dungeon-login-prompt="true"
                className="font-sans font-extrabold uppercase tracking-wide text-[14px] xs:text-[15px] sm:text-[17px] md:text-[19px] text-[#f1f5f9] whitespace-nowrap"
              >
                {LOGIN_PROMPT_TEXT.slice(0, typedChars)}
                <span
                  aria-hidden="true"
                  className="inline-block w-[2px] h-[0.95em] ml-1 align-middle bg-[#f1f5f9] animate-pulse"
                />
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto transform translate-y-[10%]">
          <button
            type="button"
            onClick={handleGateClick}
            aria-label={hasActiveEvent ? "Enter Kalcer's Game (Event Active)" : "Enter Kalcer's Game (No Active Event)"}
            className="outline-none border-none ring-0 no-underline block bg-transparent group cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 rounded-lg"
          >
            <div className="relative cursor-pointer outline-none border-none ring-0 active:scale-95 transition-transform bg-transparent p-0">
              <motion.div
                animate={{ opacity: [0.18, 0.36, 0.18], scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-[-30%] blur-[60px] rounded-full ${
                  hasActiveEvent ? "bg-yellow-400/20" : "bg-red-500/15"
                }`}
              />

              <ContentImage
                src="/dg_2.webp"
                alt="Dungeon Gate"
                width={2048}
                height={2048}
                className="w-16 sm:w-20 md:w-36 h-auto object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.9)] group-hover:brightness-115 transition-all duration-500 border-none outline-none ring-0"
              />

              {/* Event Status Dot: Green when active event Due countdown is running, Red when Not Started */}
              <div
                data-dungeon-event-dot={hasActiveEvent ? "green" : "red"}
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white transition-colors duration-300 ${
                  hasActiveEvent
                    ? "bg-green-500 animate-bounce shadow-[0_0_15px_rgba(34,197,94,0.8)]"
                    : "bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.85)]"
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
