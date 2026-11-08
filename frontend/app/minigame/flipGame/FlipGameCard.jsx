"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export function FlipGameCard({ card, phase, isFlipped, getCardTransform, onClick }) {
  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ 
        opacity: 1,
        scale: (phase === "playing" && !isFlipped) ? [1, 0.95, 1] : 1,
        y: 0,
        ...getCardTransform(card)
      }}
      transition={{ 
        opacity: { delay: phase === "intro" ? card.id * 0.15 : 0, duration: 0.4 },
        scale: (phase === "playing" && !isFlipped) 
          ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
          : { delay: phase === "intro" ? card.id * 0.15 : 0, duration: 0.4 },
        y: { delay: phase === "intro" ? card.id * 0.15 : 0, duration: 0.4 },
        x: { duration: 0.5 }, // For absorb
        rotate: { duration: 0.5 } // For absorb
      }}
      onClick={onClick}
      className="relative w-[70px] h-[92px] xs:w-[90px] xs:h-[118px] sm:w-[120px] sm:h-[155px] md:w-[145px] md:h-[180px] cursor-pointer"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.45, 0.05, 0.55, 0.95] }}
        style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
      >
        {/* Back (White with Stretched Logo) */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          background: "#ffffff", borderRadius: "1.25rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
          border: "1px solid rgba(0,0,0,0.05)",
          padding: "10px"
        }}>
           <Image src="/favicon.webp" alt="Logo" width={771} height={681} unoptimized loading="eager" decoding="auto" className="w-[45px] h-[45px] sm:w-[80px] sm:h-[80px] opacity-40 object-contain" />
        </div>
        {/* Front (Face Image) */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "#ffffff", borderRadius: "1.25rem",
          overflow: "hidden",
          border: card.matched ? "4px solid #22c55e" : "none",
          boxShadow: card.matched ? "0 0 40px rgba(34,197,94,0.6)" : "0 15px 35px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "15%"
        }}>
          <Image src={card.img} alt="Card" width={512} height={512} unoptimized loading="lazy" className="w-full h-full object-contain" />
        </div>
      </motion.div>
    </motion.div>
  );
}

