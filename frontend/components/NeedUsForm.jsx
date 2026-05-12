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
  const [form, setForm] = useState({ serviceName: "", contactPerson: userName || "", whatsapp: "", location: "", additionalNotes: "" });
  const [selectedSlots, setSelectedSlots] = useState({}); // { "date-hour": true }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [publicBookings, setPublicBookings] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchBookings = useCallback(() => {
    api.get("/services/bookings")
      .then(res => setPublicBookings(res.data.bookings || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchBookings();
    // Background polling every 20s to stay "real-time" without excessive load
    const interval = setInterval(fetchBookings, 20000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  // Distribute computing: Pre-index bookings for O(1) lookup during render
  const bookingMap = useMemo(() => {
    const map = {};
    publicBookings.forEach(b => {
      const bDate = new Date(b.targetDate).toISOString().split('T')[0];
      // Store a range or discrete hours
      const startH = parseInt(b.startTime.split(':')[0]);
      const endH = parseInt(b.endTime.split(':')[0]);
      for (let h = startH; h < endH; h++) {
        map[`${bDate}-${h}`] = b.status;
      }
    });
    return map;
  }, [publicBookings]);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); setError(""); }

  const toggleSlot = (dStr, hour) => {
    const key = `${dStr}-${hour}`;
    const currentlySelectedCount = Object.values(selectedSlots).filter(Boolean).length;
    
    if (!selectedSlots[key] && currentlySelectedCount >= 10) {
      setError("Maximum 10 slots per booking. Please create another order for additional slots.");
      return;
    }

    setSelectedSlots((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
    setError("");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const selectedArray = Object.entries(selectedSlots)
      .filter(([_, val]) => val)
      .map(([key]) => {
        const [date, hour] = key.split(/-(?=\d+$)/); // Split on last dash
        return { date, hour: parseInt(hour) };
      });

    if (selectedArray.length === 0) return setError("Please select at least one time slot.");
    setError(""); setLoading(true);
    try {
      // Map slots to backend format
      const slots = selectedArray.map(s => ({
        date: s.date,
        startTime: s.hour.toString().padStart(2, '0') + ":00",
        endTime: (s.hour + 1).toString().padStart(2, '0') + ":00"
      }));

      const res = await api.post("/services/request", {
        serviceType,
        ...form,
        slots
      });
      setDone(res.data);
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to submit.");
    } finally {
      setLoading(false);
    }
  }

  const HOURS_AM = [9, 10, 11, 12, 13, 14, 15, 16];
  const HOURS_PM = [17, 18, 19, 20, 21, 22, 23, 0];

  const getSlotStatus = (dStr, hour, dayOfWeek) => {
    if (dayOfWeek === 1) return "BUSY"; // Closed on Monday
    
    const status = bookingMap[`${dStr}-${hour}`];
    if (status) return "BUSY";

    if (selectedSlots[`${dStr}-${hour}`]) return "LOCK";

    return "READY";
  };

  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <section className={`w-full ${step === 1 ? 'max-w-4xl' : 'max-w-xl'} mx-auto px-4 py-16 transition-all duration-500`}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Kalceria Services</p>
        <h2 className="font-mono font-black text-4xl uppercase tracking-tighter text-white mb-2">Need Us?</h2>
        <div className="h-px w-16 bg-[#FF00FF] mb-8" />
      </motion.div>

      {/* Phase indicator */}
      <div className="flex items-center gap-3 mb-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-500 border ${
              step > i 
                ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                : step === i 
                  ? "bg-white/10 border-white/40 text-white" 
                  : "bg-white/5 backdrop-blur-md border-white/5 text-white/20"
            }`}>
              {step > i ? "✓" : i + 1}
            </div>
            {i < 2 && (
              <div className={`h-[2px] w-12 rounded-full transition-all duration-700 ${
                step > i ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "bg-white/5 backdrop-blur-sm"
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

              {/* Multi-Slot Heatmap Selection */}
              <div className="mt-4 p-6 bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl">
                <div className="flex flex-col lg:flex-row gap-10 mb-8">
                  {/* AM Grid */}
                  <div className="flex-1">
                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-white mb-3">09.00 - 16.00</p>
                    <div className="grid grid-cols-8 gap-1.5">
                      <div />
                      {Array.from({ length: 7 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i + (weekOffset * 7));
                        const dStr = date.toISOString().split('T')[0];
                        const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <span className="font-mono text-[7px] text-white/40">{dayLabel}</span>
                            <span className="font-mono text-[8px] text-white">{date.getDate()}</span>
                          </div>
                        );
                      })}
                      {HOURS_AM.map(h => (
                        <div key={h} className="contents">
                          <span className="font-mono text-[7px] text-white/50 flex items-center justify-end pr-1">{h.toString().padStart(2, '0')}</span>
                          {Array.from({ length: 7 }).map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() + i + (weekOffset * 7));
                            const dStr = date.toISOString().split('T')[0];
                            const status = getSlotStatus(dStr, h, date.getDay());
                            return (
                              <button
                                key={i}
                                type="button"
                                disabled={status === "BUSY"}
                                onClick={() => toggleSlot(dStr, h)}
                                onDoubleClick={() => toggleSlot(dStr, h)}
                                className={`aspect-square w-full rounded-[3px] border border-white/5 transition-all duration-300 cursor-pointer ${
                                  status === "BUSY" ? "bg-red-500/20 opacity-50 cursor-not-allowed" :
                                  status === "LOCK" ? "bg-[#FF00FF] shadow-[0_0_10px_rgba(255,0,255,0.5)] scale-105 z-10" :
                                  "bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-105"
                                }`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PM Grid */}
                  <div className="flex-1">
                    <p className="font-sans text-xs font-bold uppercase tracking-widest text-white mb-3">17.00 - 00.00</p>
                    <div className="grid grid-cols-8 gap-1.5">
                      <div />
                      {Array.from({ length: 7 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i + (weekOffset * 7));
                        const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <span className="font-mono text-[7px] text-white/40">{dayLabel}</span>
                            <span className="font-mono text-[8px] text-white">{date.getDate()}</span>
                          </div>
                        );
                      })}
                      {HOURS_PM.map(h => (
                        <div key={h} className="contents">
                          <span className="font-mono text-[7px] text-white/50 flex items-center justify-end pr-1">{h === 0 ? "00" : h.toString().padStart(2, '0')}</span>
                          {Array.from({ length: 7 }).map((_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() + i + (weekOffset * 7));
                            const dStr = date.toISOString().split('T')[0];
                            const status = getSlotStatus(dStr, h, date.getDay());
                            return (
                              <button
                                key={i}
                                type="button"
                                disabled={status === "BUSY"}
                                onClick={() => toggleSlot(dStr, h)}
                                onDoubleClick={() => toggleSlot(dStr, h)}
                                className={`aspect-square w-full rounded-[3px] border border-white/5 transition-all duration-300 cursor-pointer ${
                                  status === "BUSY" ? "bg-red-500/20 opacity-50 cursor-not-allowed" :
                                  status === "LOCK" ? "bg-[#FF00FF] shadow-[0_0_10px_rgba(255,0,255,0.5)] scale-105 z-10" :
                                  "bg-emerald-500/10 hover:bg-emerald-500/20 hover:scale-105"
                                }`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend: Just under the map */}
                <div className="flex flex-wrap justify-center gap-10 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-[4px] bg-emerald-500/20 border border-emerald-500/30" />
                    <span className="font-mono text-[10px] uppercase text-slate-400 tracking-[0.2em] font-black">READY</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-[4px] bg-red-500/20 border border-red-500/30" />
                    <span className="font-mono text-[10px] uppercase text-slate-400 tracking-[0.2em] font-black">BUSY</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-[4px] bg-[#FF00FF] shadow-[0_0_12px_rgba(255,0,255,0.7)]" />
                    <span className="font-mono text-[10px] uppercase text-slate-400 tracking-[0.2em] font-black">LOCK</span>
                  </div>
                </div>

                {/* Heatmap Footer: Week Navigation */}
                <div className="pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between bg-white/5 px-6 py-3 rounded-xl border border-white/5 shadow-inner">
                    <span className="font-mono text-[11px] text-white tracking-[0.3em] uppercase font-black italic">Temporal Segment: Week {weekOffset + 1}</span>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-base border border-white/10 bg-black/20">←</button>
                      <button type="button" onClick={() => setWeekOffset(weekOffset + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-base border border-white/10 bg-black/20">→</button>
                    </div>
                  </div>
                </div>
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
                <button type="submit" disabled={loading || !isLoggedIn || Object.values(selectedSlots).filter(Boolean).length === 0}
                  className="flex-[2] py-3.5 font-sans font-extrabold text-sm uppercase tracking-wider text-black bg-white hover:bg-[#FF00FF] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={CLIP}>
                  {loading ? "Submitting..." : Object.values(selectedSlots).filter(Boolean).length === 0 ? "Select Hours" : "Submit Request"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 2: Done */}
        {step === 2 && done && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl mx-auto mb-6 shadow-[0_0_20px_rgba(16,185,129,0.3)]">✓</div>
              <h3 className="font-sans font-black text-2xl uppercase tracking-tighter text-white mb-2">Transmission Received</h3>
              <p className="font-sans text-sm text-slate-400 mb-8">Redirecting to operational headquarters.</p>
              
              <div className="flex flex-col items-center gap-6 mb-10">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText("0811811811");
                    alert("WA Number copied to clipboard: 0811811811");
                  }}
                  className="font-sans text-xs text-[#3b82f6] underline underline-offset-4 decoration-[#3b82f6]/30 hover:decoration-[#3b82f6] uppercase tracking-widest transition-all"
                >
                  CLICK ME !
                </button>

                <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:scale-105 transition-transform duration-500">
                  <img src="/wa_logo.png" alt="WhatsApp" className="w-32 h-32 object-contain" />
                </a>
              </div>

              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => { setStep(0); setServiceType(""); setForm({ serviceName: "", contactPerson: userName || "", whatsapp: "", location: "", additionalNotes: "" }); setDone(null); }}
                  className="px-12 py-3 bg-emerald-500 text-black font-sans font-black uppercase text-sm rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-all"
                >
                  OK
                </button>
                <button 
                  onClick={() => { /* Close logic if any */ }}
                  className="px-6 py-3 bg-white/5 text-slate-500 font-sans font-black uppercase text-xs rounded-xl border border-white/5 hover:text-red-500 transition-all"
                >
                  NO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
