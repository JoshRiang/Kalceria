"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { AuroraParticles } from "./particles";
import { SolarPhoenix } from "./backgrounds";
import { FloatingAssets, CommunityQuotes, GeminiSparkParticles } from "./animatedLayers";
import { DungeonGate } from "./modals/DungeonGate";

export const ClosingSections = memo(function ClosingSections({ isMobile, onOpenIdeaModal }) {
  return (
    <>
      {/* ── Section 7: Big Square Concept ── */}
      <section id="section-map" className="relative w-full aspect-square bg-[#0c1528] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900">
        {/* Background Blobs (Cyan, Magenta, Gold) - GPU-Optimized on Mobile */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
          {isMobile ? (
            <div 
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle at 15% 15%, rgba(0,255,255,0.4) 0%, transparent 55%), radial-gradient(circle at 85% 85%, rgba(217,70,239,0.4) 0%, transparent 60%), radial-gradient(circle at 50% 50%, rgba(250,204,21,0.25) 0%, transparent 65%)"
              }}
            />
          ) : (
            <>
              <motion.div 
                animate={{ scale: [1, 1.25, 1], x: ["-15%", "15%", "-15%"], y: ["-10%", "10%", "-10%"] }} 
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} 
                className="absolute top-0 left-0 w-[60vw] h-[60vw] rounded-full blur-[140px] bg-[#00FFFF]" 
              />
              <motion.div 
                animate={{ scale: [1.1, 1.35, 1.1], x: ["15%", "-15%", "15%"], y: ["10%", "-10%", "10%"] }} 
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
                className="absolute bottom-0 right-0 w-[65vw] h-[65vw] rounded-full blur-[150px] bg-[#D946EF]" 
              />
              <motion.div 
                animate={{ scale: [1, 1.4, 1], x: ["0%", "10%", "0%"], y: ["20%", "-20%", "20%"] }} 
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }} 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] rounded-full blur-[160px] bg-[#FACC15]" 
              />
            </>
          )}
        </div>

        {/* Earthman on mobile - sits at z-[3], behind particles (z-[4]) and asteroids (z-10 container wrapper) */}
        {isMobile && (
          <motion.img 
            src="/hp/earthman_hp.webp" 
            alt="Earthman" 
            className="absolute bottom-[-1%] h-[105%] xs:h-[115%] object-contain z-[3] pointer-events-none"
            initial={{ y: 60, opacity: 0, rotate: 0, scale: 1 }}
            whileInView={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}

        <SolarPhoenix isMobile={isMobile} />

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {/* Earth - Core Centerpiece */}
          {!isMobile && (
            <motion.img 
              src="/earth.webp" 
              alt="Earth" 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[34%] md:h-[46%] object-contain opacity-90 z-0 drop-shadow-[0_0_50px_rgba(0,255,255,0.2)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Find The Others Button - Natural Cloud Fader */}
          {/* On Desktop & iPad/Tablet: Centered directly on Earth (top-1/2 -translate-y-1/2) */}
          {/* On Mobile HP: Bottom positioned (bottom-[8%]) near Earthman's hands */}
          <motion.button
            onClick={() => {
              sessionStorage.setItem("landingScrollTarget", "section-map");
              sessionStorage.setItem("landingScrollY", window.scrollY);
              sessionStorage.removeItem("mapIntroSeen");
              sessionStorage.setItem("playMapIntro", "true");
              window.location.href = "/map";
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 65px rgba(255,255,255,0.5), inset 0 0 25px rgba(255,255,255,0.25)",
            }}
            whileTap={{ scale: 0.95 }}
            className="absolute z-30 bottom-[8%] md:bottom-auto md:top-1/2 left-1/2 -translate-x-1/2 md:-translate-y-1/2 bg-white/10 backdrop-blur-3xl border-none rounded-3xl text-white font-black uppercase tracking-tighter text-base sm:text-lg md:text-2xl px-6 py-3.5 md:px-12 md:py-5 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:shadow-[0_0_75px_rgba(255,255,255,0.55)] transition-all duration-300 transform-gpu will-change-transform"
            style={{
              maskImage: "radial-gradient(ellipse 95% 85% at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.7) 75%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 95% 85% at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.7) 75%, transparent 100%)"
            }}
          >
            {/* Peach Blob */}
            <motion.div 
              animate={{ x: [0, 30, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 -left-4 w-28 h-28 bg-[#FFB07C] rounded-full blur-[26px] opacity-75 z-0 pointer-events-none"
            />
            {/* Green Blob */}
            <motion.div 
              animate={{ x: [0, -30, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -right-4 w-28 h-28 bg-green-400 rounded-full blur-[26px] opacity-70 z-0 pointer-events-none"
            />
            
            <span 
              className="relative z-10 whitespace-nowrap"
              style={{
                textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)"
              }}
            >
              FIND THE OTHERS !
            </span>
          </motion.button>

          {/* Earthman - Desktop Hero Figure at Bottom */}
          {!isMobile && (
            <motion.img 
              src="/earthman.webp" 
              alt="Earthman" 
              className="absolute bottom-[-4%] h-[40%] md:h-[54%] object-contain z-20 pointer-events-none"
              initial={{ y: 60, opacity: 0, rotate: 0, scale: 1 }}
              whileInView={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}

          {/* Asteroid Field - Optimized to 2 on Mobile, 4 on Desktop to eliminate lag */}
          {[
            { id: 1, src: '/asteroid_1.webp', top: '8%', left: '8%', size: '36px', delay: 0, rot: 45 },
            { id: 4, src: '/asteroid_1.webp', top: '12%', right: '12%', size: '42px', delay: 0.8, rot: -80 },
            { id: 7, src: '/asteroid_2.webp', bottom: '26%', left: '6%', size: '32px', delay: 0.4, rot: -40, desktopOnly: true },
            { id: 8, src: '/asteroid_1.webp', bottom: '22%', right: '10%', size: '40px', delay: 1.5, rot: 100, desktopOnly: true },
          ].filter(ast => !isMobile || !ast.desktopOnly).map((ast) => (
            <motion.img
              key={ast.id}
              src={ast.src}
              alt="Asteroid"
              className="absolute pointer-events-none opacity-50 z-[5]"
              style={{ 
                top: ast.top, 
                left: ast.left, 
                right: ast.right, 
                bottom: ast.bottom, 
                width: ast.size
              }}
              animate={{ 
                y: [0, -12, 0],
                rotate: [ast.rot - 15, ast.rot + 15, ast.rot - 15]
              }}
              transition={{ 
                duration: 6 + (ast.id % 4), 
                repeat: Infinity, 
                ease: "easeInOut", 
                delay: ast.delay 
              }}
            />
          ))}

          {/* Floating Clouds Assembly */}
          {!isMobile && (
            <>
              {/* Left Cloud: awan_3 - Now fully opaque */}
              <motion.img 
                src="/awan_3.webp" 
                alt="Cloud Left"
                className="absolute left-[23%] bottom-[27%] h-[103px] md:h-[184px] object-contain opacity-100 z-30 pointer-events-none"
                animate={{ 
                  y: [0, -15, 0], 
                  rotate: [-37, -33, -37],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Right Top Cloud: awan_1 - Duplicated awan_2 but in awan_1 position */}
              <motion.img 
                src="/awan_2.webp" 
                alt="Cloud Right Top"
                className="absolute right-[28%] top-[27%] h-[76px] md:h-[131px] object-contain opacity-100 z-30 pointer-events-none"
                animate={{ 
                  y: [0, -12, 0], 
                  rotate: [1, -3, 1],
                  scale: [1, 1.08, 1]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />

              {/* Right Middle Cloud: awan_2 - 2% lefter */}
              <motion.img 
                src="/awan_2.webp" 
                alt="Cloud Right Middle"
                className="absolute right-[21%] bottom-[33%] h-[66px] md:h-[121px] object-contain opacity-100 z-30 pointer-events-none"
                animate={{ 
                  y: [0, -20, 0], 
                  rotate: [-1, 1, -1],
                  scale: [1, 1.03, 1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Section 8: Final Scene / Tokyo Nights ── */}
      <section id="section-journey" className="relative w-full min-h-[75vh] flex flex-col items-center justify-center py-20 z-50 border-t border-slate-900 overflow-hidden bg-black isolation-auto">
        {/* Tokyo Night Background - ABSOLUTE BACK */}
        <Image src="/bg_tokyo.webp" alt="Tokyo Night" width={2730} height={1536} sizes="100vw" quality={75} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-50 z-[-2] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050a14] via-transparent to-[#050a14] z-[-2] pointer-events-none" />
        
        {/* Battle Glows (Anakin vs Obi-Wan Vibe) - BEHIND LOGOS */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {isMobile ? (
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                background: "radial-gradient(circle at 10% 40%, rgba(220,38,38,0.25) 0%, transparent 60%), radial-gradient(circle at 90% 40%, rgba(6,182,212,0.25) 0%, transparent 60%)"
              }}
            />
          ) : (
            <>
              {/* Red Dynamic Glow (Left / Kalceria) */}
              <motion.div 
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-15%] w-[60%] h-[120%] bg-red-600/25 blur-[130px] rounded-full will-change-transform"
              />
              {/* Cyan Dynamic Glow (Right / DSL) */}
              <motion.div 
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                className="absolute top-[-10%] right-[-15%] w-[60%] h-[120%] bg-cyan-500/25 blur-[130px] rounded-full will-change-transform"
              />
            </>
          )}
        </div>

        {/* Scattered Aurora Effect - TOP ATMOSPHERE */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          <AuroraParticles isMobile={isMobile} />
        </div>
        
        {/* Unified, Coherent Vertical Alignment: Kalceria X DSL -> JOIN US? -> WhatsApp -> SEE THE JOURNEY */}
        <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center justify-center gap-6 sm:gap-7 md:gap-8 mx-auto text-center">
           {/* 1. Collaboration Header (Kalceria X DSL) */}
           {isMobile ? (
             /* Mobile Phone Family: Vertical Stack (Kalceria on top, X in middle with pink/gold blobs, DSL underneath) */
             <div className="w-full max-w-[280px] xs:max-w-[320px] mx-auto flex flex-col items-center justify-center gap-3 z-20">
               {/* Kalceria on TOP - Straight, no slope, no gradient, no floating */}
               <img 
                 src="/logologin.webp" 
                 alt="Kalceria" 
                 className="h-14 xs:h-16 w-auto object-contain drop-shadow-[0_0_25px_rgba(255,0,0,0.4)] rotate-0"
               />

               {/* The "X" in MIDDLE - Semi-transparent with pink & golden blobs */}
               <div className="relative flex items-center justify-center py-1">
                 {/* Pink dynamic blob */}
                 <div 
                   className="absolute -top-1 -left-2 w-10 h-10 rounded-full bg-[#FF00FF] opacity-70 pointer-events-none"
                   style={{ filter: "blur(12px)" }}
                 />
                 {/* Golden dynamic blob */}
                 <div 
                   className="absolute -bottom-1 -right-2 w-10 h-10 rounded-full bg-[#FFD700] opacity-65 pointer-events-none"
                   style={{ filter: "blur(12px)" }}
                 />
                 <svg width="48" height="48" viewBox="0 0 100 100" className="w-10 h-10 relative z-10 select-none pointer-events-none drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]">
                   <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="85" fontWeight="950" fill="rgba(255,255,255,0.4)" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                     X
                   </text>
                 </svg>
               </div>

               {/* DSL at the UNDER - Straight, no slope, no gradient, no floating */}
               <img 
                 src="/dsl.webp" 
                 alt="DSL" 
                 className="h-14 xs:h-16 w-auto object-contain drop-shadow-[0_0_25px_rgba(0,255,255,0.4)] rotate-0"
               />
             </div>
           ) : (
             /* Desktop / Tab / iPad Family: Horizontal Grid, Kalceria (+20%) X (+15% with pink/gold blobs) DSL (+20%) */
             <div className="w-full max-w-2xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6 md:gap-8 z-20">
               {/* Kalceria Logo - 20% bigger (from 80px to 96px-112px) */}
               <div className="flex justify-end items-center">
                 <img 
                   src="/logologin.webp" 
                   alt="Kalceria" 
                   className="h-20 sm:h-24 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_0_40px_rgba(255,0,0,0.5)] rotate-0"
                 />
               </div>

               {/* The "X" - 15% bigger, semi-transparent, pink and golden blobs behind */}
               <div className="relative flex items-center justify-center px-1">
                 {/* Pink dynamic blob */}
                 <div 
                   className="absolute -top-1 -left-2 w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#FF00FF] opacity-70 pointer-events-none"
                   style={{ filter: "blur(16px)" }}
                 />
                 {/* Golden dynamic blob */}
                 <div 
                   className="absolute -bottom-1 -right-2 w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#FFD700] opacity-65 pointer-events-none"
                   style={{ filter: "blur(16px)" }}
                 />
                 <svg width="80" height="80" viewBox="0 0 100 100" className="w-16 h-16 sm:w-[70px] sm:h-[70px] md:w-[74px] md:h-[74px] lg:w-20 lg:h-20 relative z-10 select-none pointer-events-none drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]">
                   <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="85" fontWeight="950" fill="rgba(255,255,255,0.4)" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                     X
                   </text>
                 </svg>
               </div>

               {/* DSL Logo - 20% bigger (from 80px to 96px-112px) */}
               <div className="flex justify-start items-center">
                 <img 
                   src="/dsl.webp" 
                   alt="DSL" 
                   className="h-20 sm:h-24 md:h-24 lg:h-28 w-auto object-contain drop-shadow-[0_0_40px_rgba(0,255,255,0.5)] rotate-0"
                 />
               </div>
             </div>
           )}
           
           {/* 2. JOIN US? - Center of whitespace between JOIN & US mathematically aligned with WA button centerline */}
           <motion.h2 
             initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
             whileInView={{ opacity: 1, y: 0, x: 0, filter: "blur(0px)" }}
             viewport={{ once: false, amount: 0.5 }}
             transition={{ duration: 1, ease: "easeOut" }}
             className="w-full max-w-2xl mx-auto flex items-baseline justify-center text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tighter text-white select-none"
             style={{ 
               textShadow: "2px 2px 0px #444, 4px 4px 0px #222, 0 0 30px rgba(255,255,255,0.2)"
             }}
           >
             <div className="flex-1 text-right pr-2 sm:pr-3 md:pr-4">JOIN</div>
             <div className="flex-1 text-left pl-2 sm:pl-3 md:pl-4">US?</div>
           </motion.h2>

           {/* 3. WhatsApp Logo - Dead center aligned */}
           <motion.img 
             src="/wa_logo.webp" 
             alt="WhatsApp" 
             className="h-14 sm:h-16 md:h-20 w-auto object-contain drop-shadow-[0_0_35px_rgba(37,211,102,0.5)] z-20 cursor-pointer"
             animate={{ y: [0, -6, 0] }}
             transition={{ 
               y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
             }}
           />

           {/* 4. See The Journey Button - Dead center aligned */}
           <Link href="/journey" onClick={() => {
             sessionStorage.setItem("landingScrollTarget", "section-journey");
             sessionStorage.setItem("landingScrollY", window.scrollY);
           }}>
             <motion.button
               whileHover={{ 
                 scale: 1.05,
                 boxShadow: "0 0 65px rgba(255,255,255,0.5), inset 0 0 25px rgba(255,255,255,0.25)",
               }}
               whileTap={{ scale: 0.95 }}
               className="relative mx-auto z-30 bg-white/10 backdrop-blur-3xl border-none rounded-3xl text-white font-black uppercase tracking-tighter text-lg md:text-3xl px-8 py-4 md:px-14 md:py-6 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:shadow-[0_0_75px_rgba(255,255,255,0.55)] transition-all duration-300"
               style={{
                 maskImage: "radial-gradient(ellipse 95% 85% at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.7) 75%, transparent 100%)",
                 WebkitMaskImage: "radial-gradient(ellipse 95% 85% at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.7) 75%, transparent 100%)"
               }}
             >
               {/* Peach Blob */}
               <motion.div 
                 animate={{ x: [0, 30, 0], scale: [1, 1.2, 1] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute -top-8 -left-4 w-28 h-28 bg-[#FFB07C] rounded-full blur-[26px] opacity-75 z-0 pointer-events-none"
               />
               {/* Green Blob */}
               <motion.div 
                 animate={{ x: [0, -30, 0], scale: [1, 1.3, 1] }}
                 transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                 className="absolute -bottom-8 -right-4 w-28 h-28 bg-green-400 rounded-full blur-[26px] opacity-70 z-0 pointer-events-none"
               />
               
               <span 
                 className="relative z-10 whitespace-nowrap"
                 style={{
                   textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 10px rgba(0,0,0,0.8)"
                 }}
               >
                 SEE THE JOURNEY
               </span>
             </motion.button>
           </Link>
        </div>
      </section>

      {/* ── Section 9: The Legacy ── */}
      <section id="section-minigame" className="relative w-full min-h-[820px] md:min-h-0 md:aspect-square bg-[#02040a] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900 py-16 md:py-0">
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
             <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-white"
                 style={{ 
                   textShadow: "1px 1px 0px #bbb, 2px 2px 0px #999, 3px 3px 0px #777, 4px 4px 0px #555, 5px 5px 20px rgba(0,0,0,0.8)",
                   filter: "drop-shadow(0 0 15px rgba(255,255,255,0.2))"
                 }}>
               Make Us Better !
             </h2>
           </motion.div>

           {/* The Box - Clean Rounded Rectangle, Cloudy & Borderless */}
           <motion.button
             onClick={onOpenIdeaModal}
             whileTap={{ scale: 0.95 }}
             className="relative group cursor-pointer z-40 focus:outline-none"
           >
              <div className="relative w-48 md:w-[240px] py-4 md:py-6 bg-white/10 backdrop-blur-2xl border-none rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(255,255,255,0.25)] group-hover:bg-white/15 group-hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-all duration-500 flex items-center justify-center">
                {/* Glassmorphism Blobs - always visible, subtle */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity duration-500">
                   <motion.div 
                     animate={{ x: [-10, 30, -10], y: [-10, 10, -10], scale: [1, 1.2, 1] }}
                     transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute -top-4 -left-4 w-24 h-24 bg-[#00FFFF] rounded-full blur-[30px]" 
                   />
                   <motion.div 
                     animate={{ x: [10, -30, 10], y: [10, -10, 10], scale: [1.2, 1, 1.2] }}
                     transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                     className="absolute -bottom-4 -right-4 w-28 h-28 bg-[#D946EF] rounded-full blur-[40px]" 
                   />
                </div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <span className="font-sans font-black text-white uppercase tracking-widest text-lg md:text-xl text-center px-4">
                    Leave it here
                  </span>
                </div>
              </div>
            </motion.button>
          </div>
          <DungeonGate />
        </section>
    </>
  );
});
