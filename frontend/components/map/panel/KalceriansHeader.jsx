"use client";

import { motion } from "framer-motion";
import {
  FIND_TITLE_LETTERS,
  titleWaveContainer,
  titleLetterVariant,
} from "./kalceriansHelpers";

export function KalceriansHeader({
  drawerOpen,
  setDrawerOpen,
  isMapDark,
  searchQuery,
  setSearchQuery,
}) {
  return (
    <>
      {/* 1. Top Scroll Bar / Pull Handle (Solid Base #0f1014 / #ffffff) */}
      <button
        type="button"
        aria-label="Toggle panel"
        onClick={() => setDrawerOpen((prev) => !prev)}
        className={`relative z-10 w-full pt-2.5 pb-1 flex justify-center cursor-pointer select-none outline-none group ${
          isMapDark ? "bg-[#0f1014]" : "bg-[#ffffff]"
        }`}
      >
        <span
          className={`w-11 sm:w-12 h-1 rounded-full transition-colors ${
            isMapDark
              ? "bg-[#30363d] group-hover:bg-[#8b949e]"
              : "bg-[#d0d7de] group-hover:bg-[#656d76]"
          }`}
        />
      </button>

      {/* 2. Header: "Find other Kalcerians" with left wave-in animation (Solid Base #0f1014 / #ffffff) */}
      <div
        onClick={() => setDrawerOpen((prev) => !prev)}
        className={`relative z-10 px-4 pb-2.5 pt-0.5 cursor-pointer flex justify-between items-center transition-colors select-none ${
          isMapDark ? "bg-[#0f1014] hover:bg-[#181a20]" : "bg-[#ffffff] hover:bg-[#f6f8fa]/60"
        }`}
      >
        <motion.h2
          key={drawerOpen ? "drawer-open" : "drawer-closed"}
          variants={titleWaveContainer}
          initial={drawerOpen ? "hidden" : "visible"}
          animate="visible"
          className={`font-sans font-bold text-base sm:text-lg tracking-tight select-none flex flex-wrap items-center ${
            isMapDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
          }`}
        >
          {FIND_TITLE_LETTERS.map((char, index) => (
            <motion.span
              key={index}
              variants={titleLetterVariant}
              className="inline-block will-change-transform"
              style={{ whiteSpace: char === " " ? "pre" : "normal" }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h2>
      </div>

      {/* 3. Search Bar - Modern GitHub Style */}
      <div className="relative z-10 px-3 pb-2.5">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-xl py-1.5 pl-8 pr-3 text-[12px] font-sans outline-none transition-colors ${
              isMapDark
                ? "bg-[#0f1014]/92 border-[#2e323d] text-[#f0f6fc] placeholder:text-[#8b949e] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.35)] focus:border-[#58a6ff]"
                : "bg-white/92 border-[#d1d5db] text-[#1f2328] placeholder:text-[#656d76] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04)] focus:border-[#0969da]"
            }`}
          />
          <svg
            className={`absolute left-2.5 w-3.5 h-3.5 pointer-events-none ${
              isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
      </div>
    </>
  );
}
