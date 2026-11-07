"use client";

import Image from "next/image";
import { SupportUsBackground } from "../backgrounds";
import { Typewriter, MerchCard } from "../showcase";
import { StarDust, TropicalParticles } from "../particles";

export function LandingSupportSection({
  isMobile,
  isMobileOrTablet,
  displayedMerch,
  merchInitial,
}) {
  return (
    <section
      className="relative w-full min-h-[85vh] flex flex-col items-center justify-center py-20 z-40 border-t border-white/10 bg-transparent isolate overflow-hidden"
      style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}
    >
      {/* Golden Glow Border Aura - Aggressive */}
      <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_50px_rgba(251,191,36,0.7)] z-50 pointer-events-none" />

      {/* The Ultimate Background */}
      <SupportUsBackground />

      {/* Altar Border Element (Reversed 180, Truncated at Border) */}
      <div className="absolute top-[-60px] md:top-[-220px] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-5 opacity-80">
        <Image
          src={isMobileOrTablet ? "/hp/altar_hp.webp" : "/altar.webp"}
          alt="Altar"
          width={isMobileOrTablet ? 2048 : 2400}
          height={isMobileOrTablet ? 2048 : 1589}
          unoptimized
          loading="lazy"
          decoding="async"
          className={`h-[192px] md:h-[540px] w-auto object-contain drop-shadow-[0_10px_70px_rgba(255,255,255,0.05)] ${
            isMobile ? "" : "rotate-180"
          }`}
        />
      </div>

      {/* Architectural Wall Backgrounds */}
      <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
        <Image
          src="/wall_2.webp"
          alt="Wall 2"
          width={1888}
          height={2244}
          loading="lazy"
          decoding="async"
          className="absolute bottom-0 right-0 h-[215px] md:h-[377px] w-auto object-contain opacity-90 brightness-110"
        />
        <Image
          src="/wall_1.webp"
          alt="Wall 1"
          width={2400}
          height={1603}
          loading="lazy"
          decoding="async"
          className="absolute bottom-0 left-[-2%] md:left-[9%] h-[175px] md:h-[304px] w-auto object-contain opacity-90 brightness-110"
        />
      </div>

      <div className="relative z-10 mb-24 flex justify-center w-full px-4">
        <h2 className="relative text-5xl sm:text-6xl md:text-8xl font-mono font-black uppercase tracking-tighter text-white text-center select-none">
          <Typewriter text="SUPPORT US" mode="none" delay={400} skipAnim={false} />
        </h2>
      </div>

      <div className="relative z-10 w-full max-w-6xl px-4 mb-20 flex justify-center">
        <StarDust />
        <div
          className={`grid gap-4 sm:gap-6 md:gap-3.5 lg:gap-8 justify-items-center w-full ${
            isMobile ? "grid-cols-1 max-w-[280px]" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
          }`}
        >
          {(isMobile ? displayedMerch.slice(0, 1) : displayedMerch).map((item, idx) => (
            <MerchCard
              key={idx}
              item={item}
              isInitial={merchInitial}
              index={idx}
              isMobile={isMobile}
            />
          ))}
          {!displayedMerch.length && (
            <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl w-full">
              <p className="font-mono text-slate-500 uppercase tracking-widest text-sm">
                Synchronizing Inventory...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bush Footer Decoration (Colliding in Middle, Truncated at Border) */}
      <div className="absolute bottom-[-75px] md:bottom-[-125px] left-1/2 -translate-x-1/2 flex items-end justify-center pointer-events-none z-5 w-screen overflow-hidden opacity-90">
        <TropicalParticles />
        <Image
          src="/bush_1.webp"
          alt="Bush 1"
          width={3178}
          height={1129}
          loading="lazy"
          decoding="async"
          className="h-[180px] md:h-[320px] w-auto object-contain -mr-16 md:-mr-28 -translate-y-6 md:-translate-y-10"
        />
        <Image
          src="/bush_2.webp"
          alt="Bush 2"
          width={3172}
          height={1139}
          loading="lazy"
          decoding="async"
          className="h-[180px] md:h-[320px] w-auto object-contain -ml-16 md:-ml-28"
        />
      </div>

      {/* Marketplace Links */}
      <div className="relative z-20 flex gap-6 md:gap-16 items-center justify-center mb-24">
        <a
          href="#"
          className="flex flex-col items-center gap-4 group transition-transform hover:scale-105"
        >
          <div className="relative w-32 md:w-64 h-[42px] md:h-[72px] block">
            <Image
              src="/logo_tokpedgray.webp"
              alt="Tokopedia"
              width={992}
              height={1070}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0"
              draggable={false}
            />
            <Image
              src="/logo_tokped.webp"
              alt="Tokopedia Colored"
              width={1008}
              height={1049}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(3,172,14,0.6)]"
              draggable={false}
            />
          </div>
          <span className="font-sans text-[12px] md:text-[17px] text-white font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center">
            Tokopedia - Kalceros
          </span>
        </a>
        <a
          href="#"
          className="flex flex-col items-center gap-4 group transition-transform hover:scale-105"
        >
          <div className="relative w-32 md:w-64 h-[42px] md:h-[72px] block">
            <Image
              src="/logo_shopeegray.webp"
              alt="Shopee"
              width={1008}
              height={1043}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0"
              draggable={false}
            />
            <Image
              src="/logo_shopee.webp"
              alt="Shopee Colored"
              width={1053}
              height={1024}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100 drop-shadow-[0_0_15px_rgba(238,77,45,0.6)]"
              draggable={false}
            />
          </div>
          <span className="font-sans text-[12px] md:text-[17px] text-white font-semibold tracking-wide transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FFD700] group-hover:to-[#FF00FF] text-center">
            Shopee - Kalcres
          </span>
        </a>
      </div>
    </section>
  );
}
