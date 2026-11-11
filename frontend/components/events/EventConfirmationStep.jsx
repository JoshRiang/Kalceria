"use client";

import { motion, AnimatePresence } from "framer-motion";

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
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-30 space-y-4 text-center py-1">
      {/* Order Parameters Summary (Clean rows seamlessly blending into modal, no outerbox, white fee) */}
      <div className="w-full text-left my-2 px-1 space-y-2 text-xs font-sans">
        <div className="flex justify-between border-b border-white/10 pb-1.5">
          <span className="text-slate-400 font-medium">Event:</span>
          <span className="text-white font-bold">{event?.title}</span>
        </div>
        <div className="flex justify-between border-b border-white/10 pb-1.5">
          <span className="text-slate-400 font-medium">Session:</span>
          <span className="text-white font-bold">{form?.session || doneData?.registration?.selectedSession || "—"}</span>
        </div>
        <div className="flex justify-between border-b border-white/10 pb-1.5">
          <span className="text-slate-400 font-medium">Participant:</span>
          <span className="text-white font-bold">{mode === "account" ? form?.identifier : (form?.name || doneData?.registration?.user?.name || "—")}</span>
        </div>
        <div className="flex justify-between border-b border-white/10 pb-1.5">
          <span className="text-slate-400 font-medium">Email:</span>
          <span className="text-white font-bold">{userEmail || "—"}</span>
        </div>
        {form?.contact && (
          <div className="flex justify-between border-b border-white/10 pb-1.5">
            <span className="text-slate-400 font-medium">WhatsApp:</span>
            <span className="text-white font-bold">{form.contact}</span>
          </div>
        )}
        <div className="flex justify-between pt-0.5">
          <span className="text-slate-400 font-medium">Price:</span>
          <span className="text-white font-bold">Rp {Number(event?.price || 0).toLocaleString("id-ID")}</span>
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
          Pay Online Now (QRIS / VA / E-Wallet)
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
              className={`font-sans font-bold text-sm sm:text-base py-2 px-6 bg-transparent border-none shadow-none outline-none select-none transition-colors ${
                isWindowExpired
                  ? "text-white/30 cursor-not-allowed pointer-events-none select-none"
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
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-bold text-xs sm:text-sm px-6 py-2.5 rounded-lg bg-black text-white border border-white/20 hover:bg-white hover:text-black transition-all cursor-pointer shadow-md select-none mt-2"
          >
            Selesai / Kembali ke Event
          </button>
        </div>
      ) : isWindowExpired ? (
        /* Expired Window Notice */
        <div className="space-y-3 pt-2 text-center">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-sans text-xs sm:text-sm">
            <p>{error || "Batas waktu 3 menit untuk mengonfirmasi pendaftaran event telah berakhir. Pendaftaran yang belum dikonfirmasi telah dibatalkan dan dihapus."}</p>
            <button
              type="button"
              onClick={onClose}
              className="font-sans font-bold text-xs sm:text-sm px-6 py-2 rounded-lg bg-black text-white border border-white/20 hover:bg-white hover:text-black transition-all cursor-pointer shadow-md select-none mt-3"
            >
              Tutup / Kembali ke Event
            </button>
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
                  Your booking buffer has been received. Checking your registered email is mandatory to confirm and lock your spot within 3 minutes before the reservation expires:{" "}
                  <a
                    href={emailInboxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#38bdf8] hover:text-[#7dd3fc] underline underline-offset-4 font-bold transition-colors inline-block ml-1 cursor-pointer"
                  >
                    Check Email
                  </a>
                </p>

                {(doneData?.whatsappUrl || fallbackWaUrl) && (
                  <div className="flex justify-center items-center pt-1">
                    <a
                      href={doneData?.whatsappUrl || fallbackWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-sans font-normal text-[11px] sm:text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors select-none cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current text-[#25D366] shrink-0" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <span>Reopen WhatsApp</span>
                    </a>
                  </div>
                )}
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
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmViaWa}
                    disabled={loading}
                    className={`font-sans font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg bg-black text-white border border-white/20 hover:bg-white hover:text-black transition-all cursor-pointer shadow-md select-none ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading ? "Securing Spot..." : "Confirm via WhatsApp"}
                  </button>
                  <button
                    type="button"
                    onClick={onEditDetails}
                    disabled={loading}
                    className="font-sans font-bold text-xs sm:text-sm px-5 py-2.5 rounded-lg bg-black text-white border border-white/20 hover:bg-white hover:text-black transition-all cursor-pointer shadow-md select-none"
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
  );
}

