"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

const CLIP = { clipPath: "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)" };
const INPUT = "w-full bg-white/5 border border-white/10 rounded px-3 py-2.5 font-sans text-sm text-white outline-none transition-all placeholder:text-slate-700 focus:border-white/30";
const LABEL = "font-sans text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block";

const SERVICE_TYPES = [
  { id: "EO", label: "Event Organizer", desc: "Full EO service for your automotive event" },
  { id: "SHOOTING", label: "Car Shoot", desc: "Professional photography & videography" },
  { id: "HOST_EVENT", label: "Host Event", desc: "We host and manage your event end-to-end" },
];

function Step({ n, active, done }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-300 ${
      done ? "bg-[#FF00FF] text-white" : active ? "bg-white text-black" : "bg-slate-800 text-slate-600"
    }`}>
      {done ? "✓" : n}
    </div>
  );
}

export default function NeedUsForm({ userEmail, userName }) {
  const [step, setStep] = useState(0); // 0: type, 1: details, 2: done
  const [serviceType, setServiceType] = useState("");
  const [form, setForm] = useState({ serviceName: "", contactPerson: userName || "", whatsapp: "", location: "", targetDate: "", additionalNotes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); setError(""); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await api.post("/services/request", {
        serviceType,
        ...form,
      });
      setDone(res.data);
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to submit.");
    } finally {
      setLoading(false);
    }
  }

  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <section className="w-full max-w-xl mx-auto px-4 py-16">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Kalceria Services</p>
        <h2 className="font-mono font-black text-4xl uppercase tracking-tighter text-white mb-2">Need Us?</h2>
        <div className="h-px w-16 bg-[#FF00FF] mb-8" />
      </motion.div>

      {/* Phase indicator - Sync with IdeaCommentModal */}
      <div className="flex items-center gap-3 mb-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-500 border ${
              step > i 
                ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                : step === i 
                  ? "bg-white/10 border-white/40 text-white" 
                  : "bg-white/5 border-white/10 text-white/20"
            }`}>
              {step > i ? "✓" : i + 1}
            </div>
            {i < 2 && (
              <div className={`h-[2px] w-12 rounded-full transition-all duration-700 ${
                step > i ? "bg-white" : "bg-white/10"
              }`} />
            )}
          </div>
        ))}
      </div>

      {!isLoggedIn && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded" style={CLIP}>
          <p className="font-mono text-xs text-yellow-400">You must be logged in to submit a service request.</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 0: Service type */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-4">Select Service</p>
            <div className="flex flex-col gap-3">
              {SERVICE_TYPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setServiceType(s.id); setStep(1); }}
                  className={`w-full text-left px-5 py-4 border transition-all ${
                    serviceType === s.id
                      ? "border-[#FF00FF] bg-[#FF00FF]/10 text-white"
                      : "border-slate-800 bg-[#0c1528] text-slate-400 hover:border-slate-600 hover:text-white"
                  }`}
                  style={CLIP}
                >
                  <p className="font-mono font-black text-sm uppercase tracking-wide">{s.label}</p>
                  <p className="font-mono text-xs text-slate-500 mt-1">{s.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 1: Details form */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div className="flex items-center gap-3 mb-6">
              <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">Service:</p>
              <span className="font-mono text-xs font-black text-[#FF00FF] uppercase tracking-wider px-2 py-1 border border-[#FF00FF]/40 bg-[#FF00FF]/10 rounded">
                {SERVICE_TYPES.find((s) => s.id === serviceType)?.label}
              </span>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { k: "serviceName", label: "Event / Service Name", ph: "e.g. Kalceria Car Night 2026" },
                { k: "contactPerson", label: "Contact Person", ph: "Your name" },
                { k: "whatsapp", label: "WhatsApp Number", ph: "+62 8xx-xxxx-xxxx", type: "tel" },
                { k: "location", label: "Location", ph: "Jakarta, Bandung, etc." },
              ].map(({ k, label, ph, type }) => (
                <div key={k}>
                  <label className={LABEL}>{label}</label>
                  <input type={type || "text"} className={INPUT} placeholder={ph}
                    value={form[k]} onChange={(e) => setField(k, e.target.value)} required />
                </div>
              ))}

              <div>
                <label className={LABEL}>Target Date</label>
                <input type="date" className={INPUT} value={form.targetDate}
                  onChange={(e) => setField("targetDate", e.target.value)} required />
              </div>

              <div>
                <label className={LABEL}>Notes (optional)</label>
                <textarea className={INPUT} rows={3} placeholder="Additional requirements, scale, etc."
                  value={form.additionalNotes} onChange={(e) => setField("additionalNotes", e.target.value)} />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
                      <span className="text-red-500 text-sm">✕</span>
                      <span className="text-red-400 font-mono text-xs">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(0)}
                  className="flex-1 py-3 font-sans font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-800 hover:bg-slate-700 transition-colors rounded">
                  ← Back
                </button>
                <button type="submit" disabled={loading || !isLoggedIn}
                  className="flex-[2] py-3.5 font-sans font-extrabold text-sm uppercase tracking-wider text-black bg-white hover:bg-[#FF00FF] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={CLIP}>
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 2: Done */}
        {step === 2 && done && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center text-2xl mx-auto mb-6">✓</div>
              <h3 className="font-mono font-black text-xl uppercase tracking-tighter text-white mb-2">Request Submitted</h3>
              <p className="font-mono text-sm text-slate-400 mb-8">Complete the process via WhatsApp.</p>
              <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full py-4 font-sans font-extrabold uppercase tracking-wider text-sm bg-green-600 hover:bg-green-500 text-white transition-all mb-4 rounded">
                Continue to WhatsApp →
              </a>
              <button onClick={() => { setStep(0); setServiceType(""); setForm({ serviceName: "", contactPerson: userName || "", whatsapp: "", location: "", targetDate: "", additionalNotes: "" }); setDone(null); }}
                className="font-mono text-xs text-slate-600 hover:text-slate-400 transition-colors">
                Submit another request
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
