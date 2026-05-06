"use client";
import { useState, useContext } from "react";
import api from "@/lib/api";
import InvoiceModal from "./InvoiceModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
const today = new Date().toISOString().split("T")[0];
const maxDate = addDays(today, 7);

const timeSlots = [];
for (let h = 9; h <= 23; h++) {
  timeSlots.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 23) timeSlots.push(`${String(h).padStart(2, "0")}:30`);
}
timeSlots.push("00:00");

// ─── Field Wrapper ────────────────────────────────────────────────────────────
function Field({ label, locked, children }) {
  return (
    <div className={`transition-all duration-300 ${locked ? "opacity-50 pointer-events-none" : ""}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400";
const lockedClass = "bg-gray-200 grayscale cursor-not-allowed";

// ─── NeedUsForm ───────────────────────────────────────────────────────────────
export default function NeedUsForm({ userEmail, userName }) {
  const [step, setStep]           = useState(1);
  const [service, setService]     = useState("");
  const [date, setDate]           = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [invoice, setInvoice]     = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/services/book", {
        serviceType: service,
        bookingDate: date,
        startTime,
        endTime,
      });
      setInvoice(res.data);
    } catch (err) {
      setError(err.message || "Gagal membuat booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="w-full max-w-md mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-1">Need Us?</h2>
        <p className="text-gray-500 text-sm mb-8">Pesan jasa Kalceria dengan mudah.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Step 1: Email */}
          <Field label="Email Kamu" locked={false}>
            <input
              type="email"
              value={userEmail || ""}
              readOnly
              className={`${inputClass} bg-gray-100 cursor-not-allowed`}
            />
          </Field>

          {/* Step 2: Service */}
          <Field label="Pilih Layanan" locked={!userEmail}>
            <select
              value={service}
              onChange={(e) => { setService(e.target.value); if (e.target.value) setStep(3); }}
              className={`${inputClass} ${!userEmail ? lockedClass : "bg-white"}`}
              required
            >
              <option value="">-- Pilih --</option>
              <option value="SHOOTING">Shooting</option>
            </select>
          </Field>

          {/* Step 3: Date */}
          <Field label="Tanggal" locked={!service}>
            <input
              type="date"
              value={date}
              min={today}
              max={maxDate}
              onChange={(e) => { setDate(e.target.value); if (e.target.value) setStep(4); }}
              className={`${inputClass} ${!service ? lockedClass : "bg-white"}`}
              required
            />
          </Field>

          {/* Step 4: Time */}
          <Field label="Waktu Mulai" locked={!date}>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`${inputClass} ${!date ? lockedClass : "bg-white"}`}
              required
            >
              <option value="">-- Pilih --</option>
              {timeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Waktu Selesai" locked={!startTime}>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`${inputClass} ${!startTime ? lockedClass : "bg-white"}`}
              required
            >
              <option value="">-- Pilih --</option>
              {timeSlots
                .filter((t) => t > startTime || t === "00:00")
                .map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !service || !date || !startTime || !endTime}
            className="mt-2 bg-gray-900 text-white rounded-lg py-3 font-semibold text-sm hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Memproses..." : "Buat Pesanan"}
          </button>
        </form>
      </section>

      {invoice && (
        <InvoiceModal
          invoice={invoice}
          service={service}
          date={date}
          startTime={startTime}
          endTime={endTime}
          onClose={() => setInvoice(null)}
        />
      )}
    </>
  );
}
