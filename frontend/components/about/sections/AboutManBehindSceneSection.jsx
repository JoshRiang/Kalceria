"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { PhotoCollage } from "../collage";
import { StaticTypewriter } from "../typewriter";

export function AboutManBehindSceneSection({
  isMobile,
  containerRef,
  refreshContainerRect,
  handleMouseMove,
  handleMouseLeave,
  mousePos,
}) {
  return (
    <section className="relative w-full py-40 flex flex-col items-center overflow-hidden z-20 bg-[#050a14]">
      {/* Photo Collage Background */}
      <PhotoCollage isMobile={isMobile} />

      {/* Ambient Blobs: Golden & Cyan */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FFD700]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#00FFFF]"
        />
      </div>

      <div className="relative z-10 mb-20 text-center px-4 flex flex-col items-center pointer-events-none">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl lg:text-7xl font-mono font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-100 to-slate-500 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        >
          MAN BEHIND THE SCENE
        </motion.h2>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4, ease: "circOut" }}
          className="h-[1px] w-full max-w-md bg-gradient-to-r from-transparent via-[#FFD700] to-transparent my-6 origin-center"
        />

        <div className="text-slate-400 font-mono text-xs md:text-sm tracking-widest max-w-2xl min-h-[2em]">
          <StaticTypewriter
            text="Reyhan Batara, also known as Coki, was a revolutionary car enthusiast. He spent his life blending mechanical engineering with digital innovation to create the most stunning automotive experiences. His vision remains the driving force behind every project we undertake."
            speed={20}
            delay={1000}
            highlights={[
              { start: 0, end: 12 }, // Reyhan Batara
              { start: 29, end: 32 }, // Coki
            ]}
          />
        </div>
      </div>

      {/* Cursor Masking Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay: 0.2 }}
        ref={containerRef}
        onMouseEnter={refreshContainerRect}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative z-10 w-[75%] max-w-4xl aspect-video md:aspect-[21/9] bg-[#0c1528] overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.6)] cursor-crosshair group"
        style={{
          clipPath:
            "polygon(40px 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%, 0 40px)",
        }}
      >
        {/* Base Layer: Grayscale ONLY (No Blur) */}
        <Image
          src="/man.webp"
          alt="Reyhan Batara and the Kalceria founding team"
          width={1193}
          height={761}
          sizes="(max-width: 768px) 75vw, 896px"
          quality={75}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover filter grayscale opacity-40 transition-all duration-500"
          draggable={false}
        />

        {/* OWNER HIGHLIGHT: Golden-Magenta Chromatic Aberration (Inspired by Preloader 'K') */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{
            WebkitMaskImage: `radial-gradient(ellipse 20% 70% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)`,
            maskImage: `radial-gradient(ellipse 20% 70% at 50% 50%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)`,
          }}
        >
          {/* Sharp Grayscale Anchor (Ensures face clarity) */}
          <Image
            src="/man.webp"
            alt=""
            aria-hidden="true"
            width={1193}
            height={761}
            sizes="(max-width: 768px) 75vw, 896px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 brightness-110"
            draggable={false}
          />

          {/* Magenta Shifted Layer (Reduced offset) */}
          <motion.img
            src="/man.webp"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            animate={{ x: [-1, -2, -1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50"
            style={{
              filter: "sepia(1) saturate(10) hue-rotate(280deg) brightness(1.1)",
              willChange: "transform",
            }}
            draggable={false}
          />
          {/* Golden Shifted Layer (Reduced offset) */}
          <motion.img
            src="/man.webp"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            animate={{ x: [1, 2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-50"
            style={{
              filter: "sepia(1) saturate(10) hue-rotate(15deg) brightness(1.1)",
              willChange: "transform",
            }}
            draggable={false}
          />
        </div>

        {/* Reveal Layer: Full Color with Dynamic Mask via Mouse */}
        <motion.div
          className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
          animate={{ opacity: mousePos.x === -1000 ? 0 : 1 }}
          style={{
            WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`,
            maskImage: `radial-gradient(circle 200px at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)`,
          }}
        >
          <Image
            src="/man.webp"
            alt=""
            aria-hidden="true"
            width={1193}
            height={761}
            sizes="(max-width: 768px) 75vw, 896px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover contrast-110 saturate-110"
            draggable={false}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
