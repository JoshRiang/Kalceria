"use client";
import { useState } from "react";
import { LABEL, INPUT } from "../primitives";

export function AcceptBookingModal({ booking, onClose, onConfirm }) {
  const [deploymentArea, setDeploymentArea] = useState(booking.deploymentArea || "");
  const [technicalBrief, setTechnicalBrief] = useState(booking.technicalBrief || "");
  const [pricePerHour, setPricePerHour] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total duration from all slots (in hours)
  const totalHours = (booking.slots || []).reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  }, 0);

  const totalPrice = pricePerHour ? parseFloat(pricePerHour) * totalHours : 0;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({ deploymentArea, technicalBrief, totalPrice });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
          <div>
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Phase 3 — Acceptance & Pricing</p>
            <h2 className="font-mono font-black text-xl text-white uppercase tracking-tighter mt-0.5">
              Review & Accept Booking
            </h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl font-mono">&times;</button>
        </div>

        {/* Body - Two Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">

          {/* LEFT: Data Review */}
          <div className="p-8 space-y-5">
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-4">Data Review (Read-Only)</p>

            {/* Request Title */}
            <div>
              <label className={LABEL}>Request Title / Service</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.serviceName || booking.serviceType || "—"}
              </div>
            </div>

            {/* Operator Name */}
            <div>
              <label className={LABEL}>Operator / Contact Person</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.contactPerson || booking.requestor?.name || "—"}
              </div>
            </div>

            {/* Comms */}
            <div>
              <label className={LABEL}>Comms (WhatsApp)</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.whatsapp || "—"}
              </div>
            </div>

            {/* Editable: Deployment Area */}
            <div>
              <label className={LABEL}>Deployment Area *</label>
              <textarea
                value={deploymentArea}
                onChange={(e) => setDeploymentArea(e.target.value)}
                placeholder="e.g. Hall A, Stage 2, Main Entrance..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20 resize-none"
              />
            </div>

            {/* Editable: Technical Brief */}
            <div>
              <label className={LABEL}>Technical Brief *</label>
              <textarea
                value={technicalBrief}
                onChange={(e) => setTechnicalBrief(e.target.value)}
                placeholder="e.g. Power requirements, rigging notes, special setup..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20 resize-none"
              />
            </div>
          </div>

          {/* RIGHT: Real-Time Financials */}
          <div className="p-8 space-y-5 flex flex-col">
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-4">Financial Calculation</p>

            {/* Duration Summary */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-1">
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Booking Duration</p>
              <p className="font-mono font-black text-2xl text-white">{totalHours.toFixed(1)} hrs</p>
              <p className="font-mono text-[10px] text-white/30">{booking.slots?.length || 0} slot(s) total</p>
            </div>

            {/* Price Per Hour Input */}
            <div>
              <label className={LABEL}>Price per Hour (IDR)</label>
              <input
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                placeholder="e.g. 500000"
                min="0"
                className={INPUT}
              />
            </div>

            {/* Total Price Display */}
            <div className={`rounded-xl border p-5 transition-all duration-300 flex-1 flex flex-col justify-center items-center text-center ${
              totalPrice > 0
                ? "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                : "border-white/5 bg-white/[0.02]"
            }`}>
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-2">Total Price</p>
              <p className={`font-mono font-black text-3xl transition-all duration-300 ${
                totalPrice > 0 ? "text-emerald-400" : "text-white/10"
              }`}>
                {totalPrice > 0 ? formatRupiah(totalPrice) : "IDR 0"}
              </p>
              {totalPrice > 0 && pricePerHour && (
                <p className="font-mono text-[10px] text-white/30 mt-2">
                  {formatRupiah(parseFloat(pricePerHour))} × {totalHours.toFixed(1)} hrs
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white/50 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || totalPrice <= 0}
                className="flex-1 py-3 bg-emerald-500 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white hover:bg-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {isSubmitting ? "Processing..." : "Confirm & Accept ✓"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

