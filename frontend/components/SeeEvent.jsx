"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────
const HERO_IMAGES = [
  "/bg_s1ev.jpeg",
  "/bg_s2ev.jpeg",
  "/bg_s3ev.jpeg",
  "/bg_s4ev.jpeg",
];

const CLIP = { clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" };
const CLIP_CARD = { clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" };

// ─── Components ──────────────────────────────────────────────────────────────
function RainbowPixels() {
  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3", "#D946EF", "#00FFFF"];
  const particles = useMemo(() => Array.from({ length: 30 }).map(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 6 + 4,
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 5,
    xDrift: (Math.random() - 0.5) * 150
  })), []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen opacity-50">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}`
          }}
          animate={{
            y: [0, -300, 0],
            x: [0, p.xDrift, 0],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.8, 0.1]
          }}
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
  return <span>{displayed}</span>;
};

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

function ApplyModal({ events, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [mode, setMode] = useState("account");
  const [loading, setLoading] = useState(false);
  const event = events[idx];
  const [form, setForm] = useState({ name: "", email: "", contact: "", identifier: "", session: event?.sessionOptions?.[0] || "" });

  useEffect(() => {
    if (event) setForm(f => ({ ...f, session: event.sessionOptions?.[0] || "" }));
  }, [idx, event]);

  const next = () => setIdx(p => (p + 1) % events.length);
  const prev = () => setIdx(p => (p - 1 + events.length) % events.length);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = mode === "account" 
        ? { eventId: event.id, identifier: form.identifier, selectedSession: form.session }
        : { eventId: event.id, name: form.name, email: form.email, contact: form.contact, selectedSession: form.session };
      await api.post(`/events/${event.id}/register`, payload);
      alert("Registration successful!");
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-white/90 border-none rounded-lg py-2 px-3 text-black outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all font-sans text-[11px] font-medium placeholder:text-gray-400 shadow-xl";
  const labelClass = "block text-[8px] font-sans font-bold text-white uppercase mb-0.5 tracking-widest opacity-80 drop-shadow-md";
  const metaStyle = "text-[10px] md:text-[12px] font-medium text-gray-200 italic border-b border-white/10 shadow-[0_1px_4px_rgba(0,0,0,0.3)] pb-0.5 mb-2 block w-full";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#0B0C10]/85 border border-white/10 w-full max-w-lg relative overflow-hidden backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] p-6 md:p-8" style={CLIP}>
        
        {/* Dynamic Blobs */}
        <motion.div 
          animate={{ scale: [1, 1.3, 1], x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none" 
        />
        <motion.div 
          animate={{ scale: [1.3, 1, 1.3], x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" 
        />

        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors text-2xl z-40">×</button>

        {/* Mini Carousel Header */}
        <div className="relative z-30 mb-6">
           <div className="flex items-center justify-between mb-4">
              <button onClick={prev} className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/40 hover:text-white hover:border-white transition-all bg-white/5 rounded-lg">
                <ChevronLeft />
              </button>
              <div className="text-center flex-1">
                 <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white italic mb-0.5" style={{ textShadow: "2px 2px 0 #FF00FF" }}>{event?.title}</h2>
                 <p className="text-[9px] text-slate-400 font-sans uppercase tracking-[0.2em] italic">Secure your slot in the grid</p>
              </div>
              <button onClick={next} className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/40 hover:text-white hover:border-white transition-all bg-white/5 rounded-lg">
                <ChevronRight />
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <motion.div key={event?.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative w-full aspect-[3/4] bg-white/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)]" style={CLIP_CARD}>
                 <img src={event?.displayPhotoUrl} className="w-full h-full object-cover" alt="" />
                 <div className="absolute inset-0 border-2 border-white/10 pointer-events-none" style={CLIP_CARD} />
              </motion.div>
              <div className="flex flex-col justify-center h-full space-y-0.5">
                 <p className={metaStyle}>Location: <span className="text-white not-italic font-bold ml-2">{event?.location}</span></p>
                 <p className={metaStyle}>Start: <span className="text-white not-italic font-bold ml-2">{new Date(event?.regStartTime).toLocaleDateString()}</span></p>
                 <p className={metaStyle}>End: <span className="text-white not-italic font-bold ml-2">{new Date(event?.regEndTime).toLocaleDateString()}</span></p>
                 <p className={metaStyle}>Kuota: <span className="text-white not-italic font-bold ml-2">{event?.quota} Slots</span></p>
                 <p className={metaStyle}>Price: <span className="text-white not-italic font-bold ml-2">Rp {Number(event?.price).toLocaleString('id-ID')}</span></p>
              </div>
           </div>
        </div>

        {/* Elegant Form */}
        <div className="relative z-30 space-y-4">
           <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 backdrop-blur-md shadow-inner">
              {["account", "guest"].map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${mode === m ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-slate-500 hover:text-white"}`}>
                  {m === "account" ? "By Account" : "As Guest"}
                </button>
              ))}
           </div>

           <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence mode="wait">
                {mode === "account" ? (
                  <motion.div key="acc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <label className={labelClass}>Gmail / Username</label>
                    <input className={inputClass} placeholder="reinathan@gmail.com" value={form.identifier} onChange={(e) => setForm({...form, identifier: e.target.value})} required />
                  </motion.div>
                ) : (
                  <motion.div key="gst" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input className={inputClass} placeholder="Enter your name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Gmail</label>
                        <input className={inputClass} placeholder="mail@example.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
                      </div>
                      <div>
                        <label className={labelClass}>Contact</label>
                        <input className={inputClass} placeholder="WhatsApp" value={form.contact} onChange={(e) => setForm({...form, contact: e.target.value})} required />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className={labelClass}>Select Session</label>
                <select className={inputClass} value={form.session} onChange={(e) => setForm({...form, session: e.target.value})}>
                  {event?.sessionOptions?.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button disabled={loading} className={`w-full py-3 bg-white text-black font-black uppercase tracking-tighter transition-all relative overflow-hidden group shadow-[0_0_30px_rgba(255,255,255,0.2)] ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200"}`} style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}>
                 <motion.div initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.7 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-20deg] z-0" />
                 <span className="relative z-10 text-lg tracking-tighter">SECURE SPOT</span>
              </button>
           </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SeeEvent() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [eventIdx, setEventIdx] = useState(0);
  const [events, setEvents] = useState([]);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [idea, setIdea] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.get("/events");
      setEvents(r.data.events || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const heroTimer = setInterval(() => setHeroIdx((prev) => (prev + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(heroTimer);
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      const eventTimer = setInterval(() => setEventIdx((prev) => (prev + 1) % events.length), 6000);
      return () => clearInterval(eventTimer);
    }
  }, [events]);

  const activeEvent = events[eventIdx];

  return (
    <div className="w-full min-h-screen bg-[#0B0C10] text-white font-sans overflow-x-hidden">
      
      {/* ─── SECTION 1: HERO CAROUSEL ────────────────────────────────────────── */}
      <section className="relative w-full h-screen overflow-hidden flex items-center">
        <AnimatePresence mode="sync">
          {HERO_IMAGES.map((src, idx) => (
            idx === heroIdx && (
              <motion.div key={src} initial={{ opacity: 0, x: "10%" }} animate={{ opacity: 1, x: "0%", transition: { duration: 1.5, ease: "easeOut" } }} exit={{ opacity: 0, x: "-10%", transition: { duration: 1.5 } }} className="absolute inset-0 w-full h-full">
                <motion.div animate={{ x: ["0%", "-5%"] }} transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "mirror" }} className="w-[110%] h-full bg-cover bg-center bg-[#1a1c23]" style={{ backgroundImage: `url(${src})` }} />
              </motion.div>
            )
          ))}
        </AnimatePresence>

        <div className="absolute inset-0 bg-orange-400/20 mix-blend-overlay z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0C10] z-0 pointer-events-none" />

        <div className="relative z-10 container mx-auto px-6 md:px-12 pt-20">
          <div className="relative inline-block">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="relative mb-4 w-max flex items-end group">
               <img src="/coki_event.png" alt="Coki Event" className="w-32 md:w-48 block relative z-10 drop-shadow-2xl" />
               <div className="absolute left-0 bottom-0 w-[4px] h-[50%] bg-white z-20" />
               <div className="absolute left-0 bottom-0 h-[4px] w-full bg-white z-20" />
            </motion.div>

            <motion.h1 initial={{ x: '-100vw' }} animate={{ x: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="text-6xl md:text-8xl font-black tracking-tighter text-left text-white drop-shadow-2xl font-rog mb-6 relative z-10" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}>
              SEE EVENT
            </motion.h1>
          </div>
          <div className="max-w-2xl text-lg md:text-xl font-medium text-gray-200 leading-relaxed drop-shadow-lg h-[150px]">
            <Typewriter text="This Event hosted by Kalceria and by the use of community. We bring automotive enthusiasts together to share the same obsession. Prepare your engines for the ultimate street euphoria." delay={800} speed={40} />
          </div>
        </div>
      </section>

      {/* ─── SECTION 2 & 3 WRAPPER ─────────────────────────────────────────── */}
      <div className="relative w-full bg-[#0B0C10]">
        <RainbowPixels />
        <img src="/stikermobil_5.png" alt="" className="absolute z-10 w-40 md:w-56 bottom-10 right-[10%] -rotate-3 opacity-80 drop-shadow-xl pointer-events-none" />
        <img src="/stikermobil_2.png" alt="" className="absolute z-10 w-40 md:w-56 bottom-10 left-[2%] rotate-6 opacity-80 drop-shadow-xl pointer-events-none" />

        {/* ─── SECTION 2: DYNAMIC EVENT CARDS ──────────────────────────────── */}
        <section className="relative w-full py-24 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              
              {/* Left: Picture Card Carousel */}
              <div className="relative w-full aspect-[4/5] rounded-2xl shadow-2xl bg-[#0B0C10] scale-[1.03]">
                <img src="/stikermobil_4.png" alt="" className="absolute z-30 w-40 md:w-56 -bottom-36 md:-bottom-48 -left-10 md:-left-16 -rotate-3 opacity-90 drop-shadow-2xl pointer-events-none" />
                
                <div className="relative w-full h-full rounded-2xl overflow-hidden border border-gray-800">
                  <AnimatePresence mode="wait">
                    {activeEvent && (
                      <motion.div key={activeEvent.id} initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: "0%" }} exit={{ opacity: 0, x: "-100%" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="absolute inset-0 w-full h-full">
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${activeEvent.displayPhotoUrl})` }} />
                        <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.6)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: Text Details */}
              <div className="flex flex-col justify-center min-h-[450px] relative z-20">
                <img src="/stikermobil_1.png" alt="" className="absolute -top-36 md:-top-44 right-10 w-40 md:w-56 rotate-6 opacity-90 drop-shadow-2xl z-10 pointer-events-none" />
                <img src="/stikermobil_3.png" alt="" className="absolute z-10 w-36 md:w-44 bottom-[-110px] md:bottom-[-160px] left-1/2 -translate-x-1/2 rotate-3 opacity-70 drop-shadow-2xl pointer-events-none" />

                <AnimatePresence mode="wait">
                  {activeEvent && (
                    <motion.div key={activeEvent.id} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col text-right items-end relative z-20">
                      <motion.h2 
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className={`text-5xl md:text-6xl font-black italic uppercase text-white tracking-tighter mb-6 inline-block relative z-20`}
                        style={{ 
                          WebkitTextStroke: "2px rgba(255,255,255,0.3)", 
                          minHeight: "1.2em",
                          textShadow: "0 0 15px rgba(255,0,255,0.5)"
                        }}
                      >
                        <Typewriter text={activeEvent.title} speed={70} delay={300} />
                      </motion.h2>

                      <div className="relative mb-8">
                        <p className="text-gray-200 text-lg md:text-xl leading-relaxed max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium relative z-20 mb-8">
                          {activeEvent.description}
                        </p>

                        <div className="space-y-1 text-sm md:text-base font-medium text-gray-300 text-right">
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Location: <span className="text-white not-italic font-bold">{activeEvent.location || "TBA"}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Registration Start: <span className="text-white not-italic font-bold">{new Date(activeEvent.regStartTime).toLocaleDateString()} {new Date(activeEvent.regStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Registration End: <span className="text-white not-italic font-bold">{new Date(activeEvent.regEndTime).toLocaleDateString()} {new Date(activeEvent.regEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Kuota: <span className="text-white not-italic font-bold">{activeEvent.quota} Slots</span></p><br/>
                          <p className="border-b border-fuchsia-500/30 shadow-[0_1px_5px_rgba(255,0,255,0.25)] pb-1 inline-block italic">Price: <span className="text-white not-italic font-bold">Rp {Number(activeEvent.price).toLocaleString('id-ID')}</span></p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: COMMUNITY INTERACTION ────────────────────────────── */}
        <section className="relative w-full pb-32 pt-12 z-20 pointer-events-none">
          <div className="container mx-auto px-6 md:px-12 pointer-events-auto max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              
              <motion.div whileHover={{ scale: 1.02 }} className="relative bg-[#0B0C10]/40 p-8 rounded-2xl border-2 border-dashed border-gray-500/30 backdrop-blur-xl flex flex-col justify-between h-[320px]">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Wanna Join?</h3>
                <div className="flex-1 flex items-center justify-center">
                   <button onClick={() => setApplyModalOpen(true)} className="relative w-full py-5 font-sans font-black uppercase tracking-tighter text-black bg-white border border-white transition-all hover:bg-white/90 group cursor-pointer shadow-[0_0_40px_rgba(255,255,255,0.2)]" style={CLIP}>
                    <span className="relative z-10 text-2xl">APPLY NOW</span>
                    <div className="absolute inset-0 bg-black/5 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 z-0" />
                  </button>
                </div>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} className="relative bg-[#0B0C10]/40 p-8 rounded-2xl border-2 border-dashed border-gray-500/30 backdrop-blur-xl h-[320px] flex flex-col justify-between">
                <img src="/otniel_event.png" alt="Otniel" className="absolute top-0 right-8 -translate-y-full w-32 md:w-40 z-30 drop-shadow-2xl pointer-events-none" />
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-6 text-center">Any Idea?</h3>
                <form className="flex flex-col gap-4 flex-1 justify-end" onSubmit={(e) => e.preventDefault()}>
                  <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Drop your event suggestions here..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all resize-none h-20 text-xs font-light placeholder:text-slate-600" />
                  <button type="button" className="relative w-full py-4 font-sans font-black uppercase tracking-tighter text-black bg-white border border-white transition-all hover:bg-white/90 group cursor-pointer shadow-[0_0_40px_rgba(255,255,255,0.1)]" style={CLIP}>
                    <span className="relative z-10 text-xl">SUBMIT IDEA</span>
                    <div className="absolute inset-0 bg-black/5 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 z-0" />
                  </button>
                </form>
              </motion.div>

            </div>
          </div>
        </section>

      </div>
      <AnimatePresence>
        {applyModalOpen && <ApplyModal events={events} startIndex={eventIdx} onClose={() => setApplyModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
