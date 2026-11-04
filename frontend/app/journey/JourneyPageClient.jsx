"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useIsMobileViewport, useIsMobileOrTabletViewport } from '@/hooks/useIsMobileViewport';
import JourneySection4 from '../../components/JourneySection4';
import JourneyRightHalf, { JourneySlider, JourneyDescriptionBox } from '../../components/JourneyRightHalf';

export default function JourneyPageClient() {
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "KALCERIA'S JOURNEY";

  // Flip states for the 3 partner segments above "WAITING FOR YOU"
  const [isFlipped1, setIsFlipped1] = useState(false);
  const [isFlipped2, setIsFlipped2] = useState(false);
  const [isFlipped3, setIsFlipped3] = useState(false);

  const isMobile = useIsMobileViewport();
  const isMobileOrTablet = useIsMobileOrTabletViewport();

  useEffect(() => {
    window.scrollTo(0, 0);
    
    let i = 0;
    let introTimeout;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
        // Wait longer after typing for a more cinematic feel
        introTimeout = setTimeout(() => setIsIntroActive(false), 2000);
      }
    }, 100);

    return () => {
      clearInterval(typingInterval);
      if (introTimeout) clearTimeout(introTimeout);
    };
  }, []);

  return (
    <main className="relative w-full bg-black min-h-screen overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slider-sequence-5 {
          0%, 15% { transform: translateX(0%); }
          20%, 35% { transform: translateX(-20%); }
          40%, 55% { transform: translateX(-40%); }
          60%, 75% { transform: translateX(-60%); }
          80%, 95% { transform: translateX(-80%); }
          100% { transform: translateX(0%); }
        }
        .animate-slider-5 { animation: slider-sequence-5 25s infinite; }
        
        @keyframes slider-sequence-3 {
          0%, 25% { transform: translateX(0%); }
          33%, 58% { transform: translateX(-33.333%); }
          66%, 91% { transform: translateX(-66.666%); }
          100% { transform: translateX(0%); }
        }
        .animate-slider-3 { animation: slider-sequence-3 15s infinite; }

        @keyframes slider-sequence-2 {
          0%, 40% { transform: translateX(0%); }
          50%, 90% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        .animate-slider-2 { animation: slider-sequence-2 10s infinite; }
      `}} />

      {/* Intro Animation Layer */}
      <AnimatePresence>
        {isIntroActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none bg-black/80 backdrop-blur-3xl overflow-hidden"
          >
            {/* Marvel-style Background Video */}
            <motion.div 
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: isMobile ? 0.5 : 0.7, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                opacity: { duration: 2.5, ease: "easeInOut" },
                scale: { duration: 4, ease: "easeOut" }
              }}
              className="absolute inset-0 z-0 grayscale contrast-[1.2] brightness-[0.8]"
            >
              <video 
                src="/vid_abt1.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline 
                preload="metadata"
                className="w-full h-full object-cover"
              />
            </motion.div>

            <h1
              className="relative z-10 text-6xl xs:text-7xl sm:text-8xl md:text-[14.5rem] font-black tracking-tighter text-white font-rog flex flex-col md:flex-row items-center justify-center text-center gap-2 md:gap-6 px-4"
              style={{ 
                WebkitTextStroke: isMobile ? "1.5px rgba(255,255,255,0.4)" : "2px rgba(255,255,255,0.4)",
                textShadow: `
                  0px 1px 0px #999, 
                  0px 2px 0px #888, 
                  0px 3px 0px #777, 
                  0px 4px 0px #666, 
                  0px 5px 0px #555, 
                  0px 6px 0px #444, 
                  0px 7px 0px #333, 
                  0px 8px 20px rgba(0,0,0,0.9),
                  0px 15px 30px rgba(0,0,0,0.5)
                `
              }}
            >
              {isMobile ? (
                <>
                  <span>{displayedText.includes(" ") ? displayedText.split(" ")[0] : displayedText}</span>
                  {displayedText.includes(" ") && (
                    <span>{displayedText.split(" ").slice(1).join(" ")}</span>
                  )}
                </>
              ) : (
                <span>{displayedText}</span>
              )}
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Blur Effect */}
      <div 
        className={`transition-all duration-[1500ms] cubic-bezier(0.16, 1, 0.3, 1) ${isIntroActive ? 'blur-[60px] scale-[1.02]' : 'blur-0 scale-100'}`}
        style={{ pointerEvents: isIntroActive ? 'none' : 'auto' }}
      >
        {/* Section 1 - Mist */}
        <section className={`relative w-full h-screen flex items-center justify-center overflow-hidden ${isMobileOrTablet ? "flex-col justify-center pt-0" : "pt-[7vh]"}`}>
          {/* Background Layer with Graceful Blur / Unblur */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out pointer-events-none"
            style={{
              backgroundImage: isMobileOrTablet ? "url('/hp/bgj_1_hp_arcade.webp')" : "url('/bgj_1_arcade.webp')",
              filter: isFlipped1 ? "blur(18px) brightness(0.82)" : "blur(0px) brightness(1)",
              transform: isFlipped1 ? "scale(1.05)" : "scale(1)",
              willChange: "filter, transform",
            }}
          />
          <div
            className="absolute inset-0 bg-black/35 transition-opacity duration-700 pointer-events-none"
            style={{ opacity: isFlipped1 ? 1 : 0 }}
          />

          <div className="container mx-auto px-6 md:px-12 flex flex-col items-center justify-center relative z-20">
            {/* Center Stack for Mobile and iPad / Tablet Family */}
            {isMobileOrTablet && (
              <div className="w-full flex flex-col items-center justify-center gap-3 sm:gap-4 z-30">
                <JourneySlider 
                  logo="/se1.webp" 
                  logoAlt="Mist" 
                  images={['/mist_1.webp', '/mist_1.webp']} 
                  isFlipped={isFlipped1}
                  onToggleFlip={setIsFlipped1}
                  className={isMobile ? "max-w-[280px]" : "max-w-[360px]"} 
                />
                <JourneyDescriptionBox 
                  description="Mist is a legendary entity in the underground automotive scene, bringing unparalleled style and performance." 
                  isFlipped={isFlipped1}
                  className={isMobile ? "max-w-[340px]" : "max-w-[480px]"} 
                />
              </div>
            )}
          </div>

          {!isMobileOrTablet && (
            <JourneyRightHalf 
              logo="/se1.webp"
              logoAlt="Mist"
              images={['/mist_1.webp', '/mist_1.webp']} 
              isFlipped={isFlipped1}
              onToggleFlip={setIsFlipped1}
              description="Mist is a legendary entity in the underground automotive scene, bringing unparalleled style and performance." 
              delay={1000} 
              className="absolute right-0 xl:right-[5%] top-[7vh] w-1/2"
            />
          )}
        </section>

        {/* Section 2 - UI Racing Team */}
        <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Background Layer with Graceful Blur / Unblur */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out pointer-events-none"
            style={{
              backgroundImage: isMobileOrTablet ? "url('/hp/bgj_2_hp.webp')" : "url('/bgj_2.webp')",
              filter: isFlipped2 ? "blur(18px) brightness(0.82)" : "blur(0px) brightness(1)",
              transform: isFlipped2 ? "scale(1.05)" : "scale(1)",
              willChange: "filter, transform",
            }}
          />
          <div
            className="absolute inset-0 bg-black/35 transition-opacity duration-700 pointer-events-none"
            style={{ opacity: isFlipped2 ? 1 : 0 }}
          />

          <div className="container mx-auto px-6 md:px-12 relative z-20 flex flex-col items-center">
            <div className="w-full flex flex-col items-center justify-center gap-3 sm:gap-4 z-30">
              <JourneySlider 
                logo="/se2.webp" 
                logoAlt="UI Racing Team" 
                images={['/uims_1.webp', '/uims_2.webp']} 
                isFlipped={isFlipped2}
                onToggleFlip={setIsFlipped2}
                className={isMobile ? "max-w-[280px]" : "max-w-[360px]"}
              />
              <JourneyDescriptionBox 
                description="We partner with Universitas Indonesia Motorsport to deliver high-octane experiences and unparalleled performance." 
                isFlipped={isFlipped2}
                className={isMobile ? "max-w-[340px]" : "max-w-[480px]"} 
              />
            </div>
          </div>
        </section>

        {/* Section 3 - Dream Shift Labs */}
        <section className={`relative w-full h-screen flex items-center justify-center overflow-hidden ${isMobileOrTablet ? "flex-col justify-center pt-0" : "pt-[7vh]"}`}>
          {/* Background Layer with Graceful Blur / Unblur */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out pointer-events-none"
            style={{
              backgroundImage: isMobileOrTablet ? "url('/hp/bgj_3_hp_arcade.webp')" : "url('/bgj_3.webp')",
              filter: isFlipped3 ? "blur(18px) brightness(0.82)" : "blur(0px) brightness(1)",
              transform: isFlipped3 ? "scale(1.05)" : "scale(1)",
              willChange: "filter, transform",
            }}
          />
          <div
            className="absolute inset-0 bg-black/35 transition-opacity duration-700 pointer-events-none"
            style={{ opacity: isFlipped3 ? 1 : 0 }}
          />

          <div className="container mx-auto px-6 md:px-12 flex flex-col items-center justify-center relative z-20">
            {/* Center Stack for Mobile and iPad / Tablet Family */}
            {isMobileOrTablet && (
              <div className="w-full flex flex-col items-center justify-center gap-3 sm:gap-4 z-30">
                <JourneySlider 
                  logo="/dsl.webp" 
                  logoAlt="Dream Shift Labs" 
                  images={['/dsl_1.webp', '/dsl_2.webp', '/dsl_3.webp', '/dsl_4.webp', '/dsl_5.webp']} 
                  isFlipped={isFlipped3}
                  onToggleFlip={setIsFlipped3}
                  className={isMobile ? "max-w-[280px]" : "max-w-[360px]"} 
                />
                <JourneyDescriptionBox 
                  description="Dream Shift Labs pioneers the digital frontier of automotive culture, crafting immersive experiences that transcend reality." 
                  isFlipped={isFlipped3}
                  className={isMobile ? "max-w-[340px]" : "max-w-[480px]"}
                />
              </div>
            )}
          </div>

          {!isMobileOrTablet && (
            <JourneyRightHalf 
              logo="/dsl.webp"
              logoAlt="Dream Shift Labs"
              images={['/dsl_1.webp', '/dsl_2.webp', '/dsl_3.webp', '/dsl_4.webp', '/dsl_5.webp']} 
              isFlipped={isFlipped3}
              onToggleFlip={setIsFlipped3}
              description="Dream Shift Labs pioneers the digital frontier of automotive culture, crafting immersive experiences that transcend reality." 
              className="absolute right-0 xl:right-[5%] top-[7vh] w-1/2"
            />
          )}
        </section>

        {/* Section 4 */}
        <JourneySection4 isMobile={isMobile} />
      </div>
    </main>
  );
}
