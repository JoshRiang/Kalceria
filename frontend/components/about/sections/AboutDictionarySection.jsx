"use client";

import { motion } from "framer-motion";
import { VideoCollage } from "../collage";
import { StaticTypewriter } from "../typewriter";

export function AboutDictionarySection({ isMobile }) {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-8 py-32 overflow-hidden z-10">
      {/* Video Collage Background */}
      <VideoCollage isMobile={isMobile} />

      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[10%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#00FFFF]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] right-[20%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FF00FF]"
        />
      </div>

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">
        <motion.h1
          initial={{ y: -40, opacity: 0.01 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-6xl md:text-8xl font-black uppercase tracking-tighter drop-shadow-2xl mb-6 font-mono"
        >
          ABOUT US
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0.01 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.9 }}
          className="text-3xl md:text-5xl italic font-medium tracking-wide text-slate-300 font-serif mb-16"
        >
          De bello
          <span className="block mt-2 text-slate-400 text-lg md:text-xl tracking-widest">(About)</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0.01, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-left w-full max-w-2xl bg-black/40 p-10 shadow-2xl backdrop-blur-md relative border-l-4 border-slate-700 font-serif"
        >
          <h2 className="text-4xl font-bold mb-2 tracking-tight text-slate-100">Kalceria</h2>
          <p className="text-[#FFD700] italic mb-6 font-medium text-lg tracking-wide">noun. /kal·ce·ri·a/</p>
          <ol className="list-decimal pl-6 space-y-5 text-slate-300 leading-relaxed text-lg">
            <li className="pl-3 min-h-[3em]">
              <StaticTypewriter
                text="A state of transcendent automotive euphoria; the intersection where mechanical precision meets high-fidelity aesthetic design."
                speed={15}
                delay={1200}
              />
            </li>
            <li className="pl-3 min-h-[3em]">
              <StaticTypewriter
                text="A clandestine movement of enthusiasts dedicated to preserving the visceral experience of the drive in a digital age."
                speed={15}
                delay={3000}
              />
            </li>
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
