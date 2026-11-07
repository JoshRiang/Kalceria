"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { AuroraParticles } from "../particles";

export function ClosingJoinUsSection({ isMobile }) {
  return (
    <section id="section-journey" className="relative w-full min-h-[75vh] flex flex-col items-center justify-center py-20 z-50 border-t border-slate-900 overflow-hidden bg-black isolation-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "850px" }}>
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
              className="absolute top-[-15%] left-[-20%] w-[70%] h-[130%] rounded-full will-change-transform"
              style={{ background: "radial-gradient(ellipse closest-side, rgba(220,38,38,0.42) 0%, rgba(220,38,38,0.16) 48%, transparent 100%)" }}
            />
            {/* Cyan Dynamic Glow (Right / DSL) */}
            <motion.div 
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
              className="absolute top-[-15%] right-[-20%] w-[70%] h-[130%] rounded-full will-change-transform"
              style={{ background: "radial-gradient(ellipse closest-side, rgba(6,182,212,0.42) 0%, rgba(6,182,212,0.16) 48%, transparent 100%)" }}
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

             {/* The "X" in MIDDLE - Semi-transparent with pink & golden blobs strictly inside the X */}
             <div className="relative flex items-center justify-center py-1">
               <svg width="48" height="48" viewBox="0 0 100 100" className="w-10 h-10 relative z-10 select-none pointer-events-none drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]">
                 <defs>
                   <clipPath id="xClipMobile">
                     <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="85" fontWeight="950" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                       X
                     </text>
                   </clipPath>
                   <radialGradient id="pinkBlobMobile" cx="28%" cy="28%" r="48%">
                     <stop offset="0%" stopColor="#FF00FF" stopOpacity="0.95" />
                     <stop offset="60%" stopColor="#FF00FF" stopOpacity="0.55" />
                     <stop offset="100%" stopColor="#FF00FF" stopOpacity="0" />
                   </radialGradient>
                   <radialGradient id="goldBlobMobile" cx="72%" cy="72%" r="48%">
                     <stop offset="0%" stopColor="#FFD700" stopOpacity="0.95" />
                     <stop offset="60%" stopColor="#FFD700" stopOpacity="0.55" />
                     <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                   </radialGradient>
                 </defs>

                 {/* Blobs & base fill strictly inside X */}
                 <g clipPath="url(#xClipMobile)">
                   <rect width="100" height="100" fill="rgba(255,255,255,0.45)" />
                   <rect width="100" height="100" fill="url(#pinkBlobMobile)" />
                   <rect width="100" height="100" fill="url(#goldBlobMobile)" />
                 </g>

                 {/* Clean semi-transparent outline stroke */}
                 <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="85" fontWeight="950" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" style={{ fontFamily: 'Arial Black, sans-serif' }}>
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

             {/* The "X" - 15% bigger, semi-transparent, pink and golden blobs strictly inside the X */}
             <div className="relative flex items-center justify-center px-1">
               <svg width="80" height="80" viewBox="0 0 100 100" className="w-16 h-16 sm:w-[70px] sm:h-[70px] md:w-[74px] md:h-[74px] lg:w-20 lg:h-20 relative z-10 select-none pointer-events-none drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]">
                 <defs>
                   <clipPath id="xClipDesktop">
                     <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="85" fontWeight="950" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                       X
                     </text>
                   </clipPath>
                   <radialGradient id="pinkBlobDesktop" cx="28%" cy="28%" r="48%">
                     <stop offset="0%" stopColor="#FF00FF" stopOpacity="0.95" />
                     <stop offset="60%" stopColor="#FF00FF" stopOpacity="0.55" />
                     <stop offset="100%" stopColor="#FF00FF" stopOpacity="0" />
                   </radialGradient>
                   <radialGradient id="goldBlobDesktop" cx="72%" cy="72%" r="48%">
                     <stop offset="0%" stopColor="#FFD700" stopOpacity="0.95" />
                     <stop offset="60%" stopColor="#FFD700" stopOpacity="0.55" />
                     <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                   </radialGradient>
                 </defs>

                 {/* Blobs & base fill strictly inside X */}
                 <g clipPath="url(#xClipDesktop)">
                   <rect width="100" height="100" fill="rgba(255,255,255,0.45)" />
                   <rect width="100" height="100" fill="url(#pinkBlobDesktop)" />
                   <rect width="100" height="100" fill="url(#goldBlobDesktop)" />
                 </g>

                 {/* Clean semi-transparent outline stroke */}
                 <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="85" fontWeight="950" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" style={{ fontFamily: 'Arial Black, sans-serif' }}>
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
         
         {/* 2. JOIN US - Dead center aligned, 2D parent title typography */}
         <motion.h2 
           initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
           whileInView={{ opacity: 1, y: 0, x: 0, filter: "blur(0px)" }}
           viewport={{ once: false, amount: 0.5 }}
           transition={{ duration: 1, ease: "easeOut" }}
           className="w-full max-w-2xl mx-auto text-center text-5xl sm:text-7xl md:text-8xl font-mono font-black uppercase tracking-tighter text-white select-none"
         >
           JOIN US
         </motion.h2>

         {/* Small Arial, not all capital, not bold 2-line description */}
         <p className="font-sans text-xs sm:text-sm font-normal text-white/80 max-w-[300px] sm:max-w-[380px] mx-auto leading-relaxed -mt-1 sm:-mt-2 z-20 select-none">
           Connect with our community headquarters directly.<br />Tap the WhatsApp icon below to start a chat.
         </p>

         {/* 3. WhatsApp Logo - Dead center aligned */}
         <a 
           href="https://wa.me/628111" 
           target="_blank" 
           rel="noopener noreferrer"
           className="z-20 inline-block focus:outline-none"
           aria-label="Connect via WhatsApp"
         >
           <motion.img 
             src="/wa_logo.webp" 
             alt="WhatsApp" 
             className="h-14 sm:h-16 md:h-20 w-auto object-contain drop-shadow-[0_0_35px_rgba(37,211,102,0.5)] cursor-pointer hover:scale-105 transition-transform"
             animate={{ y: [0, -6, 0] }}
             transition={{ 
               y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
             }}
           />
         </a>

         {/* 4. See The Journey Button - Exact Get to Know More Style & Behaviour */}
          <Link href="/journey" onClick={() => {
            sessionStorage.setItem("introPlayed", "true");
            sessionStorage.setItem("landingSeen", "true");
            sessionStorage.setItem("landingScrollTarget", "section-journey");
            sessionStorage.setItem("landingScrollY", window.scrollY);
          }} className="z-30 inline-block focus:outline-none">
            <button
              type="button"
              className="relative px-8 md:px-10 py-2.5 md:py-3.5 font-sans font-extrabold uppercase tracking-wide text-[13px] md:text-[15px] text-black bg-white transition-all hover:bg-[#FF00FF] hover:text-white group shadow-[0_0_20px_rgba(255,255,255,0.1)] focus-polygon focus-visible:outline-none cursor-pointer"
              style={{ clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" }}
            >
              <span className="relative z-10">SEE THE JOURNEY</span>
              <div className="absolute inset-0 bg-[#050a14] scale-x-0 origin-right group-hover:scale-x-100 transition-transform duration-300 ease-out z-0" />
            </button>
          </Link>
      </div>
    </section>
  );
}
