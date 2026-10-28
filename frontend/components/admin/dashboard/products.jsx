"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useDebounce, CARD, LABEL, INPUT, BTN_PRIMARY, CLIP_BTN, ExpandableSearch } from './primitives';

export function RecordSaleModal({ product, onClose, onConfirm }) {
  const [qty, setQty] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalRevenue = qty && pricePerUnit ? parseInt(qty) * parseFloat(pricePerUnit) : 0;

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  const handleConfirm = async () => {
    setError('');
    const parsedQty = parseInt(qty);
    const parsedPrice = parseFloat(pricePerUnit);
    if (!parsedQty || parsedQty < 1) return setError('Quantity must be at least 1.');
    if (!parsedPrice || parsedPrice <= 0) return setError('Price per unit must be greater than 0.');
    setIsSubmitting(true);
    try {
      await onConfirm({ qty: parsedQty, pricePerUnit: parsedPrice, totalRevenue: totalRevenue });
    } catch {
      setError('Failed to record sale. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
          <div>
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Manual Sales Entry</p>
            <h2 className="font-mono font-black text-lg text-white uppercase tracking-tighter mt-0.5">Record Sale</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl">&times;</button>
        </div>

        <div className="p-8 space-y-5">
          {/* Product Info (read-only) */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
            <div>
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-1">Product ID</p>
              <p className="font-mono text-sm font-black text-white">{product.productId || product.id}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-1">Product Name</p>
              <p className="font-mono text-sm font-black text-white uppercase">{product.name}</p>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={LABEL}>Quantity Sold</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 3"
              className={INPUT}
            />
          </div>

          {/* Price per unit */}
          <div>
            <label className={LABEL}>Sale Price per Item (IDR)</label>
            <input
              type="number"
              min="0"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              placeholder="e.g. 250000"
              className={INPUT}
            />
          </div>

          {/* Total Revenue Display */}
          <div className={`rounded-xl border p-5 text-center transition-all duration-300 ${
            totalRevenue > 0
              ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
              : 'border-white/5 bg-white/[0.02]'
          }`}>
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-2">Total Revenue</p>
            <p className={`font-mono font-black text-3xl tracking-tighter transition-all duration-300 ${
              totalRevenue > 0 ? 'text-emerald-400' : 'text-white/10'
            }`}>
              {totalRevenue > 0 ? formatRupiah(totalRevenue) : 'IDR 0'}
            </p>
            {totalRevenue > 0 && qty && pricePerUnit && (
              <p className="font-mono text-[10px] text-white/30 mt-1.5">
                {qty} units × {formatRupiah(parseFloat(pricePerUnit))}
              </p>
            )}
          </div>

          {error && <p className="font-mono text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white/50 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || totalRevenue <= 0}
              className="flex-1 py-3 bg-emerald-500 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white hover:bg-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Sale ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ product, onEdit, onDelete, onRecordSale }) {
  const [hover, setHover] = useState(false);
  const bg = product.imageUrl || `https://picsum.photos/seed/${product.id}/600/800`;

  const labelStyles = {
    "HOT DEALS": "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]",
    "AVAILABLE": "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    "SOLD OUT": "bg-slate-700 text-slate-300 shadow-none opacity-80"
  };

  return (
    <motion.div
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      className="relative w-full aspect-[4/5] overflow-hidden bg-slate-900 border border-white/20 shadow-2xl cursor-pointer group"
      style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
    >
      <motion.div
        animate={{ scale: hover ? 1.1 : 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute inset-0 bg-cover bg-center filter saturate-120 contrast-110"
        style={{ backgroundImage: `url(${bg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

      {/* Actions Overlay */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-30 bg-black/60 backdrop-blur-[2px]"
          >
            <div className="flex gap-3 w-full max-w-[160px]">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="flex-1 py-2 bg-green-500/20 border border-green-500/50 text-green-400 font-black uppercase text-[10px] tracking-widest hover:bg-green-500/40 transition-all"
                style={CLIP_BTN}
              >
                EDIT
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="flex-1 py-2 bg-red-500/20 border border-red-500/50 text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/40 transition-all"
                style={CLIP_BTN}
              >
                DEL
              </button>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRecordSale(); }}
              className="w-full max-w-[160px] py-2 bg-emerald-400/20 border border-emerald-400/60 text-emerald-300 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400/40 transition-all shadow-[0_0_12px_rgba(52,211,153,0.3)]"
              style={CLIP_BTN}
            >
              SALE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 left-4 z-20">
        <span className={`px-3 py-1 text-[9px] font-mono font-black uppercase tracking-tighter ${labelStyles[product.label] || labelStyles.AVAILABLE}`} style={{ clipPath: "polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)" }}>
          {product.label}
        </span>
      </div>

      <div className="absolute inset-0 p-5 flex flex-col justify-end pointer-events-none">
        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <p className="font-mono text-[10px] text-white font-black tracking-widest mb-1 opacity-90 uppercase">{product.productId || "PROD-XXXX"}</p>
          <h4 className="font-mono font-black text-2xl uppercase tracking-tighter text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] italic">
            {product.name}
          </h4>
        </div>
      </div>
    </motion.div>
  );
}

export const INITIAL_DUMMIES = Array.from({ length: 10 }).map((_, i) => ({
  id: `mock-${i}`,
  productId: `KLCR-${100 + i}`,
  name: i === 0 ? "Obsidian Shift Knob" : i === 1 ? "Carbon Fiber Lip" : i === 2 ? "Aero Dynamic Wing" : i === 3 ? "Forged Pistons Set" : i === 4 ? "Titanium Exhaust" : i === 5 ? "Cold Air Intake" : i === 6 ? "Racing Brake Pads" : i === 7 ? "Coilover Suspension" : i === 8 ? "Billet Fuel Rail" : "High Flow Injectors",
  imageUrl: `https://picsum.photos/seed/kalceria${i}/600/800`,
  label: i % 4 === 0 ? "HOT DEALS" : i % 4 === 1 ? "SOLD OUT" : "AVAILABLE"
}));

export function ProductsPanel({ onRefresh }) {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ productId: "", name: "", imageUrl: "", label: "AVAILABLE" });
  const [saleModal, setSaleModal] = useState(null); // null | product object
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredProducts = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return products;
    const terms = q.split(/\s+/);
    return products.filter((p) => {
      const searchString = [p.productId, p.name].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [products, debouncedSearchQuery]);

  useEffect(() => {
    // Load dummies or from localStorage for persistence in this session
    const saved = localStorage.getItem("kalceria_dummy_products");
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Products are intentionally restored from this browser's session storage on mount.
      setProducts(JSON.parse(saved));
    } else {
      setProducts(INITIAL_DUMMIES);
      localStorage.setItem("kalceria_dummy_products", JSON.stringify(INITIAL_DUMMIES));
    }
  }, []);

  const saveToLocal = (data) => {
    setProducts(data);
    localStorage.setItem("kalceria_dummy_products", JSON.stringify(data));
    onRefresh();
  };

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function startEdit(p) {
    setEditing(p);
    setForm({ productId: p.productId, name: p.name, imageUrl: p.imageUrl, label: p.label });
  }

  function handleSave(e) {
    e.preventDefault();
    if (editing) {
      const updated = products.map(p => p.id === editing.id ? { ...p, ...form } : p);
      saveToLocal(updated);
      setEditing(null);
    } else {
      const newItem = { ...form, id: `mock-${Date.now()}` };
      saveToLocal([newItem, ...products]);
    }
    setForm({ productId: "", name: "", imageUrl: "", label: "AVAILABLE" });
  }

  function handleDelete(id) {
    if (!confirm("Delete product?")) return;
    saveToLocal(products.filter(p => p.id !== id));
  }

  async function handleRecordSale(product, { qty, pricePerUnit, totalRevenue }) {
    // For DB-backed Merch (real UUID ids), call the API
    if (!product.id.startsWith('mock-')) {
      await api.post(`/admin/merch/${product.id}/sales`, { qty, pricePerUnit });
    }
    // For localStorage dummy items, update soldCount + totalRevenue locally
    const updated = products.map((p) =>
      p.id === product.id
        ? { ...p, soldCount: (p.soldCount || 0) + qty, totalRevenue: (p.totalRevenue || 0) + totalRevenue }
        : p
    );
    saveToLocal(updated);
    setSaleModal(null);
  }

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className={`${CARD} rounded p-6`} style={CLIP_BTN}>
            <h3 className="font-mono font-black text-sm uppercase tracking-widest text-slate-400 mb-5">
              {editing ? "Edit Product" : "New Product"}
            </h3>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className={LABEL}>Product ID</label>
                <input className={INPUT} placeholder="e.g. KLCR-001" value={form.productId} onChange={(e) => setField("productId", e.target.value)} required />
              </div>
              <div>
                <label className={LABEL}>Name</label>
                <input className={INPUT} placeholder="Product name" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
              </div>
              <div>
                <label className={LABEL}>Image URL</label>
                <input className={INPUT} placeholder="https://..." value={form.imageUrl} onChange={(e) => setField("imageUrl", e.target.value)} required />
              </div>
              <div>
                <label className={LABEL}>Label</label>
                <select className={INPUT} value={form.label} onChange={(e) => setField("label", e.target.value)}>
                  {["AVAILABLE", "HOT DEALS", "SOLD OUT"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button type="submit" className={BTN_PRIMARY} style={CLIP_BTN}>
                  {editing ? "Update Product" : "Create Product"}
                </button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(null); setForm({ productId: "", name: "", imageUrl: "", label: "AVAILABLE" }); }}
                    className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono font-black text-sm uppercase tracking-widest text-white">Product List</h3>
            <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search by ID or name..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => startEdit(p)}
                onDelete={() => handleDelete(p.id)}
                onRecordSale={() => setSaleModal(p)}
              />
            ))}
            {!filteredProducts.length && (
              <div className="lg:col-span-2 border border-dashed border-white/20 p-20 text-center rounded">
                <p className="text-slate-600 text-xs font-mono uppercase tracking-widest">{searchQuery ? `No products matching "${searchQuery}"` : "No products found"}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Sale Modal — rendered as sibling inside Fragment, not outside root */}
      {saleModal && (
        <RecordSaleModal
          product={saleModal}
          onClose={() => setSaleModal(null)}
          onConfirm={(saleData) => handleRecordSale(saleModal, saleData)}
        />
      )}
    </>
  );
}
