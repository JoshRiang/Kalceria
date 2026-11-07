"use client";

import { motion } from "framer-motion";

export function FormErrorBox({ error }) {
  if (!error) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden w-full my-1.5"
    >
      <div
        style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
        className="text-red-500 text-[14px] sm:text-[15px] font-normal tracking-tight py-1 select-none text-left"
      >
        {error}
      </div>
    </motion.div>
  );
}
