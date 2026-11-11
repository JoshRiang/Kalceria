"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ContentImage from "@/components/ui/ContentImage";

export const CLIP_CARD = { clipPath: "polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)" };

export function EventConfirmationStep({
  event,
  form,
  doneData,
  mode,
  userEmail,
  emailInboxUrl,
  isCancelMode,
  isConfirmed,
  isWindowExpired,
  hasConfirmedWa,
  loading,
  isDeleting,
  error,
  fallbackWaUrl,
  handleCancelRegistration,
  handleConfirmViaWa,
  onEditDetails,
  onClose,
}) {
  const participantName = useMemo(() => {
    const rawFormName = form?.name?.trim();
    const rawRegUserName = doneData?.registration?.user?.name?.trim();
    const rawRegName = doneData?.registration?.name?.trim();
    const rawIdentifier = form?.identifier?.trim();

    // Prefer actual human names over email strings
    if (rawFormName && !rawFormName.includes("@")) return rawFormName;
    if (rawRegUserName && !rawRegUserName.includes("@")) return rawRegUserName;
    if (rawRegName && !rawRegName.includes("@")) return rawRegName;
    if (rawIdentifier && !rawIdentifier.includes("@")) return rawIdentifier;

    const emailCandidate = rawFormName || rawRegUserName || rawRegName || rawIdentifier || "";
    if (emailCandidate.includes("@")) {
      const prefix = emailCandidate.split("@")[0].replace(/[._-]/g, " ");
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return "—";
  }, [form, doneData]);

  const priceFormatted = useMemo(() => {
    return Number(event?.price || 0).toLocaleString("id-ID");
  }, [event?.price]);

  return (
    <motion.div
      key="eventStep2"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="py-2 sm:py-4 flex flex-col items-center text-center w-full"
    >
      {/* Transmission Header (Exact matching bold typography as Need Our Help) */}
      <h3 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight text-center px-2 max-w-full break-words">
        {isCancelMode ? (
          <>
            Cancel<br className="hidden xs:inline" /> Transmission
          </>
        ) : isConfirmed ? (
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
          Below are the details of your previous event registration awaiting cancellation. Please review your operational booking parameters before proceeding.
        </p>
      ) : isConfirmed ? (
        <div className="w-full max-w-[460px] flex flex-col items-center justify-center mt-3 sm:mt-4">
          <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center">
            Your registration has been <span className="text-emerald-400 font-bold">officially confirmed</span> and persisted into the Kalceria operational system. Our crew will coordinate with you via WhatsApp.
          </p>
          <button
            type="button"
            onClick={handleConfirmViaWa}
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
            {!hasConfirmedWa ? (
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
                  onClick={handleConfirmViaWa}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 font-sans font-normal text-sm sm:text-base md:text-lg text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors my-2.5 cursor-pointer disabled:opacity-50 group"
                >
                  <svg
                    className="w-5 h-5 fill-current text-[#25D366] group-hover:scale-110 transition-transform shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>
                    {loading ? "Submitting Registration..." : "Yes & Confirm via WhatsApp"}
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
                  Your booking buffer has been received. Checking your registered email is mandatory to confirm and lock your spot within 3 minutes before the reservation expires:{" "}
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
                  onClick={handleConfirmViaWa}
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

      {/* Foto Event di Tengah (Centered Event Photo with CLIP_CARD cyber-cut shape matching Part 1) */}
      {(event?.displayPhotoUrl || event?.posterUrl) && (
        <div
          className="w-full max-w-[420px] mx-auto my-3 relative shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] aspect-[16/10] sm:aspect-[16/9] bg-white/5"
          style={CLIP_CARD}
        >
          <ContentImage
            src={event.displayPhotoUrl || event.posterUrl}
            className="w-full h-full object-cover"
            alt={event.title || "Event Poster"}
            width={900}
            height={560}
          />
          <div className="absolute inset-0 border-2 border-white/10 pointer-events-none" style={CLIP_CARD} />
        </div>
      )}

      {/* Expired Window or Locked Notice (Unboxed, White text with Red highlight, Unboxed button) */}
      {(isWindowExpired || (isConfirmed && error)) && (
        <div className="w-full max-w-[460px] my-3 flex flex-col items-center text-center">
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-white">
            {isConfirmed ? (
              <>
                Pesanan ini sudah dikonfirmasi dan <span className="text-[#dc2626] font-bold">terkunci</span>. Perubahan tidak dapat dilakukan.
              </>
            ) : error?.includes("telah berakhir") || error?.includes("berakhir") ? (
              <>
                Batas waktu 3 menit untuk mengonfirmasi pendaftaran event <span className="text-[#dc2626] font-bold">telah berakhir</span>. Pendaftaran otomatis dibatalkan atau tidak ditemukan.
              </>
            ) : (
              error || (
                <>
                  Batas waktu 3 menit untuk mengonfirmasi pendaftaran event <span className="text-[#dc2626] font-bold">telah berakhir</span>. Hubungi kami via WhatsApp.
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

      {/* Registration Details with Clean Rows and Colon Alignment (No subouter box) */}
      <div className="w-full max-w-[460px] text-left my-4 px-1 sm:px-0">
        <p className="font-sans font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-3 pb-2 border-b border-white/15 flex items-center justify-between">
          <span>Registration Details:</span>
          <span className="text-[10px] text-white/50 font-normal">
            ID #{doneData?.registration?.id ? doneData.registration.id.slice(-6) : "PENDING"}
          </span>
        </p>
        <div className="space-y-2.5 font-sans text-xs sm:text-sm">
          <div className="grid grid-cols-[125px_12px_1fr] items-start">
            <span className="font-bold text-white">Event</span>
            <span className="text-white/60 text-center">:</span>
            <span className="text-white font-normal break-words">{event?.title || "—"}</span>
          </div>
          <div className="grid grid-cols-[125px_12px_1fr] items-start">
            <span className="font-bold text-white">Session</span>
            <span className="text-white/60 text-center">:</span>
            <span className="text-white font-normal break-words">
              {form?.session || doneData?.registration?.selectedSession || "—"}
            </span>
          </div>
          <div className="grid grid-cols-[125px_12px_1fr] items-start">
            <span className="font-bold text-white">Participant</span>
            <span className="text-white/60 text-center">:</span>
            <span className="text-white font-normal break-words">{participantName}</span>
          </div>
          <div className="grid grid-cols-[125px_12px_1fr] items-start">
            <span className="font-bold text-white">Email</span>
            <span className="text-white/60 text-center">:</span>
            <span className="text-white font-normal break-words">{userEmail || "—"}</span>
          </div>
          {form?.contact && (
            <div className="grid grid-cols-[125px_12px_1fr] items-start">
              <span className="font-bold text-white">WhatsApp</span>
              <span className="text-white/60 text-center">:</span>
              <span className="text-white font-normal break-words">{form.contact}</span>
            </div>
          )}
          <div className="grid grid-cols-[125px_12px_1fr] items-start">
            <span className="font-bold text-white">Event Location</span>
            <span className="text-white/60 text-center">:</span>
            <span className="text-white font-normal break-words">{event?.location || "TBA"}</span>
          </div>
          <div className="grid grid-cols-[125px_12px_1fr] items-start">
            <span className="font-bold text-white">Ticket Fee</span>
            <span className="text-white/60 text-center">:</span>
            <span className="text-white font-normal break-words">Rp {priceFormatted}</span>
          </div>
        </div>
      </div>

      {/* Online Payment Link if available */}
      {doneData?.paymentCheckout?.checkoutUrl && !isConfirmed && (
        <a
          href={doneData.paymentCheckout.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-[460px] py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-black font-black uppercase tracking-tight text-xs rounded-lg transition-all flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-2"
        >
          Pay Online Now (QRIS / VA / E-Wallet)
        </a>
      )}

      {/* Bottom Actions: Cancel Mode Confirmation OR Confirmed Mode OR Normal Edit/Cancel */}
      {isCancelMode ? (
        <div className="flex flex-col items-center text-center w-full max-w-[460px] mt-2">
          <p className="text-white font-sans font-normal text-xs sm:text-sm md:text-base leading-relaxed text-center mt-2 max-w-[460px]">
            Do you want to permanently cancel this registration? This operational window will be released immediately and cannot be undone.
          </p>
          <div className="flex justify-center items-center w-full mt-4">
            <button
              type="button"
              onClick={handleCancelRegistration}
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
          {error && (
            <div
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
              className="text-red-500 text-[13px] font-normal tracking-tight py-1 text-center select-none"
            >
              {error}
            </div>
          )}
        </div>
      ) : isConfirmed ? (
        <div className="mt-4 pt-2 flex flex-col items-center w-full max-w-[460px]">
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-bold text-sm sm:text-base text-white/90 hover:text-white transition-colors bg-transparent border-none outline-none cursor-pointer mt-2 focus:outline-none"
          >
            Selesai
          </button>
        </div>
      ) : (
        /* Normal Middle Bottom Actions: Edit & Cancel */
        <div className="mt-2 pt-2 flex flex-col items-center w-full max-w-[460px]">
          <div className="flex items-center gap-4">
            {onEditDetails && (
              <button
                type="button"
                onClick={onEditDetails}
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
              onClick={handleCancelRegistration}
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
          {error && (
            <div
              style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
              className="text-red-500 text-[13px] font-normal tracking-tight py-1 text-center select-none"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}


