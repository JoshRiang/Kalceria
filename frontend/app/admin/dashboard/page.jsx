"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

// ─── Shared primitives ────────────────────────────────────────────────────────
const DARK = "bg-[#050a14]";
const CARD = "bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] font-mono font-black uppercase tracking-tighter";
const LABEL = "font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 block";
const INPUT = "w-full bg-black/40 border border-white/20 rounded px-3 py-2 font-sans text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-white/40 backdrop-blur-sm font-normal";
const BTN_PRIMARY = "px-4 py-2 bg-white text-black font-extrabold text-xs uppercase tracking-wider rounded hover:bg-slate-200 transition-colors disabled:opacity-40";
const BTN_DANGER = "px-3 py-1.5 bg-red-900/50 border border-red-700/60 text-red-100 font-bold text-xs uppercase tracking-wider rounded hover:bg-red-800/60 transition-colors";
const BTN_SUCCESS = "px-3 py-1.5 bg-emerald-900/50 border border-emerald-700/60 text-emerald-100 font-bold text-xs uppercase tracking-wider rounded hover:bg-emerald-800/60 transition-colors";

const BTN_ICON_DANGER = "p-1.5 bg-red-900/50 border border-red-700/60 rounded hover:bg-red-800/60 transition-colors flex items-center justify-center";
const BTN_ICON_SUCCESS = "p-1.5 bg-emerald-900/50 border border-emerald-700/60 rounded hover:bg-emerald-800/60 transition-colors flex items-center justify-center";

const CheckIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const CLIP_BTN = { clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" };

function getCardHoverStyle(id) {
  if (!id) return "";
  const isPink = id.charCodeAt(id.length - 1) % 2 === 0;
  return isPink 
    ? "hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:border-fuchsia-500/50 hover:bg-fuchsia-900/10" 
    : "hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:border-yellow-500/50 hover:bg-yellow-900/10";
}

function Badge({ label, color }) {
  const map = {
    PENDING: "bg-yellow-900/30 border-yellow-700/40 text-yellow-400",
    CONFIRMED: "bg-emerald-900/30 border-emerald-700/40 text-emerald-400",
    REJECTED: "bg-red-900/30 border-red-700/40 text-red-400",
    OPEN: "bg-cyan-900/30 border-cyan-700/40 text-cyan-400",
    CLOSED: "bg-slate-800 border-slate-700 text-slate-400",
    DRAFT: "bg-slate-800 border-slate-700 text-slate-500",
    PROCESSED: "bg-blue-900/30 border-blue-700/40 text-blue-400",
    ADMIN: "bg-red-900/30 border-red-700/40 text-red-400",
    USER: "bg-slate-800 border-slate-700 text-slate-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wider ${map[label] || map.CLOSED}`}>
      {label}
    </span>
  );
}

function formatRp(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function HoverTypewriter({ text, speed = 40, hover }) {
  const [displayed, setDisplayed] = useState(text);

  useEffect(() => {
    let t;
    if (hover) {
      setDisplayed("");
      let i = 0;
      t = setInterval(() => {
        setDisplayed(text.substring(0, i));
        i++;
        if (i > text.length) clearInterval(t);
      }, speed);
    } else {
      setDisplayed(text);
    }
    return () => clearInterval(t);
  }, [hover, text, speed]);

  return <span>{displayed}</span>;
}

function DynamicBlobs() {
  const [blobIndex, setBlobIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBlobIndex(i => (i + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  const bgColors = [
    { top: "bg-cyan-500/30", bottom: "bg-red-600/30" },
    { top: "bg-fuchsia-600/30", bottom: "bg-yellow-500/30" },
    { top: "bg-green-500/30", bottom: "bg-violet-600/30" },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={blobIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className={`absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full ${bgColors[blobIndex].top} blur-[140px] mix-blend-screen animate-pulse`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full ${bgColors[blobIndex].bottom} blur-[120px] mix-blend-screen animate-pulse`} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value }) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div 
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`${CARD} rounded p-5 relative overflow-hidden group transition-all duration-300`} 
      style={CLIP_BTN}
    >
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <p className="font-mono font-black text-xs text-white uppercase tracking-widest mb-1 min-h-[1.5em] relative z-10">
        <HoverTypewriter text={label} hover={hover} />
      </p>
      <p className={`font-mono font-black text-3xl text-white relative z-10`}>{value}</p>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="font-mono font-black text-xl uppercase tracking-tighter text-white">{children}</h2>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

function ForzaCard({ event, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const bg = event.displayPhotoUrl || "/event_1.jpeg";
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

function EventsPanel({ initialEvents = [], onRefresh }) {
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState(null); 
  const [form, setForm] = useState({ title: "", description: "", displayPhotoUrl: "", location: "", regStartTime: "", regEndTime: "", price: "", quota: 100, status: "OPEN", sessionOptions: [""] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setEvents(initialEvents); }, [initialEvents]);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

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
              { k: "displayPhotoUrl", label: "Photo URL", ph: "/event_1.jpeg" },
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
                  <input type="datetime-local" className={`${INPUT} h-14 text-lg px-5 font-mono`} value={form.regStartTime} onChange={(e) => setField("regStartTime", e.target.value)} required />
                </div>
              </div>
              <div>
                <label className={LABEL}>Registration End</label>
                <div className="relative">
                  <input type="datetime-local" className={`${INPUT} h-14 text-lg px-5 font-mono`} value={form.regEndTime} onChange={(e) => setField("regEndTime", e.target.value)} required />
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
        <h3 className="font-mono font-black text-sm uppercase tracking-widest text-white mb-6">Event List</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map((e) => (
            <ForzaCard key={e.id} event={e} onEdit={() => startEdit(e)} onDelete={() => handleDelete(e.id)} />
          ))}
          {!events.length && (
            <div className="lg:col-span-2 border border-dashed border-white/20 p-20 text-center rounded">
              <p className="text-slate-600 text-xs font-mono uppercase tracking-widest">No events found in database</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RegistrationsPanel() {
  const [regs, setRegs] = useState([]);

  const load = useCallback(async () => {
    const r = await api.get("/admin/registrations").catch(() => ({ data: { registrations: [] } }));
    setRegs(r.data.registrations || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function confirmPayment(id, status) {
    await api.patch(`/admin/registrations/${id}/payment`, { status });
    load();
  }
  async function del(id) {
    if (!confirm("Delete registration?")) return;
    await api.delete(`/admin/registrations/${id}`);
    load();
  }
  async function exportPdf(id) {
    await api.patch(`/admin/registrations/${id}/pdf`);
    window.open("/receipt.pdf", "_blank");
    load();
  }

  return (
    <div className="flex flex-col gap-3">
      {regs.map((r) => (
        <div key={r.id} className={`${CARD} rounded-xl p-4 group transition-all duration-300 ${getCardHoverStyle(r.id)}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white">{r.user?.name}</p>
                <Badge label={r.paymentStatus} />
                {r.pdfExported && <span className="font-mono text-[10px] text-slate-600 group-hover:text-white transition-colors duration-300">PDF ✓</span>}
              </div>
              <p className="font-sans text-xs text-slate-500 group-hover:text-white transition-colors duration-300">{r.user?.email} · {r.event?.title}</p>
              <p className="font-sans text-xs text-slate-600 mt-1 uppercase group-hover:text-white transition-colors duration-300">Session: {r.selectedSession} · {formatDate(r.createdAt)} · {formatRp(r.event?.price)}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {r.paymentStatus === "PENDING" && <>
                <button onClick={() => confirmPayment(r.id, "CONFIRMED")} className={BTN_ICON_SUCCESS}><CheckIcon /></button>
                <button onClick={() => confirmPayment(r.id, "REJECTED")} className={BTN_DANGER}>Reject</button>
              </>}
              {r.paymentStatus === "CONFIRMED" && !r.pdfExported && (
                <button onClick={() => exportPdf(r.id)} className="px-3 py-1.5 bg-blue-900/50 border border-blue-700/60 text-blue-100 font-bold text-xs uppercase rounded hover:bg-blue-800/60 transition-colors">PDF</button>
              )}
              <button onClick={() => del(r.id)} className={BTN_ICON_DANGER}><TrashIcon /></button>
            </div>
          </div>
        </div>
      ))}
      {!regs.length && <p className="font-mono text-sm text-slate-500">No registrations.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL: SERVICE REQUESTS
// ─────────────────────────────────────────────────────────────────────────────
function ServicesPanel() {
  const [bookings, setBookings] = useState([]);

  const load = useCallback(async () => {
    const r = await api.get("/admin/services");
    setBookings(r.data.bookings);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function pay(id, status) { await api.patch(`/admin/services/${id}/payment`, { status }); load(); }
  async function del(id) { if (!confirm("Delete?")) return; await api.delete(`/admin/services/${id}`); load(); }
  async function pdf(id) { await api.patch(`/admin/services/${id}/pdf`); window.open("/receipt.pdf", "_blank"); load(); }

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => (
        <div key={b.id} className={`${CARD} rounded-xl p-4 group transition-all duration-300 ${getCardHoverStyle(b.id)}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white">{b.requestor?.name}</p>
                <Badge label={b.serviceType} />
                <Badge label={b.paymentStatus} />
                {b.pdfExported && <span className="font-mono text-[10px] text-slate-600 group-hover:text-white transition-colors duration-300">PDF ✓</span>}
              </div>
              <p className="font-sans text-xs text-slate-500 group-hover:text-white transition-colors duration-300">{b.requestor?.email} · {b.locationString}</p>
              <p className="font-sans text-xs text-slate-600 mt-1 uppercase group-hover:text-white transition-colors duration-300">{formatDate(b.targetDate)} · {b.additionalNotes || "—"}</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {b.paymentStatus === "PENDING" && <>
                <button onClick={() => pay(b.id, "CONFIRMED")} className={BTN_ICON_SUCCESS}><CheckIcon /></button>
                <button onClick={() => pay(b.id, "REJECTED")} className={BTN_DANGER}>Reject</button>
              </>}
              {b.paymentStatus === "CONFIRMED" && !b.pdfExported && (
                <button onClick={() => pdf(b.id)} className="px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 font-bold text-xs uppercase rounded hover:bg-blue-800/40 transition-colors">PDF</button>
              )}
              <button onClick={() => del(b.id)} className={BTN_ICON_DANGER}><TrashIcon /></button>
            </div>
          </div>
        </div>
      ))}
      {!bookings.length && <p className="font-mono text-sm text-slate-600">No service requests.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL: NEED US BOOKINGS (TIMEKEEPER)
// ─────────────────────────────────────────────────────────────────────────────
function BookingsPanel() {
  const [bookings, setBookings] = useState([]);

  const load = useCallback(async () => {
    const r = await api.get("/admin/bookings");
    setBookings(r.data.bookings);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function pay(id, status) { await api.patch(`/admin/bookings/${id}/payment`, { status }); load(); }
  async function del(id) { if (!confirm("Delete booking?")) return; await api.delete(`/admin/bookings/${id}`); load(); }
  async function pdf(id) { await api.patch(`/admin/bookings/${id}/pdf`); window.open("/receipt.pdf", "_blank"); load(); }

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => (
        <div key={b.id} className={`${CARD} rounded-xl p-4 group transition-all duration-300 ${getCardHoverStyle(b.id)}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white">{b.user?.name}</p>
                <Badge label={b.paymentStatus} />
                <Badge label={b.status} />
                {b.pdfExported && <span className="font-mono text-[10px] text-slate-600 group-hover:text-white transition-colors duration-300">PDF ✓</span>}
              </div>
              <p className="font-sans text-xs text-slate-500 group-hover:text-white transition-colors duration-300">{b.user?.email} · {b.serviceType}</p>
              <p className="font-sans text-xs text-slate-600 mt-1 uppercase group-hover:text-white transition-colors duration-300">
                {formatDate(b.bookingDate)} · {b.startTime} – {b.endTime} · {formatRp(b.totalAmount)}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {b.paymentStatus === "PENDING" && <>
                <button onClick={() => pay(b.id, "CONFIRMED")} className={BTN_ICON_SUCCESS}><CheckIcon /></button>
                <button onClick={() => pay(b.id, "REJECTED")} className={BTN_DANGER}>Reject</button>
              </>}
              {b.paymentStatus === "CONFIRMED" && !b.pdfExported && (
                <button onClick={() => pdf(b.id)} className="px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 font-bold text-xs uppercase rounded hover:bg-blue-800/40 transition-colors">PDF</button>
              )}
              <button onClick={() => del(b.id)} className={BTN_ICON_DANGER}><TrashIcon /></button>
            </div>
          </div>
        </div>
      ))}
      {!bookings.length && <p className="font-mono text-sm text-slate-600">No bookings.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SYSTEM LOG & HEALTH
// ─────────────────────────────────────────────────────────────────────────────
function RealTimeGraph({ active }) {
  const [points, setPoints] = useState(Array.from({ length: 12 }, () => 20 + Math.random() * 40));
  
  useEffect(() => {
    const t = setInterval(() => {
      setPoints(p => {
        const next = [...p.slice(1), 20 + Math.random() * (active ? 60 : 20)];
        return next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [active]);

  return (
    <div className="h-14 w-28 relative border border-white/5 bg-white/[0.02] rounded overflow-hidden shadow-inner flex-shrink-0">
      {/* Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-20">
        {[1, 2, 3].map(i => <div key={i} className="w-full h-[0.5px] bg-white/40" />)}
      </div>
      <div className="absolute inset-0 flex justify-between p-1 opacity-20">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-full w-[0.5px] bg-white/40" />)}
      </div>
      
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={`M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")}`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          animate={{ d: `M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")}` }}
          transition={{ duration: 2, ease: "linear" }}
        />
        <motion.path
          d={`M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")} L 120,100 L 0,100 Z`}
          fill="url(#lineGrad)"
          animate={{ d: `M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")} L 120,100 L 0,100 Z` }}
          transition={{ duration: 2, ease: "linear" }}
        />
      </svg>
    </div>
  );
}

function SystemLog({ registrations = [], bookings = [], services = [] }) {
  const [logs, setLogs] = useState([]);
  const [wibTime, setWibTime] = useState("");

  useEffect(() => {
    const all = [
      ...registrations.map(r => ({ type: 'EVENT', msg: `New Event Registration: ${r.user?.name}`, time: r.createdAt })),
      ...bookings.map(b => ({ type: 'BOOKING', msg: `New Timekeeper Booking: ${b.user?.name}`, time: b.createdAt })),
      ...services.map(s => ({ type: 'SERVICE', msg: `New Service Request: ${s.requestor?.name}`, time: s.createdAt }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);
    setLogs(all);
  }, [registrations, bookings, services]);

  return (
    <div className="p-5 overflow-hidden h-[450px] flex flex-col border-b border-white/10 bg-black/40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-black text-sm uppercase tracking-tighter text-white flex items-center gap-2">
          LIVE SYSTEM FEED
          <span className="text-[10px] text-fuchsia-500/80 font-bold ml-2 opacity-80 border-l border-white/20 pl-2">
            {wibTime}
          </span>
        </h3>
        <RealTimeGraph active={logs.length > 0} />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] scrollbar-hide">
        {logs.map((log, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="flex gap-3 border-l border-white/20 pl-3 py-1"
          >
            <span className="text-slate-400">[{new Date(log.time).toLocaleTimeString()}]</span>
            <span className={`font-bold ${log.type === 'EVENT' ? 'text-fuchsia-400' : log.type === 'BOOKING' ? 'text-cyan-400' : 'text-orange-400'}`}>
              {log.type}
            </span>
            <span className="text-slate-300">{log.msg}</span>
          </motion.div>
        ))}
        {!logs.length && <p className="text-slate-500 italic">No activity detected.</p>}
      </div>
    </div>
  );
}

function BatteryStatus({ connected }) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    // Slower polling for a more professional, "steady" system feel
    const t = setInterval(() => setKey(k => k + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (!connected) return <div className="w-20 h-8 border-2 border-white/10 rounded-md relative opacity-20" />;

  const segments = [
    { color: "bg-[#FF4D4D]", glow: "rgba(255,77,77,0.4)" },
    { color: "bg-[#FF8C00]", glow: "rgba(255,140,0,0.3)" },
    { color: "bg-[#FFD700]", glow: "rgba(255,215,0,0.3)" },
    { color: "bg-[#ADFF2F]", glow: "rgba(173,255,47,0.3)" },
    { color: "bg-[#00FF00]", glow: "rgba(0,255,0,0.5)" }
  ];

  return (
    <div key={key} className="relative flex items-center group scale-90">
      {/* Battery Body */}
      <div className="w-24 h-10 border-[2px] border-white/20 rounded-[4px] p-[3px] flex gap-1 relative overflow-hidden bg-black/60 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
        {segments.map((seg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0.5 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.6, delay: i * 0.4, ease: "easeInOut" }}
            className={`flex-1 h-full ${seg.color} rounded-[1px] relative`}
            style={{ boxShadow: `0 0 10px ${seg.glow}` }}
          />
        ))}
        {/* Slow fill-up sweep */}
        <motion.div 
          initial={{ x: "-150%" }}
          animate={{ x: "150%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
        />
      </div>
      {/* Battery Tip */}
      <div className="w-[5px] h-5 bg-white/20 rounded-r-[1px] ml-[2px] shadow-[2px_0_10px_rgba(255,255,255,0.1)]" />
    </div>
  );
}

function MailerStatus() {
  const [ready, setReady] = useState(true);
  
  if (ready) {
    return (
      <div className="relative group">
        <span className="text-xs font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse">
          READY
        </span>
      </div>
    );
  } else {
    return (
      <div className="relative group">
        <span className="text-xs font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-900">
          NOT READY
        </span>
      </div>
    );
  }
}

function LoomBackground() {
  const threads = useMemo(() => Array.from({ length: 30 }).map((_, i) => {
    const isRainbow = Math.random() > 0.7;
    const isVertical = Math.random() > 0.9;
    
    let startX, startY, endX, endY, cp1x, cp1y, cp2x, cp2y;

    if (isVertical) {
      startX = Math.random() * 100;
      startY = -20;
      endX = startX + (Math.random() - 0.5) * 30;
      endY = 120;
      cp1x = startX + (Math.random() - 0.5) * 50;
      cp1y = 30;
      cp2x = endX + (Math.random() - 0.5) * 50;
      cp2y = 70;
    } else {
      startX = -20;
      startY = Math.random() * 100;
      endX = 120;
      endY = startY + (Math.random() - 0.5) * 30;
      cp1x = 30;
      cp1y = startY + (Math.random() - 0.5) * 50;
      cp2x = 70;
      cp2y = endY + (Math.random() - 0.5) * 50;
    }
    
    return {
      id: i,
      d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
      color: isRainbow ? `hsl(${Math.random() * 360}, 80%, 60%)` : (Math.random() > 0.5 ? "#a855f7" : "#fbbf24"),
      width: 0.5 + Math.random() * 1.5,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * -20,
      glowIntensity: 8 + Math.random() * 15
    };
  }), []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-40 mix-blend-screen">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="hyper-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {threads.map((t) => (
          <g key={t.id} filter="url(#hyper-glow)">
            <motion.path
              d={t.d}
              stroke={t.color}
              strokeWidth={t.width / 20}
              fill="none"
              strokeLinecap="round"
              animate={{ pathLength: [0, 1, 0], opacity: [0, 0.7, 0] }}
              transition={{ duration: t.duration, repeat: Infinity, ease: "easeInOut", delay: t.delay }}
              style={{ filter: `drop-shadow(0 0 ${t.glowIntensity}px ${t.color})` }}
            />
          </g>
        ))}
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-yellow-400/5 blur-[120px] rounded-full" />
    </div>
  );
}

function SystemHealth() {
  return (
    <div className="p-5 bg-black/40">
       <h3 className="font-mono font-black text-sm uppercase tracking-tighter text-white mb-6">SYSTEM HEALTH</h3>
       <div className="space-y-6">
          <div className="flex justify-between items-center">
            <span className="font-sans font-medium text-[11px] text-slate-400 uppercase tracking-widest">DATABASE</span>
            <BatteryStatus connected={true} />
          </div>
          <div className="flex justify-between items-center">
            <span className="font-sans font-medium text-[11px] text-slate-400 uppercase tracking-widest">REDIS CACHE</span>
            <BatteryStatus connected={true} />
          </div>
          <div className="flex justify-between items-center bg-white/5 px-4 py-3 border border-white/5 mt-4 rounded-xl">
            <span className="font-sans font-medium text-[11px] text-slate-400 uppercase tracking-widest">MAILER</span>
            <MailerStatus />
          </div>
       </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL: USERS
// ─────────────────────────────────────────────────────────────────────────────
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const r = await api.get("/admin/users");
    setUsers(r.data.users);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRole(id, role) { await api.patch(`/admin/users/${id}/role`, { role }); load(); }
  async function del(id) { if (!confirm("Delete user?")) return; await api.delete(`/admin/users/${id}`); load(); }

  return (
    <div className="flex flex-col gap-3">
      {users.map((u) => (
        <div key={u.id} className={`${CARD} rounded-xl p-4 group transition-all duration-300 ${getCardHoverStyle(u.id)}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white truncate">{u.name}</p>
                <Badge label={u.role} />
                {u.isEmailVerified && <span className="font-mono text-[10px] text-emerald-600 group-hover:text-emerald-400 transition-colors duration-300">✓ Verified</span>}
              </div>
              <p className="font-sans text-xs text-slate-500 group-hover:text-white transition-colors duration-300">{u.email} · {u.phone}</p>
              <div className="flex gap-4 mt-1 text-[10px] text-slate-600 font-sans uppercase flex-wrap group-hover:text-white transition-colors duration-300">
                <span>Bookings: {u._count?.bookings}</span>
                <span>Events: {u._count?.eventRegistrations}</span>
                <span>Services: {u._count?.serviceBookings}</span>
                <span>Joined: {formatDate(u.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {u.role === "USER" ? (
                <button onClick={() => setRole(u.id, "ADMIN")} className="px-3 py-1.5 bg-red-900/30 border border-red-700/40 text-red-400 font-bold text-xs uppercase rounded hover:bg-red-800/40 transition-colors">→ Admin</button>
              ) : (
                <button onClick={() => setRole(u.id, "USER")} className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold uppercase rounded hover:bg-slate-700 transition-colors">→ User</button>
              )}
              <button onClick={() => del(u.id)} className={BTN_ICON_DANGER}><TrashIcon /></button>
            </div>
          </div>
        </div>
      ))}
      {!users.length && <p className="font-mono text-sm text-slate-600">No users.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "events", label: "Events" },
  { id: "registrations", label: "Registrations" },
  { id: "services", label: "Services" },
  { id: "bookings", label: "Bookings" },
  { id: "users", label: "Users" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("events");
  const [stats, setStats] = useState({ events: 0, users: 0, regs: 0, services: 0 });
  const [data, setData] = useState({ events: [], users: [], regs: [], services: [] });
  const [mounted, setMounted] = useState(false);
  const [wibTime, setWibTime] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setWibTime(new Date().toLocaleTimeString('id-ID', { 
        timeZone: 'Asia/Jakarta', 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + " WIB");
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = useCallback(() => {
    Promise.all([
      api.get("/admin/events").catch(() => ({ data: { events: [] } })),
      api.get("/admin/users").catch(() => ({ data: { users: [] } })),
      api.get("/admin/registrations").catch(() => ({ data: { registrations: [] } })),
      api.get("/admin/services").catch(() => ({ data: { bookings: [] } })),
    ]).then(([ev, us, re, sv]) => {
      const eList = ev.data.events || [];
      const uList = us.data.users || [];
      const rList = re.data.registrations || [];
      const sList = sv.data.bookings || [];

      setStats({
        events: eList.length,
        users: uList.length,
        regs: rList.length,
        services: sList.length,
      });

      setData({
        events: eList,
        users: uList,
        regs: rList,
        services: sList,
      });
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("adminToken");
    if (!token) { router.replace("/admin/login"); return; }
    loadAll();
  }, [router, loadAll]);

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    router.replace("/admin/login");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      className={`min-h-screen ${DARK} text-white`}
    >
      <DynamicBlobs />
      <LoomBackground />

      {/* Top nav */}
      <header className="relative z-10 border-b border-slate-900 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logologin.png" alt="Kalceria" className="h-7 object-contain" draggable={false} />
          <div className="h-4 w-px bg-white/20 ml-2" />
          <div className="font-sans text-[11px] text-white font-medium underline tracking-widest opacity-90">
            {wibTime}
          </div>
        </div>
        <button onClick={logout} className="font-mono text-xs text-slate-600 hover:text-white transition-colors uppercase tracking-widest">
          Logout
        </button>
      </header>

      <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Events" value={stats.events} />
              <StatCard label="Users" value={stats.users} />
              <StatCard label="Registrations" value={stats.regs} />
              <StatCard label="Services" value={stats.services} />
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded p-1 mb-8 w-fit shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-5 py-2 text-xs font-mono font-black uppercase tracking-widest transition-colors rounded ${
                    tab === t.id ? "text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="admin-tab-pill"
                      className="absolute inset-0 bg-white/10 rounded"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <SectionTitle>{TABS.find((t) => t.id === tab)?.label}</SectionTitle>
                {tab === "events" && <EventsPanel initialEvents={data.events} onRefresh={loadAll} />}
                {tab === "registrations" && <RegistrationsPanel initialRegs={data.regs} onRefresh={loadAll} />}
                {tab === "services" && <ServicesPanel initialServices={data.services} onRefresh={loadAll} />}
                {tab === "bookings" && <BookingsPanel initialBookings={data.services} onRefresh={loadAll} />}
                {tab === "users" && <UsersPanel initialUsers={data.users} onRefresh={loadAll} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Sidebar: Combined Classic Box */}
          <div className="hidden lg:block relative z-10">
            <div className="border border-white/20 bg-transparent flex flex-col p-[2px] backdrop-blur-sm" style={{ boxShadow: "0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.05)" }}>
              <SystemLog 
                registrations={stats.rawRegs || []} 
                bookings={stats.rawBookings || []} 
                services={stats.rawServices || []} 
              />
              <SystemHealth />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
