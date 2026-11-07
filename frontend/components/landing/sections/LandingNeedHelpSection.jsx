"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { FilmLane, FilmStrip, Typewriter } from "../showcase";

export function LandingNeedHelpSection({
  isMobile,
  isMobileOrTablet,
  onApplyRequest,
}) {
  return (
    <section
      className="relative w-full min-h-[100vh] lg:min-h-[107vh] bg-white flex flex-col items-center justify-center py-20 sm:py-24 z-50 overflow-hidden"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1000px" }}
    >
      {/* Solid Section Divider */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-[#050a14] z-[70]" />

      {/* Layer 1: Subtle geometry background (Dark dots for white base) */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Dynamic Aggressive Blobs (Magenta & Gold - GPU Radial Gradients) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: ["-15%", "25%", "-15%"],
            y: ["-10%", "15%", "-10%"],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[85vw] h-[85vw] rounded-full opacity-45 mix-blend-multiply will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(217,70,239,0.92) 0%, rgba(217,70,239,0.42) 45%, transparent 100%)",
          }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1.6, 1.2],
            x: ["20%", "-20%", "20%"],
            y: ["20%", "-5%", "20%"],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full opacity-45 mix-blend-multiply will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(250,204,21,0.92) 0%, rgba(250,204,21,0.42) 45%, transparent 100%)",
          }}
        />
      </div>

      {/* Layer 2: Rolling Film Rolls (Strict Global Layering to prevent any cutting) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Bottom Layer: All White Lanes */}
        <div className="absolute inset-0 z-10">
          <FilmLane rotation={15} top="15%" left="-10%" />
          <FilmLane rotation={-3} top="48%" left="-10%" />
          <FilmLane rotation={6} top="75%" left="-10%" />
          <FilmLane rotation={-55} top="100%" left="15%" height="h-20 md:h-32" />
        </div>

        {/* Top Layer: All Scrolling Film Strips */}
        <div className="absolute inset-0 z-20">
          <FilmStrip rotation={15} top="15%" left="-10%" speed={50} />
          <FilmStrip rotation={-3} top="48%" left="-10%" speed={60} />
          <FilmStrip rotation={6} top="75%" left="-10%" speed={45} />
          <FilmStrip rotation={-55} top="100%" left="15%" speed={55} height="h-20 md:h-32" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative z-20 flex flex-col items-center justify-center w-full px-4 text-center my-auto pb-20 xs:pb-24 sm:pb-28 md:pb-16 lg:pb-0"
      >
        {/* Title Area with Mobile & Half-Desktop Cokineed Face ABOVE "NEED OUR HELP?" */}
        <div className="relative flex flex-col items-center justify-center mb-8 sm:mb-10 md:mb-12 w-full">
          {/* Cokineed face above NEED OUR HELP? on mobile & half desktop, bigger and non-overlapping */}
          {isMobileOrTablet && (
            <motion.div
              className="relative -mb-2 xs:-mb-3 sm:-mb-4 z-20 flex justify-center items-center pointer-events-none select-none"
              animate={{
                rotate: [-8, 8, -8],
                y: [0, -6, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/hp/cokineed_hp.webp"
                alt="Cokineed HP"
                width={300}
                height={300}
                unoptimized
                loading="lazy"
                decoding="async"
                className="w-24 xs:w-28 sm:w-32 md:w-36 h-auto object-contain select-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
                draggable={false}
              />
            </motion.div>
          )}

          <h2 className="relative text-4xl xs:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-mono font-black uppercase tracking-tighter text-black text-center select-none leading-none">
            <Typewriter text="NEED OUR HELP?" mode="none" delay={400} skipAnim={false} />
          </h2>
        </div>

        {/* Apply A Request Button - Unified with SEE THE JOURNEY Typography & Proportion (Inverted: Black BG, White Text) */}
        <button
          type="button"
          onClick={onApplyRequest}
          className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-white bg-black transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_6px_28px_rgba(0,0,0,0.16)] focus-polygon focus-visible:outline-none cursor-pointer z-20"
          style={{
            clipPath:
              "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
          }}
        >
          <span className="relative z-10">APPLY A REQUEST</span>
          <div className="absolute inset-0 bg-[#FF00FF] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
        </button>
      </motion.div>

      {/* Mobile & Half-Desktop / Tab Family: Bounded responsive camera hands at bottom middle */}
      {isMobile && (
        <div className="absolute bottom-0 left-0 w-full pointer-events-none z-10 overflow-hidden flex justify-center items-end">
          <Image
            src="/hp/camera_hp.webp"
            alt="Camera HP"
            width={1210}
            height={864}
            unoptimized
            loading="lazy"
            decoding="async"
            className="w-[180px] xs:w-[200px] sm:w-[230px] max-w-[60vw] max-h-[13vh] xs:max-h-[15vh] sm:max-h-[17vh] h-auto object-contain select-none translate-y-[2px]"
            draggable={false}
          />
        </div>
      )}

      {/* Desktop & iPad Family: Subtitute_NeedOurHelp.webp tight to bottom middle, scaled responsibly without overlapping button */}
      {!isMobile && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-10 flex justify-center items-end overflow-hidden">
          <Image
            src="/Subtitute_NeedOurHelp.webp"
            alt="Photographers"
            width={1680}
            height={938}
            unoptimized
            loading="lazy"
            decoding="async"
            className="w-[380px] sm:w-[460px] md:w-[480px] lg:w-[780px] xl:w-[880px] 2xl:w-[940px] max-h-[20vh] sm:max-h-[22vh] md:max-h-[24vh] lg:max-h-[42vh] xl:max-h-[45vh] h-auto object-contain select-none translate-y-[2px] filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)]"
            draggable={false}
          />
        </div>
      )}
    </section>
  );
}
