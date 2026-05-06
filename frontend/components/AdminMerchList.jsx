"use client";
import { useState } from "react";
import api from "@/lib/api";

const inputClass = "w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white";

function formatRp(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function AdminMerchList({ merch, onToggle, onDeleted, onCreated }) {
  const [form, setForm] = useState({ name: "", photoUrl: "", link: "", price: "" });
  const [loading, setLoading] = useState(false);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/api/admin/merch", { ...form, price: parseFloat(form.price) });
      onCreated(res.data.merch);
      setForm({ name: "", photoUrl: "", link: "", price: "" });
    } catch {/* silent */}
    finally { setLoading(false); }
  }

  async function handleToggleSoldOut(id, current) {
    const res = await api.patch(`/api/admin/merch/${id}/soldout`);
    onToggle(id, res.data.isSoldOut);
  }

  async function handleDelete(id) {
    if (!confirm("Hapus merch ini?")) return;
    await api.delete(`/api/admin/merch/${id}`);
    onDeleted(id);
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Create Form */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Tambah Merch</h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input className={inputClass} placeholder="Nama Merch" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
          <input className={inputClass} placeholder="URL Foto" value={form.photoUrl} onChange={(e) => setField("photoUrl", e.target.value)} required />
          <input className={inputClass} placeholder="Link Tokped/Shopee" value={form.link} onChange={(e) => setField("link", e.target.value)} required />
          <input className={inputClass} type="number" placeholder="Harga (Rp)" value={form.price} onChange={(e) => setField("price", e.target.value)} required />
          <button type="submit" disabled={loading} className="bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40">
            {loading ? "Menyimpan..." : "Tambah Merch"}
          </button>
        </form>
      </div>

      {/* Merch Grid */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Daftar Merch</h3>
        <div className="grid grid-cols-2 gap-3">
          {merch.map((m) => (
            <div
              key={m.id}
              className={`relative border border-gray-200 rounded-xl overflow-hidden transition-all ${
                m.isSoldOut ? "grayscale opacity-50" : ""
              }`}
            >
              <img src={m.photoUrl} alt={m.name} className="w-full aspect-square object-cover" />
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-800 truncate">{m.name}</p>
                <p className="text-xs text-gray-400">{formatRp(m.price)}</p>
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => handleToggleSoldOut(m.id, m.isSoldOut)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium transition ${
                      m.isSoldOut
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    }`}
                  >
                    {m.isSoldOut ? "Tersedia" : "Sold Out"}
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!merch.length && <p className="text-sm text-gray-400 col-span-2">Belum ada merch.</p>}
        </div>
      </div>
    </div>
  );
}
