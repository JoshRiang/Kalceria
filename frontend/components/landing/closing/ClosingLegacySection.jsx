"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { FloatingAssets, CommunityQuotes, GeminiSparkParticles } from "../animatedLayers";
import { DungeonGate } from "../modals/DungeonGate";

export function ClosingLegacySection({ isMobile, onOpenIdeaModal }) {
  return (
    <section id="section-minigame" className="relative w-full min-h-[820px] md:min-h-0 md:aspect-square bg-[#02040a] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900 py-16 md:py-0" style={{ contentVisibility: "auto", containIntrinsicSize: "850px" }}>
      {/* Background Atmosphere - Simplified Astral Divine (Lightweight) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         {/* Cyan Core Glow */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full blur-[160px] bg-cyan-950/40" />
         {/* Magenta Bloom */}
         <div className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full blur-[180px] bg-purple-950/30" />
         {/* Blue Sweep */}
         <div className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full blur-[180px] bg-blue-950/20" />
      </div>

      {isMobile && (
        <Image
          src="/hp/bg_astro_hp.webp" 
          alt="Astronaut Background Mobile" 
          width={2744}
          height={1568}
          sizes="100vw"
          quality={75}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover z-[1] opacity-70 pointer-events-none"
        />
      )}

      {/* Community Quotes - Floating Text (Ahead of Astronaut Layer) */}
      <div className="absolute inset-0 z-[40] pointer-events-none">
        <CommunityQuotes isMobile={isMobile} />
      </div>

      {/* Night Background at Bottom */}
      {!isMobile && (
        <Image
          src="/night.webp" 
          alt="Night Sky" 
          width={2728}
          height={1536}
          sizes="100vw"
          quality={75}
          loading="lazy"
          decoding="async"
          className="absolute bottom-0 left-0 w-full h-auto object-cover z-[10] opacity-90"
          style={{ maskImage: "linear-gradient(to top, black 80%, transparent)" }}
        />
      )}
      
      {/* Astronaut - Semi-transparent, Massive and Lowered, Behind Night */}
      {!isMobile && (
        <Image
          src="/astronaut.webp" 
          alt="Astronaut" 
          width={1824}
          height={2300}
          sizes="100vw"
          quality={75}
          loading="lazy"
          decoding="async"
          className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[105%] h-auto object-contain z-[5] opacity-40 mix-blend-screen pointer-events-none" 
        />
      )}

      {/* Micro Particles - Layered Higher than Night */}
      <div className="absolute inset-0 z-[20]">
        <GeminiSparkParticles />
      </div>

      {/* Floating Car & Sticker Assets - Concentrated near Center */}
      <FloatingAssets isMobile={isMobile} />

      <div 
        className="relative z-30 flex flex-col items-center text-center gap-8 md:gap-12"
        style={{ transform: "translateY(0%)" }}
      >
        {isMobile && (
          <motion.img 
            src="/hp/astronaut_hp.webp" 
            alt="Astronaut Mobile" 
            className="absolute bottom-[115%] left-1/2 -translate-x-1/2 w-[280px] xs:w-[320px] h-auto object-contain z-10 pointer-events-none"
            animate={{ y: [-15, 15, -15] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
         >
           <h2 className="text-4xl sm:text-6xl md:text-7xl font-mono font-black uppercase tracking-tighter text-white select-none">
             Make Us Better
           </h2>
         </motion.div>

         {/* Leave It Here Button - Unified with SEE THE JOURNEY Typography & Proportion */}
          <button
            type="button"
            onClick={onOpenIdeaModal}
            className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-polygon focus-visible:outline-none cursor-pointer z-40 mx-auto"
            style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
          >
            <span className="relative z-10">LEAVE IT HERE</span>
            <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
          </button>
        </div>
        <DungeonGate />
      </section>
  );
}
