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
  loading,
  error,
}) {
  const [hasClickedWa, setHasClickedWa] = useState(false);

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
    const lines = [
      "SERVICE REQUEST - NEED OUR HELP",
      "",
      `Booking ID: #${done.bookingId ? done.bookingId.slice(-6) : "NEW"}`,
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
  }, [done.bookingId, serviceLabel, form, bookingSchedule, truncatedNotes]);

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
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setHasClickedWa(true)}
                className="inline-flex items-center gap-1.5 font-sans font-normal text-sm sm:text-base md:text-lg text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors my-2.5 cursor-pointer"
              >
                Yes & Confirm via WhatsApp
              </a>
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
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-sans font-normal text-[11px] sm:text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors mt-2 cursor-pointer"
              >
                Reopen WhatsApp confirmation
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Booking Details with Clean Rows and Colon Alignment (No subouter box) */}
      <div className="w-full max-w-[460px] text-left my-4 px-1 sm:px-0">
        <p className="font-sans font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-3 pb-2 border-b border-white/15 flex items-center justify-between">
          <span>Booking Details:</span>
          <span className="text-[10px] text-white/50 font-normal">
            ID #{done.bookingId ? done.bookingId.slice(-6) : "NEW"}
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
