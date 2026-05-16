"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

// ── Shared Components ────────────────────────────────────────────────────────

const ICONS = {
  title: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h10M7 12h10m-10 5h7"></path></svg>,
  user: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>,
  whatsapp: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>,
  location: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>,
  calendar: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>,
  notes: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>,
};

function StepIndicator({ total, current }) {
  return (
    <div className="flex items-center gap-2.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black font-sans transition-all duration-500 border ${
            i < current ? "bg-[#FF00FF] border-[#FF00FF] text-white shadow-[0_0_12px_rgba(255,0,255,0.4)]" :
            i === current ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]" :
            "bg-white/5 backdrop-blur-md border-white/5 text-white/30"
          }`}>
            {i + 1}
          </div>
          {i < total - 1 && (
            <div className="relative h-[1.5px] w-6 bg-white/5 backdrop-blur-sm overflow-hidden rounded-full">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: i < current ? "0%" : "-100%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-[#FF00FF] to-[#FACC15]"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, type, placeholder, options, val, onChange, id, required = false }) {
  const [focused, setFocused] = useState(false);
  const isSelect = type === "select";
  const isTextarea = type === "textarea";

  const baseClasses = `
    w-full bg-[#0c1528]/50 border rounded-xl px-4 py-3 
    font-sans text-[12px] text-white outline-none transition-all duration-300 placeholder:text-slate-600
    ${focused ? "border-[#FF00FF] shadow-[0_0_15px_rgba(255,0,255,0.15)] bg-[#0f1a30]" : "border-slate-800/50 hover:border-slate-700 bg-[#0c1528]/30"}
  `;

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-1.5 font-sans text-[11px] font-bold text-slate-400 flex items-center gap-1">
        {label}
      </label>
      {isSelect ? (
        <select 
          value={val} 
          onChange={(e) => onChange(id, e.target.value)} 
          onFocus={() => setFocused(true)} 
          onBlur={() => setFocused(false)} 
          className={baseClasses}
          required={required}
        >
          <option value="">Select Option…</option>
          {options.map((o) => <option key={o.id || o} value={o.id || o}>{o.label || o}</option>)}
        </select>
      ) : isTextarea ? (
        <textarea 
          rows={3} 
          placeholder={placeholder} 
          value={val} 
          onChange={(e) => onChange(id, e.target.value)} 
          onFocus={() => setFocused(true)} 
          onBlur={() => setFocused(false)} 
          className={baseClasses} 
          required={required}
        />
      ) : (
        <input 
          type={type} 
          placeholder={placeholder} 
          value={val} 
          onChange={(e) => onChange(id, e.target.value)} 
          onFocus={() => setFocused(true)} 
          onBlur={() => setFocused(false)} 
          className={baseClasses} 
          required={required} 
        />
      )}
    </div>
  );
}

const SERVICE_TYPES = [
  { id: "EO", label: "Event Organizer", desc: "Full EO service for your automotive event" },
  { id: "SHOOTING", label: "Car Shoot", desc: "Professional photography & videography" },
  { id: "HOST_EVENT", label: "Host Event", desc: "We host and manage your event end-to-end" },
];

export default function ServiceRequestModal({ onClose, userName }) {
  const [step, setStep] = useState(0); // 0: Type, 1: Details, 2: Done
  const [weekOffset, setWeekOffset] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ 
    serviceType: "", 
    serviceName: "", 
    contactPerson: userName || "", 
    whatsapp: "", 
    location: "", 
    additionalNotes: "" 
  });
  const [selectedSlots, setSelectedSlots] = useState({}); // { "date-hour": true }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [publicBookings, setPublicBookings] = useState([]);

  const fetchBookings = useCallback(() => {
    api.get("/services/bookings")
      .then(res => setPublicBookings(res.data.bookings || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 20000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  // Distribute computing: Pre-index bookings
  const bookingMap = useMemo(() => {
    const map = {};
    publicBookings.forEach(b => {
      const bDate = new Date(b.targetDate).toISOString().split('T')[0];
      const startH = parseInt(b.startTime.split(':')[0]);
      const endH = parseInt(b.endTime.split(':')[0]);
      // Handle midnight wrap if necessary, though our slots are usually day-based
      for (let h = startH; h < (endH === 0 ? 24 : endH); h++) {
        map[`${bDate}-${h}`] = b.status;
      }
    });
    return map;
  }, [publicBookings]);

  // Form Validation (now includes checking if targetDate/time is selected)
  // Form Validation
  const isFormValid = form.serviceName && form.contactPerson && form.whatsapp && form.location && Object.values(selectedSlots).filter(Boolean).length > 0;

  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem("token");

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const setField = (id, val) => {
    setForm(p => ({ ...p, [id]: val }));
    setError("");
  };

  const handleNext = () => {
    if (!form.serviceType) { setError("Please select a service type."); return; }
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { setError("You must be logged in to apply."); return; }
    if (!isFormValid) return;

    setLoading(true);
    try {
      const selectedArray = Object.entries(selectedSlots)
        .filter(([_, val]) => val)
        .map(([key]) => {
          const [date, hour] = key.split(/-(?=\d+$)/);
          return { date, hour: parseInt(hour) };
        });

      const slots = selectedArray.map(s => ({
        date: s.date,
        startTime: s.hour.toString().padStart(2, '0') + ":00",
        endTime: (s.hour === 23 ? 0 : s.hour + 1).toString().padStart(2, '0') + ":00"
      }));

      const res = await api.post("/services/request", {
        ...form,
        slots
      });
      setDone(res.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  // ── High-Fidelity Heatmap Matrix ──────────────────────────────────────────
  const hoursA = Array.from({ length: 8 }, (_, i) => 9 + i);  // 09:00 - 16:00
  const hoursB = Array.from({ length: 8 }, (_, i) => 17 + i); // 17:00 - 00:00
  
  const getDays = () => {
    const days = [];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7));
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isMonday: d.getDay() === 1
      });
    }
    return days;
  };

  const toggleSlot = (dStr, hour) => {
    const key = `${dStr}-${hour}`;
    const currentlySelectedCount = Object.values(selectedSlots).filter(Boolean).length;

    if (!selectedSlots[key] && currentlySelectedCount >= 10) {
      setError("Maximum 10 slots per order. Please complete this transaction first.");
      return;
    }

    setSelectedSlots(prev => ({ ...prev, [key]: !prev[key] }));
    setError("");
  };

  const renderGrid = (hourList) => {
    const days = getDays();
    return (
      <div className="grid grid-cols-[25px_repeat(7,1fr)] gap-1">
        <div />
        {days.map((d, i) => (
          <div key={i} className={`text-center font-sans text-[7px] font-black uppercase ${d.isMonday ? 'text-red-500' : 'text-white'}`}>
            {d.label}<br/>{d.dayNum}
          </div>
        ))}
        {hourList.map((h) => (
          <React.Fragment key={h}>
            <div className="text-[7px] font-black text-white flex items-center justify-end pr-1.5 font-sans leading-none">
              {h === 24 ? "00" : h.toString().padStart(2, '0')}
            </div>
            {days.map((d, i) => {
              const isMonday = d.isMonday;
              const slotKey = `${d.date}-${h}`;
              const isSelected = !!selectedSlots[slotKey];
              const isBooked = !!bookingMap[slotKey]; 

              return (
                <div
                  key={i}
                  onClick={() => !isMonday && !isBooked && toggleSlot(d.date, h)}
                  onDoubleClick={() => !isMonday && !isBooked && toggleSlot(d.date, h)}
                  className={`
                    aspect-square w-full rounded-[2px] transition-all duration-200 cursor-pointer relative
                    ${isMonday ? "bg-red-500/30 border border-red-500/20 cursor-not-allowed" : 
                      isBooked ? "bg-white/5 opacity-5 cursor-not-allowed" :
                      isSelected ? "bg-[#FF00FF] shadow-[0_0_12px_#FF00FF] z-10 scale-110" :
                      "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/40"
                    }
                  `}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const buttonStyle = "w-full py-4 rounded-xl font-sans font-black uppercase tracking-tight text-lg transition-all duration-300 flex items-center justify-center gap-2";

  const handleCancel = async () => {
    if (!done?.bookingId) { onClose(); return; }
    setLoading(true);
    try {
      await api.delete(`/services/request/${done.bookingId}`);
      onClose();
    } catch (err) {
      setError("Failed to cancel request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 0.9, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className={`relative z-10 w-full ${step === 1 ? "max-w-[1320px]" : "max-w-[500px]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Conic Glow Overlay */}
        <div className="absolute -inset-[2px] rounded-[32px] z-0 overflow-hidden opacity-30">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]"
            style={{
              background: "conic-gradient(from 0deg, transparent 0%, #FF00FF 30%, transparent 50%, #FACC15 80%, transparent 100%)",
              filter: "blur(40px)"
            }}
          />
        </div>

        {/* Main Card Container */}
        <div className="relative z-10 w-full bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[30px] overflow-hidden flex flex-col shadow-[0_60px_120px_rgba(0,0,0,0.8)]">
          
          {/* Internal Cinematic Blobs (Register Form Style) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
            <motion.div
              animate={{ 
                x: [-20, 20, -20], 
                y: [-20, 20, -20],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-[#FF00FF]/20 blur-[80px] rounded-full"
            />
            <motion.div
              animate={{ 
                x: [20, -20, 20], 
                y: [20, -20, 20],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-20 -right-20 w-[350px] h-[350px] bg-[#FACC15]/15 blur-[90px] rounded-full"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-emerald-500/10 blur-[100px] rounded-full"
            />
          </div>
          
          {/* Top Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/5 overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              className="h-full bg-gradient-to-r from-[#FF00FF] via-[#FACC15] to-[#FF00FF] bg-[length:200%_auto]"
              transition={{ duration: 1, ease: "circOut" }}
              style={{ animation: "gradientMove 3s linear infinite" }}
            />
          </div>

          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar { width: 3px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
          `}</style>

          {/* Header Section */}
          <div className={`p-8 pb-0 flex justify-between items-center ${step === 1 ? "hidden" : "flex"}`}>
            <h2 className="font-sans text-3xl font-black text-white uppercase tracking-tight leading-none">
              Need Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Help?</span>
            </h2>
            <button 
              onClick={onClose} 
              className="group p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300"
            >
              <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="p-6 pt-4 pb-2">
            <div className={`flex items-start gap-12 ${step === 1 ? "mb-10" : ""}`}>
              <div className="flex-shrink-0">
                <StepIndicator total={3} current={step} />
              </div>
              {step === 1 && (
                <div className="flex flex-col pt-1">
                  <h2 className="font-sans text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
                    Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Details</span>
                  </h2>
                  <p className="text-slate-400 text-[11px] leading-tight font-sans max-w-[500px]">
                    Configure mission parameters & select your operational window.
                  </p>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div 
                  key="step0" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-[400px] flex flex-col"
                >
                  <p className="text-slate-400 text-[12px] mb-8 leading-relaxed font-sans max-w-[400px]">
                    Select the operational tier for your project. Our crew handles everything from creative shoots to full-scale event infrastructure.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4 mb-auto">
                    {SERVICE_TYPES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setField("serviceType", form.serviceType === s.id ? "" : s.id)}
                        className={`group relative text-left p-5 rounded-2xl border transition-all duration-500 overflow-hidden ${
                          form.serviceType === s.id 
                          ? "bg-[#FF00FF]/5 border-[#FF00FF]/40 shadow-[0_0_30px_rgba(255,0,255,0.05)]" 
                          : "bg-white/[0.02] border-white/5 hover:border-white/10"
                        }`}
                      >
                        {form.serviceType === s.id && (
                          <motion.div layoutId="glow" className="absolute inset-0 bg-gradient-to-br from-[#FF00FF]/5 to-transparent" />
                        )}

                        <div className="relative flex items-center justify-between gap-6">
                          <div className="flex-1">
                            <p className={`font-sans font-black text-[14px] uppercase tracking-wider transition-colors ${form.serviceType === s.id ? "text-white" : "text-slate-400 group-hover:text-white"}`}>
                              {s.label}
                            </p>
                            <p className="font-sans text-[11px] text-slate-500 transition-colors group-hover:text-slate-400 mt-1">{s.desc}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 ${
                            form.serviceType === s.id 
                            ? "bg-[#FF00FF] border-[#FF00FF] shadow-[0_0_15px_rgba(255,0,255,0.4)]" 
                            : "border-white/10 group-hover:border-white/20"
                          }`}>
                            {form.serviceType === s.id ? (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={handleNext}
                    disabled={!form.serviceType}
                    className={`${buttonStyle} mt-10 bg-white text-black hover:bg-slate-200 disabled:opacity-30`}
                  >
                    NEXT
                  </button>
                </motion.div>
              )}
              {step === 1 && (
                <motion.div 
                  key="step1" 
                  initial={{ opacity: 0, scale: 0.92 }} 
                  animate={{ opacity: 1, scale: 0.92 }} 
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="flex flex-col gap-4 items-center origin-top"
                >
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full items-center">
                    <div className="flex gap-6 items-start justify-center">
                      {/* Column 1: Intel Hub */}
                      <div className="w-[384px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 shadow-2xl relative overflow-hidden">
                        {/* Internal Red-Orange Atmospheric Blob */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-500/10 blur-[40px] rounded-full pointer-events-none" />
                        
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/10 to-transparent opacity-20" />
                        <div className="relative z-10 space-y-0.5">
                          <Field id="serviceName" label="Request Title" type="text" placeholder="Project name/ID" val={form.serviceName} onChange={setField} required />
                          <Field id="contactPerson" label="Operator Name" type="text" placeholder="Full name" val={form.contactPerson} onChange={setField} required />
                          <Field id="whatsapp" label="Comms Channel" type="tel" placeholder="+62..." val={form.whatsapp} onChange={setField} required />
                          <Field id="location" label="Deployment Area" type="text" placeholder="City / Venue" val={form.location} onChange={setField} required />
                          <Field id="additionalNotes" label="Technical Brief" type="textarea" placeholder="Specific requirements..." val={form.additionalNotes} onChange={setField} />
                        </div>
                      </div>
                      
                      {/* Temporal Matrix Section - ALIGNED TO HUB TOP */}
                      <div className="flex flex-col gap-6">
                        <div className="flex gap-4">
                          {/* Shift 1 */}
                          <div className="w-[360px] bg-white/5 border border-white/10 rounded-[28px] p-8 backdrop-blur-xl shadow-2xl relative h-fit overflow-hidden">
                            {/* Internal Red-Orange Atmospheric Blob */}
                            <div className="absolute -top-5 -left-5 w-24 h-24 bg-red-500/10 blur-[30px] rounded-full pointer-events-none" />
                            
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/20 to-transparent opacity-20" />
                            <div className="relative z-10">
                              <p className="font-sans text-white text-[13px] font-bold mb-4 tracking-widest uppercase">09.00 - 16.00</p>
                              <div className="overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
                                {mounted ? renderGrid(hoursA) : null}
                              </div>
                            </div>
                          </div>

                          {/* Shift 2 */}
                          <div className="w-[360px] bg-white/5 border border-white/10 rounded-[28px] p-8 backdrop-blur-xl shadow-2xl relative h-fit overflow-hidden">
                            {/* Internal Red-Orange Atmospheric Blob */}
                            <div className="absolute -bottom-5 -right-5 w-24 h-24 bg-orange-500/10 blur-[30px] rounded-full pointer-events-none" />
                            
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/20 to-transparent opacity-20" />
                            <div className="relative z-10">
                              <p className="font-sans text-white text-[13px] font-bold mb-4 tracking-widest uppercase">17.00 - 00.00</p>
                              <div className="overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
                                {mounted ? renderGrid(hoursB) : null}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Extended Legend & Counter */}
                        <div className="flex items-center justify-between gap-5 text-[11px] font-black text-white font-sans uppercase tracking-[0.1em] bg-white/5 px-10 py-6 rounded-full border border-white/10 shadow-2xl w-full mt-4">
                          <div className="flex items-center gap-8">
                            <div className="flex items-center gap-4">
                              <div className="w-3 h-3 bg-emerald-500 border border-emerald-400 rounded-[4px]" /> 
                              READY
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-3 h-3 bg-red-500 border border-red-400 rounded-[4px]" /> 
                              BUSY
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-3 h-3 bg-[#FF00FF] border border-[#FF00FF] shadow-[0_0_15px_#FF00FF] rounded-[4px]" /> 
                              LOCK
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-5">
                            <div className="w-[1px] h-5 bg-white/20" />
                            <span className="text-white font-sans italic normal-case tracking-normal text-[12px] opacity-100">Week {weekOffset + 1}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg></button>
                              <button type="button" onClick={() => setWeekOffset(weekOffset + 1)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Footer Navigation */}
                    <div className="flex gap-6 max-w-[900px] mx-auto w-full mt-2">
                      <button 
                        type="button" 
                        onClick={() => setStep(0)} 
                        className="flex-1 py-6 bg-white/5 text-slate-400 font-sans font-black uppercase text-[12px] tracking-[0.3em] rounded-[25px] hover:bg-white/10 transition-all border border-white/5"
                      >
                        ← BACK
                      </button>
                      <button 
                        type="submit" 
                        disabled={loading || !isFormValid} 
                        className={`${buttonStyle} flex-[2.5] py-6 rounded-[25px] ${isFormValid ? "bg-white text-black opacity-100 shadow-[0_0_50px_rgba(255,255,255,0.4)]" : "bg-white/10 text-white/20 cursor-not-allowed"}`}
                      >
                        {loading ? "SENDING..." : "NEXT"}
                      </button>
                    </div>

                    {error && (
                      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-xl z-[300]">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <p className="text-red-500 text-[9px] font-sans font-black uppercase tracking-widest">{error}</p>
                      </div>
                    )}
                  </form>
                </motion.div>
              )}









              {step === 2 && done && (
                <motion.div 
                  key="step2" 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-6 flex flex-col items-center text-center"
                >
                  <div className="space-y-6 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[28px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative transform translate-x-[10%]">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                      <svg className="w-10 h-10 text-emerald-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Transmission<br/>Received</h3>
                    <p className="text-slate-400 text-[12px] leading-relaxed font-sans max-w-[320px]">
                      System link established. Redirecting to operational headquarters via WhatsApp.
                    </p>
                  </div>

                  <div className="mt-8 flex flex-col items-center gap-6">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("0811811811");
                        alert("WA Number copied to clipboard: 0811811811");
                      }}
                      className="group relative flex flex-col items-center"
                    >
                      <div className="absolute inset-0 bg-emerald-500/20 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <motion.span 
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="font-sans text-[14px] text-cyan-400 underline underline-offset-8 decoration-cyan-400/30 hover:decoration-cyan-400 font-light transition-all uppercase tracking-[0.2em] cursor-pointer"
                      >
                        CLICK ME !
                      </motion.span>
                    </button>
                    <a 
                      href={done.whatsappUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="relative z-10 hover:scale-110 transition-transform duration-500"
                    >
                      <img 
                        src="/wa_logo.png" 
                        alt="WhatsApp" 
                        className="w-40 h-40 object-contain" 
                      />
                    </a>
                  </div>

                  <div className="mt-12 flex justify-center gap-4">
                    <button 
                      onClick={onClose}
                      className="group relative px-20 py-6 rounded-[24px] overflow-hidden transition-all duration-500"
                    >
                      <div className="absolute inset-0 bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors shadow-[0_0_40px_rgba(16,185,129,0.3)]" />
                      <div className="absolute inset-0 border border-emerald-500/40 group-hover:border-emerald-500/60 rounded-[24px]" />
                      <span className="relative z-10 font-sans font-black text-white uppercase tracking-tight text-[18px]">
                        OK
                      </span>
                    </button>

                    <button 
                      onClick={handleCancel}
                      disabled={loading}
                      className="group relative px-8 py-6 rounded-[24px] overflow-hidden transition-all duration-500"
                    >
                      <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
                      <div className="absolute inset-0 border border-white/10 group-hover:border-red-500/20 rounded-[24px]" />
                      
                      <span className="relative z-10 font-sans font-black text-white/40 group-hover:text-red-500 uppercase tracking-tight text-[14px]">
                        {loading ? "..." : "NO"}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
