"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const Typewriter = ({ text, speed = 50, delay = 0, className, style }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) {
          setDisplayed(text.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return <span className={className} style={style}>{displayed}</span>;
};

// Generate deterministic particles to avoid hydration mismatch
const generateParticles = () => {
  const particles = [];
  for (let i = 0; i < 40; i++) {
    const size = (i * 7 % 4) + 2;
    const top = (i * 13 % 100);
    const left = (i * 17 % 100);
    const opacity = (i * 11 % 50) / 100 + 0.3;
    const duration = (i * 19 % 15) + 10;
    const delay = (i * 23 % 10);
    const isCyan = i % 2 === 0;
    particles.push({ id: i, size, top, left, opacity, duration, delay, isCyan });
  }
  return particles;
};

const particles = generateParticles();

export default function JourneySection4() {
  return (
    <section className="relative w-full min-h-screen bg-[#050505] overflow-hidden flex flex-col md:flex-row items-center justify-center pt-20 pb-20">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob-float {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes particle-float {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        @keyframes slider-sequence {
          0%, 33.33% { transform: translateX(0%); }
          50%, 83.33% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        @keyframes fade-fitra {
          0%, 33.33% { opacity: 1; transform: translateY(0) rotate(-30deg); }
          41.66%, 91.66% { opacity: 0; transform: translateY(15px) rotate(-30deg); }
          100% { opacity: 1; transform: translateY(0) rotate(-30deg); }
        }
        @keyframes fade-mobi {
          0%, 41.66% { opacity: 0; transform: translateY(15px) rotate(-30deg); }
          50%, 83.33% { opacity: 1; transform: translateY(0) rotate(-30deg); }
          91.66%, 100% { opacity: 0; transform: translateY(15px) rotate(-30deg); }
        }
        .animate-blob {
          animation: blob-float 15s infinite alternate ease-in-out;
        }
        .animate-slider {
          animation: slider-sequence 12s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .animate-text-fitra {
          animation: fade-fitra 12s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .animate-text-mobi {
          animation: fade-mobi 12s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}} />
      
      {/* Dynamic Blobs */}
      <div className="absolute top-[10%] left-[20%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-cyan-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-70 animate-blob" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[10%] right-[10%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] bg-amber-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-70 animate-blob" style={{ animationDelay: '-5s' }}></div>
      <div className="absolute top-[40%] left-[40%] -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-cyan-400/10 rounded-full mix-blend-screen filter blur-[120px] opacity-60 animate-blob" style={{ animationDelay: '-10s' }}></div>

      {/* Micro Particles */}
      <div className="absolute inset-0 z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`absolute rounded-full ${p.isCyan ? 'bg-cyan-400' : 'bg-amber-400'}`}
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              top: `${p.top}%`,
              left: `${p.left}%`,
              opacity: p.opacity,
              animation: `particle-float ${p.duration}s linear infinite`,
              animationDelay: `-${p.delay}s`,
              boxShadow: `0 0 ${p.size * 2}px ${p.isCyan ? '#22d3ee' : '#fbbf24'}`
            }}
          />
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-20 container mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-12">
        
        {/* Left Half: Title & Description */}
        <div className="w-full md:w-1/2 flex flex-col justify-center text-left py-12 md:py-0">
          <div className="relative mb-6 w-full group">
            {/* Surfer Image Floating above/around Title */}
            <motion.img 
              src="/surfer.png" 
              alt="Surfer"
              className="absolute -top-[230%] left-[0%] md:left-[5%] h-[244%] z-20 object-contain drop-shadow-[0_10px_30px_rgba(34,211,238,0.4)] pointer-events-none"
              animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-left text-white drop-shadow-2xl font-rog relative z-10" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}>
              <Typewriter text="WAITING FOR YOU" delay={500} speed={80} />
            </h1>
          </div>
          
          <div className="max-w-xl text-lg md:text-xl font-medium text-gray-200 leading-relaxed drop-shadow-lg text-justify">
            Kalceria is open for visionary partnerships, media collaborations, and brand sponsorships. We are aggressively building an automotive ecosystem where street culture and innovation thrive. Connect with us today to explore limitless possibilities and dominate the scene together. 
            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline font-bold pointer-events-auto transition-colors duration-300 ml-1">
              Click here to chat!
            </a>
          </div>
        </div>
      </div>

      {/* Right Half: Square Box Auto Scroll */}
      <div className="w-full flex items-center justify-center p-4 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 md:w-1/2 md:p-0 z-30">
        <div className="relative w-full max-w-[450px] aspect-square">
          
          {/* Floating Texts Overlays (Attached to the square box corner, outside overflow-hidden) */}
          <div className="absolute -top-10 -left-6 md:-left-16 md:-top-12 z-50 pointer-events-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)] w-40 md:w-56 h-40">
            <img 
              src="/textfitra.png" 
              alt="Fitra" 
              className="absolute top-0 left-0 w-full animate-text-fitra"
            />
            <img 
              src="/textmobi.png" 
              alt="Mobi" 
              className="absolute -top-4 md:-top-6 left-0 w-full animate-text-mobi"
            />
          </div>

          {/* Inner Container with overflow-hidden for the sliding images */}
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.15)] bg-black/50 backdrop-blur-sm z-20">
            {/* Auto Scroll Track (200% width) */}
            <div className="absolute inset-0 flex w-[200%] animate-slider">
              <div className="w-[50%] h-full bg-[url('/fitra.jpeg')] bg-cover bg-center" />
              <div className="w-[50%] h-full bg-[url('/mobi.jpeg')] bg-cover bg-center" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
