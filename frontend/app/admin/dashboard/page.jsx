"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

// ─── Shared primitives ────────────────────────────────────────────────────────
const DARK = "bg-[#050a14]";
const CARD = "bg-[#0c1528] border border-slate-800";
const LABEL = "font-sans text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block";
const INPUT = "w-full bg-[#050a14] border border-slate-800 rounded px-3 py-2 font-sans text-sm text-white outline-none transition-all placeholder:text-slate-700 focus:border-slate-600";
const BTN_PRIMARY = "px-4 py-2 bg-white text-black font-extrabold text-xs uppercase tracking-wider rounded hover:bg-slate-200 transition-colors disabled:opacity-40";
const BTN_DANGER = "px-3 py-1.5 bg-red-900/30 border border-red-700/40 text-red-400 font-bold text-xs uppercase tracking-wider rounded hover:bg-red-800/40 transition-colors";
const BTN_SUCCESS = "px-3 py-1.5 bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 font-bold text-xs uppercase tracking-wider rounded hover:bg-emerald-800/40 transition-colors";

const CLIP_BTN = { clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" };

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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  const colors = { cyan: "text-cyan-400", magenta: "text-[#FF00FF]", gold: "text-[#FACC15]", red: "text-red-400" };
  return (
    <div className={`${CARD} rounded p-5`} style={CLIP_BTN}>
      <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-mono font-black text-3xl ${colors[accent] || "text-white"}`}>{value}</p>
    </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// PANEL: EVENTS CRUD
// ─────────────────────────────────────────────────────────────────────────────
function EventsPanel() {
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null); // null | event object
  const [form, setForm] = useState({ title: "", description: "", displayPhotoUrl: "", location: "", regStartTime: "", regEndTime: "", price: "", quota: 100, status: "OPEN", sessionOptions: [""] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api.get("/admin/events");
    setEvents(r.data.events);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete event?")) return;
    await api.delete(`/admin/events/${id}`);
    load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className={`${CARD} rounded p-6`} style={CLIP_BTN}>
        <h3 className="font-mono font-black text-sm uppercase tracking-widest text-slate-400 mb-5">
          {editing ? `Editing: ${editing.title}` : "New Event"}
        </h3>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          {[
            { k: "title", label: "Title", ph: "Event title" },
            { k: "displayPhotoUrl", label: "Photo URL", ph: "https://..." },
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Reg Start</label>
              <input type="datetime-local" className={INPUT} value={form.regStartTime} onChange={(e) => setField("regStartTime", e.target.value)} required />
            </div>
            <div>
              <label className={LABEL}>Reg End</label>
              <input type="datetime-local" className={INPUT} value={form.regEndTime} onChange={(e) => setField("regEndTime", e.target.value)} required />
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

      {/* List */}
      <div className="flex flex-col gap-3">
        {events.map((ev) => (
          <div key={ev.id} className={`${CARD} rounded p-4`} style={CLIP_BTN}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-mono font-bold text-sm text-white truncate">{ev.title}</p>
                  <Badge label={ev.status} />
                </div>
                <p className="font-mono text-[10px] text-slate-600">{ev.id}</p>
                <div className="flex gap-4 mt-2 text-xs text-slate-500 font-mono flex-wrap">
                  <span>{formatRp(ev.price)}</span>
                  <span>Quota: {ev._count?.registrations || 0}/{ev.quota}</span>
                  <span>{formatDate(ev.regStartTime)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => startEdit(ev)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold uppercase rounded hover:bg-slate-700 transition-colors">Edit</button>
                <button onClick={() => handleDelete(ev.id)} className={BTN_DANGER}>Del</button>
              </div>
            </div>
          </div>
        ))}
        {!events.length && <p className="font-mono text-sm text-slate-600">No events.</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL: REGISTRATIONS
// ─────────────────────────────────────────────────────────────────────────────
function RegistrationsPanel() {
  const [regs, setRegs] = useState([]);

  const load = useCallback(async () => {
    const r = await api.get("/admin/registrations");
    setRegs(r.data.registrations);
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
        <div key={r.id} className={`${CARD} rounded p-4`} style={CLIP_BTN}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white">{r.user?.name}</p>
                <Badge label={r.paymentStatus} />
                {r.pdfExported && <span className="font-mono text-[10px] text-slate-600">PDF ✓</span>}
              </div>
              <p className="font-mono text-xs text-slate-500">{r.user?.email} · {r.event?.title}</p>
              <p className="font-mono text-xs text-slate-600 mt-1">Session: {r.selectedSession} · {formatDate(r.createdAt)} · {formatRp(r.event?.price)}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {r.paymentStatus === "PENDING" && <>
                <button onClick={() => confirmPayment(r.id, "CONFIRMED")} className={BTN_SUCCESS}>Confirm</button>
                <button onClick={() => confirmPayment(r.id, "REJECTED")} className={BTN_DANGER}>Reject</button>
              </>}
              {r.paymentStatus === "CONFIRMED" && !r.pdfExported && (
                <button onClick={() => exportPdf(r.id)} className="px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 font-bold text-xs uppercase rounded hover:bg-blue-800/40 transition-colors">PDF</button>
              )}
              <button onClick={() => del(r.id)} className={BTN_DANGER}>Del</button>
            </div>
          </div>
        </div>
      ))}
      {!regs.length && <p className="font-mono text-sm text-slate-600">No registrations.</p>}
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
        <div key={b.id} className={`${CARD} rounded p-4`} style={CLIP_BTN}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white">{b.requestor?.name}</p>
                <Badge label={b.serviceType} />
                <Badge label={b.paymentStatus} />
                {b.pdfExported && <span className="font-mono text-[10px] text-slate-600">PDF ✓</span>}
              </div>
              <p className="font-mono text-xs text-slate-500">{b.requestor?.email} · {b.locationString}</p>
              <p className="font-mono text-xs text-slate-600 mt-1">{formatDate(b.targetDate)} · {b.additionalNotes || "—"}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {b.paymentStatus === "PENDING" && <>
                <button onClick={() => pay(b.id, "CONFIRMED")} className={BTN_SUCCESS}>Confirm</button>
                <button onClick={() => pay(b.id, "REJECTED")} className={BTN_DANGER}>Reject</button>
              </>}
              {b.paymentStatus === "CONFIRMED" && !b.pdfExported && (
                <button onClick={() => pdf(b.id)} className="px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 font-bold text-xs uppercase rounded hover:bg-blue-800/40 transition-colors">PDF</button>
              )}
              <button onClick={() => del(b.id)} className={BTN_DANGER}>Del</button>
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
        <div key={b.id} className={`${CARD} rounded p-4`} style={CLIP_BTN}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white">{b.user?.name}</p>
                <Badge label={b.paymentStatus} />
                <Badge label={b.status} />
                {b.pdfExported && <span className="font-mono text-[10px] text-slate-600">PDF ✓</span>}
              </div>
              <p className="font-mono text-xs text-slate-500">{b.user?.email} · {b.serviceType}</p>
              <p className="font-mono text-xs text-slate-600 mt-1">
                {formatDate(b.bookingDate)} · {b.startTime} – {b.endTime} · {formatRp(b.totalAmount)}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {b.paymentStatus === "PENDING" && <>
                <button onClick={() => pay(b.id, "CONFIRMED")} className={BTN_SUCCESS}>Confirm</button>
                <button onClick={() => pay(b.id, "REJECTED")} className={BTN_DANGER}>Reject</button>
              </>}
              {b.paymentStatus === "CONFIRMED" && !b.pdfExported && (
                <button onClick={() => pdf(b.id)} className="px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 font-bold text-xs uppercase rounded hover:bg-blue-800/40 transition-colors">PDF</button>
              )}
              <button onClick={() => del(b.id)} className={BTN_DANGER}>Del</button>
            </div>
          </div>
        </div>
      ))}
      {!bookings.length && <p className="font-mono text-sm text-slate-600">No bookings.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: SYSTEM LOG
// ─────────────────────────────────────────────────────────────────────────────
function SystemLog({ registrations, bookings, services }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const all = [
      ...registrations.map(r => ({ type: 'EVENT', msg: `New Event Registration: ${r.user?.name}`, time: r.createdAt })),
      ...bookings.map(b => ({ type: 'BOOKING', msg: `New Timekeeper Booking: ${b.user?.name}`, time: b.createdAt })),
      ...services.map(s => ({ type: 'SERVICE', msg: `New Service Request: ${s.requestor?.name}`, time: s.createdAt }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);
    setLogs(all);
  }, [registrations, bookings, services]);

  return (
    <div className={`${CARD} rounded p-5 overflow-hidden h-[400px] flex flex-col`} style={CLIP_BTN}>
      <h3 className="font-mono font-black text-xs uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
        Live System Feed
      </h3>
      <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] scrollbar-hide">
        {logs.map((log, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="flex gap-3 border-l border-slate-800 pl-3 py-1"
          >
            <span className="text-slate-600">[{new Date(log.time).toLocaleTimeString()}]</span>
            <span className={`font-bold ${log.type === 'EVENT' ? 'text-magenta' : log.type === 'BOOKING' ? 'text-cyan-400' : 'text-red-400'}`}>
              {log.type}
            </span>
            <span className="text-slate-400">{log.msg}</span>
          </motion.div>
        ))}
        {!logs.length && <p className="text-slate-700 italic">No activity detected.</p>}
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
        <div key={u.id} className={`${CARD} rounded p-4`} style={CLIP_BTN}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-bold text-sm text-white truncate">{u.name}</p>
                <Badge label={u.role} />
                {u.isEmailVerified && <span className="font-mono text-[10px] text-emerald-600">✓ Verified</span>}
              </div>
              <p className="font-mono text-xs text-slate-500">{u.email} · {u.phone}</p>
              <div className="flex gap-4 mt-1 text-[10px] text-slate-600 font-mono flex-wrap">
                <span>Bookings: {u._count?.bookings}</span>
                <span>Events: {u._count?.eventRegistrations}</span>
                <span>Services: {u._count?.serviceBookings}</span>
                <span>Joined: {formatDate(u.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {u.role === "USER" ? (
                <button onClick={() => setRole(u.id, "ADMIN")} className="px-3 py-1.5 bg-red-900/30 border border-red-700/40 text-red-400 font-bold text-xs uppercase rounded hover:bg-red-800/40 transition-colors">→ Admin</button>
              ) : (
                <button onClick={() => setRole(u.id, "USER")} className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold uppercase rounded hover:bg-slate-700 transition-colors">→ User</button>
              )}
              <button onClick={() => del(u.id)} className={BTN_DANGER}>Del</button>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("adminToken");
    if (!token) { router.replace("/admin/login"); return; }

    // Load stats
    Promise.all([
      api.get("/admin/events").catch(() => ({ data: { events: [] } })),
      api.get("/admin/users").catch(() => ({ data: { users: [] } })),
      api.get("/admin/registrations").catch(() => ({ data: { registrations: [] } })),
      api.get("/admin/services").catch(() => ({ data: { bookings: [] } })),
    ]).then(([ev, us, re, sv]) => {
      setStats({
        events: ev.data.events?.length || 0,
        users: us.data.users?.length || 0,
        regs: re.data.registrations?.length || 0,
        services: sv.data.bookings?.length || 0,
        rawRegs: re.data.registrations || [],
        rawBookings: sv.data.bookings || [],
        rawServices: sv.data.bookings || [], // Note: services list in stats logic was using same endpoint re-fetch
      });
    });
  }, [router]);

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
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-[10%] w-[40vw] h-[40vw] rounded-full bg-red-900/5 blur-[180px]" />
        <div className="absolute bottom-0 right-[10%] w-[35vw] h-[35vw] rounded-full bg-slate-800/20 blur-[140px]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 border-b border-slate-900 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logologin.png" alt="Kalceria" className="h-7 object-contain" draggable={false} />
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-red-400">Control Room</span>
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
              <StatCard label="Events" value={stats.events} accent="cyan" />
              <StatCard label="Users" value={stats.users} accent="magenta" />
              <StatCard label="Registrations" value={stats.regs} accent="gold" />
              <StatCard label="Services" value={stats.services} accent="red" />
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-[#0c1528] border border-slate-800 rounded p-1 mb-8 w-fit">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors rounded ${
                    tab === t.id ? "text-white" : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="admin-tab-pill"
                      className="absolute inset-0 bg-slate-700/60 rounded"
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
                {tab === "events" && <EventsPanel />}
                {tab === "registrations" && <RegistrationsPanel />}
                {tab === "services" && <ServicesPanel />}
                {tab === "bookings" && <BookingsPanel />}
                {tab === "users" && <UsersPanel />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Sidebar: Operational Log */}
          <div className="hidden lg:block">
            <SystemLog 
              registrations={stats.rawRegs || []} 
              bookings={stats.rawBookings || []} 
              services={stats.rawServices || []} 
            />
            
            <div className={`${CARD} rounded p-5 mt-6`} style={CLIP_BTN}>
               <h3 className="font-mono font-black text-xs uppercase tracking-widest text-slate-500 mb-3">System Health</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-slate-400">DATABASE</span>
                    <span className="text-[10px] text-emerald-400 font-bold">CONNECTED</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-slate-400">REDIS CACHE</span>
                    <span className="text-[10px] text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-slate-400">MAILER</span>
                    <span className="text-[10px] text-yellow-400 font-bold">STANDBY</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
