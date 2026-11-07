"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FloatingQuotesLayer } from "../quotes";
import { AnimatedReiiPair } from "../ambient";

export function AboutFaqSection({
  isMobile,
  masterFaqOpen,
  setMasterFaqOpen,
  openFaq,
  setOpenFaq,
  faqs,
}) {
  return (
    <section className="relative w-full min-h-screen py-24 md:py-40 flex flex-col items-center justify-between overflow-hidden z-30 bg-[#050a14]">
      {/* Floating Bohemian Quotes Background */}
      <FloatingQuotesLayer />

      {/* Ambient Blobs: Golden & Magenta */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[30%] w-[30vw] h-[30vw] rounded-full blur-[130px] bg-[#FF00FF]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] right-[30%] w-[40vw] h-[40vw] rounded-full blur-[160px] bg-[#FFD700]"
        />
      </div>

      {/* Animated Reii Pair Sticks to Bottom Screen Corners on ALL devices */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-between pointer-events-none px-0 sm:px-2 md:px-4">
        <AnimatedReiiPair isMobile={isMobile} />
      </div>

      {/* Top Center Segment Title - FAQs */}
      <div className="absolute top-8 xs:top-10 sm:top-12 md:top-16 lg:top-20 left-1/2 -translate-x-1/2 z-30 text-center w-full px-4 flex flex-col items-center pointer-events-none">
        <motion.h2
          initial={{ opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-normal tracking-tighter text-white leading-none select-none"
          style={{
            fontFamily: "'Times New Roman', Times, serif",
            textShadow: `
              1px 1px 0px #ccc,
              2px 2px 0px #bbb,
              3px 3px 0px #aaa,
              4px 4px 0px #999,
              5px 5px 0px #888,
              6px 6px 15px rgba(0,0,0,0.5)
            `,
          }}
        >
          FAQs
        </motion.h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        className="relative z-10 w-[90%] max-w-4xl flex flex-col my-auto mt-28 sm:mt-32 md:mt-40"
      >
        {/* 1. GLASS BACKGROUND LAYER (Blurs the quotes behind it) */}
        <div
          className="absolute inset-0 border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_80px_rgba(0,0,0,0.8)] z-0 pointer-events-none"
          style={{
            clipPath:
              "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
          }}
        />

        {/* 4. CONTENT LAYER (Text and buttons) */}
        <div className="relative z-20 flex flex-col w-full h-full transition-all duration-300">
          <button
            onClick={() => setMasterFaqOpen(!masterFaqOpen)}
            className="w-full text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none px-4 py-4 md:px-8 md:py-10"
          >
            <span className="font-mono font-black uppercase tracking-tighter text-white transition-colors drop-shadow-2xl text-lg sm:text-2xl md:text-5xl">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <span
              className="font-mono text-white transition-transform duration-300 text-xl md:text-4xl"
              style={{ transform: masterFaqOpen ? "rotate(45deg)" : "rotate(0deg)" }}
            >
              +
            </span>
          </button>

          {/* NESTED QUESTIONS */}
          <AnimatePresence>
            {masterFaqOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="bg-transparent border-t border-white/10 overflow-hidden"
              >
                <div className="flex flex-col p-2 sm:p-3 gap-2 sm:gap-3 md:p-8 md:gap-4">
                  {faqs.map((faq, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex flex-col border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition-colors"
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full text-left flex justify-between items-center group hover:bg-white/5 transition-colors focus:outline-none px-3.5 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6"
                      >
                        <span className="font-mono font-black uppercase tracking-tighter text-slate-300 group-hover:text-white transition-colors pr-4 text-xs sm:text-sm md:text-xl">
                          {faq.q}
                        </span>
                        <span className="font-mono text-white transition-colors flex-shrink-0 text-base md:text-2xl">
                          {openFaq === i ? "—" : "+"}
                        </span>
                      </button>

                      <AnimatePresence>
                        {openFaq === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="border-t border-slate-800 overflow-hidden"
                          >
                            <div className="font-sans text-slate-400 leading-relaxed bg-[#060c18] px-3.5 py-3 text-[11px] sm:text-xs md:px-6 md:py-6 md:text-base">
                              {faq.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}
