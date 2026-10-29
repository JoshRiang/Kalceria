"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { AuroraParticles } from "./particles";
import { SolarPhoenix } from "./backgrounds";
import { CometEffect, FloatingAssets, CommunityQuotes, GeminiSparkParticles } from "./animatedLayers";
import { DungeonGate } from "./modals/DungeonGate";

export const ClosingSections = memo(function ClosingSections({ isMobile, onOpenIdeaModal }) {
  return (
    <>
      {/* ── Section 7: Big Square Concept ── */}
      <section id="section-map" className="relative w-full aspect-square bg-[#0c1528] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900">
        {/* Background Blobs (Cyan, Magenta, Gold) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-screen">
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
              className="absolute h-[30%] md:h-[40%] object-contain opacity-90 z-0 drop-shadow-[0_0_50px_rgba(0,255,255,0.2)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Find The Others Button */}
          <motion.button
            onClick={() => {
              sessionStorage.removeItem("mapIntroSeen");
              sessionStorage.setItem("landingScrollTarget", "section-map");
              sessionStorage.setItem("landingScrollY", window.scrollY);
              window.location.href = "/map";
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 40px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.2)",
              backgroundColor: "rgba(255,255,255,0.15)"
            }}
            whileTap={{ scale: 0.95 }}
            className="absolute z-30 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-black uppercase tracking-tighter text-xl md:text-3xl px-8 py-4 md:px-12 md:py-5 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors duration-300"
          >
            {/* Peach Blob */}
            <motion.div 
              animate={{ x: [0, 30, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 -left-4 w-24 h-24 bg-[#FFB07C] rounded-full blur-[24px] opacity-70 z-0 pointer-events-none"
            />
            {/* Green Blob */}
            <motion.div 
              animate={{ x: [0, -30, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -right-4 w-24 h-24 bg-green-400 rounded-full blur-[24px] opacity-60 z-0 pointer-events-none"
            />
            
            <span 
              className="relative z-10"
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

          {/* Asteroid Field - Grouped Clusters */}
          {[
            // Cluster 1: Top Left (2x A1, 1x A2)
            { id: 1, src: '/asteroid_1.webp', top: '5%', left: '5%', size: '42px', delay: 0, rot: 45 },
            { id: 2, src: '/asteroid_1.webp', top: '15%', left: '18%', size: '49px', delay: 1.2, rot: -30 },
            { id: 3, src: '/asteroid_2.webp', top: '22%', left: '8%', size: '31px', delay: 2.5, rot: 115 },
            
            // Cluster 2: Top Right (2x A1, 2x A2)
            { id: 4, src: '/asteroid_1.webp', top: '10%', right: '10%', size: '55px', delay: 0.8, rot: -80 },
            { id: 14, src: '/asteroid_1.webp', top: '3%', right: '22%', size: '38px', delay: 1.4, rot: 25 },
            { id: 5, src: '/asteroid_2.webp', top: '18%', right: '15%', size: '28px', delay: 1.8, rot: 12 },
            { id: 10, src: '/asteroid_2.webp', top: '5%', right: '30%', size: '34px', delay: 0.9, rot: 55 },
            
            // Cluster 3: Bottom Left (2x A1, 2x A2)
            { id: 6, src: '/asteroid_1.webp', bottom: '18%', left: '10%', size: '35px', delay: 3.2, rot: 155 },
            { id: 15, src: '/asteroid_1.webp', bottom: '5%', left: '22%', size: '44px', delay: 0.5, rot: -60 },
            { id: 7, src: '/asteroid_2.webp', bottom: '25%', left: '5%', size: '44px', delay: 0.4, rot: -40 },
            { id: 12, src: '/asteroid_2.webp', bottom: '12%', left: '28%', size: '24px', delay: 3.5, rot: 190 },
            
            // Cluster 4: Bottom Right (2x A1, 3x A2)
            { id: 8, src: '/asteroid_1.webp', bottom: '22%', right: '10%', size: '52px', delay: 1.5, rot: 100 },
            { id: 16, src: '/asteroid_1.webp', bottom: '30%', right: '25%', size: '39px', delay: 2.2, rot: 10 },
            { id: 9, src: '/asteroid_2.webp', bottom: '35%', right: '12%', size: '37px', delay: 2.8, rot: -120 },
            { id: 11, src: '/asteroid_2.webp', bottom: '10%', right: '32%', size: '43px', delay: 2.1, rot: -20 },
            { id: 13, src: '/asteroid_2.webp', bottom: '5%', right: '40%', size: '49px', delay: 0.6, rot: -10 }
          ].map((ast) => (
            <motion.img
              key={ast.id}
              src={ast.src}
              alt="Asteroid"
              className="absolute pointer-events-none opacity-60 z-[5]"
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
           {/* Red Dynamic Glow (Left / Kalceria) */}
           <motion.div 
             animate={{ opacity: [0.3, 0.5, 0.3] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-[-10%] left-[-15%] w-[60%] h-[120%] bg-red-600/30 blur-[130px] rounded-full will-change-transform"
           />
           {/* Cyan Dynamic Glow (Right / DSL) */}
           <motion.div 
             animate={{ opacity: [0.3, 0.5, 0.3] }}
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
             className="absolute top-[-10%] right-[-15%] w-[60%] h-[120%] bg-cyan-500/30 blur-[130px] rounded-full will-change-transform"
           />
        </div>

        {/* Static Star Wars Backdrop Focal Point */}
        <div 
          className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-full flex items-center justify-center z-[5] pointer-events-none"
          style={{ opacity: 0.7 }}
        >
          <Image
            src="/starwarr.webp" 
            alt="Battle of Heroes" 
            width={974}
            height={1024}
            sizes="(max-width: 768px) 100vw, 1152px"
            quality={75}
            loading="lazy"
            decoding="async"
            className={`w-full h-auto max-h-[85vh] object-contain ${isMobile ? "scale-[1.12]" : "scale-[1.82]"}`}
            style={{ 
              filter: "contrast(1.2) brightness(0.9) saturate(1.1) drop-shadow(0 0 80px rgba(0,0,0,0.8))",
            }}
          />
        </div>

        {/* Scattered Aurora Effect - TOP ATMOSPHERE */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          <AuroraParticles />
        </div>
        
        <div className="relative z-10 w-full max-w-6xl px-8 flex flex-col items-center gap-16">
           {/* Collaboration Header - Shifted 15% Under */}
           <div 
             className="flex items-center justify-center gap-6 md:gap-10"
             style={{ transform: `translateY(${isMobile ? "35%" : "15%"})` }}
           >
              {/* Kalceria Logo - Shifted 15% Under */}
              <motion.img 
                src="/logologin.webp" 
                alt="Kalceria" 
                className={`${isMobile ? "h-[58px]" : "h-18 md:h-24"} w-auto object-contain -rotate-[12deg] drop-shadow-[0_0_40px_rgba(255,0,0,0.6)] z-20 will-change-transform`}
                animate={{ y: isMobile ? [75, 69, 75] : [75, 69, 75], x: '20%' }}
                transition={{ 
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.8 }
                }}
              />

              {/* The "X" as an SVG Clipped Glass Artifact (Stabilized) */}
              <div 
                className="relative flex items-center justify-center group z-20"
                style={{ transform: `translateY(${isMobile ? "30%" : "0%"})` }}
              >
                 {/* X-Backglow */}
                 <div className="absolute inset-0 bg-white/10 blur-[40px] rounded-full scale-110 opacity-30 pointer-events-none" />

                 {/* Golden-Red Corona Dynamic Flare */}
                 <motion.div 
                   animate={{ scale: [1, 1.1, 1], rotate: [0, 360], opacity: [0.2, 0.4, 0.2] }}
                   transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                   className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] bg-gradient-to-tr from-amber-500 via-orange-600 to-red-700 opacity-40 z-0 will-change-transform ${isMobile ? "w-[144px] h-[144px]" : "w-[240px] md:w-[340px] h-[240px] md:h-[340px]"}`}
                 />

                 <svg width={isMobile ? "132" : "220"} height={isMobile ? "132" : "220"} viewBox="0 0 220 220" className="relative z-10 transform-gpu">
                    <defs>
                      <clipPath id="collab-x-clip-v3">
                        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize="160" fontWeight="950" style={{ fontFamily: 'Arial Black, sans-serif' }}>X</text>
                      </clipPath>
                    </defs>
                    
                    <g clipPath="url(#collab-x-clip-v3)">
                       {/* Glass Fill */}
                       <rect width="100%" height="100%" fill="rgba(255,255,255,0.18)" />
                       
                       {/* Internal Energy Blobs */}
                       <motion.circle 
                         animate={{ cx: [30, 190], cy: [30, 190], r: [45, 75, 45] }}
                         transition={{ duration: 6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                         fill="#FF00FF" style={{ filter: 'blur(35px)', opacity: 0.9 }}
                         className="will-change-[cx,cy]"
                       />
                       <motion.circle 
                         animate={{ cx: [190, 30], cy: [190, 30], r: [75, 45, 75] }}
                         transition={{ duration: 7, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                         fill="#FFD700" style={{ filter: 'blur(35px)', opacity: 0.9 }}
                         className="will-change-[cx,cy]"
                       />
                    </g>
                    
                    {/* HD Stroke */}
                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize="160" fontWeight="950" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" style={{ fontFamily: 'Arial Black, sans-serif' }}>X</text>
                 </svg>
              </div>

              {/* DSL Logo - Shifted 15% Under */}
              <motion.img 
                src="/dsl.webp" 
                alt="DSL" 
                className={`${isMobile ? "h-[58px]" : "h-18 md:h-24"} w-auto object-contain rotate-[12deg] drop-shadow-[0_0_40px_rgba(0,255,255,0.6)] z-20 will-change-transform`}
                animate={{ y: isMobile ? [64, 70, 64] : [69, 75, 69], x: '-20%' }}
                transition={{ 
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.8 }
                }}
              />
           </div>
           
           <div className="flex flex-col items-center gap-8">
              <motion.h2 
                initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, x: '4%', scale: 0.85, filter: "blur(0px)" }}
                viewport={{ once: false, amount: 0.5 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white text-center"
                style={{ 
                  textShadow: "2px 2px 0px #444, 4px 4px 0px #222, 0 0 30px rgba(255,255,255,0.2)"
                }}
              >
                JOIN US?
              </motion.h2>

              <motion.img 
                src="/wa_logo.webp" 
                alt="WhatsApp" 
                className="h-16 md:h-28 w-auto object-contain drop-shadow-[0_0_40px_rgba(37,211,102,0.5)] z-20"
                animate={{ y: [0, -6, 0], x: '22%' }}
                transition={{ 
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.8 }
                }}
              />

              <Link href="/journey" onClick={() => {
                sessionStorage.setItem("landingScrollTarget", "section-journey");
                sessionStorage.setItem("landingScrollY", window.scrollY);
              }}>
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 40px rgba(255,255,255,0.3), inset 0 0 20px rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(255,255,255,0.15)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="relative mt-4 ml-6 md:ml-10 z-30 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-black uppercase tracking-tighter text-xl md:text-3xl px-8 py-4 md:px-12 md:py-5 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors duration-300"
                >
                  {/* Peach Blob */}
                  <motion.div 
                    animate={{ x: [0, 30, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-8 -left-4 w-24 h-24 bg-[#FFB07C] rounded-full blur-[24px] opacity-70 z-0 pointer-events-none"
                  />
                  {/* Green Blob */}
                  <motion.div 
                    animate={{ x: [0, -30, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-8 -right-4 w-24 h-24 bg-green-400 rounded-full blur-[24px] opacity-60 z-0 pointer-events-none"
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
        </div>
      </section>

      {/* ── Section 9: The Legacy ── */}
      <section id="section-minigame" className="relative w-full aspect-square bg-[#02040a] flex flex-col items-center justify-center z-50 overflow-hidden border-t border-slate-900">
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

        {/* Dynamic Comet Effect - Replacing Portal */}
        <CometEffect />
 
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
          className="relative z-30 flex flex-col items-center text-center gap-12"
          style={{ transform: `translateY(${isMobile ? "120%" : "0%"})` }}
        >
          {isMobile && (
            <motion.img 
              src="/hp/astronaut_hp.webp" 
              alt="Astronaut Mobile" 
              className="absolute bottom-[135%] left-1/2 -translate-x-1/2 w-[420px] h-auto object-contain z-10 pointer-events-none"
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

           {/* The Box - Clean Rounded Rectangle, Hover Only Affects Rectangle */}
           <motion.button
             onClick={onOpenIdeaModal}
             whileTap={{ scale: 0.95 }}
             className="relative group cursor-pointer z-40 focus:outline-none"
           >
              <div className="relative w-48 md:w-[240px] py-4 md:py-6 bg-white/8 backdrop-blur-3xl border border-white/15 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] group-hover:bg-white/12 group-hover:border-white/25 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-500 flex items-center justify-center">
                {/* Glassmorphism Blobs - always visible, subtle */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 group-hover:opacity-30 transition-opacity duration-500">
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
