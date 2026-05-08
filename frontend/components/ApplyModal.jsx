"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ total, current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-300 ${
            i < current ? "bg-[#FF00FF] text-white" :
            i === current ? "bg-white text-black" :
            "bg-slate-800 text-slate-600"
          }`}>
            {i < current ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-6 transition-all duration-500 ${i < current ? "bg-[#FF00FF]" : "bg-slate-800"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Apply Now Modal ──────────────────────────────────────────────────────────
export default function ApplyModal({ event, onClose }) {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // { whatsappUrl }
  const [error, setError] = useState("");

  const isLoggedIn = !!localStorage.getItem("token");
  const sessions = Array.isArray(event.sessionOptions) ? event.sessionOptions : [];
  const TOTAL_STEPS = 3;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleRegister() {
    if (!session) return;
    setError(""); setLoading(true);
    try {
      const res = await api.post(`/events/${event.id}/register`, { selectedSession: session });
      setDone(res.data);
      setStep(TOTAL_STEPS - 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const CLIP = { clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Conic border — magenta */}
        <div className="absolute -inset-[1px] rounded-xl z-0 overflow-hidden" style={{ opacity: 0.5 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]"
            style={{
              background: "conic-gradient(from 0deg, transparent 0%, rgba(255,0,255,0.7) 30%, transparent 60%, rgba(250,204,21,0.5) 80%, transparent 100%)",
              filter: "blur(4px)",
            }}
          />
        </div>

        <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden p-8">
          {/* Close */}
          <button onClick={onClose} className="absolute top-5 right-5 text-slate-600 hover:text-white transition-colors font-mono text-lg">✕</button>

          <Steps total={TOTAL_STEPS} current={step} />

          <AnimatePresence mode="wait">
            {/* Step 0: Event Overview */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">You are registering for</p>
                <h2 className="font-mono font-black text-2xl uppercase tracking-tighter text-white mb-4">{event.title}</h2>
                {event.displayPhotoUrl && (
                  <div className="w-full aspect-video rounded overflow-hidden mb-4 border border-slate-800">
                    <img src={event.displayPhotoUrl} alt={event.title} className="w-full h-full object-cover opacity-80" />
                  </div>
                )}
                <div className="flex flex-wrap gap-4 mb-4 text-xs font-mono text-slate-400">
                  {event.location && <span>📍 {event.location}</span>}
                  <span>💰 Rp {Number(event.price).toLocaleString("id-ID")}</span>
                  <span>🎯 Quota: {event._count?.registrations || 0}/{event.quota}</span>
                </div>
                {event.description && <p className="text-sm text-slate-400 leading-relaxed mb-6">{event.description}</p>}
                {!isLoggedIn ? (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded mb-4">
                    <p className="font-mono text-xs text-yellow-400">You must be logged in to register.</p>
                  </div>
                ) : (
                  <button onClick={() => setStep(1)} className="w-full py-3.5 font-sans font-extrabold uppercase tracking-wider text-sm text-black bg-white hover:bg-[#FF00FF] hover:text-white transition-all" style={CLIP}>
                    Continue →
                  </button>
                )}
              </motion.div>
            )}

            {/* Step 1: Session select */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Choose Session</p>
                <h2 className="font-mono font-black text-xl uppercase tracking-tighter text-white mb-6">Select Your Slot</h2>
                <div className="flex flex-col gap-3 mb-6">
                  {sessions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSession(s)}
                      className={`w-full px-5 py-4 text-left font-mono text-sm font-bold uppercase tracking-wide border transition-all ${
                        session === s
                          ? "border-[#FF00FF] bg-[#FF00FF]/10 text-white"
                          : "border-slate-800 bg-[#0c1528] text-slate-400 hover:border-slate-600 hover:text-white"
                      }`}
                      style={CLIP}
                    >
                      {s}
                    </button>
                  ))}
                  {!sessions.length && <p className="font-mono text-sm text-slate-600">No sessions configured.</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-3 font-sans font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-800 hover:bg-slate-700 transition-colors rounded">← Back</button>
                  <button
                    onClick={() => session && setStep(2)}
                    disabled={!session}
                    className="flex-2 flex-1 py-3 font-sans font-extrabold text-xs uppercase tracking-wider text-black bg-white hover:bg-[#FF00FF] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={session ? CLIP : {}}
                  >
                    Confirm →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Confirm + submit */}
            {step === 2 && !done && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Confirm Details</p>
                <h2 className="font-mono font-black text-xl uppercase tracking-tighter text-white mb-6">Review & Register</h2>
                <div className="bg-[#0c1528] border border-slate-800 rounded p-5 mb-6 space-y-3" style={CLIP}>
                  {[
                    ["Event", event.title],
                    ["Session", session],
                    ["Location", event.location || "TBA"],
                    ["Biaya Pendaftaran", `Rp ${Number(event.price).toLocaleString("id-ID")}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-start gap-4">
                      <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">{k}</span>
                      <span className="font-mono text-sm text-white text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-xs text-slate-600 mb-6">After registering, you will be directed to WhatsApp to complete payment.</p>
                {error && <p className="font-mono text-xs text-red-400 mb-4">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 font-sans font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-800 hover:bg-slate-700 transition-colors rounded">← Back</button>
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="flex-1 py-3.5 font-sans font-extrabold text-xs uppercase tracking-wider text-black bg-white hover:bg-[#FF00FF] hover:text-white transition-all disabled:opacity-40"
                    style={CLIP}
                  >
                    {loading ? "Registering..." : "Register Now"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Done — WA redirect */}
            {step === 2 && done && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center text-2xl mx-auto mb-6">✓</div>
                  <h2 className="font-mono font-black text-xl uppercase tracking-tighter text-white mb-2">Registered!</h2>
                  <p className="font-mono text-sm text-slate-400 mb-8">Complete your payment via WhatsApp to secure your slot.</p>
                  <a
                    href={done.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 font-sans font-extrabold uppercase tracking-wider text-sm bg-green-600 hover:bg-green-500 text-white transition-all mb-3 rounded"
                  >
                    Complete Payment via WhatsApp →
                  </a>
                  <button onClick={onClose} className="font-mono text-xs text-slate-600 hover:text-slate-400 transition-colors">Close</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
