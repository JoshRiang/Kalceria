"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { validateCommsValue } from "./service-request/FormControls";
import { CLIP } from "./service-request/constants";
import { useServiceBookingSchedule } from "./service-request/useServiceBookingSchedule";
import { ServiceTypeStep } from "./service-request/ServiceTypeStep";
import { ServiceDetailsStep } from "./service-request/ServiceDetailsStep";
import { ServiceConfirmationStep } from "./service-request/ServiceConfirmationStep";
import { ServiceModalBackground } from "./service-request/ServiceModalBackground";
import api from "@/lib/api";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useAuthStore } from "@/stores/useAuthStore";

export default function ServiceRequestModal({
  onClose,
  userName,
  userEmail,
  onRequireAuth,
  initialLocation,
  initialBookingId,
  initialToken,
  initialAction,
}) {
  const authUser = useAuthStore((s) => s.user);
  const activeEmail = userEmail || authUser?.email || "";
  const activeName = userName || authUser?.displayName || authUser?.name || authUser?.nickname || "";

  const [step, setStep] = useState(initialBookingId ? 1 : 0); // 0: Type, 1: Details, 2: Done
  const modalScrollRef = useRef(null);

  // Automatically reset modal scroll position to top whenever stepping forward/backward
  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [step]);

  const mounted = useHasMounted();
  const [isLocationVerified, setIsLocationVerified] = useState(Boolean(initialLocation));
  const [form, setForm] = useState({
    serviceType: "",
    serviceName: "",
    contactPerson: activeName,
    whatsapp: "",
    email: activeEmail,
    location: initialLocation || "",
    additionalNotes: "",
  });

  // Auto-fill email & operator name if logged-in user session becomes active/hydrated
  useEffect(() => {
    if (activeEmail && !form.email) {
      setForm((p) => ({ ...p, email: activeEmail }));
    }
    if (activeName && !form.contactPerson) {
      setForm((p) => ({ ...p, contactPerson: activeName }));
    }
  }, [activeEmail, activeName, form.email, form.contactPerson]);

  useEffect(() => {
    if (initialLocation && !form.location) {
      setForm((p) => ({ ...p, location: initialLocation }));
      setIsLocationVerified(true);
    }
  }, [initialLocation, form.location]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(
    initialBookingId ? { bookingId: initialBookingId, cancelToken: initialToken } : null
  );
  const [candidateSlots, setCandidateSlots] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [isWindowExpired, setIsWindowExpired] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Live Countdown & Expiration Watcher (Strict 3-Minute Timeline Invariant)
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsWindowExpired(true);
          setError("Batas waktu 3 menit untuk mengedit atau membatalkan pesanan telah berakhir. Hubungi kami via WhatsApp.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const isEditMode = Boolean(
    initialAction === "edit" || (initialBookingId && initialAction !== "cancel")
  );

  // Heatmap & booking schedule hook
  const {
    weekOffset,
    setWeekOffset,
    selectedSlots,
    setSelectedSlots,
    hoursA,
    hoursB,
    currentMonthYear,
    currentWeekNumber,
    renderGrid,
    bookingSchedule,
  } = useServiceBookingSchedule({ setError, mounted });

  // Load existing booking if initialBookingId is provided
  useEffect(() => {
    if (!initialBookingId) return;

    let active = true;
    setLoading(true);

    if (initialAction === "confirm") {
      api
        .post(`/services/request/${initialBookingId}/confirm`, {}, {
          headers: initialToken ? { "x-manage-token": initialToken } : {},
        })
        .then((res) => {
          if (!active || !res.data?.booking) return;
          const b = res.data.booking;
          setForm({
            serviceType: b.serviceType,
            serviceName: b.serviceName || "",
            contactPerson: b.contactPerson || "",
            whatsapp: b.whatsapp || "",
            email: b.email || b.requestor?.email || activeEmail || "",
            location: b.location || "",
            additionalNotes: b.additionalNotes || "",
          });
          setIsLocationVerified(true);

          const slotsMap = {};
          (b.slots || []).forEach((s) => {
            const d = typeof s.date === "string" ? s.date.split("T")[0] : new Date(s.date).toISOString().split("T")[0];
            const startH = parseInt(String(s.startTime).split(":")[0], 10);
            const endH = parseInt(String(s.endTime).split(":")[0], 10);
            if (startH === 0 && endH === 1) {
              slotsMap[`${d}-24`] = true;
            } else {
              for (let h = startH; h < (endH === 0 ? 24 : endH); h++) {
                slotsMap[`${d}-${h}`] = true;
              }
            }
          });
          setSelectedSlots(slotsMap);
          setDone({
            bookingId: b.id,
            cancelToken: initialToken,
            userEmail: b.email || b.requestor?.email || activeEmail,
          });
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
          const errMsg = err.response?.data?.error || "Batas waktu 3 menit untuk mengonfirmasi pesanan telah berakhir. Pesanan otomatis dibatalkan.";
          setError(errMsg);
          setStep(2);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      api
        .get(`/services/request/${initialBookingId}`, {
          headers: initialToken ? { "x-manage-token": initialToken } : {},
        })
        .then((res) => {
          if (!active || !res.data?.booking) return;
          const b = res.data.booking;
          if (b.status === "PROCESSED") {
            setIsConfirmed(true);
          }
          setForm({
            serviceType: b.serviceType,
            serviceName: b.serviceName || "",
            contactPerson: b.contactPerson || "",
            whatsapp: b.whatsapp || "",
            email: b.email || b.requestor?.email || activeEmail || "",
            location: b.location || "",
            additionalNotes: b.additionalNotes || "",
          });
          setIsLocationVerified(true);

          const slotsMap = {};
          (b.slots || []).forEach((s) => {
            const d = typeof s.date === "string" ? s.date.split("T")[0] : new Date(s.date).toISOString().split("T")[0];
            const startH = parseInt(String(s.startTime).split(":")[0], 10);
            const endH = parseInt(String(s.endTime).split(":")[0], 10);
            if (startH === 0 && endH === 1) {
              slotsMap[`${d}-24`] = true;
            } else {
              for (let h = startH; h < (endH === 0 ? 24 : endH); h++) {
                slotsMap[`${d}-${h}`] = true;
              }
            }
          });
          setSelectedSlots(slotsMap);
          setInitialSnapshot({
            form: {
              serviceType: b.serviceType,
              serviceName: b.serviceName || "",
              contactPerson: b.contactPerson || "",
              whatsapp: b.whatsapp || "",
              email: b.email || b.requestor?.email || activeEmail || "",
              location: b.location || "",
              additionalNotes: b.additionalNotes || "",
            },
            slotsMap: { ...slotsMap },
          });
          setDone({
            bookingId: b.id,
            cancelToken: initialToken,
            userEmail: b.email || b.requestor?.email || activeEmail,
          });
          if (typeof res.data?.remainingSeconds === "number") {
            setRemainingSeconds(res.data.remainingSeconds);
            if (res.data.remainingSeconds <= 0) {
              setIsWindowExpired(true);
              setError("Batas waktu 3 menit untuk mengedit atau membatalkan pesanan telah berakhir. Hubungi kami via WhatsApp.");
            }
          }

          if (initialAction === "cancel" || b.status === "PROCESSED") {
            setStep(2);
          } else {
            setStep(1);
          }
        })
        .catch((err) => {
          if (!active) return;
          if (err.response?.data?.isConfirmed) {
            setIsConfirmed(true);
          }
          setIsWindowExpired(true);
          const errMsg = err.response?.data?.error || "Batas waktu 3 menit untuk mengedit atau membatalkan pesanan telah berakhir. Hubungi kami via WhatsApp.";
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
  }, [initialBookingId, initialToken, initialAction, setSelectedSlots, activeEmail]);

  // Cross-Tab Synchronization via BroadcastChannel & localStorage
  useEffect(() => {
    let channel;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("kalceria_service_channel");
        channel.onmessage = (event) => {
          const data = event.data;
          if (!data || data.type !== "SERVICE_ACTION_TRIGGERED") return;
          if (data.action === "cancel") {
            setStep(2);
          } else if (data.action === "cancelled") {
            onClose();
          } else if (data.action === "edit") {
            setStep(1);
          } else if (data.action === "confirm") {
            setIsConfirmed(true);
            setStep(2);
          }
        };
      }
    } catch {}

    const handleStorage = (e) => {
      if (e.key === "kalceria_service_action_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.action === "cancel") {
            setStep(2);
          } else if (parsed?.action === "cancelled") {
            onClose();
          } else if (parsed?.action === "edit") {
            setStep(1);
          } else if (parsed?.action === "confirm") {
            setIsConfirmed(true);
            setStep(2);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [done?.bookingId, done?.cancelToken]);

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
  const isEmailValid = Boolean(form.email && EMAIL_REGEX.test(form.email.trim()));

  // Form Validation
  const isFormValid = Boolean(
    form.serviceName &&
      form.contactPerson &&
      form.whatsapp &&
      isEmailValid &&
      form.location &&
      Object.values(selectedSlots).filter(Boolean).length > 0
  );

  // Determine if user modified any field or calendar slot compared to initial loaded booking
  const isDirty = React.useMemo(() => {
    if (!initialSnapshot) return false;
    const f1 = form;
    const f0 = initialSnapshot.form;
    if (
      f1.serviceName !== f0.serviceName ||
      f1.contactPerson !== f0.contactPerson ||
      f1.whatsapp !== f0.whatsapp ||
      f1.email !== f0.email ||
      f1.location !== f0.location ||
      f1.additionalNotes !== f0.additionalNotes ||
      f1.serviceType !== f0.serviceType
    ) {
      return true;
    }

    const currentSlots = Object.entries(selectedSlots)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .sort();
    const initialSlots = Object.entries(initialSnapshot.slotsMap || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .sort();

    if (currentSlots.length !== initialSlots.length) return true;
    for (let i = 0; i < currentSlots.length; i++) {
      if (currentSlots[i] !== initialSlots[i]) return true;
    }

    return false;
  }, [form, selectedSlots, initialSnapshot]);

  const canUpdate = isFormValid && isDirty;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const setField = (id, val) => {
    setForm((p) => ({ ...p, [id]: val }));
    setError("");
  };

  const handleNext = () => {
    if (!form.serviceType) {
      setError("Please select a service type.");
      return;
    }
    setError("");
    setStep(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.serviceName || form.serviceName.trim().length < 2) {
      setError("Please provide a valid request title.");
      return;
    }
    if (!form.contactPerson || form.contactPerson.trim().length < 2) {
      setError("Please provide operator name.");
      return;
    }

    // Strict Indonesian phone validation (+628xxxxxxxxxx, valid carrier code)
    const commsCheck = validateCommsValue("tel", "whatsapp", form.whatsapp);
    if (!commsCheck.valid) {
      setError(
        commsCheck.message ||
          "Please provide a valid Indonesian WhatsApp contact (+62 8xx-xxxx-xxxx)."
      );
      return;
    }

    // Strict email validation
    if (!form.email || !EMAIL_REGEX.test(form.email.trim())) {
      setError("Email salah");
      return;
    }

    // Strict location verification against verified suggestions
    if (!isLocationVerified || !form.location || form.location.trim().length < 5) {
      setError(
        "Deployment area must be selected from the verified locations list (Street, City, Province)."
      );
      return;
    }
    if (Object.values(selectedSlots).filter(Boolean).length === 0) {
      setError("Please select at least one operational time slot.");
      return;
    }

    const selectedArray = Object.entries(selectedSlots)
      .filter(([, val]) => val)
      .map(([key]) => {
        const [date, hour] = key.split(/-(?=\d+$)/);
        return { date, hour: parseInt(hour, 10) };
      });

    const slots = selectedArray.map((s) => ({
      date: s.date,
      startTime: (s.hour === 24 ? 0 : s.hour).toString().padStart(2, "0") + ":00",
      endTime:
        (s.hour === 23 ? 0 : s.hour === 24 ? 1 : s.hour + 1).toString().padStart(2, "0") + ":00",
    }));

    // Buffer as candidate data without writing to database prematurely
    setCandidateSlots(slots);
    setError("");

    if (isEditMode) {
      handleFinalizeOrder(slots)
        .then(() => {
          setStep(2);
        })
        .catch(() => {
          // error is already recorded in state and rendered in FormErrorBox
        });
      return;
    }

    setStep(2);
  };

  const handleFinalizeOrder = async (explicitSlots) => {
    if (done?.bookingId && !initialBookingId) {
      return done;
    }

    setLoading(true);
    setError("");

    let waWindow = null;
    try {
      if (typeof window !== "undefined") {
        waWindow = window.open("", "_blank");
      }
    } catch {}

    try {
      const isUpdate = Boolean(initialBookingId);
      const endpoint = isUpdate ? `/services/request/${initialBookingId}` : "/services/request";
      const method = isUpdate ? "put" : "post";
      const slotsToSend = explicitSlots || (candidateSlots.length > 0 ? candidateSlots : undefined);

      const res = await api[method](
        endpoint,
        {
          ...form,
          slots: slotsToSend,
        },
        {
          headers: initialToken ? { "x-manage-token": initialToken } : undefined,
        }
      );

      const data = res.data;
      setDone(data);

      if (waWindow && !waWindow.closed && data?.whatsappUrl) {
        waWindow.location.href = data.whatsappUrl;
      } else if (data?.whatsappUrl && typeof window !== "undefined") {
        window.open(data.whatsappUrl, "_blank");
      }

      return data;
    } catch (err) {
      if (waWindow && !waWindow.closed) {
        try { waWindow.close(); } catch {}
      }
      const errMsg = err.response?.data?.error || err.message || "Failed to submit request.";
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!done?.bookingId) {
      onClose();
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.delete(`/services/request/${done.bookingId}`, {
        headers: done.cancelToken ? { "x-cancel-token": done.cancelToken } : undefined,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kalceria:service-bookings-updated"));
      }
      onClose();
    } catch (err) {
      if (err.response?.status === 404) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("kalceria:service-bookings-updated"));
        }
        setIsWindowExpired(true);
        onClose();
        return;
      }
      const errMsg =
        err.response?.data?.error || err.message || "Failed to cancel booking.";
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
        className={`relative z-10 w-full ${
          step === 1 ? "max-w-[95%] xl:max-w-[1320px]" : "max-w-[95%] sm:max-w-[540px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Card Container */}
        <div
          className="relative z-10 w-full max-h-[92vh] overflow-hidden bg-black/80 backdrop-blur-2xl border border-white/15 flex flex-col shadow-[0_60px_120px_rgba(0,0,0,0.85)]"
          style={CLIP}
        >
          {/* Background effects & progress bar */}
          <ServiceModalBackground step={step} />

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

          {/* Scrollable Modal Body strictly clipped within rounded corners */}
          <div
            ref={modalScrollRef}
            className="w-full flex-1 overflow-y-auto custom-scrollbar flex flex-col relative z-20 pt-1"
          >
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
              ) : step === 2 ? (
                <div />
              ) : (
                <h2 className="font-sans text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none">
                  Need Our <span className="text-white">Help?</span>
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors p-1 cursor-pointer focus:outline-none"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 pt-2 pb-6 relative z-20">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <ServiceTypeStep
                    form={form}
                    setField={setField}
                    handleNext={handleNext}
                    error={error}
                  />
                )}

                {step === 1 && (
                  <ServiceDetailsStep
                    form={form}
                    setForm={setForm}
                    setField={setField}
                    handleSubmit={handleSubmit}
                    isLocationVerified={isLocationVerified}
                    setIsLocationVerified={setIsLocationVerified}
                    setError={setError}
                    setStep={setStep}
                    currentMonthYear={currentMonthYear}
                    currentWeekNumber={currentWeekNumber}
                    weekOffset={weekOffset}
                    setWeekOffset={setWeekOffset}
                    mounted={mounted}
                    renderGrid={renderGrid}
                    hoursA={hoursA}
                    hoursB={hoursB}
                    error={error}
                    loading={loading}
                    isFormValid={isFormValid}
                    isEditMode={isEditMode}
                    canUpdate={canUpdate}
                    isWindowExpired={isWindowExpired}
                  />
                )}

                {step === 2 && (
                  <ServiceConfirmationStep
                    done={done || {}}
                    form={form}
                    bookingSchedule={bookingSchedule}
                    handleCancel={handleCancel}
                    handleEdit={isEditMode || isConfirmed ? null : () => setStep(1)}
                    onFinalize={handleFinalizeOrder}
                    isCancelMode={initialAction === "cancel" && !isConfirmed}
                    isEditMode={isEditMode}
                    isConfirmedMode={isConfirmed}
                    isWindowExpired={isWindowExpired}
                    loading={loading}
                    error={error}
                    onClose={onClose}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
