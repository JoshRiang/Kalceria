"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICE_TYPES } from "./constants";
import { FormErrorBox } from "./FormErrorBox";

export function ServiceConfirmationStep({
  done,
  form,
  bookingSchedule,
  handleCancel,
  handleEdit,
  onFinalize,
  loading,
  error,
}) {
  const [hasClickedWa, setHasClickedWa] = useState(false);
  const [isSubmittingWa, setIsSubmittingWa] = useState(false);

  const serviceLabel = useMemo(() => {
    return SERVICE_TYPES.find((s) => s.id === form.serviceType)?.label || form.serviceType || "—";
  }, [form.serviceType]);

  const truncatedNotes = useMemo(() => {
    if (!form.additionalNotes) return "";
    const trimmed = form.additionalNotes.trim();
    return trimmed.length > 50 ? trimmed.slice(0, 50) + "..." : trimmed;
  }, [form.additionalNotes]);

  // Construct WhatsApp URL: +62 8117998790, exact metadata from Part 3, NO emojis
  const waUrl = useMemo(() => {
    if (done?.whatsappUrl) return done.whatsappUrl;
    const lines = [
      "SERVICE REQUEST - NEED OUR HELP",
      "",
      `Booking ID: #${done?.bookingId ? done.bookingId.slice(-6) : "PENDING"}`,
      `Service: ${serviceLabel}`,
      `Request Title: ${form.serviceName || "—"}`,
      `Operator Name: ${form.contactPerson || "—"}`,
      `WhatsApp: ${form.whatsapp || "—"}`,
      `Deployment Area: ${form.location || "—"}`,
      `Selected Date: ${bookingSchedule.dates || "—"}`,
      `Selected Hours: ${bookingSchedule.hours || "—"}`,
    ];
    if (form.additionalNotes && form.additionalNotes.trim()) {
      lines.push(`Notes: ${truncatedNotes}`);
    }
    const cleanWaText = lines.join("\n");
    return `https://wa.me/628117998790?text=${encodeURIComponent(cleanWaText)}`;
  }, [done?.whatsappUrl, done?.bookingId, serviceLabel, form, bookingSchedule, truncatedNotes]);

  // Handle WhatsApp action: Candidate buffer is finalized in backend ONLY when WA is clicked!
  const handleWaClick = async () => {
    // If order was already submitted/finalized (done.bookingId exists and confirmed), just reopen WhatsApp
    if (done?.bookingId && hasClickedWa) {
      if (typeof window !== "undefined") {
        window.open(done.whatsappUrl || waUrl, "_blank");
      }
      return;
    }

    // Candidate buffer: finalize now!
    if (onFinalize) {
      setIsSubmittingWa(true);
      try {
        await onFinalize();
        setHasClickedWa(true);
      } catch {
        // Error is set in parent state and rendered via FormErrorBox
      } finally {
        setIsSubmittingWa(false);
      }
      return;
    }

    // Standalone fallback
    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank");
    }
    setHasClickedWa(true);
  };

  // Resolve user's email client / webmail inbox URL
  const userEmail = done?.userEmail || form?.email || "";
  const emailInboxUrl = useMemo(() => {
    const lower = String(userEmail).toLowerCase().trim();
    if (lower.includes("@gmail.com")) {
      return "https://mail.google.com/mail/u/0/#search/Kalceria";
    }
    if (lower.includes("@yahoo.com")) {
      return "https://mail.yahoo.com";
    }
    if (lower.includes("@outlook.com") || lower.includes("@hotmail.com")) {
      return "https://outlook.live.com/mail";
    }
    if (lower && lower.includes("@")) {
      return `mailto:${lower}`;
    }
    return "https://mail.google.com";
  }, [userEmail]);

  return (
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

      {/* Smoothly animated description container */}
      <div className="w-full max-w-[460px] min-h-[92px] flex flex-col items-center justify-center relative overflow-hidden mt-3 sm:mt-4">
        <AnimatePresence mode="wait">
          {!hasClickedWa ? (
            <motion.div
              key="pre-wa-prompt"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center w-full"
            >
              <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center">
                System link established. Redirecting to operational headquarters via WhatsApp:
              </p>
              <button
                type="button"
                onClick={handleWaClick}
                disabled={loading || isSubmittingWa}
                className="inline-flex items-center justify-center gap-2 font-sans font-normal text-sm sm:text-base md:text-lg text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors my-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-wait group"
              >
                <svg
                  className="w-5 h-5 fill-current text-[#25D366] group-hover:scale-110 transition-transform shrink-0"
                  viewBox="0 0 24 24"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>
                  {isSubmittingWa ? "Submitting Order to System..." : "Yes & Confirm via WhatsApp"}
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="post-wa-prompt"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center w-full py-1"
            >
              <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center">
                Your order has been submitted to our system. If you wish to make any changes, you can check your registered email:{" "}
                <a
                  href={emailInboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors inline-block ml-1 cursor-pointer"
                >
                  Check Email
                </a>
              </p>
              <button
                type="button"
                onClick={handleWaClick}
                className="inline-flex items-center gap-1.5 font-sans font-normal text-[11px] sm:text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors mt-2 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 fill-current text-[#25D366] shrink-0"
                  viewBox="0 0 24 24"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>Reopen WhatsApp confirmation</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking Details with Clean Rows and Colon Alignment (No subouter box) */}
      <div className="w-full max-w-[460px] text-left my-4 px-1 sm:px-0">
        <p className="font-sans font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-3 pb-2 border-b border-white/15 flex items-center justify-between">
          <span>Booking Details:</span>
          <span className="text-[10px] text-white/50 font-normal">
            ID #{done?.bookingId ? done.bookingId.slice(-6) : "CANDIDATE"}
          </span>
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

      {/* Middle Bottom Actions: Edit & Cancel */}
      <div className="mt-2 pt-2 flex flex-col items-center w-full max-w-[460px]">
        <div className="flex items-center gap-3">
          {handleEdit && (
            <>
              <button
                type="button"
                onClick={handleEdit}
                disabled={loading}
                style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
                className="font-normal text-sm sm:text-base text-white/70 hover:text-white transition-colors cursor-pointer py-1.5 focus:outline-none underline underline-offset-2"
              >
                Edit Details
              </button>
              <span className="text-white/30 text-xs">•</span>
            </>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
            className="font-normal text-sm sm:text-base text-white/60 hover:text-red-400 transition-colors cursor-pointer py-1.5 focus:outline-none"
          >
            {loading ? "Cancelling..." : "Cancel"}
          </button>
        </div>
        <FormErrorBox error={error} />
      </div>
    </motion.div>
  );
}
