"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { PrinceRupertDrop, GoldenDust } from "../particles";
import { FindMoreSlider } from "../showcase";

export function LandingFindMoreSection({ isMobile, mascotFrame }) {
  return (
    <section
      className="relative w-full min-h-[1080px] md:min-h-[90vh] bg-[#050a14] flex flex-col items-center justify-center py-16 md:py-20 z-50 border-t border-slate-900 overflow-hidden"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1000px" }}
    >
      {/* Ambient Blobs (GPU-Accelerated Radial Gradients) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[12%] left-[22%] w-[44vw] h-[44vw] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(0,255,255,0.9) 0%, rgba(0,255,255,0.38) 45%, transparent 100%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[12%] right-[22%] w-[54vw] h-[54vw] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(255,0,255,0.9) 0%, rgba(255,0,255,0.38) 45%, transparent 100%)",
          }}
        />
      </div>

      {/* Prince Rupert's Drop Assembly */}
      <PrinceRupertDrop />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col xl:grid xl:grid-cols-2 items-center gap-6 xl:gap-10">
        {/* Typography: Top center on mobile & iPad, Column 1 on desktop widescreen */}
        <div className="relative flex flex-col items-center xl:items-start justify-center text-center xl:text-left p-2 md:p-4 order-1 w-full">
          <GoldenDust />
          <div className="relative z-10 flex flex-col items-center xl:items-start w-full">
            {/* 1. Title: Top center on mobile and iPad */}
            <motion.h2
              animate={isMobile ? { opacity: 1 } : { opacity: [0.3, 1, 0.3] }}
              transition={isMobile ? { duration: 0 } : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-3 xl:mb-6 font-mono text-center xl:text-left"
            >
              FIND MORE
            </motion.h2>

            {/* 2. Description: Sub description right below title on mobile & iPad */}
            <p className="font-sans text-gray-300 text-sm sm:text-base md:text-lg max-w-md md:max-w-xl xl:max-w-md text-center xl:text-left leading-relaxed px-4 xl:px-0">
              Wahib embut keren banget wowowowow. Kalceria is the ultimate destination for automotive euphoria.
            </p>

            {/* 3. Social Media Icon List: Shown in left column on desktop widescreen */}
            <div className="hidden xl:flex flex-col gap-6 mt-8 items-start w-full">
              {/* Instagram Icon */}
              <a
                href="https://www.instagram.com/kalceria_?exln=cHBnaW5qOWs0czFj"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row items-center gap-4 group cursor-pointer"
              >
                <div className="relative shrink-0 flex items-center justify-center w-8 md:w-10 h-8 md:h-10">
                  <Image
                    src="/ig_gray.webp"
                    alt="Instagram"
                    width={1077}
                    height={976}
                    unoptimized
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0 scale-[1.4]"
                    draggable={false}
                  />
                  <Image
                    src="/ig.webp"
                    alt="Instagram Colored"
                    width={1077}
                    height={976}
                    unoptimized
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(225,48,108,0.3)] scale-[1.4]"
                    draggable={false}
                  />
                </div>
                <span className="font-sans text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-left text-sm">
                  Instagram - kalceria
                </span>
              </a>

              {/* TikTok Icon */}
              <a
                href="https://www.tiktok.com/@gallerykalceria"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row items-center gap-4 group cursor-pointer"
              >
                <div className="relative shrink-0 w-8 md:w-10 h-8 md:h-10">
                  <Image
                    src="/tiktok_gray.webp"
                    alt="TikTok"
                    width={944}
                    height={1117}
                    unoptimized
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0"
                    draggable={false}
                  />
                  <Image
                    src="/tiktok.webp"
                    alt="TikTok Colored"
                    width={944}
                    height={1117}
                    unoptimized
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    draggable={false}
                  />
                </div>
                <span className="font-sans text-gray-400 font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-left text-sm">
                  tiktok kalceria
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* TikTok Feed Container: Center middle on mobile & iPad, Column 2 on desktop widescreen */}
        <div className="relative flex items-center justify-center xl:justify-start ml-0 xl:-ml-[20%] py-4 md:py-6 lg:py-10 order-2 w-full">
          <GoldenDust />
          {/* Clean, minimalist video container */}
          <div
            className={`relative w-full ${
              isMobile ? "max-w-[210px] aspect-[9/16]" : "max-w-[270px] md:max-w-[290px] aspect-[340/680]"
            } group z-10 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl mx-auto xl:mx-0`}
          >
            <FindMoreSlider />
          </div>
        </div>

        {/* Flying & Floating Coki Mascot (Mobile Phone & Tablet Family Only) - Placed in between video and TikTok/IG logo */}
        <div className="flex xl:hidden items-center justify-center w-full order-3 z-20 my-4 sm:my-6 md:my-8 pointer-events-none">
          <motion.div
            animate={{
              y: [-12, 12, -12],
              x: [-5, 5, -5],
              rotate: [-3, 3, -3],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative w-44 xs:w-48 sm:w-56 md:w-64 max-w-[75vw] h-auto drop-shadow-[0_10px_35px_rgba(255,0,255,0.35)]"
          >
            <Image
              src="/hp/kalcer_man_hp.webp"
              alt="Coki Flying Mascot"
              width={2048}
              height={2048}
              priority
              className="w-full h-auto object-contain select-none"
            />
          </motion.div>
        </div>

        {/* Social Media Icon List: Below Coki Mascot on mobile & tablet */}
        <div className="flex xl:hidden flex-row gap-6 mt-2 mb-4 items-center justify-center w-full order-4 z-20">
          {/* Instagram Icon */}
          <a
            href="https://www.instagram.com/kalceria_?exln=cHBnaW5qOWs0czFj"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row items-center gap-2 group cursor-pointer"
          >
            <div className="relative shrink-0 flex items-center justify-center w-8 h-8">
              <Image
                src="/ig_gray.webp"
                alt="Instagram"
                width={1077}
                height={976}
                unoptimized
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0 scale-[1.3]"
                draggable={false}
              />
              <Image
                src="/ig.webp"
                alt="Instagram Colored"
                width={1077}
                height={976}
                unoptimized
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(225,48,108,0.3)] scale-[1.3]"
                draggable={false}
              />
            </div>
            <span className="font-sans text-gray-400 font-semibold tracking-wide text-xs sm:text-sm">
              Instagram - kalceria
            </span>
          </a>

          {/* TikTok Icon */}
          <a
            href="https://www.tiktok.com/@gallerykalceria"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row items-center gap-2 group cursor-pointer"
          >
            <div className="relative shrink-0 w-8 h-8">
              <Image
                src="/tiktok_gray.webp"
                alt="TikTok"
                width={944}
                height={1117}
                unoptimized
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0"
                draggable={false}
              />
              <Image
                src="/tiktok.webp"
                alt="TikTok Colored"
                width={944}
                height={1117}
                unoptimized
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                draggable={false}
              />
            </div>
            <span className="font-sans text-gray-400 font-semibold tracking-wide text-xs sm:text-sm">
              tiktok kalceria
            </span>
          </a>
        </div>
      </div>

      {/* Looping 8-Bit Mascot (Fixed Corner Position: Desktop Widescreen Only) */}
      <div className="hidden xl:block absolute bottom-0 right-0 xl:w-72 2xl:w-80 z-20 pointer-events-none">
        {/* Hat placed above the head */}
        <Image
          src="/kalcer_hat.webp"
          alt="Kalcer Hat"
          width={1408}
          height={768}
          unoptimized
          loading="lazy"
          decoding="async"
          className="absolute top-[-30%] left-1/2 -translate-x-[56%] w-[185%] h-auto z-30 drop-shadow-[0_15px_10px_rgba(0,0,0,0.5)]"
        />

        <Image
          src={mascotFrame === 1 ? "/kalcer_man.webp" : "/kalcer_man2.webp"}
          alt="Kalcer Mascot"
          width={912}
          height={1181}
          unoptimized
          loading="lazy"
          decoding="async"
          className="relative z-10 w-full h-auto object-contain drop-shadow-[0_0_20px_rgba(255,0,255,0.3)]"
        />

        {/* Static Favicon Overlay to cover Gemini Logo in the absolute corner */}
        <Image
          src="/favicon.webp"
          alt="Favicon"
          width={771}
          height={681}
          unoptimized
          loading="lazy"
          decoding="async"
          className="absolute bottom-1 right-1 w-6 md:w-8 h-auto z-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        />
      </div>
    </section>
  );
}
