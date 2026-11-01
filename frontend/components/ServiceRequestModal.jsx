"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Field } from "./service-request/FormControls";
import api from "@/lib/api";
import { hasUserSession } from "@/lib/session";
import { useHasMounted } from "@/hooks/useHasMounted";

const SERVICE_TYPES = [
  { id: "EO", label: "Event Organizer", desc: "Full EO service for your automotive event" },
  { id: "SHOOTING", label: "Car Shoot", desc: "Professional photography & videography" },
  { id: "HOST_EVENT", label: "Host Event", desc: "We host and manage your event end-to-end" },
];

export default function ServiceRequestModal({ onClose, userName, onRequireAuth }) {
  const [step, setStep] = useState(0); // 0: Type, 1: Details, 2: Done
  const [weekOffset, setWeekOffset] = useState(0);
  const mounted = useHasMounted();
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
      const startH = parseInt(b.startTime.split(':')[0], 10);
      const endH = parseInt(b.endTime.split(':')[0], 10);
      if (startH === 0 && endH === 1) {
        map[`${bDate}-24`] = b.status;
        return;
      }
      for (let h = startH; h < (endH === 0 ? 24 : endH); h++) {
        map[`${bDate}-${h}`] = b.status;
      }
    });
    return map;
  }, [publicBookings]);

  // Form Validation
  const isFormValid = Boolean(
    form.serviceName && 
    form.contactPerson && 
    form.whatsapp && 
    form.location && 
    Object.values(selectedSlots).filter(Boolean).length > 0
  );

  const isLoggedIn = hasUserSession();

  useEffect(() => {
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
    if (!isFormValid) return;

    setLoading(true);
    try {
      const selectedArray = Object.entries(selectedSlots)
        .filter(([, val]) => val)
        .map(([key]) => {
          const [date, hour] = key.split(/-(?=\d+$)/);
          return { date, hour: parseInt(hour, 10) };
        });

      const slots = selectedArray.map(s => ({
        date: s.date,
        startTime: (s.hour === 24 ? 0 : s.hour).toString().padStart(2, '0') + ":00",
        endTime: (s.hour === 23 ? 0 : s.hour === 24 ? 1 : s.hour + 1).toString().padStart(2, '0') + ":00"
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

  // ── Synchronize to WIB (Asia/Jakarta, UTC+7) ──────────────────────────────
  const getWibNow = () => {
    const now = new Date();
    const wibFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = wibFormatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value;
    const y = parseInt(getPart("year") || "2026", 10);
    const m = parseInt(getPart("month") || "11", 10) - 1;
    const d = parseInt(getPart("day") || "1", 10);
    return new Date(y, m, d);
  };

  // High-Fidelity Heatmap Matrix
  const hoursA = Array.from({ length: 8 }, (_, i) => 9 + i);  // 09:00 - 16:00
  const hoursB = Array.from({ length: 8 }, (_, i) => 17 + i); // 17:00 - 00:00
  
  const getDays = () => {
    const days = [];
    const startOfWeek = getWibNow();
    startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7));
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayNum}`;
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "Asia/Jakarta" }),
        dayNum: d.getDate(),
        isMonday: d.getDay() === 1
      });
    }
    return days;
  };

  const currentMonthYear = useMemo(() => {
    const startOfWeek = getWibNow();
    startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7));
    const month = startOfWeek.toLocaleDateString("en-US", { month: "long", timeZone: "Asia/Jakarta" });
    const year = startOfWeek.toLocaleDateString("en-US", { year: "numeric", timeZone: "Asia/Jakarta" });
    return `${month}, ${year}`;
  }, [weekOffset]);

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
      <div className="grid grid-cols-[14px_repeat(7,1fr)] xs:grid-cols-[18px_repeat(7,1fr)] sm:grid-cols-[25px_repeat(7,1fr)] gap-0.5 sm:gap-1">
        <div />
        {days.map((d, i) => (
          <div key={i} className={`text-center font-sans text-[6px] xs:text-[7px] sm:text-[8px] font-black uppercase ${d.isMonday ? 'text-red-400' : 'text-white'} leading-tight`}>
            {d.label}<br/>{d.dayNum}
          </div>
        ))}
        {hourList.map((h) => (
          <React.Fragment key={h}>
            <div className="text-[6px] xs:text-[7px] sm:text-[8px] font-black text-white flex items-center justify-end pr-0.5 xs:pr-1 sm:pr-1.5 font-sans leading-none">
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

  const buttonStyle = "w-full py-4 rounded-xl font-sans font-black uppercase tracking-tight text-base sm:text-lg transition-all duration-300 flex items-center justify-center gap-2";

  const handleCancel = async () => {
    if (!done?.bookingId) { onClose(); return; }
    setLoading(true);
    try {
      await api.delete(`/services/request/${done.bookingId}`, {
        headers: done.cancelToken ? { "x-cancel-token": done.cancelToken } : undefined,
      });
    } catch (err) {
      console.warn("Cancel request non-blocking notice:", err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  // Format Booking Details
  const serviceLabel = useMemo(() => {
    return SERVICE_TYPES.find(s => s.id === form.serviceType)?.label || form.serviceType || "—";
  }, [form.serviceType]);

  const bookingSchedule = useMemo(() => {
    const rawKeys = Object.entries(selectedSlots).filter(([, val]) => val).map(([k]) => k);
    if (!rawKeys.length) return { dates: "—", hours: "—" };

    const dateMap = {};
    rawKeys.forEach(k => {
      const [date, hourStr] = k.split(/-(?=\d+$)/);
      const h = parseInt(hourStr, 10);
      if (!dateMap[date]) dateMap[date] = [];
      dateMap[date].push(h);
    });

    const sortedDates = Object.keys(dateMap).sort();
    const formattedDatesList = sortedDates.map(d => {
      const [y, m, day] = d.split("-").map(Number);
      const dObj = new Date(y, m - 1, day);
      return dObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }).join(", ");

    const formattedHoursList = sortedDates.map(d => {
      const hours = dateMap[d].sort((a, b) => a - b);
      const blocks = [];
      let start = hours[0];
      let prev = hours[0];

      for (let i = 1; i < hours.length; i++) {
        if (hours[i] === prev + 1) {
          prev = hours[i];
        } else {
          blocks.push({ start, end: prev + 1 });
          start = hours[i];
          prev = hours[i];
        }
      }
      blocks.push({ start, end: prev + 1 });

      const blockStrs = blocks.map(b => {
        const sStr = (b.start === 24 ? 0 : b.start).toString().padStart(2, "0") + ":00";
        const eStr = (b.end === 24 ? "00" : b.end === 25 ? "01" : b.end).toString().padStart(2, "0") + ":00";
        return `${sStr} - ${eStr}`;
      });

      const [y, m, day] = d.split("-").map(Number);
      const dObj = new Date(y, m - 1, day);
      const shortDate = dObj.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

      if (sortedDates.length === 1) {
        return blockStrs.join(", ") + " WIB";
      } else {
        return `${shortDate} (${blockStrs.join(", ")} WIB)`;
      }
    }).join("; ");

    return { dates: formattedDatesList, hours: formattedHoursList };
  }, [selectedSlots]);

  const truncatedNotes = useMemo(() => {
    if (!form.additionalNotes) return "";
    const trimmed = form.additionalNotes.trim();
    return trimmed.length > 50 ? trimmed.slice(0, 50) + "..." : trimmed;
  }, [form.additionalNotes]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={`relative z-10 w-full ${step === 1 ? "max-w-[95%] xl:max-w-[1320px]" : "max-w-[95%] sm:max-w-[540px]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Conic Glow Overlay */}
        <div className="absolute -inset-[2px] rounded-[32px] z-0 overflow-hidden opacity-30 pointer-events-none">
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

        {/* Main Card Container: Semi-transparent (~20% translucency) for authentic glassmorphism */}
        <div className="relative z-10 w-full max-h-[92vh] overflow-y-auto custom-scrollbar bg-black/80 backdrop-blur-2xl border border-white/15 rounded-[30px] flex flex-col shadow-[0_60px_120px_rgba(0,0,0,0.85)]">
          
          {/* Dynamic Ambient Blobs: 60% Black, 25% Pink, 15% Yellow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[30px]">
            {/* 60% Dominant Dynamic Black Blobs */}
            <motion.div
              animate={{ 
                x: [-30, 30, -30], 
                y: [-20, 25, -20],
                scale: [1, 1.15, 1],
              }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[480px] bg-black/95 blur-[70px] rounded-full z-[1]"
            />
            <motion.div
              animate={{ 
                x: [25, -25, 25], 
                y: [30, -30, 30],
                scale: [1.1, 0.95, 1.1],
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-16 -left-16 w-[420px] h-[420px] bg-black/90 blur-[80px] rounded-full z-[1]"
            />
            <motion.div
              animate={{ 
                x: [-20, 20, -20], 
                y: [20, -20, 20],
              }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-16 -right-16 w-[380px] h-[380px] bg-black/95 blur-[65px] rounded-full z-[1]"
            />

            {/* 25% Pink / Magenta Dynamic Blobs */}
            <motion.div
              animate={{ 
                x: [-30, 30, -30], 
                y: [-15, 20, -15],
              }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-12 -left-12 w-[300px] h-[300px] bg-[#FF00FF]/25 blur-[75px] rounded-full z-[2]"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                x: [15, -15, 15],
              }}
              transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-1/3 -right-10 w-[240px] h-[240px] bg-[#EC4899]/20 blur-[65px] rounded-full z-[2]"
            />

            {/* 15% Yellow Dynamic Blob */}
            <motion.div
              animate={{ 
                x: [20, -20, 20], 
                y: [20, -20, 20],
                scale: [0.95, 1.1, 0.95],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-10 right-1/4 w-[220px] h-[220px] bg-[#FACC15]/20 blur-[70px] rounded-full z-[2]"
            />
          </div>
          
          {/* Top Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/5 overflow-hidden z-20">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              className="h-full bg-gradient-to-r from-[#FF00FF] via-[#FACC15] to-[#FF00FF] bg-[length:200%_auto]"
              transition={{ duration: 0.8, ease: "circOut" }}
            />
          </div>

          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar { width: 3px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
          `}</style>

          {/* Unified Header with Close Button */}
          <div className="p-6 sm:p-8 pb-3 flex justify-between items-center relative z-20">
            {step === 1 ? (
              <div className="flex flex-col">
                <h2 className="font-sans text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">
                  Project <span className="text-white">Details</span>
                </h2>
                <p className="text-white/85 text-xs leading-snug font-sans max-w-[500px]">
                  Configure mission parameters & select your operational window.
                </p>
              </div>
            ) : (
              <h2 className="font-sans text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none">
                Need Our <span className="text-white">Help?</span>
              </h2>
            )}
            <button 
              type="button"
              onClick={onClose} 
              className="group p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 border border-white/10 cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="p-6 pt-2 pb-6 relative z-20">
            <AnimatePresence mode="wait">
              {/* ── STEP 0: SERVICE TYPE SELECTION ── */}
              {step === 0 && (
                <motion.div 
                  key="step0" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-[380px] flex flex-col"
                >
                  <p className="text-white font-medium text-xs sm:text-sm mb-6 leading-relaxed font-sans max-w-[440px]">
                    Select the operational tier for your project. Our crew handles everything from creative shoots to full-scale event infrastructure.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3.5 mb-auto">
                    {SERVICE_TYPES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setField("serviceType", form.serviceType === s.id ? "" : s.id)}
                        className={`group relative text-left p-5 rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                          form.serviceType === s.id 
                          ? "bg-white/15 border-white shadow-[0_0_25px_rgba(255,255,255,0.15)] ring-1 ring-white/50" 
                          : "bg-white/[0.05] border-white/20 hover:border-white/40 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="relative flex items-center justify-between gap-6">
                          <div className="flex-1">
                            <p className="font-sans font-bold text-sm sm:text-base uppercase tracking-wider text-white">
                              {s.label}
                            </p>
                            <p className="font-sans text-xs text-white/85 font-medium mt-1 leading-snug">
                              {s.desc}
                            </p>
                          </div>
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                            form.serviceType === s.id 
                            ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                            : "border-white/30 group-hover:border-white/60"
                          }`}>
                            {form.serviceType === s.id ? (
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7"></path>
                              </svg>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button 
                    type="button"
                    onClick={handleNext}
                    disabled={!form.serviceType}
                    className={`${buttonStyle} mt-8 bg-white text-black hover:bg-slate-200 disabled:opacity-30 cursor-pointer`}
                  >
                    NEXT
                  </button>
                </motion.div>
              )}

              {/* ── STEP 1: PROJECT DETAILS & HEATMAP ── */}
              {step === 1 && (
                <motion.div 
                  key="step1" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-4 items-center origin-top w-full"
                >
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full items-center">
                    <div className="flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center w-full">
                      {/* Column 1: Intel Hub */}
                      <div className="w-full max-w-[384px] bg-black/50 backdrop-blur-xl border border-white/15 rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-1">
                          <Field id="serviceName" label="Request Title" type="text" placeholder="Project name/ID" val={form.serviceName} onChange={setField} required />
                          <Field id="contactPerson" label="Operator Name" type="text" placeholder="Full name" val={form.contactPerson} onChange={setField} required />
                          <Field id="whatsapp" label="Comms Channel" type="tel" placeholder="+62..." val={form.whatsapp} onChange={setField} required />
                          <Field id="location" label="Deployment Area" type="text" placeholder="City / Venue" val={form.location} onChange={setField} required />
                          <Field id="additionalNotes" label="Technical Brief" type="textarea" placeholder="Specific requirements..." val={form.additionalNotes} onChange={setField} maxLength={50} />
                        </div>
                      </div>
                      
                      {/* Temporal Matrix Section */}
                      <div className="flex flex-col gap-4 md:gap-6 w-full max-w-[736px] items-center">
                        <div className="flex flex-row gap-2 sm:gap-4 w-full justify-center items-start">
                          {/* Shift 1 */}
                          <div className="w-[165px] xs:w-[220px] sm:w-[360px] bg-black/50 border border-white/15 rounded-[12px] sm:rounded-[28px] p-2 sm:p-8 backdrop-blur-xl shadow-2xl relative h-fit overflow-hidden">
                            <div className="relative z-10">
                              <p className="font-sans text-white text-[10px] sm:text-[13px] font-bold mb-2 sm:mb-4 tracking-widest uppercase">09.00 - 16.00 WIB</p>
                              <div className="overflow-y-auto max-h-[180px] sm:max-h-[320px] pr-1 sm:pr-2 custom-scrollbar">
                                {mounted ? renderGrid(hoursA) : null}
                              </div>
                            </div>
                          </div>

                          {/* Shift 2 */}
                          <div className="w-[165px] xs:w-[220px] sm:w-[360px] bg-black/50 border border-white/15 rounded-[12px] sm:rounded-[28px] p-2 sm:p-8 backdrop-blur-xl shadow-2xl relative h-fit overflow-hidden">
                            <div className="relative z-10">
                              <p className="font-sans text-white text-[10px] sm:text-[13px] font-bold mb-2 sm:mb-4 tracking-widest uppercase">17.00 - 00.00 WIB</p>
                              <div className="overflow-y-auto max-h-[180px] sm:max-h-[320px] pr-1 sm:pr-2 custom-scrollbar">
                                {mounted ? renderGrid(hoursB) : null}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Extended Legend & Counter: Replaced "|" with Month Year e.g. November, 2026 */}
                        <div className="flex flex-row items-center justify-between gap-2 sm:gap-5 text-[9px] sm:text-[11px] font-black text-white font-sans uppercase tracking-[0.1em] bg-black/50 px-4 sm:px-10 py-3 sm:py-6 rounded-full border border-white/15 shadow-2xl w-full mt-2 sm:mt-4">
                          <div className="flex flex-row items-center gap-2 sm:gap-8 flex-wrap">
                            <div className="flex items-center gap-1 sm:gap-4 text-white">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-emerald-500 border border-emerald-400 rounded-[2px] sm:rounded-[4px]" /> 
                              READY
                            </div>
                            <div className="flex items-center gap-1 sm:gap-4 text-white">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 border border-red-400 rounded-[2px] sm:rounded-[4px]" /> 
                              BUSY
                            </div>
                            <div className="flex items-center gap-1 sm:gap-4 text-white">
                              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#FF00FF] border border-[#FF00FF] shadow-[0_0_15px_#FF00FF] rounded-[2px] sm:rounded-[4px]" /> 
                              LOCK
                            </div>
                          </div>
                          
                          <div className="flex flex-row items-center gap-2 sm:gap-4">
                            <span className="text-white font-sans font-semibold normal-case tracking-normal text-[10px] sm:text-[12px] whitespace-nowrap">
                              {currentMonthYear}
                            </span>
                            <span className="text-white/80 font-sans font-medium normal-case tracking-normal text-[10px] sm:text-[12px] whitespace-nowrap">
                              Week {weekOffset + 1}
                            </span>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20 cursor-pointer" aria-label="Previous Week">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                              </button>
                              <button type="button" onClick={() => setWeekOffset(weekOffset + 1)} className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20 cursor-pointer" aria-label="Next Week">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Footer Navigation */}
                    <div className="flex gap-4 sm:gap-6 max-w-[900px] mx-auto w-full mt-2">
                      <button 
                        type="button" 
                        onClick={() => setStep(0)} 
                        className="flex-1 py-3.5 sm:py-6 bg-white/10 text-white font-sans font-bold uppercase text-[10px] sm:text-[12px] tracking-[0.15em] sm:tracking-[0.25em] rounded-[20px] sm:rounded-[25px] hover:bg-white/20 transition-all border border-white/20 cursor-pointer"
                      >
                        ← BACK
                      </button>
                      <button 
                        type="submit" 
                        disabled={loading || !isFormValid} 
                        className={`${buttonStyle} flex-[2] sm:flex-[2.5] py-3.5 sm:py-6 rounded-[20px] sm:rounded-[25px] ${isFormValid ? "bg-white text-black opacity-100 shadow-[0_0_50px_rgba(255,255,255,0.4)] cursor-pointer" : "bg-white/10 text-white/30 cursor-not-allowed"}`}
                      >
                        {loading ? "SENDING..." : "NEXT"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 2: CONFIRMATION & BOOKING DETAILS ── */}
              {step === 2 && done && (
                <motion.div 
                  key="step2" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-4 sm:py-6 flex flex-col items-center text-center w-full"
                >
                  {/* Transmission Received Header (Enlarged to cover upper half responsively) */}
                  <h3 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none text-center">
                    Transmission<br className="hidden xs:inline" /> Received
                  </h3>

                  {/* Description in firm white */}
                  <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed max-w-[460px] text-center mt-3 sm:mt-4">
                    System link established. Redirecting to operational headquarters via WhatsApp:
                  </p>

                  {/* Hyperlink: Sky Blue, NOT bold, NOT all capital */}
                  <a 
                    href={done.whatsappUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-sans font-normal text-sm sm:text-base md:text-lg text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors my-2.5 cursor-pointer"
                  >
                    Yes & Confirm via WhatsApp
                  </a>

                  {/* Booking Details Card with Clean Rows and Colon Alignment */}
                  <div className="w-full max-w-[460px] bg-black/50 border border-white/15 rounded-2xl p-4 sm:p-5 text-left my-3 backdrop-blur-md shadow-xl">
                    <p className="font-sans font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-3 pb-2 border-b border-white/10 flex items-center justify-between">
                      <span>Booking Details:</span>
                      <span className="text-[10px] text-white/50 font-normal">ID #{done.bookingId ? done.bookingId.slice(-6) : "NEW"}</span>
                    </p>
                    <div className="space-y-2.5 font-sans text-xs sm:text-sm">
                      <div className="grid grid-cols-[125px_12px_1fr] items-start">
                        <span className="font-bold text-white">Service</span>
                        <span className="text-white/60 text-center">:</span>
                        <span className="text-white font-normal break-words">{serviceLabel}</span>
                      </div>
                      <div className="grid grid-cols-[125px_12px_1fr] items-start">
                        <span className="font-bold text-white">Request Title</span>
                        <span className="text-white/60 text-center">:</span>
                        <span className="text-white font-normal break-words">{form.serviceName || "—"}</span>
                      </div>
                      <div className="grid grid-cols-[125px_12px_1fr] items-start">
                        <span className="font-bold text-white">Operator Name</span>
                        <span className="text-white/60 text-center">:</span>
                        <span className="text-white font-normal break-words">{form.contactPerson || "—"}</span>
                      </div>
                      <div className="grid grid-cols-[125px_12px_1fr] items-start">
                        <span className="font-bold text-white">WhatsApp</span>
                        <span className="text-white/60 text-center">:</span>
                        <span className="text-white font-normal break-words">{form.whatsapp || "—"}</span>
                      </div>
                      <div className="grid grid-cols-[125px_12px_1fr] items-start">
                        <span className="font-bold text-white">Deployment Area</span>
                        <span className="text-white/60 text-center">:</span>
                        <span className="text-white font-normal break-words">{form.location || "—"}</span>
                      </div>
                      <div className="grid grid-cols-[125px_12px_1fr] items-start">
                        <span className="font-bold text-white">Selected Date</span>
                        <span className="text-white/60 text-center">:</span>
                        <span className="text-white font-normal break-words">{bookingSchedule.dates}</span>
                      </div>
                      <div className="grid grid-cols-[125px_12px_1fr] items-start">
                        <span className="font-bold text-white">Selected Hours</span>
                        <span className="text-white/60 text-center">:</span>
                        <span className="text-white font-normal break-words">{bookingSchedule.hours}</span>
                      </div>
                      {form.additionalNotes ? (
                        <div className="grid grid-cols-[125px_12px_1fr] items-start">
                          <span className="font-bold text-white">Notes</span>
                          <span className="text-white/60 text-center">:</span>
                          <span className="text-white font-normal break-words">{truncatedNotes}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Middle Bottom Cancel Action: NOT bold, NOT all capital */}
                  <div className="mt-2 pt-2 flex flex-col items-center">
                    <button 
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="font-sans font-normal text-sm sm:text-base text-white/50 hover:text-red-400 transition-colors cursor-pointer py-1.5 focus:outline-none"
                    >
                      {loading ? "Cancelling..." : "Cancel"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Error Message: Same style as Login Form (Red bg, border, ✕, Arial font, not all capital, not bold, NO red dot, NO Sign In button) */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 p-3 bg-red-500/15 border border-red-500/30 rounded-md flex items-center gap-2.5 backdrop-blur-md z-[10000] shadow-[0_10px_25px_rgba(220,38,38,0.25)] max-w-[90vw]">
          <span className="text-red-400 text-xs font-mono select-none">✕</span>
          <span className="font-sans text-xs text-red-200 font-normal tracking-normal select-none">
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-white/60 hover:text-white text-xs ml-2 font-mono cursor-pointer"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
