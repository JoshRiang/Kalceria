"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { establishSession, hasUserSession } from "@/lib/session";
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

export function ApplyModal({
  events,
  startIndex = 0,
  isMobile,
  onClose,
  initialAction,
  initialRegistrationId,
  initialToken,
}) {
  const [idx, setIdx] = useState(startIndex);
  const [mode, setMode] = useState(hasUserSession() ? "account" : "guest");
  const [step, setStep] = useState(initialRegistrationId ? 2 : 1); // 1: Form Fill, 2: Review / Confirm / Cancel
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneData, setDoneData] = useState(null);
  const [hasConfirmedWa, setHasConfirmedWa] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(Boolean(initialAction === "confirm"));
  const [isWindowExpired, setIsWindowExpired] = useState(false);

  const event = events[idx];
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    identifier: "",
    session: event?.sessionOptions?.[0] || "",
  });

  // Handle incoming initialAction (cancel or confirm from email magic link)
  useEffect(() => {
    if (!initialRegistrationId) return;

    let active = true;
    setLoading(true);

    if (initialAction === "confirm") {
      api
        .post(`/events/registration/${initialRegistrationId}/confirm`, {}, {
          headers: initialToken ? { "x-manage-token": initialToken } : {},
        })
        .then((res) => {
          if (!active) return;
          const reg = res.data?.registration;
          if (reg?.event) {
            const foundIdx = events.findIndex((e) => e.id === reg.eventId);
            if (foundIdx >= 0) setIdx(foundIdx);
          }
          setDoneData({ registration: reg });
          setIsConfirmed(true);
          setStep(2);
        })
        .catch((err) => {
          if (!active) return;
          if (err.response?.data?.isConfirmed) {
            setIsConfirmed(true);
          }
          if (err.response?.data?.isExpired) {
            setIsWindowExpired(true);
          }
          const errMsg = err.response?.data?.error || "Gagal mengonfirmasi pendaftaran event.";
          setError(errMsg);
          setStep(2);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      // cancel inspection mode
      api
        .get(`/events/registration/${initialRegistrationId}`, {
          headers: initialToken ? { "x-manage-token": initialToken } : {},
        })
        .then((res) => {
          if (!active) return;
          const reg = res.data?.registration;
          if (reg?.event) {
            const foundIdx = events.findIndex((e) => e.id === reg.eventId);
            if (foundIdx >= 0) setIdx(foundIdx);
          }
          if (res.data?.isConfirmed || reg?.paymentStatus === "CONFIRMED") {
            setIsConfirmed(true);
          }
          setDoneData({ registration: reg, cancelToken: initialToken });
          setStep(2);
        })
        .catch((err) => {
          if (!active) return;
          if (err.response?.data?.isConfirmed) {
            setIsConfirmed(true);
          }
          setIsWindowExpired(true);
          const errMsg = err.response?.data?.error || "Batas waktu 3 menit untuk mengelola pendaftaran telah berakhir.";
          setError(errMsg);
          setStep(2);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [initialRegistrationId, initialAction, initialToken, events]);

  useEffect(() => {
    let active = true;
    api.get("/users/me")
      .then((res) => {
        if (!active) return;
        const me = res.data?.user;
        if (me) establishSession(me);
        if (me?.nickname || me?.name) {
          setForm((prev) => ({
            ...prev,
            identifier: prev.identifier || me.nickname || me.name,
            name: prev.name || me.name || "",
            email: prev.email || me.email || "",
            contact: prev.contact || me.phone || "",
          }));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (event && !initialRegistrationId) {
      setForm((f) => ({ ...f, session: event.sessionOptions?.[0] || "" }));
      setError("");
      setDoneData(null);
      setHasConfirmedWa(false);
    }
  }, [idx, event, initialRegistrationId]);

  const next = () => {
    if (step === 1) setIdx((p) => (p + 1) % events.length);
  };
  const prev = () => {
    if (step === 1) setIdx((p) => (p - 1 + events.length) % events.length);
  };

  // Step 1: Candidate Buffer Validation (pure state buffer, NO DATABASE INSERTION)
  function handleSubmit(e) {
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
      const rawDigits = form.contact.replace(/\D/g, "");
      if (rawDigits.length < 9) {
        setError("Please enter a valid WhatsApp number (+62 8xx...).");
        return;
      }
    }

    // Buffer candidate in memory and proceed to Part 2 gracefully!
    setStep(2);
  }

  // Handle WhatsApp action: Store in Backend ONLY when WhatsApp is clicked!
  const handleConfirmViaWa = async () => {
    if (doneData?.whatsappUrl && hasConfirmedWa) {
      if (typeof window !== "undefined") {
        window.open(doneData.whatsappUrl, "_blank");
      }
      return;
    }

    setLoading(true);
    setError("");

    let waWin = null;
    try {
      if (typeof window !== "undefined") {
        waWin = window.open("", "_blank");
      }
    } catch {}

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
      setHasConfirmedWa(true);

      if (waWin && !waWin.closed && res.data?.whatsappUrl) {
        waWin.location.href = res.data.whatsappUrl;
      } else if (res.data?.whatsappUrl && typeof window !== "undefined") {
        window.open(res.data.whatsappUrl, "_blank");
      }
    } catch (err) {
      if (waWin && !waWin.closed) {
        try { waWin.close(); } catch {}
      }
      const errMsg = err.response?.data?.error || err.message || "Registration failed.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // User Cancel Action: Dimmed loading buffer screen, delete from backend, auto-close form
  const handleCancelRegistration = async () => {
    const regId = initialRegistrationId || doneData?.registration?.id;
    const token = initialToken || doneData?.cancelToken;
    if (!regId) {
      onClose();
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      await api.delete(`/events/registration/${regId}`, {
        headers: token ? { "x-cancel-token": token } : {},
      });
      onClose();
    } catch (err) {
      setIsDeleting(false);
      const errMsg = err.response?.data?.error || err.message || "Gagal membatalkan pendaftaran.";
      setError(errMsg);
    }
  };

  const userEmail = form.email || doneData?.registration?.user?.email || "";
  const emailInboxUrl = (() => {
    const lower = String(userEmail).toLowerCase().trim();
    if (lower.includes("@gmail.com")) return "https://mail.google.com/mail/u/0/#search/Kalceria";
    if (lower.includes("@yahoo.com")) return "https://mail.yahoo.com";
    if (lower.includes("@outlook.com") || lower.includes("@hotmail.com")) return "https://outlook.live.com/mail";
    if (lower && lower.includes("@")) return `mailto:${lower}`;
    return "https://mail.google.com";
  })();

  const isCancelMode = Boolean(initialAction === "cancel" && !isConfirmed);

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
           <div className={`flex items-center justify-between mb-4 ${isMobile ? "px-6" : ""}`}>
              {step === 1 ? (
                <button type="button" onClick={prev} className="p-2 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none focus:outline-none">
                  <ChevronLeft />
                </button>
              ) : (
                <div className="w-9" />
              )}
              <div className="text-center flex-1">
                 <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white italic mb-0.5" style={{ textShadow: "2px 2px 0 #FF00FF" }}>
                   {isCancelMode ? "Cancel Booking" : isConfirmed ? "Booking Confirmed" : event?.title}
                 </h2>
                 <p className="text-[9px] text-slate-400 font-sans uppercase tracking-[0.2em] italic">
                   {isCancelMode ? "Operational window cancellation" : isConfirmed ? "Ticket secured & locked" : step === 2 ? (hasConfirmedWa ? "Transmission Received" : "Review Parameters") : "Secure your slot in the grid"}
                 </p>
              </div>
              {step === 1 ? (
                <button type="button" onClick={next} className="p-2 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none focus:outline-none">
                  <ChevronRight />
                </button>
              ) : (
                <div className="w-9" />
              )}
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

        {/* Step 2 (Review / Cancel / Confirmed) vs Step 1 (Form Fill) */}
        {step === 2 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-30 space-y-4 text-center py-1">
            {/* Order Parameters Summary */}
            <div className="bg-black/60 p-3.5 rounded-lg border border-white/10 backdrop-blur-md space-y-1.5 text-left text-xs font-sans shadow-inner">
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-slate-400 font-medium">Event:</span>
                <span className="text-white font-bold">{event?.title}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-slate-400 font-medium">Session:</span>
                <span className="text-white font-bold">{form.session || doneData?.registration?.selectedSession || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-slate-400 font-medium">Participant:</span>
                <span className="text-white font-bold">{mode === "account" ? form.identifier : (form.name || doneData?.registration?.user?.name || "—")}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-slate-400 font-medium">Email:</span>
                <span className="text-white font-bold">{userEmail || "—"}</span>
              </div>
              {form.contact && (
                <div className="flex justify-between border-b border-white/10 pb-1">
                  <span className="text-slate-400 font-medium">WhatsApp:</span>
                  <span className="text-white font-bold">{form.contact}</span>
                </div>
              )}
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-400 font-medium">Price:</span>
                <span className="text-emerald-400 font-bold">Rp {Number(event?.price || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Online Payment Link if available */}
            {doneData?.paymentCheckout?.checkoutUrl && (
              <a
                href={doneData.paymentCheckout.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-black font-black uppercase tracking-tight text-xs rounded-lg transition-all flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-2"
              >
                💳 Pay Online Now (QRIS / VA / E-Wallet)
              </a>
            )}

            {/* Cancel Mode from Magic Link */}
            {isCancelMode ? (
              <div className="space-y-4 pt-2">
                <p className="font-sans font-normal text-sm sm:text-base text-white/90 text-center">
                  Do you want to cancel your book for <span className="font-bold text-white not-italic">{event?.title}</span>?
                </p>
                <div className="flex justify-center items-center w-full mt-4">
                  <button
                    type="button"
                    onClick={handleCancelRegistration}
                    disabled={isDeleting || loading || isWindowExpired}
                    className={`font-sans font-bold text-xs sm:text-sm transition-colors py-2 px-6 select-none bg-transparent border-none shadow-none outline-none ${
                      isWindowExpired
                        ? "text-white/40 opacity-40 cursor-not-allowed pointer-events-none"
                        : "text-white hover:text-red-500 cursor-pointer"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
                {error && (
                  <div style={{ fontFamily: "Consolas, 'Courier New', monospace" }} className="text-red-500 text-[13px] font-normal tracking-tight py-1 text-center select-none">
                    {error}
                  </div>
                )}
              </div>
            ) : isConfirmed ? (
              /* Confirmed & Locked Mode */
              <div className="space-y-3 pt-2 text-center">
                <div className="inline-flex items-center gap-2 py-2 px-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans font-bold text-xs sm:text-sm uppercase tracking-wider select-none">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Registration Confirmed &amp; Locked</span>
                </div>
                <p className="text-white/80 font-sans font-normal text-xs sm:text-sm leading-relaxed max-w-[460px] mx-auto">
                  Your spot for <span className="font-bold text-white not-italic">{event?.title}</span> has been confirmed and locked. A final receipt with zero action buttons has been dispatched to your email.
                </p>
              </div>
            ) : isWindowExpired ? (
              /* Expired Window Notice */
              <div className="space-y-3 pt-2 text-center">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-sans text-xs sm:text-sm">
                  {error || "Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran yang belum dikonfirmasi telah dibatalkan dan dihapus."}
                </div>
              </div>
            ) : (
              /* Normal Candidate Review Mode (Pre-WA / Post-WA) */
              <div className="space-y-3 pt-2 text-center">
                <AnimatePresence mode="wait">
                  {hasConfirmedWa ? (
                    <motion.div
                      key="post-wa"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center max-w-[460px] mx-auto">
                        Your booking buffer has been received. Checking your registered email is mandatory to confirm and lock your spot within 3 minutes before the reservation expires:
                      </p>

                      <div className="flex flex-col items-center justify-center gap-2 pt-1">
                        <a
                          href={emailInboxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-6 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-sans font-bold text-xs sm:text-sm hover:bg-emerald-500/30 transition-all select-none shadow-none"
                        >
                          Check Email
                        </a>
                        {doneData?.whatsappUrl && (
                          <a
                            href={doneData.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors select-none mt-1"
                          >
                            Reopen WhatsApp
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pre-wa"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-center gap-6 pt-1">
                        <button
                          type="button"
                          onClick={handleConfirmViaWa}
                          disabled={loading}
                          className={`font-sans font-bold text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors cursor-pointer ${
                            loading ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          {loading ? "Securing Spot..." : "Confirm via WhatsApp"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setStep(1); setError(""); }}
                          disabled={loading}
                          className="font-sans font-bold text-xs sm:text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
                        >
                          Edit Details
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div style={{ fontFamily: "Consolas, 'Courier New', monospace" }} className="text-red-500 text-[13px] font-normal tracking-tight py-1 text-center select-none">
                    {error}
                  </div>
                )}
              </div>
            )}
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
                          <label className={labelClass}>WhatsApp Contact</label>
                          <div className="flex items-center w-full bg-white/90 border-none rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-fuchsia-500 transition-all shadow-xl">
                            <div className="flex items-center pl-2.5 pr-2 py-2 text-black font-sans font-bold text-[11px] select-none border-r border-black/10 bg-black/[0.04] shrink-0">
                              +62
                            </div>
                            <input
                              type="tel"
                              className="w-full bg-transparent border-none py-2 px-2 text-black outline-none font-sans text-[11px] font-medium placeholder:text-gray-400"
                              placeholder="8xx-xxxx-xxxx"
                              value={(form.contact || "").replace(/^\+?62/, "").replace(/^0+/, "")}
                              onChange={(e) => {
                                let raw = (e.target.value || "").replace(/^\+?62/, "").replace(/^0+/, "");
                                const digits = raw.replace(/\D/g, "");
                                setForm({ ...form, contact: digits ? `+62${digits}` : "" });
                                setError("");
                              }}
                              required
                            />
                          </div>
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
                  <div 
                    style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
                    className="text-red-500 text-[14px] sm:text-[15px] font-normal tracking-tight py-1 select-none mb-3 text-left"
                  >
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

        {/* Dimmed Screen Buffer during Cancellation (Arc Spinner without any text) */}
        <AnimatePresence>
          {isDeleting && (
            <motion.div
              key="deleting-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center select-none"
            >
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeDasharray="70 200"
                      strokeLinecap="round"
                      className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                    />
                  </svg>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
