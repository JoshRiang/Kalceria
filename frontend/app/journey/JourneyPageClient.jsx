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
        <section className="relative w-full h-screen bg-[url('/bgj_1.png')] bg-[length:100%_100%] bg-no-repeat flex items-start pt-[7vh]">
          <div className="container mx-auto px-6 md:px-12">
            <div className="relative flex items-center">
              {/* Glass Box Layer */}
              <div className="relative overflow-hidden w-fit py-4 md:py-6 pl-8 md:pl-12 pr-[120px] md:pr-[220px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                {/* Dynamic Blobs */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                  <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[#FF00FF] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
                  <div className="absolute bottom-[-50%] right-[-10%] w-[120%] h-[200%] bg-[#FFD700] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                </div>
                <JourneySectionTitle text="WITH" align="left" delay={500} />
              </div>

              {/* Logo Layer (Independent) */}
              <img 
                src="/se1.png" 
                alt="SE1" 
                className="absolute left-[145px] md:left-[185px] top-[33%] -translate-y-1/2 z-20 h-24 md:h-32 object-contain pointer-events-none drop-shadow-2xl scale-[0.90] origin-left" 
              />
            </div>
          </div>

          <JourneyRightHalf 
            images={['/mist_1.jpeg', '/mist_1.jpeg']} 
            description="Mist is a legendary entity in the underground automotive scene, bringing unparalleled style and performance." 
            delay={1000} 
            className="absolute right-0 md:right-[5%] top-[7vh] w-1/2"
          />
        </section>

        <section className="relative w-full h-screen bg-[url('/bgj_2.png')] bg-[length:100%_100%] bg-no-repeat flex flex-col items-start pt-[20vh] overflow-hidden">
          <div className="container mx-auto px-6 md:px-12 relative z-20">
            <div className="flex flex-col md:flex-row justify-start items-start w-full gap-8">
              <div className="relative flex items-center">
                {/* Glass Box Layer */}
                <div className="relative overflow-hidden w-fit py-4 md:py-6 pl-8 md:pl-12 pr-[90px] md:pr-[180px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                  {/* Dynamic Blobs */}
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                    <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[#FF00FF] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-[-50%] right-[-10%] w-[120%] h-[200%] bg-[#FFD700] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                  </div>
                  <JourneySectionTitle text="WITH" align="left" delay={500} />
                </div>

                {/* Logo Layer (Independent) */}
                <img 
                  src="/se2.png" 
                  alt="SE2" 
                  className="absolute left-[160px] md:left-[230px] top-[47%] -translate-y-1/2 z-20 h-24 md:h-32 object-contain pointer-events-none drop-shadow-2xl" 
                />
              </div>

              {/* Description Box exactly beside WITH box */}
              <JourneyDescriptionBox 
                description="We partner with Universitas Indonesia Motorsport to deliver high-octane experiences and unparalleled performance." 
                delay={1200} 
                className="hidden md:flex" 
              />
            </div>

            {/* Photocard Box under WITH box */}
            <div className="w-full mt-6 ml-0 relative z-30">
              <JourneySlider 
                images={['/uims_1.jpeg', '/uims_2.jpeg']} 
                className="max-w-[400px] aspect-square"
              />
            </div>
          </div>
        </section>

        {/* Section 3 - Left Half */}
        <section className="relative w-full h-screen bg-[url('/bgj_3.png')] bg-[length:100%_100%] bg-no-repeat flex items-start pt-[12vh]">
          <div className="container mx-auto px-6 md:px-12">
            <div className="relative flex items-center">
              {/* Glass Box Layer (Sized for both WITH and DSL area) */}
              <div className="relative overflow-hidden w-fit py-4 md:py-6 pl-8 md:pl-12 pr-[140px] md:pr-[260px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                {/* Dynamic Blobs */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                  <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[#FF00FF] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s' }} />
                  <div className="absolute bottom-[-50%] right-[-10%] w-[120%] h-[200%] bg-[#FFD700] rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                </div>
                <JourneySectionTitle text="WITH" align="left" delay={500} />
              </div>
              
              {/* Logo Layer (Independent of Box Layout) */}
              <img 
                src="/dsl.png" 
                alt="DSL" 
                className="absolute left-[114px] md:left-[168px] top-[44%] -translate-y-1/2 z-20 h-20 md:h-32 object-contain pointer-events-none drop-shadow-2xl scale-[0.90] origin-left" 
              />
            </div>
          </div>

          <JourneyRightHalf 
            images={['/dsl_1.jpeg', '/dsl_2.jpeg', '/dsl_3.jpeg', '/dsl_4.jpeg', '/dsl_5.jpeg']} 
            description="Dream Shift Labs pioneers the digital frontier of automotive culture, crafting immersive experiences that transcend reality." 
            delay={1400} 
          />
        </section>

        {/* Section 4 */}
        <JourneySection4 />
      </div>
    </main>
  );
}
