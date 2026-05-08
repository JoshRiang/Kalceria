"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import ApplyModal from "./ApplyModal";

// ─── Hero images ──────────────────────────────────────────────────────────────
const HERO_IMAGES = ["/bg_s1ev.jpeg", "/bg_s2ev.jpeg", "/bg_s3ev.jpeg", "/bg_s4ev.jpeg"];

// ─── Gradient map by index ────────────────────────────────────────────────────
const GRADIENTS = [
  { gradient: "from-orange-500 via-yellow-300 to-orange-500", stroke: "#F97316", shadow: "rgba(250,204,21,0.5)" },
  { gradient: "from-blue-500 via-cyan-300 to-blue-500",       stroke: "#3B82F6", shadow: "rgba(34,211,238,0.5)" },
  { gradient: "from-purple-500 via-pink-400 to-purple-500",   stroke: "#A855F7", shadow: "rgba(236,72,153,0.5)" },
  { gradient: "from-emerald-500 via-cyan-300 to-emerald-500", stroke: "#10B981", shadow: "rgba(52,211,153,0.5)" },
];

function RainbowPixels() {
  const colors = ["#FF0000","#FF7F00","#FFFF00","#00FF00","#0000FF","#4B0082","#9400D3","#D946EF","#00FFFF"];
  const particles = React.useMemo(() => Array.from({ length: 30 }).map(() => ({
    x: Math.random() * 100, y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 6 + 4, duration: 15 + Math.random() * 20,
    delay: Math.random() * 5, xDrift: (Math.random() - 0.5) * 150,
  })), []);
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen opacity-50">
      {particles.map((p, i) => (
        <motion.div key={i} className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
          animate={{ y: [0, -300, 0], x: [0, p.xDrift, 0], rotate: [0, 180, 360], opacity: [0.1, 0.8, 0.1] }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay }}
        />
      ))}
    </div>
  );
}

const Typewriter = ({ text, speed = 50, delay = 0 }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i <= text.length) { setDisplayed(text.slice(0, i)); i++; }
        else clearInterval(interval);
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  return <span>{displayed}</span>;
};

export default function SeeEvent() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [eventIdx, setEventIdx] = useState(0);
  const [events, setEvents] = useState([]);
  const [applyEvent, setApplyEvent] = useState(null);
  const [idea, setIdea] = useState("");

  useEffect(() => {
    api.get("/events").then((r) => setEvents(r.data.events || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((p) => (p + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!events.length) return;
    const t = setInterval(() => setEventIdx((p) => (p + 1) % events.length), 6000);
    return () => clearInterval(t);
  }, [events.length]);

  const ev = events[eventIdx];
  const style = GRADIENTS[eventIdx % GRADIENTS.length];
  const CLIP = { clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" };

  return (
    <div className="w-full min-h-screen bg-[#0B0C10] text-white font-sans overflow-x-hidden">

      {/* SECTION 1: HERO */}
      <section className="relative w-full h-screen overflow-hidden flex items-center">
        <AnimatePresence mode="sync">
          {HERO_IMAGES.map((src, idx) => idx === heroIdx && (
            <motion.div key={src} initial={{ opacity: 0, x: "10%" }} animate={{ opacity: 1, x: "0%", transition: { duration: 1.5, ease: "easeOut" } }} exit={{ opacity: 0, x: "-10%", transition: { duration: 1.5 } }} className="absolute inset-0 w-full h-full">
              <motion.div animate={{ x: ["0%", "-5%"] }} transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "mirror" }} className="w-[110%] h-full bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="absolute inset-0 bg-orange-400/20 mix-blend-overlay z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0C10] z-0 pointer-events-none" />
        <div className="relative z-10 container mx-auto px-6 md:px-12 pt-20">
          <motion.h1 initial={{ x: "-100vw" }} animate={{ x: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-black tracking-tighter text-left text-white drop-shadow-2xl font-rog mb-6"
            style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}>
            SEE EVENT
          </motion.h1>
          <div className="max-w-2xl text-lg text-gray-200 leading-relaxed h-[120px]">
            <Typewriter text="Live events by Kalceria. Real data. Real slots." delay={800} speed={40} />
          </div>
        </div>
      </section>

      {/* SECTION 2+3 WRAPPER */}
      <div className="relative w-full bg-[#0B0C10]">
        <RainbowPixels />
        <img src="/stikermobil_5.png" alt="" className="absolute z-10 w-40 md:w-56 bottom-10 right-[10%] -rotate-3 opacity-80 drop-shadow-xl pointer-events-none" />
        <img src="/stikermobil_2.png" alt="" className="absolute z-10 w-40 md:w-56 bottom-10 left-[2%] rotate-6 opacity-80 drop-shadow-xl pointer-events-none" />

        {/* SECTION 2: EVENT CARDS */}
        <section className="relative w-full py-24 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto">
            {events.length === 0 ? (
              <p className="font-mono text-slate-500 text-center py-20">Loading events...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Left: Photo Card */}
                <div className="relative w-full aspect-[4/5] rounded-2xl shadow-2xl bg-[#0B0C10] scale-[1.03]">
                  <img src="/stikermobil_4.png" alt="" className="absolute z-30 w-40 md:w-56 -bottom-36 md:-bottom-48 -left-10 md:-left-16 -rotate-3 opacity-90 drop-shadow-2xl pointer-events-none" />
                  <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-800">
                    <AnimatePresence mode="wait">
                      <motion.div key={eventIdx} initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: "0%" }} exit={{ opacity: 0, x: "-100%" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0">
                        {ev?.displayPhotoUrl ? (
                          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${ev.displayPhotoUrl})` }} />
                        ) : (
                          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                            <span className="font-mono text-slate-700">No Image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.6)]" />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right: Text */}
                <div className="flex flex-col justify-center h-[320px] relative z-20">
                  <img src="/stikermobil_1.png" alt="" className="absolute -top-36 md:-top-44 right-10 w-40 md:w-56 rotate-6 opacity-90 drop-shadow-2xl z-10 pointer-events-none" />
                  <AnimatePresence mode="wait">
                    {ev && (
                      <motion.div key={eventIdx} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col text-right items-end relative z-20">
                        <motion.h2
                          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className={`text-5xl md:text-6xl font-rog text-transparent bg-clip-text bg-gradient-to-r ${style.gradient} mb-3 inline-block`}
                          style={{ WebkitTextStroke: `2px ${style.stroke}`, filter: `drop-shadow(0 0 10px ${style.shadow})` }}
                        >
                          <Typewriter text={ev.title} speed={70} delay={300} />
                        </motion.h2>
                        <div className="flex gap-3 mb-3 justify-end flex-wrap">
                          <span className={`font-mono text-xs px-2 py-1 border rounded ${ev.status === "OPEN" ? "border-cyan-700/40 text-cyan-400 bg-cyan-900/20" : "border-slate-700 text-slate-500"}`}>{ev.status}</span>
                          <span className="font-mono text-xs text-slate-400">{ev._count?.registrations || 0}/{ev.quota} slots</span>
                          {ev.location && <span className="font-mono text-xs text-slate-400">📍 {ev.location}</span>}
                        </div>
                        <p className="text-gray-200 text-lg leading-relaxed max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium">
                          {ev.description || "Join us for an unforgettable automotive experience."}
                        </p>
                        <div className="mt-4 font-mono text-sm text-[#FACC15] font-bold">
                          Rp {Number(ev.price).toLocaleString("id-ID")}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Event selector dots */}
            {events.length > 1 && (
              <div className="flex gap-2 justify-center mt-10">
                {events.map((_, i) => (
                  <button key={i} onClick={() => setEventIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === eventIdx ? "bg-[#FF00FF] w-4" : "bg-slate-700 hover:bg-slate-500"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: COMMUNITY */}
        <section className="relative w-full pb-32 pt-12 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

              {/* Wanna Join */}
              <motion.div whileHover={{ scale: 1.02 }}
                className="relative bg-transparent p-8 rounded-2xl border-2 border-dashed border-gray-500 flex flex-col justify-between backdrop-blur-sm h-full">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Wanna Join?</h3>
                <div className="flex flex-col gap-3">
                  {events.filter((e) => e.status === "OPEN").slice(0, 3).map((e) => (
                    <button key={e.id} onClick={() => setApplyEvent(e)}
                      className="relative w-full py-3 font-sans font-extrabold uppercase tracking-wide text-[13px] text-[#050a14] bg-white border border-white transition-all hover:border-[#FF00FF] hover:bg-transparent hover:text-white group cursor-pointer"
                      style={CLIP}>
                      <span className="relative z-10 truncate">{e.title}</span>
                      <div className="absolute inset-0 bg-[#FF00FF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
                    </button>
                  ))}
                  {!events.filter((e) => e.status === "OPEN").length && (
                    <p className="font-mono text-sm text-slate-600 text-center">No open events.</p>
                  )}
                </div>
              </motion.div>

              {/* Any Idea */}
              <motion.div whileHover={{ scale: 1.02 }}
                className="relative bg-transparent p-8 rounded-2xl border-2 border-dashed border-gray-500 backdrop-blur-sm h-full flex flex-col justify-between">
                <img src="/otniel_event.png" alt="" className="absolute top-0 right-8 -translate-y-full w-32 md:w-40 z-30 drop-shadow-2xl pointer-events-none" />
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Any Idea?</h3>
                <form className="flex flex-col gap-4 flex-1 justify-end" onSubmit={(e) => e.preventDefault()}>
                  <textarea
                    value={idea} onChange={(e) => setIdea(e.target.value)}
                    placeholder="Drop your event suggestions here..."
                    className="w-full bg-black/30 border border-gray-700 border-dashed rounded-xl p-3 text-white focus:outline-none focus:border-[#00FFFF] focus:ring-1 focus:ring-[#00FFFF] transition-all resize-none h-24 text-sm"
                  />
                  <button type="button"
                    className="relative w-full py-3 font-sans font-extrabold uppercase tracking-wide text-[15px] text-[#050a14] bg-[#00FFFF] border border-[#00FFFF] transition-all hover:bg-transparent hover:text-white group cursor-pointer"
                    style={CLIP}>
                    <span className="relative z-10">SUBMIT IDEA</span>
                    <div className="absolute inset-0 bg-[#00FFFF]/10 scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-300 ease-out z-0" />
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {applyEvent && <ApplyModal event={applyEvent} onClose={() => setApplyEvent(null)} />}
      </AnimatePresence>
    </div>
  );
}
