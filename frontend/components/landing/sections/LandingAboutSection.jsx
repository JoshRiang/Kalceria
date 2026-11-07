"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Typewriter } from "../showcase";

export function LandingAboutSection({
  aboutIndex,
  currentAboutImage,
  slideVariants,
}) {
  return (
    <section
      id="section-about"
      className="relative w-full h-[70vh] overflow-hidden bg-black flex items-center justify-center border-t border-slate-900 z-30"
    >
      <AnimatePresence initial={false} custom={aboutIndex}>
        <motion.div
          key={aboutIndex}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full"
        >
          <Image
            src={currentAboutImage.src}
            alt="About Us BG"
            width={currentAboutImage.width}
            height={currentAboutImage.height}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-70 grayscale xl:grayscale-0"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050a14] via-[#050a14]/60 to-transparent z-[1]" />
          {/* Warm Peach & Gold & Magenta Master overlay on mobile & tablet */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/35 via-[#ffaa66]/30 to-[#ff00ff]/25 mix-blend-color xl:hidden z-[2]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#ff00ff]/20 via-[#ffaa66]/20 to-[#ffd700]/15 mix-blend-overlay xl:hidden z-[3]" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-20 w-full max-w-6xl px-8 flex justify-center md:justify-start">
        <div className="flex flex-col items-center md:items-start gap-6 border-l-0 md:border-l-2 pl-0 md:pl-8">
          <h2 className="text-center md:text-left text-5xl md:text-7xl font-black uppercase tracking-tighter text-white">
            <Typewriter text="ABOUT US" mode="word" delay={3000} skipAnim={false} />
          </h2>
          <Link
            href="/about"
            onClick={() => {
              sessionStorage.setItem("landingScrollTarget", "section-about");
              sessionStorage.setItem("landingScrollY", window.scrollY);
            }}
          >
            <button
              className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-polygon focus-visible:outline-none cursor-pointer"
              style={{
                clipPath:
                  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
              }}
            >
              <span className="relative z-10">Get to Know More</span>
              <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
