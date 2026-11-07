"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { StarDust } from "../particles";
import { Typewriter, EventSlider } from "../showcase";

export function LandingEventsSection() {
  return (
    <section
      id="section-events"
      className="relative w-full min-h-[70vh] flex flex-col xl:flex-row items-center justify-center xl:justify-between overflow-hidden bg-[#050a14] z-20 px-6 sm:px-8 xl:px-24 py-16 xl:py-20 gap-8 sm:gap-10 xl:gap-16"
      style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}
    >
      <StarDust />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] left-[15%] w-[52vw] h-[52vw] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(255,0,255,0.9) 0%, rgba(255,0,255,0.38) 45%, transparent 100%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-8%] right-[4%] w-[62vw] h-[62vw] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(255,215,0,0.9) 0%, rgba(255,215,0,0.38) 45%, transparent 100%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[25%] left-[44%] w-[40vw] h-[40vw] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.32) 45%, transparent 100%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-[-16%] left-[0%] w-[52vw] h-[52vw] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(255,0,0,0.85) 0%, rgba(255,0,0,0.35) 45%, transparent 100%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[14%] right-[-16%] w-[56vw] h-[56vw] rounded-full will-change-transform"
          style={{
            background:
              "radial-gradient(circle closest-side, rgba(255,140,0,0.9) 0%, rgba(255,140,0,0.38) 45%, transparent 100%)",
          }}
        />
      </div>

      {/* Mobile Silhouette: grup_hp.webp (strictly mobile screens < 768px; purged on iPad, Mini, Pro, Surface) */}
      <div className="absolute bottom-0 left-0 w-full h-[360px] xs:h-[400px] sm:h-[450px] pointer-events-none z-[1] overflow-hidden md:hidden flex justify-center items-end">
        <Image
          src="/hp/grup_hp.webp"
          alt="Group Mobile"
          width={2304}
          height={1848}
          loading="lazy"
          decoding="async"
          className="h-full w-auto object-contain opacity-50 translate-y-[65%] xs:translate-y-[68%] sm:translate-y-[70%]"
        />
      </div>

      {/* Header: Title above carousel for Mobile and iPad family; hidden on desktop widescreen */}
      <div className="relative z-20 flex flex-col items-center gap-2 mb-2 sm:mb-4 xl:hidden">
        <h2
          className="text-center text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter"
          style={{ textShadow: "4px 4px 0 rgba(255,0,255,0.15)" }}
        >
          <Typewriter text="SEE EVENT" mode="letter" delay={0} skipAnim={false} />
        </h2>
      </div>

      {/* Center: Event Slider Card (Relative on Mobile & iPad, Absolutely Centered on Desktop Widescreen) */}
      <div
        className="relative xl:absolute xl:left-1/2 xl:top-1/2 xl:-translate-x-1/2 xl:-translate-y-1/2 z-10 w-full max-w-[190px] xs:max-w-[205px] sm:max-w-[225px] md:max-w-[250px] xl:max-w-[320px] aspect-[4/5] rounded-xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] border border-white/10 backdrop-blur-sm"
        style={{
          clipPath:
            "polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px)",
        }}
      >
        <EventSlider />
      </div>

      {/* Explore Button: Underneath carousel on Mobile & iPad, on Left on Desktop Widescreen */}
      <div className="relative xl:absolute left-0 xl:left-24 bottom-0 xl:top-1/2 xl:-translate-y-1/2 z-20 flex flex-col items-center xl:items-start gap-4 xl:gap-6 mt-4 sm:mt-6 xl:mt-0">
        <h2
          className="hidden xl:block text-center xl:text-left text-5xl xl:text-6xl font-black uppercase tracking-tighter"
          style={{ textShadow: "4px 4px 0 rgba(255,0,255,0.15)" }}
        >
          <Typewriter text="SEE EVENT" mode="letter" delay={0} skipAnim={false} />
        </h2>
        <Link
          href="/events"
          onClick={() => {
            sessionStorage.setItem("landingScrollTarget", "section-events");
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
            <span className="relative z-10">EXPLORE</span>
            <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
          </button>
        </Link>
      </div>

      {/* Floating Crystal 2 (Meteors) - Dynamically framed around Event Card on Mobile with zero cutoffs */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        {/* Meteor 1: Upper Left */}
        <motion.img
          src="/crystal_2.webp"
          className="absolute h-[22px] xs:h-[26px] md:h-[36px] object-contain opacity-85 left-[calc(50%-115px)] top-[18%] md:left-[calc(50%-260px)] md:top-[55%] filter drop-shadow-[0_0_12px_rgba(255,0,255,0.7)]"
          animate={{ y: [0, -14, 0], x: [0, 5, 0], rotate: [-35, -15, -35], scale: [1, 1.1, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Meteor 2: Right Center */}
        <motion.img
          src="/crystal_2.webp"
          className="absolute h-[26px] xs:h-[30px] md:h-[47px] object-contain opacity-85 left-[calc(50%+92px)] top-[27%] md:left-[calc(50%+175px)] md:top-[18%] filter drop-shadow-[0_0_15px_rgba(255,215,0,0.7)]"
          animate={{ y: [0, -16, 0], x: [0, -6, 0], rotate: [25, 45, 25], scale: [1, 1.12, 1] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        {/* Meteor 3: Lower Left */}
        <motion.img
          src="/crystal_2.webp"
          className="absolute h-[18px] xs:h-[22px] md:h-[28px] object-contain opacity-85 left-[calc(50%-105px)] top-[42%] md:left-[35%] md:bottom-[5%] md:top-auto filter drop-shadow-[0_0_10px_rgba(255,140,0,0.6)]"
          animate={{ y: [0, -10, 0], x: [0, 4, 0], rotate: [50, 70, 50], scale: [1, 1.08, 1] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        {/* Meteor 4: Desktop Only */}
        <motion.img
          src="/crystal_2.webp"
          className="hidden md:block absolute h-[45px] md:h-[63px] object-contain opacity-70 md:left-[calc(50%+200px)] md:top-[50%]"
          animate={{ y: [0, -18, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Silhouettes - Static Background */}
      <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden px-8 md:px-24">
        {/* Crystal 3 Top Right (Truncated at Top) */}
        <div className="absolute top-[-20px] md:top-[-40px] right-12 md:right-40 hidden md:flex flex-col items-center pointer-events-none opacity-80">
          <Image
            src="/crystal_3.webp"
            alt="Crystal 3"
            width={2480}
            height={1728}
            loading="lazy"
            decoding="async"
            className="h-[75px] md:h-[120px] w-auto object-contain rotate-180"
          />
        </div>

        {/* Crystal 1 Bottom Left (Truncated at Bottom) */}
        <Image
          src="/crystal_1.webp"
          alt="Crystal 1"
          width={2016}
          height={2120}
          loading="lazy"
          decoding="async"
          className="absolute bottom-[-20px] md:bottom-[-30px] left-0 md:left-2 xl:left-4 h-[80px] md:h-[120px] xl:h-[130px] w-auto object-contain opacity-80 z-[15] hidden md:block"
        />

        {/* Group Silhouette: Preserved for iPad Family (md/lg, shifted flush to left) & Desktop Widescreen (xl:left-40) */}
        <div className="absolute bottom-0 left-0 md:-left-16 lg:-left-12 xl:left-40 hidden md:flex items-end z-10">
          <Image
            src="/grup.webp"
            alt="Group"
            width={2064}
            height={1655}
            loading="lazy"
            decoding="async"
            className="relative z-10 h-[180px] md:h-[220px] lg:h-[250px] xl:h-[280px] w-auto object-contain translate-y-[2.5px] opacity-35"
          />
        </div>

        <div className="absolute bottom-0 right-4 md:right-2 lg:right-6 xl:right-10 opacity-50 hidden md:flex flex-col items-center pointer-events-none">
          {/* Magenta Tapakan (Base) - Wedge Shape from Sketch */}
          <div
            className="absolute bottom-[-5px] right-[-20%] w-[150%] h-[75px] md:h-[80px] lg:h-[110px] xl:h-[140px] bg-gradient-to-r from-[#D946EF] to-[#FACC15] blur-[16px] md:blur-[18px] xl:blur-[22px] z-0 opacity-80"
            style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%, 0 100%)" }}
          />
          <Image
            src="/brio_black.webp"
            alt="Brio"
            width={2226}
            height={1207}
            loading="lazy"
            decoding="async"
            className="relative z-10 h-[120px] md:h-[125px] lg:h-[175px] xl:h-[240px] w-auto object-contain translate-y-[2.5px]"
          />
        </div>
      </div>
    </section>
  );
}
