"use client";
import { useState } from "react";
import api from "@/lib/api";

const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white";

export default function AdminEventForm({ events, onCreated, onDeleted }) {
  const [form, setForm] = useState({
    title: "", displayPhotoUrl: "", regStartTime: "", regEndTime: "", price: "", sessionOptions: [""],
  });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function addSession() { setForm((p) => ({ ...p, sessionOptions: [...p.sessionOptions, ""] })); }
  function removeSession(i) {
    setForm((p) => ({ ...p, sessionOptions: p.sessionOptions.filter((_, idx) => idx !== i) }));
  }
  function setSession(i, v) {
    setForm((p) => {
      const arr = [...p.sessionOptions];
      arr[i] = v;
      return { ...p, sessionOptions: arr };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await api.post("/api/admin/events", {
        ...form,
        price: parseFloat(form.price),
        sessionOptions: form.sessionOptions.filter(Boolean),
      });
      onCreated(res.data.event);
      setForm({ title: "", displayPhotoUrl: "", regStartTime: "", regEndTime: "", price: "", sessionOptions: [""] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Hapus event ini?")) return;
    await api.delete(`/api/admin/events/${id}`);
    onDeleted(id);
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Create Form */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Tambah Event</h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <input className={inputClass} placeholder="Judul Event" value={form.title} onChange={(e) => setField("title", e.target.value)} required />
          <input className={inputClass} placeholder="URL Foto" value={form.displayPhotoUrl} onChange={(e) => setField("displayPhotoUrl", e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Registrasi Mulai</label>
              <input type="datetime-local" className={inputClass} value={form.regStartTime} onChange={(e) => setField("regStartTime", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Registrasi Selesai</label>
              <input type="datetime-local" className={inputClass} value={form.regEndTime} onChange={(e) => setField("regEndTime", e.target.value)} required />
            </div>
          </div>
          <input className={inputClass} type="number" placeholder="Harga (Rp)" value={form.price} onChange={(e) => setField("price", e.target.value)} required />

          {/* Session Options */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block font-medium">Sesi</label>
            {form.sessionOptions.map((s, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className={inputClass} placeholder={`Sesi ${i + 1}`} value={s} onChange={(e) => setSession(i, e.target.value)} />
                {form.sessionOptions.length > 1 && (
                  <button type="button" onClick={() => removeSession(i)} className="text-red-400 hover:text-red-600 px-2 text-lg">×</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addSession} className="text-xs text-gray-500 hover:text-gray-900 underline mt-1">+ Tambah Sesi</button>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button type="submit" disabled={loading} className="bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40">
            {loading ? "Menyimpan..." : "Buat Event"}
          </button>
        </form>
      </div>

      {/* Event List */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Daftar Event</h3>
        <div className="flex flex-col gap-3">
          {events.map((ev) => (
            <div key={ev.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm text-gray-900">{ev.title}</p>
                <p className="text-xs text-gray-400 font-mono">{ev.id}</p>
              </div>
              <button onClick={() => handleDelete(ev.id)} className="text-xs text-red-400 hover:text-red-600 transition">Hapus</button>
            </div>
          ))}
          {!events.length && <p className="text-sm text-gray-400">Belum ada event.</p>}
        </div>
      </div>
    </div>
  );
}
