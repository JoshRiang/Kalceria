"use client";
import { useEffect } from "react";
import api from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(dateStr));
}

// ─── Table Row ───────────────────────────────────────────────────────────────
function Row({ label, value }) {
  return (
    <tr>
      <td className="border border-gray-300 px-4 py-3 font-bold text-[11px] uppercase tracking-wide text-black w-[38%] align-top">
        {label}
      </td>
      <td className="border border-gray-300 px-4 py-3 text-[11px] text-black align-top">
        {value || "—"}
      </td>
    </tr>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ReceiptModal({ type, data, onClose }) {
  const isBooking = type === "BOOKING";

  // Background: mark as exported in DB
  useEffect(() => {
    const endpoint = isBooking
      ? `/admin/services/${data.id}/pdf`
      : `/admin/registrations/${data.id}/pdf`;
    api.patch(endpoint).catch((err) => console.error("Failed to mark PDF exported:", err));
  }, [type, data.id, isBooking]);

  // ── Derived field values ──────────────────────────────────────────────────
  const name = isBooking
    ? (data.contactPerson || data.requestor?.name || "—")
    : (data.user?.name || "—");

  const eventName  = isBooking ? "—" : (data.event?.title || "—");
  const serviceName = isBooking ? (data.serviceName || data.serviceType || "—") : (data.selectedSession || "—");
  const registrationDate = formatDate(data.createdAt);

  const eventServiceDate = isBooking
    ? (data.slots?.length
        ? [...new Set(data.slots.map((s) => formatDate(s.date)))].join(", ")
        : "—")
    : formatDate(data.event?.date || data.event?.eventDate);

  // ── Financial ─────────────────────────────────────────────────────────────
  const totalHours = isBooking
    ? (data.slots || []).reduce((acc, s) => {
        if (!s.startTime || !s.endTime) return acc;
        const [sh, sm] = s.startTime.split(":").map(Number);
        const [eh, em] = s.endTime.split(":").map(Number);
        return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
      }, 0)
    : 0;

  const totalPrice   = isBooking ? (data.totalPrice || 0) : (data.event?.price || 0);
  const pricePerHour = isBooking && totalHours > 0 ? totalPrice / totalHours : null;

  const publishedOn = new Intl.DateTimeFormat("en-US", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Print CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .k-receipt, .k-receipt * { visibility: visible; }
          .k-receipt { position: fixed; left: 0; top: 0; width: 100%; box-shadow: none !important; max-height: none !important; overflow: visible !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      ` }} />

      {/* ── Receipt Container ── */}
      <div className="k-receipt w-full max-w-2xl bg-[#faf9f6] shadow-2xl overflow-hidden overflow-y-auto max-h-[92vh] relative">

        {/* ── BLACK HEADER BAR ── */}
        <div className="bg-black py-5 flex justify-center items-center relative px-6">
          <span
            className="font-black italic text-4xl tracking-tight select-none"
            style={{ fontFamily: "sans-serif", background: "linear-gradient(90deg, #ff6600, #ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            KALCERIA
          </span>

          {/* Action buttons — top-right of header, hidden on print */}
          <div className="no-print absolute right-4 flex gap-2">
            <button
              onClick={() => window.print()}
              title="Print Receipt"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-emerald-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-500 transition-all text-lg font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Orange–Yellow gradient rule */}
        <div style={{ height: "4px", background: "linear-gradient(90deg, #ff6600, #ffcc00)" }} />

        {/* ── DOCUMENT BODY ── */}
        <div className="px-14 py-10">

          {/* Centered Title Block */}
          <div className="text-center mb-10">
            <h1 className="font-black text-4xl text-black tracking-tight mb-2" style={{ fontFamily: "sans-serif" }}>
              E-RECEIPT
            </h1>
            <p className="font-bold text-sm text-black mb-1">Kalceria Car Community Club</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Fresmarket Bintaro, Jl. Bintaro Utama 10, Parigi,<br />
              Kec. Pd. Aren, Kota Tangerang Selatan, Banten 15227
            </p>
            <p className="text-xs text-gray-600 mt-3">
              Published On : <span className="font-semibold">{publishedOn}</span>
            </p>
          </div>

          {/* Data Table */}
          <table className="w-full border-collapse mb-4 text-sm">
            <tbody>
              <Row label="NAME"                    value={name} />
              {!isBooking && (
                <Row label="NAME OF EVENT"           value={eventName} />
              )}
              <Row label="NAME OF SERVICE"         value={serviceName} />
              <Row label="REGISTRATION DATE"       value={registrationDate} />
              <Row label="DATE OF EVENT / SERVICE" value={eventServiceDate} />
              {/* Booking-only operational rows */}
              {isBooking && totalHours > 0 && (
                <Row label="DURATION" value={`${totalHours.toFixed(1)} hours`} />
              )}
              {isBooking && pricePerHour && (
                <Row label="PRICE / HOUR" value={formatRupiah(pricePerHour)} />
              )}
            </tbody>
          </table>

          {/* TOTAL Row — right-aligned pill */}
          <div className="flex justify-end mb-12">
            <div className="border border-gray-300 flex items-center gap-10 px-6 py-3">
              <span className="font-black text-[11px] uppercase tracking-widest text-black">TOTAL</span>
              <span className="font-black text-xl text-black">{formatRupiah(totalPrice)}</span>
            </div>
          </div>

          {/* Signature Block — bottom right */}
          <div className="flex justify-end">
            <div className="text-center" style={{ minWidth: "220px" }}>
              {/* Blank signature space */}
              <div className="h-20" />
              <div className="border-t border-gray-600 pt-2">
                <p className="font-black text-sm text-black">Reyhan Batara</p>
                <p className="text-xs text-gray-500 mt-0.5">Vice President</p>
              </div>
            </div>
          </div>

          {/* Bottom padding for scroll */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
