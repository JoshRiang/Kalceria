"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SERVICE_TYPES } from "./constants";
import { FormErrorBox } from "./FormErrorBox";
import { resolveWebmailInboxUrl } from "../../utils/webmailUtils";

export function ServiceConfirmationStep({
  done,
  form,
  bookingSchedule,
  handleCancel,
  handleEdit,
  onFinalize,
  isCancelMode = false,
  isEditMode = false,
  isConfirmedMode = false,
  isWindowExpired = false,
  loading,
  error,
  onClose,
}) {
  const [hasClickedWa, setHasClickedWa] = useState(Boolean(done?.bookingId || isConfirmedMode));
  const [isSubmittingWa, setIsSubmittingWa] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmCancel = async () => {
    setIsDeleting(true);
    try {
      await handleCancel();
    } catch {
      setIsDeleting(false);
    }
  };

  const serviceLabel = useMemo(() => {
    return SERVICE_TYPES.find((s) => s.id === form.serviceType)?.label || form.serviceType || "—";
  }, [form.serviceType]);

  const truncatedNotes = useMemo(() => {
    if (!form.additionalNotes) return "";
    const trimmed = form.additionalNotes.trim();
    return trimmed.length > 50 ? trimmed.slice(0, 50) + "..." : trimmed;
  }, [form.additionalNotes]);

  const userEmail = done?.userEmail || form?.email || "";

  // Construct WhatsApp URL: +62 8117998790, exact metadata from Part 3, NO emojis
  const waUrl = useMemo(() => {
    if (done?.whatsappUrl) return done.whatsappUrl;
    const header = isEditMode
      ? "UPDATE PESANAN - NEED OUR HELP"
      : "SERVICE REQUEST - NEED OUR HELP";
    const lines = [
      header,
      "",
      `Booking ID: #${done?.bookingId ? done.bookingId.slice(-6) : "PENDING"}`,
      `Service: ${serviceLabel}`,
      `Request Title: ${form.serviceName || "—"}`,
      `Operator Name: ${form.contactPerson || "—"}`,
      `WhatsApp: ${form.whatsapp || "—"}`,
      `Email: ${userEmail || "—"}`,
      `Deployment Area: ${form.location || "—"}`,
      `Selected Date: ${bookingSchedule.dates || "—"}`,
      `Selected Hours: ${bookingSchedule.hours || "—"}`,
    ];
    if (form.additionalNotes && form.additionalNotes.trim()) {
      lines.push(`Notes: ${truncatedNotes}`);
    }
    const cleanWaText = lines.join("\n");
    return `https://wa.me/628117998790?text=${encodeURIComponent(cleanWaText)}`;
  }, [done?.whatsappUrl, done?.bookingId, isEditMode, serviceLabel, form, bookingSchedule, truncatedNotes, userEmail]);

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
  const emailInboxUrl = useMemo(() => {
    return resolveWebmailInboxUrl(userEmail);
  }, [userEmail]);

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="py-4 sm:py-6 flex flex-col items-center text-center w-full"
    >
      {/* Transmission Header (Enlarged to cover upper half responsively) */}
      <h3 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black text-white uppercase tracking-tight leading-none text-center">
        {isCancelMode ? (
          <>
            Cancel<br className="hidden xs:inline" /> Transmission
          </>
        ) : isConfirmedMode ? (
          <>
            Transmission<br className="hidden xs:inline" /> Confirmed
          </>
        ) : (
          <>
            Transmission<br className="hidden xs:inline" /> Received
          </>
        )}
      </h3>

      {/* Top description / WhatsApp prompt */}
      {isCancelMode ? (
        <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center mt-3 sm:mt-4 max-w-[460px]">
          Below are the details of your previous service order awaiting cancellation. Please review your operational booking parameters before proceeding.
        </p>
      ) : isConfirmedMode ? (
        <div className="w-full max-w-[460px] flex flex-col items-center justify-center mt-3 sm:mt-4">
          <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center">
            Your order has been <span className="text-emerald-400 font-bold">officially confirmed</span> and persisted into the Kalceria operational system. Our crew will coordinate with you via WhatsApp.
          </p>
          <button
            type="button"
            onClick={handleWaClick}
            className="inline-flex items-center gap-1.5 font-sans font-normal text-[11px] sm:text-xs text-emerald-400/80 hover:text-emerald-300 underline underline-offset-2 transition-colors mt-2.5 cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5 fill-current text-[#25D366] shrink-0"
              viewBox="0 0 24 24"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>Contact Headquarters via WhatsApp</span>
          </button>
        </div>
      ) : (
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
                  {isEditMode
                    ? "Your updated order has been submitted to our system. Checking your email is mandatory to confirm and persist your booking parameters before the timer expires:"
                    : "Your order has been submitted to our system. Checking your email is mandatory to confirm and persist your booking parameters before the timer expires:"}{" "}
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
      )}

      {/* Expired Window or Locked Notice (Unboxed, White text with Red highlight, Unboxed button) */}
      {(isWindowExpired || (isConfirmedMode && error)) && (
        <div className="w-full max-w-[460px] my-3 flex flex-col items-center text-center">
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-white">
            {isConfirmedMode ? (
              <>
                Pesanan ini sudah dikonfirmasi dan <span className="text-[#dc2626] font-bold">terkunci</span>. Perubahan tidak dapat dilakukan.
              </>
            ) : error?.includes("telah berakhir") || error?.includes("berakhir") ? (
              <>
                Batas waktu 3 menit untuk memproses pesanan <span className="text-[#dc2626] font-bold">telah berakhir</span>. Pesanan otomatis dibatalkan atau tidak ditemukan.
              </>
            ) : (
              error || (
                <>
                  Batas waktu 3 menit untuk memproses pesanan <span className="text-[#dc2626] font-bold">telah berakhir</span>. Hubungi kami via WhatsApp.
                </>
              )
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-medium text-xs sm:text-sm text-white/70 hover:text-white transition-colors bg-transparent border-none outline-none cursor-pointer mt-2.5 focus:outline-none"
          >
            Tutup / Kembali ke Beranda
          </button>
        </div>
      )}

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
            <span className="font-bold text-white">Email</span>
            <span className="text-white/60 text-center">:</span>
            <span className="text-white font-normal break-words">{userEmail || "—"}</span>
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

      {/* Bottom Actions: Cancel Mode Confirmation OR Confirmed Mode OR Normal Edit/Cancel */}
      {isCancelMode ? (
        <div className="flex flex-col items-center text-center w-full max-w-[460px] mt-2">
          {/* Bottom Description with exact matching typography */}
          <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center mt-2 max-w-[460px]">
            Do you want to permanently cancel this order? This operational window will be released immediately and cannot be undone.
          </p>

          {/* Centered CANCEL Action: No outer box, text turns red on hover without glow */}
          <div className="flex justify-center items-center w-full mt-4">
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isDeleting || loading || isWindowExpired}
              className={`font-sans font-bold text-sm sm:text-base py-2 px-6 bg-transparent border-none shadow-none outline-none select-none transition-colors ${
                isWindowExpired
                  ? "text-white/20 opacity-30 cursor-not-allowed pointer-events-none select-none"
                  : "text-white hover:text-[#dc2626] cursor-pointer disabled:opacity-50"
              }`}
            >
              {isWindowExpired ? "CANCEL (EXPIRED)" : "CANCEL"}
            </button>
          </div>
          <FormErrorBox error={error} />
        </div>
      ) : isConfirmedMode ? (
        <div className="mt-4 pt-2 flex flex-col items-center w-full max-w-[460px]">
          <div className="inline-flex items-center gap-2 py-2 px-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans font-bold text-xs sm:text-sm uppercase tracking-wider select-none">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>Order Confirmed &amp; Locked</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-medium text-xs sm:text-sm text-white/70 hover:text-white transition-colors bg-transparent border-none outline-none cursor-pointer mt-4 focus:outline-none"
          >
            Selesai / Kembali ke Beranda
          </button>
          <FormErrorBox error={error} />
        </div>
      ) : (
        /* Normal Middle Bottom Actions: Edit & Cancel */
        <div className="mt-2 pt-2 flex flex-col items-center w-full max-w-[460px]">
          <div className="flex items-center gap-4">
            {!isEditMode && handleEdit && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={loading || isWindowExpired}
                style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
                className={`font-normal text-sm sm:text-base py-1.5 focus:outline-none underline underline-offset-2 transition-colors ${
                  isWindowExpired
                    ? "text-white/20 opacity-30 cursor-not-allowed pointer-events-none select-none"
                    : "text-white/70 hover:text-white cursor-pointer"
                }`}
              >
                Edit Details
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading || isWindowExpired}
              style={{ fontFamily: "Arial, sans-serif", fontWeight: "normal", textTransform: "none" }}
              className={`font-normal text-sm sm:text-base py-1.5 focus:outline-none transition-colors bg-transparent border-none ${
                isWindowExpired
                  ? "text-white/20 opacity-30 cursor-not-allowed pointer-events-none select-none"
                  : "text-white/60 hover:text-[#dc2626] cursor-pointer"
              }`}
            >
              {loading ? "Cancelling..." : "Cancel"}
            </button>
          </div>
          <FormErrorBox error={error} />
        </div>
      )}

      {/* Dimmed Screen Buffer during Cancellation (Arc Spinner matching Logging Out buffer without any text) */}
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
  );
}
