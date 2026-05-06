"use client";
import { useEffect } from "react";

function formatRp(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function InvoiceModal({ invoice, service, date, startTime, endTime, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">Kalceria</p>
          <h3 className="text-lg font-semibold text-gray-900 mt-0.5">Order summary</h3>
        </div>

        {/* Item */}
        <div className="px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-gray-900 text-sm">
                Jasa {service.charAt(0) + service.slice(1).toLowerCase()} Kalceria
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-gray-400">{startTime} – {endTime}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
            <span>Rate</span>
            <span>Rp 120.000 / jam</span>
          </div>
        </div>

        {/* Total */}
        <div className="px-6 pb-5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-gray-900 text-lg">{formatRp(invoice.totalAmount)}</span>
          </div>
        </div>

        {/* Action */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <a
            href={invoice.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition"
          >
            Lanjutkan ke WhatsApp
          </a>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 transition mt-1"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
