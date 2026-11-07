"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import dynamic from "next/dynamic";
import { GoldenAmbientSparks } from "../ambient";

const WebDevEntrySequence = dynamic(
  () => import("../entrySequence").then((m) => m.WebDevEntrySequence),
  { ssr: false }
);

export function AboutWebdevTeamSection({
  showEntry,
  setShowEntry,
  entryDone,
  handleEntryComplete,
  isMobileOrTablet,
  activeChar,
  setActiveChar,
  hoverMentor,
  setHoverMentor,
  hoverRei,
  setHoverRei,
  hoverJosh,
  setHoverJosh,
  hoverOtniel,
  setHoverOtniel,
  toggleChar,
}) {
  return (
    <motion.section
      onViewportEnter={() => {
        if (!entryDone && !showEntry) {
          setShowEntry(true);
        }
      }}
      className="relative w-full flex flex-col items-center justify-center overflow-hidden z-25 border-t border-slate-900 min-h-[820px] xs:min-h-[860px] sm:min-h-[900px] md:h-[980px] md:min-h-[980px] lg:h-[1040px] lg:min-h-[1040px] xl:h-auto xl:max-h-none xl:min-h-[150vh]"
    >
      {/* Entry Sequence Overlay */}
      <AnimatePresence>
        {showEntry && <WebDevEntrySequence onComplete={handleEntryComplete} />}
      </AnimatePresence>

      {/* Base Background: Deep Mix of Red & Black */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-black to-[#050000]" />

      {/* Dynamic Random Blobs (Gold & Orange-Gold) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-screen">
        {/* Golden Blob */}
        <motion.div
          animate={{
            x: ["-10%", "30%", "10%", "-10%"],
            y: ["-20%", "20%", "40%", "-20%"],
            scale: [1, 1.4, 1.2, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#f59e0b]/30"
        />
        {/* Orange-Gold Blob 1 */}
        <motion.div
          animate={{
            x: ["40%", "-20%", "0%", "40%"],
            y: ["10%", "-10%", "-40%", "10%"],
            scale: [1.2, 1, 1.3, 1.2],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-[65vw] h-[65vw] rounded-full blur-[160px] bg-[#fbbf24]/30"
        />
        {/* Orange-Gold Blob 2 (Aggressive Burnt Orange) */}
        <motion.div
          animate={{
            x: ["0%", "50%", "-30%", "0%"],
            y: ["50%", "0%", "50%", "50%"],
            scale: [0.8, 1.5, 1, 0.8],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] rounded-full blur-[180px] bg-[#ea580c]/25"
        />
      </div>

      {/* Golden Shine Effect - Rising from the plateau */}
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[40vh] z-[3] pointer-events-none transform translate-y-[10%]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255, 215, 0, 0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Character Group Behind Plateau */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-auto z-[4] pointer-events-none transform translate-y-[15%]">
        {/* Unified Top-Center Info Box for mobile and iPad family */}
        {isMobileOrTablet && (
          <AnimatePresence>
            {activeChar && (
              <motion.div
                key={activeChar}
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                className="absolute bottom-[200px] xs:bottom-[210px] sm:bottom-[230px] md:bottom-[295px] lg:bottom-[320px] left-1/2 -translate-x-1/2 z-[50] w-max flex flex-col items-center p-2 pointer-events-auto select-none"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
              >
                {/* Photo Box */}
                <div className="overflow-hidden border border-white/15 bg-black/30 w-[84px] h-[84px] md:w-[105px] md:h-[105px] rounded-[0.6rem] md:rounded-[0.8rem] mb-2 shadow-inner">
                  <Image
                    src={activeChar === "rei" ? "/reifo.webp" : activeChar === "josh" ? "/jofo.webp" : "/ofo.webp"}
                    alt={activeChar}
                    width={200}
                    height={200}
                    sizes="(max-width: 768px) 84px, 105px"
                    quality={80}
                    priority
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute -z-10 inset-0 bg-black/60 blur-2xl rounded-full scale-75" />
                <p className="text-white font-normal leading-relaxed relative z-10 text-xs md:text-sm text-center">
                  <span className="underline font-bold">Our beloved friend,</span>
                  <br />
                  {activeChar === "rei"
                    ? "Reinathan Ezkhiel K."
                    : activeChar === "josh"
                    ? "Joshua Ricardo R."
                    : "Otniel Kristian S."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Rei - Center Bottom Layer (Central Gladiator) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 z-[1] pointer-events-auto h-[44vw] sm:h-[38vw] md:h-[34vw] w-auto xl:h-[102vh] xl:bottom-[-25vh]"
          onMouseEnter={() => {
            if (!isMobileOrTablet) {
              setHoverRei(true);
              setActiveChar("rei");
            }
          }}
          onMouseLeave={() => {
            if (!isMobileOrTablet) {
              setHoverRei(false);
              setActiveChar(null);
            }
          }}
          onClick={() => {
            toggleChar("rei");
            setHoverRei((p) => !p);
          }}
        >
          <Image
            src="/rei.webp"
            alt="Reinathan Ezkhiel K."
            width={1536}
            height={2736}
            sizes="(max-width: 768px) 55vw, (max-width: 1280px) 42vw, 520px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="h-full w-auto object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.2)] cursor-pointer md:cursor-pointer xl:cursor-help"
          />
          {!isMobileOrTablet && (
            <AnimatePresence>
              {(hoverRei || activeChar === "rei") && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  className="absolute bottom-[80%] left-1/2 -translate-x-1/2 z-[30] w-max flex flex-col items-center p-2 select-none"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  {/* Photo Box */}
                  <div className="overflow-hidden border border-white/10 bg-black/20 w-[136px] h-[136px] rounded-[1rem] mb-4">
                    <Image
                      src="/reifo.webp"
                      alt="Reinathan photo"
                      width={481}
                      height={572}
                      sizes="136px"
                      quality={80}
                      priority
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                  <p className="text-white font-normal leading-relaxed relative z-10 text-base text-center">
                    <span className="underline font-bold">Our beloved friend,</span>
                    <br />
                    Reinathan Ezkhiel K.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Josh - Left Upper Layer (Symmetrical Trias Formation - Flanking Rei) */}
        <div
          className="absolute -translate-x-1/2 z-[2] pointer-events-auto bottom-0 left-[28%] sm:left-[29%] md:left-[30%] xl:left-[30%] w-[32vw] sm:w-[28vw] md:w-[26vw] h-auto xl:h-[63vh] xl:w-auto"
          onMouseEnter={() => {
            if (!isMobileOrTablet) {
              setHoverJosh(true);
              setActiveChar("josh");
            }
          }}
          onMouseLeave={() => {
            if (!isMobileOrTablet) {
              setHoverJosh(false);
              setActiveChar(null);
            }
          }}
          onClick={() => {
            toggleChar("josh");
            setHoverJosh((p) => !p);
          }}
        >
          <Image
            src="/josh.webp"
            alt="Joshua Ricardo R."
            width={2016}
            height={2130}
            sizes="(max-width: 768px) 32vw, (max-width: 1280px) 26vw, 560px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-pointer md:cursor-pointer xl:cursor-help w-full h-auto xl:h-full xl:w-auto"
          />
          {!isMobileOrTablet && (
            <AnimatePresence>
              {(hoverJosh || activeChar === "josh") && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  className="absolute z-[30] w-max flex flex-col items-start top-[40%] right-[85%] p-2 select-none"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  {/* Photo Box */}
                  <div className="overflow-hidden border border-white/10 bg-black/20 w-[136px] h-[136px] rounded-[1rem] mb-4">
                    <Image
                      src="/jofo.webp"
                      alt="Joshua photo"
                      width={433}
                      height={416}
                      sizes="136px"
                      quality={80}
                      priority
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                  <p className="text-white font-normal leading-relaxed relative z-10 text-base">
                    <span className="underline font-bold">Our beloved friend,</span>
                    <br />
                    Joshua Ricardo R.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Otniel - Right Upper Layer (Symmetrical Trias Formation - Exactly Mirroring Josh) */}
        <div
          className="absolute -translate-x-1/2 z-[2] pointer-events-auto left-[72%] sm:left-[71%] md:left-[70%] xl:left-[70%] w-[32vw] sm:w-[28vw] md:w-[26vw] h-auto bottom-0 xl:h-[63vh] xl:w-auto xl:bottom-[-18vh]"
          onMouseEnter={() => {
            if (!isMobileOrTablet) {
              setHoverOtniel(true);
              setActiveChar("otniel");
            }
          }}
          onMouseLeave={() => {
            if (!isMobileOrTablet) {
              setHoverOtniel(false);
              setActiveChar(null);
            }
          }}
          onClick={() => {
            toggleChar("otniel");
            setHoverOtniel((p) => !p);
          }}
        >
          <Image
            src="/otniel.webp"
            alt="Otniel Kristian S."
            width={1888}
            height={2234}
            sizes="(max-width: 768px) 32vw, (max-width: 1280px) 26vw, 560px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="object-contain brightness-90 contrast-110 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-pointer md:cursor-pointer xl:cursor-help w-full h-auto xl:h-full xl:w-auto xl:scale-[1.3] xl:origin-bottom"
          />
          {!isMobileOrTablet && (
            <AnimatePresence>
              {(hoverOtniel || activeChar === "otniel") && (
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  className="absolute top-[25%] left-[95%] z-[30] w-max flex flex-col items-start p-2 select-none"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  {/* Photo Box */}
                  <div className="overflow-hidden border border-white/10 bg-black/20 w-[136px] h-[136px] rounded-[1rem] mb-4">
                    <Image
                      src="/ofo.webp"
                      alt="Otniel photo"
                      width={664}
                      height={622}
                      sizes="136px"
                      quality={80}
                      priority
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />
                  <p className="text-white font-normal leading-relaxed relative z-10 text-base">
                    <span className="underline font-bold">Our beloved friend,</span>
                    <br />
                    Otniel Kristian S.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Plateau Centerpiece - Adjusted Height */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto h-auto z-[10] pointer-events-none transform translate-y-[40%]">
        <Image
          src="/plateau.webp"
          alt="Golden plateau"
          width={1050}
          height={700}
          sizes="(max-width: 768px) 90vw, 1050px"
          quality={75}
          loading="lazy"
          decoding="async"
          className="w-auto h-auto object-contain opacity-90 brightness-75 contrast-125"
          style={{
            maskImage:
              "linear-gradient(to top, black 50%, transparent 100%), radial-gradient(ellipse at center, black 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, black 50%, transparent 100%), radial-gradient(ellipse at center, black 80%, transparent 100%)",
          }}
        />

        {/* Floating Logolden - Above Plateau Layer (Tight Steady Float) */}
        <motion.div
          animate={{
            y: [0, -6, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-[20] w-[232px] md:w-[323px] h-auto drop-shadow-[0_0_50px_rgba(255,215,0,0.6)] translate-y-[112%] md:translate-y-[143%]"
          style={{
            rotate: "0deg",
            willChange: "transform",
          }}
        >
          <Image
            src="/logolden.webp"
            alt="Kalceria Golden Logo"
            width={2400}
            height={715}
            sizes="(max-width: 768px) 232px, 323px"
            quality={75}
            loading="lazy"
            decoding="async"
            className="w-full h-auto object-contain brightness-110 contrast-125"
          />
        </motion.div>
      </div>

      {/* Golden Ambient Sparks (Free Floating) */}
      <GoldenAmbientSparks />

      {/* Section Title at the top - Always visible & prominent on re-scroll */}
      <div className="absolute top-3 xs:top-4 sm:top-6 md:top-6 lg:top-8 xl:top-20 left-1/2 -translate-x-1/2 z-30 text-center w-full px-4 flex flex-col items-center pointer-events-none">
        <motion.h2
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-normal tracking-tighter text-white leading-none select-none mb-1.5 xs:mb-2 md:mb-4"
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            textShadow: `
              1px 1px 0px #ccc,
              2px 2px 0px #bbb,
              3px 3px 0px #aaa,
              4px 4px 0px #999,
              5px 5px 0px #888,
              6px 6px 15px rgba(0,0,0,0.5)
            `,
          }}
        >
          Webdev Team
        </motion.h2>

        {/* Mobile & iPad Paragraph */}
        <p
          className="block xl:hidden w-[92%] max-w-[340px] md:max-w-[440px] text-slate-200 text-[11px] xs:text-xs sm:text-sm md:text-base font-normal leading-relaxed text-center opacity-100"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Kalceria used to be a Final Project, now it is becoming a legacy of digital craftsmanship and automotive passion. It stands as a testament to the boundary-pushing creativity of our development team.
        </p>
      </div>

      {/* Static Paragraph - Desktop Widescreen Left placement preserved */}
      <p
        className="hidden xl:block absolute xl:top-[12.5rem] xl:max-w-[280px] text-slate-200 xl:text-lg font-normal leading-relaxed pointer-events-none z-30 xl:text-justify xl:left-[32%] xl:translate-x-0 opacity-100"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        Kalceria used to be a Final Project, now it is becoming a legacy of digital craftsmanship and automotive passion. It stands as a testament to the boundary-pushing creativity of our development team.
      </p>

      {/* dy_3 (Mentor / Ditya Alif K.) image */}
      <div
        className="absolute left-1/2 -translate-x-1/2 xl:translate-x-0 xl:left-[50.4%] z-20 top-[7.5rem] xs:top-[8rem] sm:top-[8.75rem] md:top-[10rem] lg:top-[10.5rem] xl:top-[5.88rem]"
        onMouseEnter={() => {
          if (!isMobileOrTablet) setHoverMentor(true);
        }}
        onMouseLeave={() => {
          if (!isMobileOrTablet) setHoverMentor(false);
        }}
        onClick={() => setHoverMentor((p) => !p)}
      >
        <div className="relative w-max flex flex-col items-center justify-end mx-auto">
          <Image
            src="/dy_3.webp"
            alt="Ditya Alif K."
            width={768}
            height={1364}
            sizes="(max-width: 768px) 145px, (max-width: 1280px) 185px, 372px"
            quality={80}
            priority
            loading="eager"
            decoding="async"
            className="object-contain block pointer-events-auto opacity-95 cursor-pointer xl:cursor-help w-[130px] xs:w-[145px] sm:w-[165px] md:w-[185px] lg:w-[200px] h-auto xl:w-[23.25rem] xl:h-[23.25rem] rotate-0 xl:-rotate-[10.5deg] transition-transform duration-300 transform-gpu will-change-transform"
          />
          {/* Pure CSS Horizontal Line */}
          <div className="block xl:hidden absolute bottom-0 left-0 right-0 h-[2px] bg-white/95 shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
        </div>

        <AnimatePresence>
          {hoverMentor && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              className="absolute top-[20%] left-[95%] z-[30] w-max p-2 select-none"
              style={{
                fontFamily: "'Times New Roman', Times, serif",
              }}
            >
              {/* Black Blob effect inside */}
              <div className="absolute -z-10 inset-0 bg-black/40 blur-2xl rounded-full scale-75" />

              <p className="text-white font-normal leading-tight relative z-10 text-xs md:text-xl">
                <span className="underline font-bold block mb-2">Our Mentor,</span>
                Ditya Alif K.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Aesthetic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 pointer-events-none" />
    </motion.section>
  );
}
