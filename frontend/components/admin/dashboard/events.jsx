"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useDebounce, CARD, LABEL, INPUT, BTN_PRIMARY, CLIP_BTN, ExpandableSearch } from './primitives';

export function ForzaCard({ event, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const bg = event.displayPhotoUrl || "/event_1.webp";
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
        className="absolute inset-0 bg-cover bg-center filter saturate-150 contrast-125"
        style={{ backgroundImage: `url(${bg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

      {/* Actions Overlay */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 flex items-center justify-center gap-4 z-30 bg-black/60 backdrop-blur-[2px]"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="px-6 py-2.5 bg-green-500/20 border border-green-500/50 text-green-400 font-black uppercase text-[11px] tracking-widest hover:bg-green-500/40 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
              style={CLIP_BTN}
            >
              EDIT
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="px-6 py-2.5 bg-red-500/20 border border-red-500/50 text-red-400 font-black uppercase text-[11px] tracking-widest hover:bg-red-500/40 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              style={CLIP_BTN}
            >
              DEL
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 p-5 flex flex-col justify-end pointer-events-none">
        <div className="translate-y-8 group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <h4 className="font-mono font-black text-2xl md:text-3xl uppercase tracking-tighter text-white drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] italic mb-2" style={{ textShadow: "2px 2px 0 #FF00FF, -2px -2px 0 #00FFFF" }}>
            {event.title}
          </h4>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <p className="font-sans text-[9px] text-slate-300 mb-3 line-clamp-2 leading-tight font-light italic border-b border-white/10 pb-2 shadow-[0_1px_0_0_#FF00FF]">{event.description || "Join us for an unforgettable automotive experience."}</p>
            <div className="flex gap-3 text-[10px] font-mono font-bold text-white uppercase flex-wrap">
              <span className="bg-cyan-500 text-black px-2 py-0.5" style={{ clipPath: "polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)" }}>{event.location || "TBA"}</span>
              <span className="bg-fuchsia-500 text-white px-2 py-0.5" style={{ clipPath: "polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)" }}>Rp {Number(event.price).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function EventsPanel({ initialEvents = [], onRefresh }) {
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", displayPhotoUrl: "", location: "", regStartTime: "", regEndTime: "", price: "", quota: 100, status: "OPEN", sessionOptions: [""] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredEvents = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return events;
    const terms = q.split(/\s+/);
    return events.filter((e) => {
      const searchString = [e.title, e.description, e.location].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [events, debouncedSearchQuery]);

  useEffect(() => { setEvents(initialEvents); }, [initialEvents]);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }
  function addSession() { setForm((p) => ({ ...p, sessionOptions: [...p.sessionOptions, ""] })); }
  function removeSession(i) { setForm((p) => ({ ...p, sessionOptions: p.sessionOptions.filter((_, idx) => idx !== i) })); }
  function setSession(i, v) { setForm((p) => { const a = [...p.sessionOptions]; a[i] = v; return { ...p, sessionOptions: a }; }); }

  function startEdit(ev) {
    setEditing(ev);
    setForm({
      title: ev.title, description: ev.description || "", displayPhotoUrl: ev.displayPhotoUrl,
      location: ev.location || "", regStartTime: ev.regStartTime?.slice(0, 16) || "",
      regEndTime: ev.regEndTime?.slice(0, 16) || "", price: ev.price, quota: ev.quota,
      status: ev.status, sessionOptions: ev.sessionOptions || [""],
    });
  }

  async function handleSave(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), quota: parseInt(form.quota), sessionOptions: form.sessionOptions.filter(Boolean) };
      if (editing) {
        await api.put(`/admin/events/${editing.id}`, payload);
      } else {
        await api.post("/admin/events", payload);
      }
      setEditing(null);
      setForm({ title: "", description: "", displayPhotoUrl: "", location: "", regStartTime: "", regEndTime: "", price: "", quota: 100, status: "OPEN", sessionOptions: [""] });
      onRefresh();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete event?")) return;
    await api.delete(`/admin/events/${id}`);
    onRefresh();
  }

  return (
    <div className="grid lg:grid-cols-3 gap-10">
      <div className="lg:col-span-1 space-y-8">
        {/* Form */}
        <div className={`${CARD} rounded p-6`} style={CLIP_BTN}>
          <h3 className="font-mono font-black text-sm uppercase tracking-widest text-slate-400 mb-5">
            {editing ? editing.title : "New Event"}
          </h3>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            {[
              { k: "title", label: "Title", ph: "Event title" },
              { k: "displayPhotoUrl", label: "Photo URL", ph: "/event_1.webp" },
              { k: "location", label: "Location", ph: "Jakarta" },
            ].map(({ k, label, ph }) => (
              <div key={k}>
                <label className={LABEL}>{label}</label>
                <input className={INPUT} placeholder={ph} value={form[k]} onChange={(e) => setField(k, e.target.value)} required={k !== "location"} />
              </div>
            ))}
            <div>
              <label className={LABEL}>Description</label>
              <textarea className={INPUT} rows={2} placeholder="Event description..." value={form.description} onChange={(e) => setField("description", e.target.value)} />
            </div>
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Registration Start</label>
                <div className="relative">
                  <input type="datetime-local" className={`${INPUT} h-14 text-lg px-5`} value={form.regStartTime} onChange={(e) => setField("regStartTime", e.target.value)} required />
                </div>
              </div>
              <div>
                <label className={LABEL}>Registration End</label>
                <div className="relative">
                  <input type="datetime-local" className={`${INPUT} h-14 text-lg px-5`} value={form.regEndTime} onChange={(e) => setField("regEndTime", e.target.value)} required />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Price (IDR)</label>
                <input type="number" className={INPUT} placeholder="50000" value={form.price} onChange={(e) => setField("price", e.target.value)} required />
              </div>
              <div>
                <label className={LABEL}>Quota</label>
                <input type="number" className={INPUT} placeholder="100" value={form.quota} onChange={(e) => setField("quota", e.target.value)} required />
              </div>
            </div>
            <div>
              <label className={LABEL}>Status</label>
              <select className={INPUT} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                {["DRAFT", "OPEN", "CLOSED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Sessions</label>
              {form.sessionOptions.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className={INPUT} placeholder={`Session ${i + 1}`} value={s} onChange={(e) => setSession(i, e.target.value)} />
                  {form.sessionOptions.length > 1 && (
                    <button type="button" onClick={() => removeSession(i)} className="text-red-500 hover:text-red-400 px-2 text-lg font-bold">×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addSession} className="text-xs text-slate-500 hover:text-slate-300 underline mt-1">+ Add Session</button>
            </div>
            {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
            <div className="flex gap-3 mt-2">
              <button type="submit" disabled={loading} className={BTN_PRIMARY} style={CLIP_BTN}>
                {loading ? "Saving..." : editing ? "Update Event" : "Create Event"}
              </button>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setForm({ title: "", description: "", displayPhotoUrl: "", location: "", regStartTime: "", regEndTime: "", price: "", quota: 100, status: "OPEN", sessionOptions: [""] }); }}
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
          <h3 className="font-mono font-black text-sm uppercase tracking-widest text-white">Event List</h3>
          <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search by title..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredEvents.map((e) => (
            <ForzaCard key={e.id} event={e} onEdit={() => startEdit(e)} onDelete={() => handleDelete(e.id)} />
          ))}
          {!filteredEvents.length && (
            <div className="lg:col-span-2 border border-dashed border-white/20 p-20 text-center rounded">
              <p className="text-slate-600 text-xs font-mono uppercase tracking-widest">{searchQuery ? `No events matching "${searchQuery}"` : "No events found in database"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
