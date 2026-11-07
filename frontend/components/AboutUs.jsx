"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  AboutDictionarySection,
  AboutManBehindSceneSection,
  AboutWebdevTeamSection,
  AboutFaqSection,
  AboutSeparator,
} from "./about/sections";
import { useIsMobileViewport, useIsMobileOrTabletViewport } from "@/hooks/useIsMobileViewport";

const FAQS = [
  {
    q: "WHAT IS THE END OF LINE CLUB?",
    a: "A clandestine automotive culture collective focused on pushing the boundaries of aesthetics and performance. We exist at the intersection of high-octane engineering and premium digital art.",
  },
  {
    q: "WHO IS BEHIND KALCERIA?",
    a: "Kalceria was forged by a dedicated core team including Coki, Wahib Embut, and the rest of the crew. They serve as the architects behind the movement, continuously pushing the limits of automotive luxury and interactive media.",
  },
  {
    q: "HOW TO PARTICIPATE IN FUTURE EVENTS?",
    a: "Keep an eye on our event drops. We operate on an invite-only and limited-slot basis. Ensure you are registered and frequently check the dashboard for the latest coordinates.",
  },
];

export default function AboutUs() {
  const [showEntry, setShowEntry] = useState(false);
  const [entryDone, setEntryDone] = useState(false);

  // Character Hover / Tap states
  const [hoverMentor, setHoverMentor] = useState(false);
  const [activeChar, setActiveChar] = useState(null); // 'rei' | 'josh' | 'otniel' | null
  const [hoverRei, setHoverRei] = useState(false);
  const [hoverJosh, setHoverJosh] = useState(false);
  const [hoverOtniel, setHoverOtniel] = useState(false);

  const toggleChar = (char) => {
    setActiveChar((prev) => (prev === char ? null : char));
  };

  const handleEntryComplete = useCallback(() => {
    setShowEntry(false);
    setEntryDone(true);
  }, []);

  // ─── Mouse Tracking for Masking (cached rect avoids forced reflow on mousemove) ───
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const containerRef = useRef(null);
  const rectCacheRef = useRef(null);

  const isMobile = useIsMobileViewport();
  const isMobileOrTablet = useIsMobileOrTabletViewport();

  const refreshContainerRect = useCallback(() => {
    if (containerRef.current) {
      rectCacheRef.current = containerRef.current.getBoundingClientRect();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", refreshContainerRect, { passive: true });
    window.addEventListener("scroll", refreshContainerRect, { passive: true });
    return () => {
      window.removeEventListener("resize", refreshContainerRect);
      window.removeEventListener("scroll", refreshContainerRect);
    };
  }, [refreshContainerRect]);

  const handleMouseMove = (e) => {
    if (!rectCacheRef.current) refreshContainerRect();
    const rect = rectCacheRef.current;
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  // FAQ state
  const [masterFaqOpen, setMasterFaqOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0.01, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full min-h-screen bg-[#050a14] text-white overflow-x-hidden selection:bg-[#FFD700] selection:text-black"
    >
      {/* ── SECTION 1: ABOUT US & DICTIONARY ── */}
      <AboutDictionarySection isMobile={isMobile} />

      {/* Dynamic Cyan Separator Line */}
      <AboutSeparator />

      {/* ── SECTION 2: MAN BEHIND THE SCENE ── */}
      <AboutManBehindSceneSection
        isMobile={isMobile}
        containerRef={containerRef}
        refreshContainerRect={refreshContainerRect}
        handleMouseMove={handleMouseMove}
        handleMouseLeave={handleMouseLeave}
        mousePos={mousePos}
      />

      {/* Dynamic Cyan Separator Line */}
      <AboutSeparator />

      {/* ── SECTION 3: THE GOLDEN CORE ── */}
      <AboutWebdevTeamSection
        showEntry={showEntry}
        setShowEntry={setShowEntry}
        entryDone={entryDone}
        handleEntryComplete={handleEntryComplete}
        isMobileOrTablet={isMobileOrTablet}
        activeChar={activeChar}
        setActiveChar={setActiveChar}
        hoverMentor={hoverMentor}
        setHoverMentor={setHoverMentor}
        hoverRei={hoverRei}
        setHoverRei={setHoverRei}
        hoverJosh={hoverJosh}
        setHoverJosh={setHoverJosh}
        hoverOtniel={hoverOtniel}
        setHoverOtniel={setHoverOtniel}
        toggleChar={toggleChar}
      />

      {/* Dynamic Cyan Separator Line */}
      <AboutSeparator />

      {/* ── SECTION 4: THE FAQ ACCORDION ── */}
      <AboutFaqSection
        isMobile={isMobile}
        masterFaqOpen={masterFaqOpen}
        setMasterFaqOpen={setMasterFaqOpen}
        openFaq={openFaq}
        setOpenFaq={setOpenFaq}
        faqs={FAQS}
      />
    </motion.div>
  );
}
