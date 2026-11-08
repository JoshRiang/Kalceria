"use client";

import { memo } from "react";
import { motion } from "framer-motion";

export const CameraCaptionBox = memo(function CameraCaptionBox({
  caption,
  setCaption,
  handleConfirmSend,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-[340px] sm:max-w-[360px] mt-2.5 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-xl z-30"
    >
      {/* Smiley Emoji Icon */}
      <span className="text-white/80 select-none shrink-0">
        <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </span>

      {/* Caption Input Field */}
      <input
        type="text"
        value={caption}
        maxLength={50}
        onChange={(e) => setCaption(e.target.value.slice(0, 50))}
        placeholder="Ketik deskripsi..."
        style={{ fontFamily: "Arial, sans-serif" }}
        className="flex-1 bg-transparent text-xs text-white placeholder:text-white/50 outline-none min-w-0"
      />

      {/* 0/50 Character Counter: Arial non-bold, mini, consistent */}
      <span
        style={{ fontFamily: "Arial, sans-serif" }}
        className="text-[10px] font-normal text-white/70 shrink-0 select-none"
      >
        {caption.length}/50
      </span>

      {/* Send Button */}
      <button
        type="button"
        onClick={handleConfirmSend}
        className="p-1 text-white hover:text-white/80 transition-transform active:scale-90 cursor-pointer shrink-0"
        title="Kirim Foto / Video"
      >
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </motion.div>
  );
});
