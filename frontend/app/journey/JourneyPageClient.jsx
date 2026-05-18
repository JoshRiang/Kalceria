"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JourneySection4 from '../../components/JourneySection4';
import JourneySectionTitle from '../../components/JourneySectionTitle';
import JourneyRightHalf, { JourneySlider, JourneyDescriptionBox } from '../../components/JourneyRightHalf';

export default function JourneyPageClient() {
  const [isIntroActive, setIsIntroActive] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "KALCERIA'S JOURNEY";

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
        // Wait longer after typing for a more cinematic feel
        setTimeout(() => setIsIntroActive(false), 2000);
      }
    }, 100);

    return () => clearInterval(typingInterval);
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
              animate={{ opacity: 0.7, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                opacity: { duration: 3, ease: "easeInOut" },
                scale: { duration: 5, ease: "easeOut" }
              }}
              className="absolute inset-0 z-0 grayscale contrast-[1.2] brightness-[0.8]"
            >
              <video 
                src="/vid_abt1.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover"
              />
            </motion.div>

            <h1
              className="relative z-10 text-[6rem] md:text-[14.5rem] font-black tracking-tighter text-white font-rog whitespace-nowrap"
              style={{ 
                WebkitTextStroke: "2px rgba(255,255,255,0.4)",
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
              {displayedText}
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Blur Effect */}
      <div 
        className={`transition-all duration-[1500ms] cubic-bezier(0.16, 1, 0.3, 1) ${isIntroActive ? 'blur-[60px] scale-[1.02]' : 'blur-0 scale-100'}`}
        style={{ pointerEvents: isIntroActive ? 'none' : 'auto' }}
      >
        {/* Section 1 - Left Half */}
        <section className={`relative w-full h-screen bg-no-repeat flex items-start pt-[7vh] ${isMobile ? "bg-[url('/hp/bgj_1_hp.webp')] bg-cover bg-center flex-col pt-[8vh]" : "bg-[url('/bgj_1.webp')] bg-[length:100%_100%]"}`}>
          <div className={`container mx-auto px-6 md:px-12 ${isMobile ? "flex flex-col items-center" : ""}`}>
            <div className={`relative flex items-center ${isMobile ? "justify-center mx-auto" : ""}`}>
              {/* Glass Box Layer */}
              <div className={`relative overflow-hidden w-fit py-4 md:py-6 pl-8 md:pl-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_12px_40px_rgba(0,0,0,0.4)] ${isMobile ? "pr-[160px]" : "pr-[120px] md:pr-[196px]"}`}>
                {/* Dynamic Blobs */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                  <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[#FF00FF] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
                  <div className="absolute bottom-[-50%] right-[-10%] w-[120%] h-[200%] bg-[#FFD700] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                </div>
                <JourneySectionTitle text="WITH" align="left" delay={500} />
              </div>

              {/* Logo Layer (Independent) */}
              <img 
                src="/se1.webp" 
                alt="SE1" 
                className={`absolute top-[33%] z-20 h-24 md:h-32 object-contain pointer-events-none drop-shadow-2xl origin-left ${isMobile ? "left-[180px]" : "left-[145px] md:left-[228px]"}`} 
                style={{ transform: isMobile ? "translateY(-50%) translateX(-30%) scale(0.82)" : "translateY(-50%) translateX(-20%) scale(0.90)" }}
              />
            </div>

            {/* Mobile Stack for Section 1 */}
            {isMobile && (
              <div className="w-full flex flex-col items-center gap-6 mt-12 z-30">
                <JourneySlider images={['/mist_1.webp', '/mist_1.webp']} className="max-w-[280px]" />
                <JourneyDescriptionBox 
                  description="Mist is a legendary entity in the underground automotive scene, bringing unparalleled style and performance." 
                  delay={1000} 
                  className="max-w-[320px]"
                />
              </div>
            )}
          </div>

          {!isMobile && (
            <JourneyRightHalf 
              images={['/mist_1.webp', '/mist_1.webp']} 
              description="Mist is a legendary entity in the underground automotive scene, bringing unparalleled style and performance." 
              delay={1000} 
              className="absolute right-0 md:right-[5%] top-[7vh] w-1/2"
            />
          )}
        </section>

        {/* Section 2 */}
        <section className={`relative w-full h-screen bg-no-repeat flex flex-col items-start pt-[8vh] overflow-hidden ${isMobile ? "bg-[url('/hp/bgj_2_hp.webp')] bg-cover bg-center pt-[2vh]" : "bg-[url('/bgj_2.webp')] bg-[length:100%_100%]"}`}>
          <div className={`container mx-auto px-6 md:px-12 relative z-20 ${isMobile ? "flex flex-col items-center" : ""}`}>
            <div className={`flex flex-col md:flex-row justify-start items-start w-full gap-8 ${isMobile ? "items-center" : ""}`}>
              <div className={`relative flex items-center ${isMobile ? "justify-center mx-auto" : ""}`}>
                {/* Glass Box Layer */}
                <div className={`relative overflow-hidden w-fit py-4 md:py-6 pl-8 md:pl-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_12px_40px_rgba(0,0,0,0.4)] ${isMobile ? "pr-[138px]" : "pr-[90px] md:pr-[177px]"}`}>
                  {/* Dynamic Blobs */}
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                    <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[#FF00FF] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-[-50%] right-[-10%] w-[120%] h-[200%] bg-[#FFD700] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                  </div>
                  <JourneySectionTitle text="WITH" align="left" delay={500} />
                </div>

                {/* Logo Layer (Independent) */}
                <img 
                  src="/se2.webp" 
                  alt="SE2" 
                  className={`absolute top-[47%] z-20 h-24 md:h-32 object-contain pointer-events-none drop-shadow-2xl ${isMobile ? "left-[158px]" : "left-[160px] md:left-[215px]"}`} 
                  style={{ transform: isMobile ? "translateY(-50%) translateX(-15%) scale(0.85)" : "translateY(-50%) translateX(-5%)" }}
                />
              </div>

              {/* Description Box exactly beside WITH box */}
              <JourneyDescriptionBox 
                description="We partner with Universitas Indonesia Motorsport to deliver high-octane experiences and unparalleled performance." 
                delay={1200} 
                className="hidden md:flex" 
              />
            </div>

            {/* Mobile Stack for Section 2 */}
            {isMobile ? (
              <div className="w-full flex flex-col items-center gap-6 mt-6 z-30">
                <JourneySlider 
                  images={['/uims_1.webp', '/uims_2.webp']} 
                  className="max-w-[280px]"
                />
                <JourneyDescriptionBox 
                  description="We partner with Universitas Indonesia Motorsport to deliver high-octane experiences and unparalleled performance." 
                  delay={1200} 
                  className="max-w-[320px]" 
                />
              </div>
            ) : (
              /* Photocard Box under WITH box */
              <div className="w-full mt-6 ml-0 relative z-30">
                <JourneySlider 
                  images={['/uims_1.webp', '/uims_2.webp']} 
                  className="max-w-[400px] aspect-square"
                />
              </div>
            )}
          </div>
        </section>

        {/* Section 3 - Left Half */}
        <section className={`relative w-full h-screen bg-no-repeat flex items-start pt-[12vh] ${isMobile ? "bg-[url('/hp/bgj_3_hp.webp')] bg-cover bg-center flex-col pt-[8vh]" : "bg-[url('/bgj_3.webp')] bg-[length:100%_100%]"}`}>
          <div className={`container mx-auto px-6 md:px-12 ${isMobile ? "flex flex-col items-center" : ""}`}>
            <div className={`relative flex items-center ${isMobile ? "justify-center mx-auto" : ""}`}>
              {/* Glass Box Layer (Sized for both WITH and DSL area) */}
              <div className={`relative overflow-hidden w-fit py-4 md:py-6 pl-8 md:pl-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${isMobile ? "pr-[151px]" : "pr-[140px] md:pr-[260px]"}`}>
                {/* Dynamic Blobs */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                  <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[#FF00FF] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
                  <div className="absolute bottom-[-50%] right-[-10%] w-[120%] h-[200%] bg-[#FFD700] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                </div>
                <JourneySectionTitle text="WITH" align="left" delay={500} />
              </div>
              
              {/* Logo Layer (Independent of Box Layout) */}
              <img 
                src="/dsl.webp" 
                alt="DSL" 
                className={`absolute top-[44%] z-20 h-20 md:h-32 object-contain pointer-events-none drop-shadow-2xl origin-left ${isMobile ? "left-[118px]" : "left-[114px] md:left-[168px]"}`} 
                style={{ transform: isMobile ? "translateY(-50%) translateX(-2%) scale(0.82)" : "translateY(-50%) scale(0.90)" }}
              />
            </div>

            {/* Mobile Stack for Section 3 */}
            {isMobile && (
              <div className="w-full flex flex-col items-center gap-6 mt-12 z-30">
                <JourneySlider images={['/dsl_1.webp', '/dsl_2.webp', '/dsl_3.webp', '/dsl_4.webp', '/dsl_5.webp']} className="max-w-[280px]" />
                <JourneyDescriptionBox 
                  description="Dream Shift Labs pioneers the digital frontier of automotive culture, crafting immersive experiences that transcend reality." 
                  delay={1400} 
                  className="max-w-[320px]"
                />
              </div>
            )}
          </div>

          {!isMobile && (
            <JourneyRightHalf 
              images={['/dsl_1.webp', '/dsl_2.webp', '/dsl_3.webp', '/dsl_4.webp', '/dsl_5.webp']} 
              description="Dream Shift Labs pioneers the digital frontier of automotive culture, crafting immersive experiences that transcend reality." 
              delay={1400} 
            />
          )}
        </section>

        {/* Section 4 */}
        <JourneySection4 isMobile={isMobile} />
      </div>
    </main>
  );
}
