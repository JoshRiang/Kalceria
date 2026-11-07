"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { SERVICE_TYPES } from "./constants";
import { FormErrorBox } from "./FormErrorBox";

export function ServiceConfirmationStep({
  done,
  form,
  bookingSchedule,
  handleCancel,
  loading,
  error,
}) {
  const serviceLabel = useMemo(() => {
    return SERVICE_TYPES.find((s) => s.id === form.serviceType)?.label || form.serviceType || "—";
  }, [form.serviceType]);

  const truncatedNotes = useMemo(() => {
    if (!form.additionalNotes) return "";
    const trimmed = form.additionalNotes.trim();
    return trimmed.length > 50 ? trimmed.slice(0, 50) + "..." : trimmed;
  }, [form.additionalNotes]);

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

      {/* Middle Bottom Cancel Action: NOT bold, NOT all capital */}
      <div className="mt-2 pt-2 flex flex-col items-center w-full max-w-[460px]">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
          className="font-normal text-sm sm:text-base text-white/60 hover:text-red-400 transition-colors cursor-pointer py-1.5 focus:outline-none"
        >
          {loading ? "Cancelling..." : "Cancel"}
        </button>
        <FormErrorBox error={error} />
      </div>
    </motion.div>
  );
}
