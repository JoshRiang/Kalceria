"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { establishSession, hasUserSession } from "@/lib/session";
import { useAuthStore } from "@/stores/useAuthStore";
import { CLIP } from "./constants";
import ContentImage from "@/components/ui/ContentImage";
import { resolveWebmailInboxUrl } from "@/utils/webmailUtils";
import { EventConfirmationStep } from "./EventConfirmationStep";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;

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
  initialError,
}) {
  const authUser = useAuthStore((s) => s.user);
  const activeEmail = authUser?.email || "";
  const activeName = authUser?.displayName || authUser?.name || authUser?.nickname || "";
  const activePhone = authUser?.phone || "";
  const isLoggedIn = Boolean(hasUserSession() || authUser?.id || activeEmail);

  const [idx, setIdx] = useState(startIndex);
  const [mode, setMode] = useState(isLoggedIn ? "account" : "guest");
  const [step, setStep] = useState(initialRegistrationId ? 2 : 1); // 1: Form Fill, 2: Review / Confirm / Cancel
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    initialError === "expired"
      ? "Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran otomatis dibatalkan atau tidak ditemukan."
      : ""
  );
  const [doneData, setDoneData] = useState(null);
  const [hasConfirmedWa, setHasConfirmedWa] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(Boolean(initialAction === "confirm"));
  const [isWindowExpired, setIsWindowExpired] = useState(Boolean(initialError === "expired"));

  const event = events[idx];
  const [form, setForm] = useState({
    name: activeName,
    email: activeEmail,
    contact: activePhone,
    identifier: activeEmail || activeName,
    session: event?.sessionOptions?.[0] || "",
  });

  // Auto-fill form values when logged in user session hydrates
  useEffect(() => {
    if (activeEmail && !form.email) {
      setForm((p) => ({ ...p, email: activeEmail, identifier: p.identifier || activeEmail }));
    }
    if (activeName && !form.name) {
      setForm((p) => ({ ...p, name: activeName, identifier: p.identifier || activeName }));
    }
    if (activePhone && !form.contact) {
      setForm((p) => ({ ...p, contact: activePhone }));
    }
  }, [activeEmail, activeName, activePhone, form.email, form.name, form.contact]);

  // Automatic check if email is already registered for this event (Form Part 1)
  useEffect(() => {
    const emailToTest = (form.email || (mode === "account" && form.identifier?.includes("@") ? form.identifier : "")).trim().toLowerCase();
    if (!event?.id || !emailToTest || !EMAIL_REGEX.test(emailToTest) || isEditing || step !== 1) {
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/events/${event.id}/check-email`, {
          params: { email: emailToTest },
        });
        if (!active) return;
        if (res.data?.isRegistered) {
          setError("Email sudah terdaftar untuk event ini");
        } else if (error === "Email sudah terdaftar untuk event ini") {
          setError("");
        }
      } catch {}
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.email, form.identifier, mode, event?.id, isEditing, step, error]);

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
          if (err.response?.data?.isExpired || err.response?.status === 404) {
            setIsWindowExpired(true);
          }
          const errMsg = err.response?.data?.error || "Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran otomatis dibatalkan.";
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
        if (me) {
          establishSession(me);
          setForm((prev) => ({
            ...prev,
            identifier: prev.identifier || me.nickname || me.name || me.email || "",
            name: prev.name || me.name || me.nickname || "",
            email: prev.email || me.email || "",
            contact: prev.contact || me.phone || "",
          }));
          setMode("account");
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

  const handleModeSelect = (m) => {
    if (m === "account" && !isLoggedIn) {
      setMode("account");
      setError("Login First.");
      return;
    }
    setMode(m);
    setError("");
  };

  // Step 1: Candidate Validation & Immediate Registration in DB to Dispatch Email
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!event?.id) return;

    if (mode === "account" && !isLoggedIn) {
      setError("Login First.");
      return;
    }

    const emailToValidate = (form.email || (mode === "account" && form.identifier?.includes("@") ? form.identifier : "")).trim();
    const nameToValidate = (form.name || (mode === "account" ? form.identifier : "")).trim();
    const contactToValidate = (form.contact || "").trim();

    if (!nameToValidate) {
      setError("Please fill in your full name or username.");
      return;
    }

    // Strict email validation (with "Email salah" warning matching design DNA)
    if (!emailToValidate || !EMAIL_REGEX.test(emailToValidate)) {
      setError("Email salah");
      return;
    }

    const rawDigits = contactToValidate.replace(/\D/g, "");
    if (rawDigits.length < 9) {
      setError("Please enter a valid WhatsApp number (+62 8xx...).");
      return;
    }

    setLoading(true);
    try {
      const emailVal = emailToValidate;
      const nameVal = nameToValidate;
      const contactVal = contactToValidate;

      if (isEditing && doneData?.registration?.id) {
        const updatePayload = {
          name: nameVal,
          contact: contactVal,
          selectedSession: form.session,
        };
        const token = initialToken || doneData?.cancelToken;
        const res = await api.put(`/events/registration/${doneData.registration.id}`, updatePayload, {
          headers: token ? { "x-manage-token": token, "x-cancel-token": token } : {},
        });
        setDoneData(res.data);
        setForm((p) => ({
          ...p,
          email: emailVal,
          name: nameVal,
          contact: contactVal,
          identifier: p.identifier || emailVal || nameVal,
        }));
        setIsEditing(false);
        setStep(2);
      } else {
        const payload = {
          eventId: event.id,
          mode,
          name: nameVal,
          email: emailVal,
          contact: contactVal,
          identifier: form.identifier || emailVal || nameVal,
          selectedSession: form.session,
        };

        const res = await api.post(`/events/${event.id}/register`, payload);
        setDoneData(res.data);
        setForm((p) => ({
          ...p,
          email: emailVal,
          name: nameVal,
          contact: contactVal,
          identifier: p.identifier || emailVal || nameVal,
        }));
        setIsEditing(false);
        setStep(2);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || "Registration failed.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  const userEmail = form.email || doneData?.registration?.user?.email || "";
  const emailInboxUrl = resolveWebmailInboxUrl(userEmail);

  // Coherent WhatsApp message format for admin +62 8117998790 with zero emojis
  const fallbackWaUrl = useMemo(() => {
    const rawPrice = Number(event?.price || 0);
    const priceStr = rawPrice === 0 ? "Rp 0 (Gratis / Free Entry)" : `Rp ${rawPrice.toLocaleString("id-ID")}`;
    const participantName = (mode === "account" ? form.identifier : form.name) || authUser?.name || "—";
    const participantContact = form.contact || authUser?.phone || "—";
    const session = form.session || "—";

    const lines = [
      "PENDAFTARAN EVENT - SEE EVENT",
      "",
      `Booking ID: #${doneData?.registration?.id ? doneData.registration.id.slice(-6) : "PENDING"}`,
      `Event: ${event?.title || "—"}`,
      `Sesi: ${session}`,
      `Nama Pendaftar: ${participantName}`,
      `Email Pendaftar: ${userEmail || "—"}`,
      `WhatsApp Pendaftar: ${participantContact}`,
      `Lokasi Event: ${event?.location || "TBA"}`,
      `Total Tagihan: ${priceStr}`,
      `Status Pendaftaran: ${doneData?.registration?.paymentStatus || "PENDING"} (Menunggu Konfirmasi Email)`,
      "",
      "Catatan: Pendaftaran wajib dikonfirmasi via email pendaftar dalam batas waktu 3 menit sebelum slot kedaluwarsa.",
    ];

    const cleanText = lines.join("\n");
    return `https://wa.me/628117998790?text=${encodeURIComponent(cleanText)}`;
  }, [event, doneData, form, mode, authUser, userEmail]);

  // Handle WhatsApp action: Open WhatsApp confirmation link in new window
  const handleConfirmViaWa = async () => {
    const currentWaUrl = doneData?.whatsappUrl || fallbackWaUrl;
    if (currentWaUrl && typeof window !== "undefined") {
      window.open(currentWaUrl, "_blank");
    }
    setHasConfirmedWa(true);
  };

  // User Cancel Action: Dimmed loading buffer screen, delete from backend, auto-close form
  const handleCancelRegistration = async () => {
    if (isConfirmed) return;
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
      if (err.response?.status === 404) {
        setIsWindowExpired(true);
        onClose();
        return;
      }
      const errMsg = err.response?.data?.error || err.message || "Gagal membatalkan pendaftaran.";
      setError(errMsg);
    }
  };

  const isCancelMode = Boolean(initialAction === "cancel" && !isConfirmed);

  const inputClass = "w-full bg-white/90 border-none rounded-lg py-2 px-3 text-black outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all font-sans text-[11px] font-medium placeholder:text-gray-400 shadow-xl";
  const labelClass = "block text-[8px] font-sans font-bold text-white uppercase mb-0.5 tracking-widest opacity-80 drop-shadow-md";
  const metaStyle = "text-[10px] md:text-[12px] font-medium text-gray-200 italic border-b border-white/10 shadow-[0_1px_4px_rgba(0,0,0,0.3)] pb-0.5 mb-2 block w-full";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: isMobile ? 0.78 : 0.9, y: 20 }}
        animate={{ scale: isMobile ? 0.825 : 1, y: 0 }}
        className="bg-[#0B0C10]/85 border border-white/10 w-full max-w-lg max-h-[85vh] sm:max-h-[88vh] flex flex-col relative overflow-hidden backdrop-blur-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-transform duration-500 my-auto"
        style={CLIP}
      >

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

        <style jsx global>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px !important;
            height: 4px !important;
          }
          .custom-scrollbar::-webkit-scrollbar-button {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
          .custom-scrollbar::-webkit-scrollbar-track,
          .custom-scrollbar::-webkit-scrollbar-track-piece {
            background: transparent !important;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.25) !important;
            border-radius: 9999px !important;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.45) !important;
          }
        `}</style>

        {/* Scrollable Modal Body (Custom Semi-Transparent Scrollbar positioned flush to right edge) */}
        <div className="relative z-30 flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8 custom-scrollbar">
          {/* Mini Carousel Header (Shown ONLY on Step 1: Form Fill) */}
          {step === 1 && (
            <div className="relative z-30 mb-6">
               <div className={`flex items-center justify-between mb-4 ${isMobile ? "px-6" : ""}`}>
                  <button type="button" onClick={prev} className="p-2 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none focus:outline-none">
                    <ChevronLeft />
                  </button>
                  <div className="text-center flex-1">
                     <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white italic mb-0.5" style={{ textShadow: "2px 2px 0 #FF00FF" }}>
                       {event?.title}
                     </h2>
                     <p className="text-[9px] text-slate-400 font-sans uppercase tracking-[0.2em] italic">
                       Secure your slot in the grid
                     </p>
                  </div>
                  <button type="button" onClick={next} className="p-2 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none focus:outline-none">
                    <ChevronRight />
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-4 md:gap-6 items-center">
                  <motion.div
                    key={event?.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`relative w-full bg-white/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] ${isMobile ? "aspect-square" : "aspect-[3/4]"}`}
                    style={CLIP_CARD}
                  >
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
          )}

        {/* Step 2 (Review / Cancel / Confirmed) vs Step 1 (Form Fill) */}
        {step === 2 ? (
          <EventConfirmationStep
            event={event}
            form={form}
            doneData={doneData}
            mode={mode}
            userEmail={userEmail}
            emailInboxUrl={emailInboxUrl}
            isCancelMode={isCancelMode}
            isConfirmed={isConfirmed}
            isWindowExpired={isWindowExpired}
            hasConfirmedWa={hasConfirmedWa}
            loading={loading}
            isDeleting={isDeleting}
            error={error}
            fallbackWaUrl={fallbackWaUrl}
            handleCancelRegistration={handleCancelRegistration}
            handleConfirmViaWa={handleConfirmViaWa}
            onEditDetails={() => { setIsEditing(true); setStep(1); setError(""); }}
            onClose={onClose}
          />
        ) : (
          <div className="relative z-30 space-y-4">
             <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 backdrop-blur-md shadow-inner">
                {["account", "guest"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeSelect(m)}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${mode === m ? "bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "text-slate-500 hover:text-white"}`}
                  >
                    {m === "account" ? "By Account" : "As Guest"}
                  </button>
                ))}
             </div>

             <form onSubmit={handleSubmit} className="space-y-3">
                <AnimatePresence mode="wait">
                  {mode === "account" ? (
                    <motion.div key="acc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                      <div>
                        <label className={labelClass}>Gmail / Registered Email</label>
                        <input
                          type="email"
                          className={inputClass}
                          placeholder="user@gmail.com"
                          value={form.email || (form.identifier?.includes("@") ? form.identifier : "")}
                          onChange={(e) => {
                            setForm({ ...form, email: e.target.value, identifier: e.target.value });
                            setError("");
                          }}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Username / Name</label>
                          <input
                            className={inputClass}
                            placeholder="username or nickname"
                            value={form.name || (form.identifier && !form.identifier.includes("@") ? form.identifier : "")}
                            onChange={(e) => {
                              setForm({ ...form, name: e.target.value });
                              setError("");
                            }}
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
                   <span className="relative z-10 text-lg tracking-tighter">
                     {loading ? (isEditing ? "UPDATING..." : "PROCESSING...") : (isEditing ? "UPDATE REGISTRATION" : "SECURE SPOT")}
                   </span>
                </button>
             </form>
          </div>
        )}
        </div>

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
