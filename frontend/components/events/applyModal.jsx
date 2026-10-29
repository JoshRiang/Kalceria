"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { hasUserSession } from "@/lib/session";
import { CLIP } from "./constants";
import ContentImage from "@/components/ui/ContentImage";

export const CLIP_CARD = { clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" };

export const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export function ApplyModal({ events, startIndex, isMobile, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [mode, setMode] = useState("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneData, setDoneData] = useState(null);
  const event = events[idx];
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    identifier: "",
    session: event?.sessionOptions?.[0] || "",
  });

  useEffect(() => {
    if (!hasUserSession()) return;
    let active = true;
    api.get("/users/me")
      .then((res) => {
        if (!active) return;
        const me = res.data?.user;
        if (me?.nickname || me?.name) {
          setForm((prev) => ({
            ...prev,
            identifier: prev.identifier || me.nickname || me.name,
          }));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (event) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve the selected session reset when the user changes events.
      setForm((f) => ({ ...f, session: event.sessionOptions?.[0] || "" }));
      setError("");
      setDoneData(null);
    }
  }, [idx, event]);

  const next = () => setIdx((p) => (p + 1) % events.length);
  const prev = () => setIdx((p) => (p - 1 + events.length) % events.length);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!event?.id) return;

    if (mode === "account" && !form.identifier.trim()) {
      setError("Please enter your registered email or username.");
      return;
    }
    if (mode === "guest") {
      if (!form.name.trim() || !form.email.trim() || !form.contact.trim()) {
        setError("Please fill in your full name, email, and WhatsApp contact.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = mode === "account"
        ? {
            eventId: event.id,
            identifier: form.identifier.trim(),
            selectedSession: form.session,
          }
        : {
            eventId: event.id,
            name: form.name.trim(),
            email: form.email.trim(),
            contact: form.contact.trim(),
            selectedSession: form.session,
          };
      const res = await api.post(`/events/${event.id}/register`, payload);
      setDoneData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-white/90 border-none rounded-lg py-2 px-3 text-black outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all font-sans text-[11px] font-medium placeholder:text-gray-400 shadow-xl";
  const labelClass = "block text-[8px] font-sans font-bold text-white uppercase mb-0.5 tracking-widest opacity-80 drop-shadow-md";
  const metaStyle = "text-[10px] md:text-[12px] font-medium text-gray-200 italic border-b border-white/10 shadow-[0_1px_4px_rgba(0,0,0,0.3)] pb-0.5 mb-2 block w-full";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ scale: isMobile ? 0.78 : 0.9, y: 20 }} animate={{ scale: isMobile ? 0.825 : 1, y: 0 }} className="bg-[#0B0C10]/85 border border-white/10 w-full max-w-lg relative overflow-hidden backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] p-6 md:p-8 transition-transform duration-500" style={CLIP}>

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
           <div className={`flex items-center justify-between mb-4 ${isMobile ? "px-10" : ""}`}>
              <button type="button" onClick={prev} className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/40 hover:text-white hover:border-white transition-all bg-white/5 rounded-lg">
                <ChevronLeft />
              </button>
              <div className="text-center flex-1">
                 <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white italic mb-0.5" style={{ textShadow: "2px 2px 0 #FF00FF" }}>{event?.title}</h2>
                 <p className="text-[9px] text-slate-400 font-sans uppercase tracking-[0.2em] italic">Secure your slot in the grid</p>
              </div>
              <button type="button" onClick={next} className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/40 hover:text-white hover:border-white transition-all bg-white/5 rounded-lg">
                <ChevronRight />
              </button>
           </div>

           <div className="grid grid-cols-2 gap-4 md:gap-6 items-center">
              <motion.div key={event?.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`relative w-full bg-white/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] ${isMobile ? "aspect-square" : "aspect-[3/4]"}`} style={CLIP_CARD}>
                 <ContentImage src={event?.displayPhotoUrl} className="w-full h-full object-cover" alt="" width={900} height={1200} />
                 <div className="absolute inset-0 border-2 border-white/10 pointer-events-none" style={CLIP_CARD} />
              </motion.div>
              <div className="flex flex-col justify-center h-full space-y-0.5">
                 <p className={metaStyle}>Location: <span className="text-white not-italic font-bold ml-2">{event?.location}</span></p>
                 <p className={metaStyle}>Start: <span className="text-white not-italic font-bold ml-2">{new Date(event?.regStartTime).toLocaleDateString()}</span></p>
                 <p className={metaStyle}>End: <span className="text-white not-italic font-bold ml-2">{new Date(event?.regEndTime).toLocaleDateString()}</span></p>
                 <p className={metaStyle}>Kuota: <span className="text-white not-italic font-bold ml-2">{event?.quota} Slots</span></p>
                 <p className={metaStyle}>Price: <span className="text-white not-italic font-bold ml-2">Rp {Number(event?.price).toLocaleString("id-ID")}</span></p>
              </div>
           </div>
        </div>

        {/* Elegant Form or Confirmation */}
        {doneData ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-30 space-y-4 text-center py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-emerald-400 font-black uppercase tracking-wider text-sm">Spot Secured!</p>
              <p className="text-slate-300 font-sans text-xs mt-1">
                Registered for <span className="text-white font-bold">{event?.title}</span> ({form.session}).
              </p>
            </div>
            <div className="flex gap-3">
              {doneData.whatsappUrl && (
                <a
                  href={doneData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-tight text-xs rounded-lg transition-all flex items-center justify-center"
                >
                  Confirm via WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-tight text-xs rounded-lg border border-white/15 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="relative z-30 space-y-4">
             <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 backdrop-blur-md shadow-inner">
                {["account", "guest"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(""); }}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${mode === m ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-slate-500 hover:text-white"}`}
                  >
                    {m === "account" ? "By Account" : "As Guest"}
                  </button>
                ))}
             </div>

             <form onSubmit={handleSubmit} className="space-y-3">
                <AnimatePresence mode="wait">
                  {mode === "account" ? (
                    <motion.div key="acc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <label className={labelClass}>Gmail / Username</label>
                      <input
                        className={inputClass}
                        placeholder="user@gmail.com or username"
                        value={form.identifier}
                        onChange={(e) => { setForm({ ...form, identifier: e.target.value }); setError(""); }}
                        required
                      />
                    </motion.div>
                  ) : (
                    <motion.div key="gst" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                      <div>
                        <label className={labelClass}>Full Name</label>
                        <input
                          className={inputClass}
                          placeholder="Enter your name"
                          value={form.name}
                          onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(""); }}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Gmail</label>
                          <input
                            type="email"
                            className={inputClass}
                            placeholder="mail@example.com"
                            value={form.email}
                            onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); }}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Contact</label>
                          <input
                            type="tel"
                            className={inputClass}
                            placeholder="WhatsApp (+62...)"
                            value={form.contact}
                            onChange={(e) => { setForm({ ...form, contact: e.target.value }); setError(""); }}
                            required
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className={labelClass}>Select Session</label>
                  <select className={inputClass} value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
                    {event?.sessionOptions?.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 font-sans text-[11px] font-medium">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className={`w-full py-3 bg-white text-black font-black uppercase tracking-tighter transition-all relative overflow-hidden group shadow-[0_0_30px_rgba(255,255,255,0.2)] ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200"}`} style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}>
                   <motion.div initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.7 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-[-20deg] z-0" />
                   <span className="relative z-10 text-lg tracking-tighter">{loading ? "PROCESSING..." : "SECURE SPOT"}</span>
                </button>
             </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
