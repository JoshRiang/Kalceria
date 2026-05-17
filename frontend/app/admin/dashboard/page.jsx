"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import ReceiptModal from "@/components/ReceiptModal";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Shared primitives ────────────────────────────────────────────────────────
const DARK = "bg-[#050a14]";
const CARD = "bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] font-mono font-black tracking-tighter";
const LABEL = "font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 block";
const INPUT = "w-full bg-white/5 border border-white/10 rounded-xl px-6 h-14 font-sans font-medium text-sm text-white focus:outline-none focus:border-[#FF00FF]/50 transition-all placeholder:text-slate-600 backdrop-blur-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const BTN_PRIMARY = "px-4 py-2 bg-white text-black font-extrabold text-xs uppercase tracking-wider rounded hover:bg-slate-200 transition-colors disabled:opacity-40";
const BTN_DANGER = "px-3 py-1.5 bg-red-900/50 border border-red-700/60 text-red-100 font-bold text-xs uppercase tracking-wider rounded hover:bg-red-800/60 transition-colors";
const BTN_SUCCESS = "px-3 py-1.5 bg-emerald-900/50 border border-emerald-700/60 text-emerald-100 font-bold text-xs uppercase tracking-wider rounded hover:bg-emerald-800/60 transition-colors";

const BTN_ICON_DANGER = "p-1.5 bg-red-900/50 border border-red-700/60 rounded hover:bg-red-800/60 transition-colors flex items-center justify-center";
const BTN_ICON_SUCCESS = "p-1.5 bg-emerald-900/50 border border-emerald-700/60 rounded hover:bg-emerald-800/60 transition-colors flex items-center justify-center";

const CheckIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const XIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>;

function LocalBlob({ color }) {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden rounded-3xl">
      <div className={`absolute top-[-20%] left-[-20%] w-[120%] h-[120%] ${color} blur-[40px] animate-pulse`} />
    </div>
  );
}

const CLIP_BTN = { clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" };

function getCardHoverStyle(id) {
  if (!id) return "";
  const isPink = id.charCodeAt(id.length - 1) % 2 === 0;
  return isPink
    ? "hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:border-fuchsia-500/50 hover:bg-fuchsia-900/10"
    : "hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:border-yellow-500/50 hover:bg-yellow-900/10";
}

function Badge({ label }) {
  const map = {
    PENDING: "text-amber-600",
    CONFIRMED: "text-emerald-600",
    REJECTED: "text-red-600",
    OPEN: "text-cyan-600",
    CLOSED: "text-slate-500",
    DRAFT: "text-slate-400",
    PROCESSED: "text-blue-600",
    ADMIN: "text-red-500/80",
    USER: "text-slate-500",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-[0.15em] ${map[label] || map.CLOSED}`}>
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
function Clock({ className }) {
  const [wibTime, setWibTime] = useState("");
  useEffect(() => {
    const updateTime = () => setWibTime(new Date().toLocaleTimeString('id-ID', { 
      timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) + " WIB");
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className={className}>{wibTime}</span>;
}

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

// ─── Expandable Search Bar (shared across panels) ─────────────────────────────
function ExpandableSearch({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="flex items-center justify-end">
      <div className="flex items-center gap-2 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm transition-all duration-300 overflow-hidden w-64 pl-3 pr-1 py-1">
        <svg
          className="w-4 h-4 text-white/50 flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-xs font-mono placeholder:text-white/25 focus:outline-none py-1"
        />
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(""); }}
            className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white rounded-lg transition-colors flex-shrink-0 text-sm"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: JIT RESET MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CONFIRM_PHRASE = 'CONFIRM SYSTEM FORMAT';

function JITResetModal({ onClose, onConfirm }) {
  const [phrase, setPhrase] = useState('');
  const [jitPassword, setJitPassword] = useState('');
  const [step, setStep] = useState(1); // 1=phrase, 2=jit
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');

  const phraseMatch = phrase === CONFIRM_PHRASE;

  const handleExecute = async () => {
    if (!phraseMatch || !jitPassword) return;
    setError('');
    setIsExecuting(true);
    try {
      // Step 1: Verify JIT password
      const jitRes = await api.post('/admin/verify-jit', { password: jitPassword });
      const jitToken = jitRes.data.jitToken;
      // Step 2: Execute reset with JIT token
      await api.post('/admin/system/reset', {}, {
        headers: { 'x-jit-token': jitToken },
      });
      await onConfirm();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Reset failed. Check JIT password.';
      setError(msg);
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Red pulsing border glow */}
      <div className="w-full max-w-lg relative">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-red-600 via-red-500/50 to-transparent opacity-70 blur-sm animate-pulse pointer-events-none" />

        <div className="relative bg-[#0d0608] border border-red-500/40 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.3)]">
          {/* Header */}
          <div className="bg-red-950/60 border-b border-red-500/30 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <div>
                <p className="font-mono text-[9px] text-red-400/60 uppercase tracking-widest">⚠ DESTRUCTIVE OPERATION</p>
                <h2 className="font-mono font-black text-base text-red-200 uppercase tracking-tighter">System Database Reset</h2>
              </div>
            </div>
            <button onClick={onClose} disabled={isExecuting} className="text-red-400/50 hover:text-red-200 transition-colors text-xl">&times;</button>
          </div>

          <div className="p-8 space-y-6">
            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 space-y-1.5">
              <p className="font-mono font-black text-[11px] text-red-300 uppercase tracking-widest">⚠ This action is irreversible</p>
              <p className="font-mono text-[10px] text-red-400/70 leading-relaxed">
                All service bookings, event registrations, merch sales, comments, audit logs, mini events, and broadcasts will be permanently deleted.
              </p>
              <p className="font-mono text-[10px] text-emerald-400/80 mt-2">✓ Preserved: User accounts, Events catalog, Merch catalog.</p>
            </div>

            {/* Step 1: Phrase confirmation */}
            <div>
              <label className="font-mono text-[10px] text-white/40 uppercase tracking-widest block mb-2">
                Type exactly to continue:
                <span className="text-red-400 font-black ml-2">{CONFIRM_PHRASE}</span>
              </label>
              <input
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="Type the phrase above..."
                autoComplete="off"
                spellCheck={false}
                className={`w-full bg-black/40 border rounded-xl px-4 py-3 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none transition-all ${
                  phrase.length > 0
                    ? phraseMatch
                      ? 'border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                      : 'border-red-500/60 shadow-[0_0_10px_rgba(220,38,38,0.15)]'
                    : 'border-white/10'
                }`}
              />
            </div>

            {/* Step 2: JIT Password (unlocks when phrase is correct) */}
            <div className={`transition-all duration-300 ${phraseMatch ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <label className="font-mono text-[10px] text-white/40 uppercase tracking-widest block mb-2">JIT Admin Password</label>
              <input
                type="password"
                value={jitPassword}
                onChange={(e) => setJitPassword(e.target.value)}
                placeholder="Enter JIT password..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-red-500/60 transition-all"
              />
            </div>

            {error && <p className="font-mono text-xs text-red-400">{error}</p>}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white/40 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={!phraseMatch || !jitPassword || isExecuting}
                className="flex-1 py-3 bg-red-600 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white hover:bg-red-500 transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(220,38,38,0.3)]"
              >
                {isExecuting ? 'Executing...' : '⚡ Execute Reset'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: JIT ACTION MODAL (single-item delete authorization)
// ─────────────────────────────────────────────────────────────────────────────
function JITActionModal({ title, description, onClose, onConfirm }) {
  const [jitPassword, setJitPassword] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!jitPassword.trim()) return;
    setError('');
    setIsExecuting(true);
    try {
      const jitRes = await api.post('/admin/verify-jit', { password: jitPassword });
      await onConfirm(jitRes.data.jitToken);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Authorization failed.';
      setError(msg);
      setIsExecuting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isExecuting) onClose(); }}
    >
      <div className="w-full max-w-md relative">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber-500/40 via-amber-400/10 to-transparent blur-sm pointer-events-none" />
        <div className="relative bg-[#0d0f0a] border border-amber-500/25 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.12)]">

          {/* Header */}
          <div className="bg-amber-950/30 border-b border-amber-500/20 px-7 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="font-mono text-[9px] text-amber-400/50 uppercase tracking-widest">Authorization Required</p>
                <h2 className="font-mono font-black text-sm text-amber-100 uppercase tracking-tighter">{title || 'Confirm Action'}</h2>
              </div>
            </div>
            <button onClick={onClose} disabled={isExecuting} className="text-white/20 hover:text-white transition-colors text-xl">&times;</button>
          </div>

          <div className="p-7 space-y-5">
            {description && (
              <p className="font-mono text-[10px] text-white/40 leading-relaxed">{description}</p>
            )}

            {/* JIT Password */}
            <div>
              <label className="font-mono text-[10px] text-white/30 uppercase tracking-widest block mb-2">JIT Admin Password</label>
              <input
                type="password"
                value={jitPassword}
                onChange={(e) => setJitPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                placeholder="Enter JIT password to authorize..."
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            {error && <p className="font-mono text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white/40 hover:bg-white/10 transition-all disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!jitPassword.trim() || isExecuting}
                className="flex-1 py-3 bg-amber-600 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white hover:bg-amber-500 transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              >
                {isExecuting ? 'Authorizing...' : 'Confirm →'}
              </button>
            </div>
          </div>
        </div>
      </div>
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

function RegistrationsPanel({ initialRegs = [], onRefresh, lowPowerMode }) {
  const [regs, setRegs] = useState(initialRegs);
  const [receiptModal, setReceiptModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jitAction, setJitAction] = useState(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredRegs = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return regs;
    const terms = q.split(/\s+/);
    return regs.filter((r) => {
      const searchString = [r.user?.name, r.user?.email, r.event?.title, r.status].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [regs, debouncedSearchQuery]);

  useEffect(() => { setRegs(initialRegs); }, [initialRegs]);

  async function confirmPayment(id, status, version) {
    await api.patch(`/admin/registrations/${id}/payment`, { status, version });
    if (onRefresh) onRefresh();
  }
  function del(id, name, version) {
    setJitAction({ id, version, label: name || `Registration #${id.slice(0, 8).toUpperCase()}` });
  }
  const executeDel = async (jitToken) => {
    await api.delete(`/admin/registrations/${jitAction.id}`, {
      headers: jitToken ? { 'x-jit-token': jitToken } : {},
      data: { version: jitAction.version },
    });
    setJitAction(null);
    if (onRefresh) onRefresh();
  };
  function exportPdf(r) {
    setReceiptModal({ type: "REGISTRATION", data: r });
    setTimeout(() => { if (onRefresh) onRefresh(); }, 1000); 
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search name or email..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegs.map((r) => (
        <div key={r.id} className={`relative aspect-square rounded-3xl p-6 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 overflow-hidden flex flex-col justify-between ${
            lowPowerMode ? "bg-[#d6cdc2]" : "bg-white/70 backdrop-blur-xl"
          }`}>
          <LocalBlob color="bg-cyan-400" />

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <p className="font-sans font-black text-sm text-black tracking-tight leading-none uppercase">{r.user?.name}</p>
              <Badge label={r.paymentStatus} />
            </div>

            <div className="space-y-1">
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300 truncate">{r.user?.email}</p>
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300">{r.event?.title}</p>
            </div>

            <div className="pt-2 border-t border-black/5 space-y-1">
              <p className="font-sans text-[10px] text-black/60 group-hover:text-black transition-colors duration-300">Session: {r.selectedSession}</p>
              <p className="font-sans text-[10px] text-black/60 group-hover:text-black transition-colors duration-300">{formatDate(r.createdAt)}</p>
              <p className="font-sans text-[10px] text-black/60 group-hover:text-black transition-colors duration-300 font-bold">{formatRp(r.event?.price)}</p>
            </div>
          </div>

          <div className="relative z-10 flex gap-2 pt-4">
            {r.paymentStatus === "PENDING" && (
              <>
                <button onClick={() => confirmPayment(r.id, "CONFIRMED", r.version)} title="Confirm Payment" className="flex-1 h-10 flex items-center justify-center bg-emerald-500 rounded-2xl text-white shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform"><CheckIcon /></button>
                <button onClick={() => confirmPayment(r.id, "REJECTED", r.version)} title="Reject Payment" className="flex-1 h-10 flex items-center justify-center bg-red-500 rounded-2xl text-white shadow-[0_5px_15px_rgba(239,68,68,0.3)] hover:scale-105 transition-transform"><XIcon /></button>
              </>
            )}
            {r.paymentStatus === "CONFIRMED" && (
              <button onClick={() => exportPdf(r)} className="flex-1 h-10 bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-[0_5px_15px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform">
                VIEW RECEIPT
              </button>
            )}
            <button onClick={() => del(r.id, r.user?.name, r.version)} className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black/40 hover:bg-red-500 hover:text-white transition-all"><TrashIcon /></button>
          </div>
        </div>
      ))}
      {!filteredRegs.length && <p className="font-mono text-sm text-slate-500 col-span-full py-10 text-center">{searchQuery ? `No registrations matching "${searchQuery}"` : "No registrations."}</p>}
      
      {/* JIT Delete Modal */}
      {jitAction && (
        <JITActionModal
          title="Delete Registration"
          description={`You are permanently deleting the registration for ${jitAction.label}. This action cannot be undone and requires JIT authorization.`}
          onClose={() => setJitAction(null)}
          onConfirm={executeDel}
        />
      )}

      {/* Universal Receipt Modal */}
      {receiptModal && (
        <ReceiptModal
          type={receiptModal.type}
          data={receiptModal.data}
          onClose={() => setReceiptModal(null)}
        />
      )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: RECORD SALE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function RecordSaleModal({ product, onClose, onConfirm }) {
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
    } catch (err) {
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: PRODUCT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, onRecordSale }) {
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

const INITIAL_DUMMIES = Array.from({ length: 10 }).map((_, i) => ({
  id: `mock-${i}`,
  productId: `KLCR-${100 + i}`,
  name: i === 0 ? "Obsidian Shift Knob" : i === 1 ? "Carbon Fiber Lip" : i === 2 ? "Aero Dynamic Wing" : i === 3 ? "Forged Pistons Set" : i === 4 ? "Titanium Exhaust" : i === 5 ? "Cold Air Intake" : i === 6 ? "Racing Brake Pads" : i === 7 ? "Coilover Suspension" : i === 8 ? "Billet Fuel Rail" : "High Flow Injectors",
  imageUrl: `https://picsum.photos/seed/kalceria${i}/600/800`,
  label: i % 4 === 0 ? "HOT DEALS" : i % 4 === 1 ? "SOLD OUT" : "AVAILABLE"
}));

function ProductsPanel({ onRefresh }) {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ productId: "", name: "", imageUrl: "", label: "AVAILABLE" });
<<<<<<< HEAD
=======
  const [loading, setLoading] = useState(false);
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
>>>>>>> origin/PushFinalBukanPunyaRei

  useEffect(() => {
    const saved = localStorage.getItem("kalceria_dummy_products");
    if (saved) {
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

function SystemLog({ registrations = [], products = [] }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const all = [
      ...registrations.map(r => ({ type: 'EVENT', msg: `New Event Registration: ${r.user?.name}`, time: r.createdAt })),
      ...products.map(p => ({ type: 'PRODUCT', msg: `Inventory Sync: ${p.name}`, time: new Date() })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
    setLogs(all);
  }, [registrations, products]);

  return (
    <div className="p-5 overflow-hidden h-[450px] flex flex-col border-b border-white/10 bg-transparent">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-black text-sm uppercase tracking-tighter text-white flex items-center gap-2">
          LIVE SYSTEM FEED
          <Clock className="text-[10px] text-fuchsia-500/80 font-bold ml-2 opacity-80 border-l border-white/20 pl-2" />
        </h3>
        <RealTimeGraph active={logs.length > 0} />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3 border-l border-white/20 pl-3 py-1"
          >
            <span className="text-slate-400">{new Date(log.time).toLocaleTimeString()}</span>
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
<<<<<<< HEAD
        <motion.div 
=======
        {/* Slow fill-up sweep */}
        <motion.div
>>>>>>> origin/PushFinalBukanPunyaRei
          initial={{ x: "-150%" }}
          animate={{ x: "150%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
        />
      </div>
      <div className="w-[5px] h-5 bg-white/20 rounded-r-[1px] ml-[2px] shadow-[2px_0_10px_rgba(255,255,255,0.1)]" />
    </div>
  );
}

function MailerStatus() {
<<<<<<< HEAD
  const [ready] = useState(true);
  
  return (
    <div className="relative group">
      <span className={`text-xs font-black uppercase tracking-tighter bg-clip-text text-transparent ${ready ? "bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse" : "bg-gradient-to-r from-red-600 to-red-900"}`}>
        {ready ? "READY" : "NOT READY"}
      </span>
    </div>
  );
=======
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
>>>>>>> origin/PushFinalBukanPunyaRei
}

function LoomBackground() {
  const threads = useMemo(() => Array.from({ length: 24 }).map((_, i) => {
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
    <div className="p-5 bg-transparent">
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

<<<<<<< HEAD
function CommentsPanel({ onRefresh }) {
=======
// ─── Comments Panel ──────────────────────────────────────────────────────────
function CommentsPanel({ lowPowerMode }) {
>>>>>>> origin/PushFinalBukanPunyaRei
  const [comments, setComments] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(["All"]);

  const load = useCallback(async () => {
    let pinned = filters.includes("Pinned") ? "true" : "";
    let type = filters.find(f => f === "Advice" || f === "Idea") || "All";

    const r = await api.get("/admin/comments", {
      params: { search, pinned, type }
    });
    setComments(r.data.comments || []);
  }, [search, filters]);

  useEffect(() => { load(); }, [load]);

  const toggleFilter = (f) => {
    setFilters(prev => {
      if (f === "All") return ["All"];
      let next = prev.filter(x => x !== "All");
      if (next.includes(f)) {
        next = next.filter(x => x !== f);
        return next.length === 0 ? ["All"] : next;
      }
      if (next.length >= 2) next.shift();
      return [...next, f];
    });
  };

  async function togglePin(id) {
    await api.patch(`/admin/comments/${id}/pin`);
    onRefresh();
    load();
  }

  async function del(id) {
    if (!confirm("Delete this comment?")) return;
    await api.delete(`/admin/comments/${id}`);
    onRefresh();
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
<<<<<<< HEAD
          <input className={INPUT} placeholder="SEARCH USERNAME..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Pinned", "Advice", "Idea"].map(f => (
            <button key={f} onClick={() => toggleFilter(f)} className={`px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-widest border transition-all ${filters.includes(f) ? "bg-white text-black border-white" : "bg-white/5 text-slate-500 border-white/10 hover:border-white/30"}`}>{f}</button>
=======
          <input
            className={INPUT}
            placeholder="SEARCH USERNAME..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Pinned", "Advice", "Idea"].map(f => (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-widest border transition-all ${filters.includes(f)
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-slate-500 border-white/10 hover:border-white/30"
                }`}
            >
              {f}
            </button>
>>>>>>> origin/PushFinalBukanPunyaRei
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {comments.map((c) => (
<<<<<<< HEAD
          <motion.div key={c.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative aspect-square bg-white/70 backdrop-blur-xl rounded-3xl p-6 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 overflow-hidden flex flex-col justify-between">
            <LocalBlob color="bg-fuchsia-400" />
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-black/5 border border-black/10 overflow-hidden flex-shrink-0">
                  <img src={c.user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username || 'anon'}`} alt="" className="w-full h-full object-cover" />
=======
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          className={`relative aspect-square rounded-3xl p-6 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 overflow-hidden flex flex-col justify-between ${
              lowPowerMode ? "bg-[#d6cdc2]" : "bg-white/70 backdrop-blur-xl"
            }`}
          >
            <LocalBlob color="bg-fuchsia-400" />

            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-black/5 border border-black/10 overflow-hidden flex-shrink-0">
                  <img
                    src={c.user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username || 'anon'}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
>>>>>>> origin/PushFinalBukanPunyaRei
                </div>
                <div className="min-w-0">
                  <p className="font-sans font-black text-sm text-black tracking-tight leading-none uppercase truncate">{c.username || "ANONYMOUS"}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
<<<<<<< HEAD
                    <span className={`font-sans font-black text-[9px] uppercase tracking-tighter ${c.type === 'ADVICE' ? 'text-[#1a365d]' : 'text-red-600'}`}>{c.type}</span>
                    <span className="text-black/20 text-[9px]">-</span>
                    <span className={`font-sans font-black text-[9px] uppercase tracking-tighter ${c.category?.toUpperCase() === 'EVENT' ? 'text-fuchsia-600' : c.category?.toUpperCase() === 'WEB DEV' ? 'text-yellow-600' : 'text-emerald-600'}`}>{c.category || 'OTHER'}</span>
                  </div>
                </div>
              </div>
=======
                    <span className={`font-sans font-black text-[9px] uppercase tracking-tighter ${c.type === 'ADVICE' ? 'text-[#1a365d]' : 'text-red-600'
                      }`}>
                      {c.type}
                    </span>
                    <span className="text-black/20 text-[9px]">-</span>
                    <span className={`font-sans font-black text-[9px] uppercase tracking-tighter ${c.category?.toUpperCase() === 'EVENT' ? 'text-fuchsia-600' :
                        c.category?.toUpperCase() === 'WEB DEV' ? 'text-yellow-600' : 'text-emerald-600'
                      }`}>
                      {c.category || 'OTHER'}
                    </span>
                  </div>
                </div>
              </div>

>>>>>>> origin/PushFinalBukanPunyaRei
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <p className="font-sans text-[12px] text-black/80 leading-relaxed font-medium group-hover:text-black transition-colors duration-300">{c.content}</p>
              </div>
<<<<<<< HEAD
              <p className="font-sans text-[10px] text-black/40 mt-4 uppercase tracking-widest">{formatDate(c.createdAt)}</p>
=======

              <p className="font-sans text-[10px] text-black/40 mt-4 uppercase tracking-widest">
                {formatDate(c.createdAt)}
              </p>
>>>>>>> origin/PushFinalBukanPunyaRei
            </div>
            <div className="relative z-10 flex gap-2 pt-4">
<<<<<<< HEAD
              <button onClick={() => togglePin(c.id)} className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${c.isPinned ? "bg-emerald-500 text-white shadow-[0_5px_15px_rgba(34,197,94,0.3)]" : "bg-black/5 text-black/30 hover:bg-black/10 hover:text-black"}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
=======
              <button
                onClick={() => togglePin(c.id)}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${c.isPinned
                    ? "bg-emerald-500 text-white shadow-[0_5px_15px_rgba(34,197,94,0.3)]"
                    : "bg-black/5 text-black/30 hover:bg-black/10 hover:text-black"
                  }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                </svg>
              </button>
              <button
                onClick={() => del(c.id)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/5 text-black/30 hover:bg-red-500 hover:text-white transition-all"
              >
                <TrashIcon />
>>>>>>> origin/PushFinalBukanPunyaRei
              </button>
              <button onClick={() => del(c.id)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/5 text-black/30 hover:bg-red-500 hover:text-white transition-all"><TrashIcon /></button>
            </div>
          </motion.div>
        ))}
        {!comments.length && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl">
            <p className="font-mono text-xs text-slate-600 uppercase tracking-[0.2em]">No comments found</p>
          </div>
        )}
      </div>
    </div>
  );
}

<<<<<<< HEAD
function BookingsPanel({ onRefresh }) {
  const [bookings, setBookings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [viewDate, setViewDate] = useState(new Date(2026, 0, 1));
=======
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: ACCEPT BOOKING MODAL (Phase 3 - Financial Acceptance Workflow)
// ─────────────────────────────────────────────────────────────────────────────
function AcceptBookingModal({ booking, onClose, onConfirm }) {
  const [deploymentArea, setDeploymentArea] = useState(booking.deploymentArea || '');
  const [technicalBrief, setTechnicalBrief] = useState(booking.technicalBrief || '');
  const [pricePerHour, setPricePerHour] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total duration from all slots (in hours)
  const totalHours = (booking.slots || []).reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
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
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

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
                {booking.serviceName || booking.serviceType || '—'}
              </div>
            </div>

            {/* Operator Name */}
            <div>
              <label className={LABEL}>Operator / Contact Person</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.contactPerson || booking.requestor?.name || '—'}
              </div>
            </div>

            {/* Comms */}
            <div>
              <label className={LABEL}>Comms (WhatsApp)</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.whatsapp || '—'}
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
                ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : 'border-white/5 bg-white/[0.02]'
            }`}>
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-2">Total Price</p>
              <p className={`font-mono font-black text-3xl transition-all duration-300 ${
                totalPrice > 0 ? 'text-emerald-400' : 'text-white/10'
              }`}>
                {totalPrice > 0 ? formatRupiah(totalPrice) : 'IDR 0'}
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
                {isSubmitting ? 'Processing...' : 'Confirm & Accept ✓'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// PANEL: BOOKINGS (HEATMAP + CARDS)
// ─────────────────────────────────────────────────────────────────────────────
function BookingsPanel({ onRefresh }) {
  const [bookings, setBookings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [acceptModal, setAcceptModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [jitAction, setJitAction] = useState(null); // null | { id, version, label }

  const filteredBookings = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return bookings;
    const terms = q.split(/\s+/);
    return bookings.filter((b) => {
      const searchString = [b.requestor?.name, b.requestor?.email, b.title, b.serviceType, b.status].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [bookings, debouncedSearchQuery]);
>>>>>>> origin/PushFinalBukanPunyaRei
  
  // Math Setup
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getStartOfWeek = (d) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() - dt.getDay());
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const currentWeekStart = getStartOfWeek(today);

  // Admin can only navigate backwards a maximum of ONE completely passed week
  const minWeekStart = new Date(currentWeekStart);
  minWeekStart.setDate(currentWeekStart.getDate() - 7);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewWeekStart, setViewWeekStart] = useState(currentWeekStart);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/admin/services");
      setBookings(r.data.bookings || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

<<<<<<< HEAD
  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/services/${id}/status`, { status });
      load();
      onRefresh();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    }
=======
  const updateStatus = async (id, status, version, extraData = {}) => {
    try {
      await api.patch(`/admin/services/${id}/status`, { status, version, ...extraData });
      
      // Auto-open Receipt Modal if successfully accepted
      if (status === 'PROCESSED' && acceptModal) {
         const processedBooking = { ...acceptModal, ...extraData, status: 'PROCESSED' };
         setReceiptModal({ type: 'BOOKING', data: processedBooking });
      }

      setAcceptModal(null);
      load();
      onRefresh();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        alert(err.response.data.error || "Gagal mengupdate status. Silakan refresh halaman.");
        load();
      } else {
        alert("Terjadi kesalahan: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const del = (id, version) => {
    setJitAction({ id, version, label: `Booking #${id.slice(0, 8).toUpperCase()}` });
  };

  const executeDel = async (jitToken) => {
    const { id, version } = jitAction;
    await api.delete(`/admin/services/${id}`, {
      data: { version },
      headers: jitToken ? { 'x-jit-token': jitToken } : {},
    });
    setJitAction(null);
    load();
    onRefresh();
>>>>>>> origin/PushFinalBukanPunyaRei
  };

  const getWeek1OfMonth = (y, m) => {
    const firstDay = new Date(y, m, 1);
    return getStartOfWeek(firstDay);
  };

  const getWeekNumber = (weekStart, m, y) => {
    const week1Start = getWeek1OfMonth(y, m);
    const diffDays = Math.round((weekStart - week1Start) / (24 * 60 * 60 * 1000));
    return Math.floor(diffDays / 7) + 1;
  };

<<<<<<< HEAD
  const startOfWeek = new Date(viewDate);
  startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
  const HOURS = [...Array.from({ length: 15 }, (_, i) => 9 + i), 0];

  const getSlotColor = (dayOffset, hour) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + dayOffset);
    if (d.getDay() === 1) return "bg-red-900/20 opacity-40";
    const dStr = d.toISOString().split('T')[0];
    const hourStr = hour.toString().padStart(2, '0') + ":00";
    const activeBooking = bookings.find(b => b.slots?.some(s => {
      const sDate = new Date(s.date).toISOString().split('T')[0];
      return sDate === dStr && s.startTime <= hourStr && s.endTime > hourStr;
    }));
    if (!activeBooking) return "bg-emerald-500/10";
    if (activeBooking.id === selectedId) return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)] z-10 scale-105";
    if (activeBooking.status === "PROCESSED") return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]";
    if (activeBooking.status === "PENDING") return "bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]";
    return "bg-emerald-500/10";
=======
  const HOURS = [...Array.from({ length: 15 }, (_, i) => 9 + i), 0]; // 09:00 to 00:00

  const getSlotColor = (dayOffset, hour) => {
    const d = new Date(viewWeekStart);
    d.setDate(viewWeekStart.getDate() + dayOffset);

    const dStr = d.toISOString().split('T')[0];
    const hourStr = hour.toString().padStart(2, '0') + ":00";

    const activeBooking = bookings.find(b =>
      b.slots?.some(s => {
        const sDate = new Date(s.date).toISOString().split('T')[0];
        return sDate === dStr && s.startTime <= hourStr && s.endTime > hourStr;
      })
    );

    let colorClass = "bg-emerald-500/10"; // Available
    let borderClass = "border border-white/5"; // Default border

    if (d.getDay() === 1) {
      colorClass = "bg-red-900/20"; // Closed on Monday
    } else if (activeBooking) {
      // BUG 3 FIX: Status drives BASE color. Selection drives BORDER ONLY.
      if (activeBooking.status === "PROCESSED") {
        colorClass = "bg-white shadow-[0_0_8px_rgba(255,255,255,0.3)]";
      } else if (activeBooking.status === "PENDING") {
        colorClass = "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]";
      }

      // Selection adds glowing orange BORDER, never overrides the status color
      if (activeBooking.id === selectedId) {
        borderClass = "border-2 border-orange-500 shadow-[0_0_8px_theme(colors.orange.500)] z-10";
      }
    }

    // Past / spillover: grayscale + dimmed (preserves booking color visibility)
    const isPast = d < today;
    const isSpillover = d.getMonth() !== viewMonth;

    if (isPast || isSpillover) {
      return `${colorClass} ${borderClass} opacity-40 grayscale pointer-events-none`;
    }

    return `${colorClass} ${borderClass}`;
>>>>>>> origin/PushFinalBukanPunyaRei
  };

  const shiftWeek = (n) => {
    const nextWeekStart = new Date(viewWeekStart);
    nextWeekStart.setDate(viewWeekStart.getDate() + (n * 7));
    
    if (nextWeekStart < minWeekStart) return;

    setViewWeekStart(nextWeekStart);
    
    // Auto-update month if the Wednesday of this week falls in another month
    const wednesday = new Date(nextWeekStart);
    wednesday.setDate(nextWeekStart.getDate() + 3);
    if (wednesday.getMonth() !== viewMonth) {
      setViewMonth(wednesday.getMonth());
      setViewYear(wednesday.getFullYear());
    }
  };
  const shiftMonth = (n) => {
    const nextMonthDate = new Date(viewYear, viewMonth + n, 1);
    const nextM = nextMonthDate.getMonth();
    const nextY = nextMonthDate.getFullYear();

    const currentMDate = new Date(today.getFullYear(), today.getMonth(), 1);

    setViewMonth(nextM);
    setViewYear(nextY);

    if (n > 0) {
      // Going Forward (>): Always lands on Week 1 of the target month
      setViewWeekStart(getWeek1OfMonth(nextY, nextM));
    } else {
      // Going Backward (<)
      if (nextMonthDate > currentMDate) {
        // Purely future month -> land on Week 1
        setViewWeekStart(getWeek1OfMonth(nextY, nextM));
      } else {
        // Moving back to Current Active Month -> land on earliest accessible week
        setViewWeekStart(new Date(minWeekStart));
      }
    }
  };
  const selectBooking = (b) => {
    if (selectedId === b.id) { setSelectedId(null); }
    else {
      setSelectedId(b.id);
<<<<<<< HEAD
      if (b.slots?.length > 0) setViewDate(new Date(b.slots[0].date));
=======
      if (b.slots?.length > 0) {
        const slotDate = new Date(b.slots[0].date);
        slotDate.setHours(0,0,0,0);
        const targetWeekStart = getStartOfWeek(slotDate);
        if (targetWeekStart >= minWeekStart) {
          setViewWeekStart(targetWeekStart);
          const wednesday = new Date(targetWeekStart);
          wednesday.setDate(targetWeekStart.getDate() + 3);
          setViewMonth(wednesday.getMonth());
          setViewYear(wednesday.getFullYear());
        }
      }
>>>>>>> origin/PushFinalBukanPunyaRei
    }
  };

  return (
    <div className="space-y-6">
<<<<<<< HEAD
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-5xl mx-auto items-start">
        <div className="hidden xl:flex justify-end">
          <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-lg">
            <button onClick={() => shiftMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white">←</button>
            <span className="font-mono font-black text-[16px] uppercase w-32 text-center text-white/80 tracking-widest">{new Intl.DateTimeFormat('en-US', { month: 'long' }).format(viewDate)}</span>
            <button onClick={() => shiftMonth(1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white">→</button>
          </div>
        </div>
        <div className="hidden xl:flex justify-start">
          <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-lg">
            <button onClick={() => shiftWeek(-1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white">←</button>
            <span className="font-mono font-black text-[16px] uppercase w-40 text-center text-white/80 tracking-widest">Week {startOfWeek.getDate()}</span>
            <button onClick={() => shiftWeek(1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white">→</button>
          </div>
        </div>
        {[0, 1].map((weekOffset) => {
          const currentStart = new Date(startOfWeek);
          currentStart.setDate(startOfWeek.getDate() + (weekOffset * 7));
          return (
            <div key={weekOffset} className={`${CARD} rounded-[20px] p-4 border-white/5 bg-white/[0.02] w-full overflow-hidden`}>
              <div className="flex flex-col gap-4 mb-4"><h3 className="font-mono font-black text-[16px] uppercase tracking-tighter text-white">{weekOffset === 0 ? "Current Week" : "Next Week"}</h3></div>
=======
      {/* Navigation Header Area */}
      <div className="relative w-full max-w-5xl mx-auto mb-4">
        {/* Centered Navigation Boxes */}
        <div className="flex items-center justify-center gap-8">
          
          {/* Box 1: Month Selector */}
          <div className="flex items-center gap-1 bg-gray-800/60 backdrop-blur-md rounded-md p-2 border border-white/10 shadow-md">
            <button 
              onClick={() => shiftMonth(-1)} 
              disabled={new Date(viewYear, viewMonth, 1) <= new Date(today.getFullYear(), today.getMonth(), 1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <span className="font-mono font-black text-[16px] uppercase w-32 text-center text-white/80 tracking-widest">
              {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(viewYear, viewMonth, 1))}
            </span>
            <button 
              onClick={() => shiftMonth(1)} 
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white"
            >
              →
            </button>
          </div>

          {/* Box 2: Week Selector */}
          <div className="flex items-center gap-1 bg-gray-800/60 backdrop-blur-md rounded-md p-2 border border-white/10 shadow-md">
            <button 
              onClick={() => shiftWeek(-1)} 
              disabled={viewWeekStart <= minWeekStart}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <span className="font-mono font-black text-[16px] uppercase w-32 text-center text-white/80 tracking-widest">
              Week {getWeekNumber(viewWeekStart, viewMonth, viewYear)}
            </span>
            <button 
              onClick={() => shiftWeek(1)} 
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white"
            >
              →
            </button>
          </div>

        </div>

        {/* Far-Right Year Indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
          <span className="font-mono font-black text-[16px] text-white/30 tracking-widest">
            {viewYear}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-5xl mx-auto items-start">
        {[0, 1].map((weekOffset) => {
          const currentStart = new Date(viewWeekStart);
          currentStart.setDate(viewWeekStart.getDate() + (weekOffset * 7));

          return (
            <div key={weekOffset} className={`${CARD} rounded-[20px] p-4 border-white/5 bg-white/[0.02] w-full overflow-hidden`}>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono font-black text-[16px] uppercase tracking-tighter text-white">
                    Week {getWeekNumber(viewWeekStart, viewMonth, viewYear) + weekOffset}
                  </h3>
                </div>
              </div>

>>>>>>> origin/PushFinalBukanPunyaRei
              <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-1 mb-2">
                <div />
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => {
                  const dateObj = new Date(currentStart); dateObj.setDate(currentStart.getDate() + i);
                  return (
<<<<<<< HEAD
                    <div key={i} className="flex flex-col items-center">
                      <span className="font-mono text-[11px] font-black text-white/50">{d}</span>
                      <span className={`font-mono text-[11px] font-black ${dateObj.getDate() === new Date().getDate() ? 'text-white' : 'text-white/70'}`}>{dateObj.getDate()}</span>
=======
          <div key={i} className="flex flex-col items-center">
                       <span className="font-mono text-[11px] font-black text-white/50">{d}</span>
                      <span className={`font-mono text-[11px] font-black ${dateObj.getTime() === today.getTime() ? 'text-orange-500 scale-125 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : (dateObj < today || dateObj.getMonth() !== viewMonth) ? 'text-white/20' : 'text-white/70'}`}>
                        {dateObj.getDate()}
                      </span>
>>>>>>> origin/PushFinalBukanPunyaRei
                    </div>
                  );
                })}
              </div>
<<<<<<< HEAD
=======

>>>>>>> origin/PushFinalBukanPunyaRei
              <div className="space-y-1">
                {HOURS.map(h => (
                  <div key={h} className="grid grid-cols-[40px_repeat(7,1fr)] gap-1">
                    <div className="flex items-center justify-end pr-2 font-mono text-[11px] font-black text-white/60">{h.toString().padStart(2, '0')}:00</div>
<<<<<<< HEAD
                    {Array.from({ length: 7 }).map((_, i) => (<div key={i} className={`aspect-square w-full rounded-[4px] border border-white/5 transition-all duration-300 ${getSlotColor(i + (weekOffset * 7), h)}`} />))}
=======
                    {Array.from({ length: 7 }).map((_, i) => {
                      const slotDay = new Date(currentStart);
                      slotDay.setDate(currentStart.getDate() + i);
                      return (
                        <div key={i} className={`aspect-square w-full rounded-[4px] transition-all duration-300 ${getSlotColor(i + (weekOffset * 7), h)}`} />
                      );
                    })}
>>>>>>> origin/PushFinalBukanPunyaRei
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
<<<<<<< HEAD
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((b) => (
          <div key={b.id} onClick={() => selectBooking(b)} className={`relative bg-[#d6cdc2] rounded-[32px] p-6 group transition-all duration-500 cursor-pointer overflow-hidden flex flex-col border-none ${selectedId === b.id ? "shadow-[0_0_30px_rgba(249,115,22,0.2)] scale-[1.002]" : "hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]"}`}>
            <div className="relative z-10 space-y-1.5 flex flex-col">
              <div className="flex justify-between items-start"><div className="min-w-0"><h3 className="font-sans font-black text-xl text-black tracking-tight leading-tight uppercase">{b.requestor?.name}</h3><div className="flex items-center gap-2 mt-1"><span className="font-sans text-[8px] font-black text-red-500 uppercase tracking-widest">ADMIN</span><span className={`font-sans text-[8px] font-black uppercase tracking-widest ${b.status === 'PROCESSED' ? 'text-emerald-600' : 'text-orange-500'}`}>{b.status === 'PROCESSED' ? 'VERIFIED' : 'PENDING'}</span></div></div></div>
              <div className="py-3 space-y-3">
                <div><p className="font-sans text-[10px] text-black/70 font-medium mb-0 truncate">{b.requestor?.email || "admin@gmail.com"}</p><p className="font-sans text-[10px] text-black/70 font-medium tracking-widest">0000000000</p></div>
                <div className="w-full h-px bg-black/5" />
                <div className="max-h-[160px] overflow-y-auto scrollbar-hide"><p className="font-sans text-[8px] text-black/30 uppercase font-black tracking-widest mb-1">Schedule ({b.slots?.length || 0} Slots)</p><div className="space-y-0.5">{(b.slots || []).map((s, idx) => (<div key={idx} className="flex items-center justify-between py-0.5"><span className="font-sans text-[9px] font-bold text-black/50">{formatDate(s.date)}</span><span className="font-sans text-[9px] font-black text-black tracking-tighter">{s.startTime}-{s.endTime}</span></div>))}</div></div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2"><span className="font-sans text-[10px] text-black/40 font-medium">Book: 0</span><span className="font-sans text-[10px] text-black/40 font-medium">Ev: 0</span><span className="font-sans text-[10px] text-black/40 font-medium">Svc: 0</span><span className="font-sans text-[10px] text-black/40 font-medium">Since: {new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</span><div className="col-span-1"><p className="font-sans text-[10px] text-black/40 font-medium">PIC: <span className="text-black/70">{b.contactPerson?.split(' ')[0]}</span></p></div><div className="col-span-1"><p className="font-sans text-[10px] text-black/40 font-medium">Loc: <span className="text-black/70">{b.locationString}</span></p></div></div>
=======

      {/* Cards Section - with search header */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">{filteredBookings.length} request{filteredBookings.length !== 1 ? "s" : ""}</p>
        <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search requestor..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBookings.map((b) => (
          <div
            key={b.id}
            onClick={() => selectBooking(b)}
            className={`relative rounded-[32px] p-6 group transition-all duration-500 cursor-pointer overflow-hidden flex flex-col border-none
              bg-[#d6cdc2]
              ${selectedId === b.id
                ? "shadow-[0_0_30px_rgba(249,115,22,0.25)] ring-2 ring-orange-400/40 scale-[1.002]"
                : "hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]"}
            `}
          >
            {/* Minimalist Image 2 Aesthetic: Beige background, no blobs */}

            <div className="relative z-10 space-y-1.5 flex flex-col">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h3 className="font-sans font-black text-xl text-black tracking-tight leading-tight uppercase">{b.requestor?.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {/* BUG 2 FIX: Read actual role from requestor, not hardcoded ADMIN */}
                    <span className={`font-sans text-[8px] font-black uppercase tracking-widest ${
                      b.requestor?.role === 'ADMIN' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      {b.requestor?.role || 'USER'}
                    </span>
                    <span className={`font-sans text-[8px] font-black uppercase tracking-widest ${b.status === 'PROCESSED' ? 'text-emerald-600' : 'text-orange-500'
                      }`}>
                      {b.status === 'PROCESSED' ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-3 space-y-3">
                <div>
                  <p className="font-sans text-[10px] text-black/70 font-medium mb-0 truncate">{b.requestor?.email || "admin@gmail.com"}</p>
                  <p className="font-sans text-[10px] text-black/70 font-medium tracking-widest">0000000000</p>
                </div>

                <div className="w-full h-px bg-black/5" />

                <div className="max-h-[160px] overflow-y-auto scrollbar-hide">
                  <p className="font-sans text-[8px] text-black/30 uppercase font-black tracking-widest mb-1">Schedule ({b.slots?.length || 0} Slots)</p>
                  <div className="space-y-0.5">
                    {(b.slots || []).map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between py-0.5">
                        <span className="font-sans text-[9px] font-bold text-black/50">{formatDate(s.date)}</span>
                        <span className="font-sans text-[9px] font-black text-black tracking-tighter">{s.startTime}-{s.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span className="font-sans text-[10px] text-black/40 font-medium">Book: 0</span>
                  <span className="font-sans text-[10px] text-black/40 font-medium">Ev: 0</span>
                  <span className="font-sans text-[10px] text-black/40 font-medium">Svc: 0</span>
                  <span className="font-sans text-[10px] text-black/40 font-medium">Since: {new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</span>

                  <div className="col-span-1">
                    <p className="font-sans text-[10px] text-black/40 font-medium">PIC: <span className="text-black/70">{b.contactPerson?.split(' ')[0]}</span></p>
                  </div>
                  <div className="col-span-1">
                    <p className="font-sans text-[10px] text-black/40 font-medium">Loc: <span className="text-black/70">{b.locationString}</span></p>
                  </div>
                </div>
>>>>>>> origin/PushFinalBukanPunyaRei
              </div>
              <div className="flex gap-2 pt-3 mt-2 border-t border-black/5">
<<<<<<< HEAD
                <button onClick={(e) => { e.stopPropagation(); updateStatus(b.id, b.status === 'PROCESSED' ? 'PENDING' : 'PROCESSED'); }} className={`w-9 h-9 flex items-center justify-center rounded-full text-white shadow-md hover:scale-105 transition-all outline-none ${b.status === 'PROCESSED' ? 'bg-emerald-600 ring-2 ring-black ring-offset-2 ring-offset-[#d6cdc2]' : 'bg-emerald-500'}`}><CheckIcon /></button>
                <button onClick={(e) => { e.stopPropagation(); updateStatus(b.id, 'CANCELLED'); }} className="w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white shadow-md hover:scale-105 transition-all"><XIcon /></button>
                <button onClick={(e) => { e.stopPropagation(); del(b.id); }} className="w-9 h-9 flex items-center justify-center bg-black/5 rounded-full text-black/40 hover:bg-red-500 hover:text-white transition-all"><TrashIcon /></button>
=======
                {b.status === 'PENDING' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Phase 3: Open Acceptance Modal instead of firing API directly
                        setAcceptModal(b);
                      }}
                      className="w-9 h-9 flex items-center justify-center bg-emerald-500 rounded-full text-white shadow-md hover:scale-105 transition-all"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(b.id, 'CANCELLED', b.version); }}
                      className="w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white shadow-md hover:scale-105 transition-all"
                    >
                      <XIcon />
                    </button>
                  </>
                )}
                {b.status === 'PROCESSED' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setReceiptModal({ type: 'BOOKING', data: b }); }}
                    className="flex-1 h-9 flex items-center justify-center bg-blue-500 rounded-full text-white font-bold text-[10px] uppercase tracking-widest shadow-md hover:bg-blue-400 transition-all"
                    title="View Receipt"
                  >
                    View Receipt
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); del(b.id, b.version); }}
                  className="w-9 h-9 flex items-center justify-center bg-black/5 rounded-full text-black/40 hover:bg-red-500 hover:text-white transition-all"
                  title="Delete booking"
                >
                  <TrashIcon />
                </button>
>>>>>>> origin/PushFinalBukanPunyaRei
              </div>
            </div>
          </div>
        ))}
<<<<<<< HEAD
        {!bookings.length && (<div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[40px]"><p className="font-mono text-xs text-slate-600 uppercase tracking-[0.2em]">No booking requests found</p></div>)}
=======
        {!filteredBookings.length && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[40px]">
            <p className="font-mono text-xs text-slate-600 uppercase tracking-[0.2em]">{searchQuery ? `No requests matching "${searchQuery}"` : "No booking requests found"}</p>
          </div>
        )}
>>>>>>> origin/PushFinalBukanPunyaRei
      </div>

      {/* Accept Booking Modal — Phase 3 Financial Acceptance Workflow */}
      {acceptModal && (
        <AcceptBookingModal
          booking={acceptModal}
          onClose={() => setAcceptModal(null)}
          onConfirm={(extraData) =>
            updateStatus(acceptModal.id, 'PROCESSED', acceptModal.version, extraData)
          }
        />
      )}

      {/* JIT Delete Modal */}
      {jitAction && (
        <JITActionModal
          title="Delete Booking"
          description={`You are permanently deleting ${jitAction.label}. This action cannot be undone and requires JIT authorization.`}
          onClose={() => setJitAction(null)}
          onConfirm={executeDel}
        />
      )}

      {/* Universal Receipt Modal */}
      {receiptModal && (
        <ReceiptModal
          type={receiptModal.type}
          data={receiptModal.data}
          onClose={() => setReceiptModal(null)}
        />
      )}
    </div>
  );
}

<<<<<<< HEAD
function EarningsPanel({ data }) {
  const [target, setTarget] = useState(10);
  const [range, setRange] = useState({ start: "2026-01-01", end: "2026-12-31" });
  const [granularity, setGranularity] = useState("month");
  const [useIntelligence, setUseIntelligence] = useState(false);
  const historicalAvg = 2.5;
  
  const chartData = useMemo(() => {
    let length = 12; let labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (granularity === "day") { length = 7; labels = ["M", "T", "W", "T", "F", "S", "S"]; }
    else if (granularity === "week") { length = 4; labels = ["W1", "W2", "W3", "W4"]; }
    const baseline = 1.2; const growth = (i) => i * (granularity === "day" ? 0.05 : 0.45);
    return Array.from({ length }, (_, i) => {
      const realVal = data.daily?.[i]?.amount || (baseline + growth(i) + (Math.random() * 0.5));
      const baseAvg = data.average || historicalAvg;
      const projection = baseAvg + (i * (granularity === "day" ? 0.08 : 0.4)) + (Math.sin(i * 0.3) * 0.2);
      return { label: labels[i % labels.length], value: realVal, projected: projection };
    });
  }, [granularity, data]);
=======
// ─────────────────────────────────────────────────────────────────────────────
// PANEL: EARNINGS (FINANCIAL INTELLIGENCE)
// ─────────────────────────────────────────────────────────────────────────────
function EarningsPanel({ data: initialData }) {
  const [target, setTarget] = useState(10); // in Juta
  const [range, setRange] = useState({ start: "2026-01-01", end: "2026-12-31" });
  const [granularity, setGranularity] = useState("month");
  const [useIntelligence, setUseIntelligence] = useState(false);
  const [earningsData, setEarningsData] = useState(initialData);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await api.get(`/admin/earnings?start=${range.start}&end=${range.end}`);
        setEarningsData(res.data);
      } catch (err) {
        console.error("Failed to fetch earnings:", err);
      }
    };
    fetchEarnings();
  }, [range.start, range.end]);

  const chartData = useMemo(() => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const transactions = earningsData.transactions || [];
    const points = [];
    const historicalAvg = earningsData.average || 2.5; // Backend monthly avg

    if (granularity === "day") {
      let curr = new Date(start);
      while (curr <= end) {
        const currDate = curr.toLocaleDateString('en-CA'); // "YYYY-MM-DD" in local TZ
        const label = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(curr);
        const val = transactions.filter(t => new Date(t.date).toLocaleDateString('en-CA') === currDate).reduce((s, t) => s + (t.total || 0), 0) / 1_000_000;
        points.push({ label, value: val, projected: useIntelligence ? historicalAvg / 30 : 0 });
        curr.setDate(curr.getDate() + 1);
      }
    } else if (granularity === "week") {
      let curr = new Date(start);
      let weekCount = 1;
      while (curr <= end) {
        const next = new Date(curr);
        next.setDate(next.getDate() + 7);
        const label = `W${weekCount}`;
        const val = transactions.filter(t => {
          const d = new Date(t.date);
          return d >= curr && d < next;
        }).reduce((s, t) => s + (t.total || 0), 0) / 1_000_000;
        points.push({ label, value: val, projected: useIntelligence ? historicalAvg / 4 : 0 });
        curr = next;
        weekCount++;
      }
    } else {
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (curr <= endMonth) {
        const currMonth = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
        const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(curr);
        const val = transactions.filter(t => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currMonth;
        }).reduce((s, t) => s + (t.total || 0), 0) / 1_000_000;
        points.push({ label, value: val, projected: useIntelligence ? historicalAvg : 0 });
        curr.setMonth(curr.getMonth() + 1);
      }
    }

    if (points.length === 0) return [{ label: "No Data", value: 0, projected: 0 }];
    return points;
  }, [range, granularity, earningsData, useIntelligence]);
>>>>>>> origin/PushFinalBukanPunyaRei

  const maxVal = Math.max(...chartData.map(p => Math.max(p.value, p.projected)), target, 1) * 1.2;

  const totalRaw = earningsData.totalRaw || 0;
  const breakdown = earningsData.breakdown || {};

  const formatIDR = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
<<<<<<< HEAD
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
=======
    <div className="space-y-8">
      {/* ── Real-Time KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: totalRaw, accent: 'text-yellow-400', border: 'border-yellow-400/20', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.08)]' },
          { label: 'Service Bookings', value: breakdown.serviceBookings || 0, accent: 'text-orange-400', border: 'border-orange-400/10', glow: '' },
          { label: 'Event Registrations', value: breakdown.eventRegistrations || 0, accent: 'text-cyan-400', border: 'border-cyan-400/10', glow: '' },
          { label: 'Merch Sales', value: (breakdown.merch || 0) + (breakdown.timekeeperBookings || 0), accent: 'text-emerald-400', border: 'border-emerald-400/10', glow: '' },
        ].map(({ label, value, accent, border, glow }) => (
          <div key={label} className={`bg-white/[0.03] border ${border} rounded-2xl p-5 ${glow}`}>
            <p className="font-mono text-[9px] text-white/30 uppercase tracking-widest mb-2">{label}</p>
            <p className={`font-mono font-black text-lg tracking-tighter ${accent}`}>{formatIDR(value)}</p>
          </div>
        ))}
      </div>

      {/* ── Config + Chart Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Target Form */}
>>>>>>> origin/PushFinalBukanPunyaRei
      <div className={`${CARD} p-8 space-y-6 bg-white/[0.03] border-white/5 rounded-3xl`}>
        <h3 className="font-sans font-black text-xs text-white uppercase tracking-tighter mb-6">Target Configuration</h3>
        <div className="space-y-4">
          <div className="space-y-4">
<<<<<<< HEAD
            <div className="space-y-1"><label className="font-sans font-bold text-[9px] text-white/20 uppercase tracking-widest block ml-1">Start Period</label><input type="date" className={INPUT} value={range.start} onChange={e => setRange({...range, start: e.target.value})} /></div>
            <div className="space-y-1"><label className="font-sans font-bold text-[9px] text-white/20 uppercase tracking-widest block ml-1">End Period</label><input type="date" className={INPUT} value={range.end} onChange={e => setRange({...range, end: e.target.value})} /></div>
=======
            <div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-sans font-bold text-[9px] text-white/20 uppercase tracking-widest block ml-1">Start Period</label>
                  <input type="date" className={INPUT} value={range.start} onChange={e => setRange({ ...range, start: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="font-sans font-bold text-[9px] text-white/20 uppercase tracking-widest block ml-1">End Period</label>
                  <input type="date" className={INPUT} value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} />
                </div>
              </div>
            </div>
            <div>
              <label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Profit Target (Juta IDR)</label>
              <div className="relative group/input">
                <input type="number" className={INPUT} value={target} onChange={e => setTarget(Number(e.target.value))} />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20">
                  <button
                    onClick={() => setTarget(prev => prev + 1)}
                    className="text-white/20 hover:text-white transition-colors p-0.5"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTarget(prev => Math.max(0, prev - 1))}
                    className="text-white/20 hover:text-white transition-colors p-0.5"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Growth Intelligence</label>
              <button
                onClick={() => setUseIntelligence(!useIntelligence)}
                className={`relative w-full py-4 px-6 rounded-2xl border transition-all font-sans font-medium text-[10px] flex items-center justify-between overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${useIntelligence
                    ? "border-white/40 bg-white/10 ring-1 ring-white/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
              >
                {/* Glow Blobs (Menonjol Effect) */}
                <div className="absolute -left-10 -top-10 w-24 h-24 bg-red-600/20 blur-[40px] rounded-full group-hover:bg-red-600/40 transition-all duration-700" />
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-amber-500/20 blur-[40px] rounded-full group-hover:bg-amber-500/40 transition-all duration-700" />

                <span className="relative z-10 text-white shadow-sm">Use Historical Avg</span>
                <div className={`relative z-10 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] ${useIntelligence ? "bg-white animate-pulse scale-110" : "bg-white/20"
                  }`} />
              </button>
            </div>
            <div>
              <label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Display Metric</label>
              <div className="flex gap-2">
                {["Day", "Week", "Month"].map(g => (
                  <button key={g} onClick={() => setGranularity(g.toLowerCase())} className={`flex-1 py-2 rounded-lg border font-sans font-bold text-[9px] tracking-widest transition-all ${granularity === g.toLowerCase() ? "bg-white text-black border-white" : "border-white/10 text-white/40 hover:text-white"
                    }`}>{g}</button>
                ))}
              </div>
            </div>
>>>>>>> origin/PushFinalBukanPunyaRei
          </div>
          <div><label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Profit Target (Juta IDR)</label><div className="relative group/input"><input type="number" className={INPUT} value={target} onChange={e => setTarget(Number(e.target.value))} /><div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20"><button onClick={() => setTarget(prev => prev + 1)} className="text-white/20 hover:text-white transition-colors p-0.5"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 15l7-7 7 7" /></svg></button><button onClick={() => setTarget(prev => Math.max(0, prev - 1))} className="text-white/20 hover:text-white transition-colors p-0.5"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg></button></div></div></div>
          <div><label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Growth Intelligence</label><button onClick={() => setUseIntelligence(!useIntelligence)} className={`relative w-full py-4 px-6 rounded-2xl border transition-all font-sans font-medium text-[10px] flex items-center justify-between overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${useIntelligence ? "border-white/40 bg-white/10 ring-1 ring-white/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}><div className="absolute -left-10 -top-10 w-24 h-24 bg-red-600/20 blur-[40px] rounded-full group-hover:bg-red-600/40 transition-all duration-700" /><div className="absolute -right-10 -bottom-10 w-24 h-24 bg-amber-500/20 blur-[40px] rounded-full group-hover:bg-amber-500/40 transition-all duration-700" /><span className="relative z-10 text-white shadow-sm">Use Historical Avg</span><div className={`relative z-10 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] ${useIntelligence ? "bg-white animate-pulse scale-110" : "bg-white/20"}`} /></button></div>
          <div><label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Display Metric</label><div className="flex gap-2">{["Day", "Week", "Month"].map(g => (<button key={g} onClick={() => setGranularity(g.toLowerCase())} className={`flex-1 py-2 rounded-lg border font-sans font-bold text-[9px] tracking-widest transition-all ${granularity === g.toLowerCase() ? "bg-white text-black border-white" : "border-white/10 text-white/40 hover:text-white"}`}>{g}</button>))}</div></div>
        </div>
      </div>
      <div className="xl:col-span-2 relative min-h-[500px] bg-white/[0.01] backdrop-blur-3xl rounded-[40px] border border-white/5 overflow-hidden p-10 group">
<<<<<<< HEAD
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
        <div className="relative h-full flex flex-col">
          <div className="flex justify-between items-start mb-10"><h3 className="font-sans font-black text-sm text-white uppercase tracking-tighter">Earnings Growth <span className="text-white/20 font-sans font-black tracking-tighter uppercase">/ Rp. X1000</span></h3><div className="text-right"><p className="font-mono text-[10px] text-white/40 uppercase">Projected Profit</p><p className="font-sans text-2xl font-black text-white tracking-tighter">Rp {chartData[chartData.length-1].value.toFixed(2)}M</p></div></div>
=======
        {/* Geometric Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

        <div className="relative h-full flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <h3 className="font-sans font-black text-sm text-white uppercase tracking-tighter">Earnings Growth <span className="text-white/20 font-sans font-black tracking-tighter uppercase">/ Rp. X1000</span></h3>
            <div className="text-right">
              <p className="font-mono text-[10px] text-white/40 uppercase">Total Revenue (YTD)</p>
              <p className="font-sans text-2xl font-black text-yellow-400 tracking-tighter">{formatIDR(totalRaw)}</p>
            </div>
          </div>

>>>>>>> origin/PushFinalBukanPunyaRei
          <div className="flex-1 relative">
            <svg viewBox="0 0 1000 400" className="w-full h-full preserve-3d overflow-visible">
<<<<<<< HEAD
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (<g key={i}><line x1="0" y1={400 - (p * 400)} x2="1000" y2={400 - (p * 400)} stroke="white" strokeOpacity="0.05" strokeDasharray="4 4" /><text x="-10" y={400 - (p * 400)} className="fill-white/20 font-mono text-[10px]" textAnchor="end">{(p * maxVal).toFixed(1)}</text></g>))}
              <line x1="0" y1={400 - (target / maxVal * 400)} x2="1000" y2={400 - (target / maxVal * 400)} stroke="#FF0000" strokeOpacity="0.8" strokeWidth="2" /><text x="1000" y={400 - (target / maxVal * 400) - 10} fill="white" className="font-mono text-[16px] uppercase font-black" textAnchor="end">Target</text>
              {useIntelligence && (<path d={`M ${chartData.map((p, i) => `${(i / (chartData.length - 1)) * 1000},${400 - (p.projected / maxVal * 400)}`).join(' L ')}`} fill="none" stroke="#00FFFF" strokeWidth="4" className="opacity-80" />)}
              <path d={`M ${chartData.map((p, i) => `${(i / (chartData.length - 1)) * 1000},${400 - (p.value / maxVal * 400)}`).join(' L ')}`} fill="none" stroke="#FFFF00" strokeWidth="3" className="drop-shadow-[0_0_15px_rgba(255,255,0,0.4)]" />
              {chartData.map((p, i) => (<circle key={i} cx={(i / (chartData.length - 1)) * 1000} cy={400 - (p.value / maxVal * 400)} r="4" className="fill-yellow-400 group-hover:r-6 transition-all cursor-crosshair" />))}
            </svg>
            <div className="flex justify-between mt-4">{chartData.map((p, i) => (<span key={i} className="font-mono text-[9px] text-white/30 uppercase">{p.label}</span>))}</div>
=======
              {/* Horizontal Y-Lines (Targets) */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                <g key={i}>
                  <line x1="0" y1={400 - (p * 400)} x2="1000" y2={400 - (p * 400)} stroke="white" strokeOpacity="0.05" strokeDasharray="4 4" />
                  <text x="-10" y={400 - (p * 400)} className="fill-white/20 font-mono text-[10px]" textAnchor="end">{(p * maxVal).toFixed(1)}</text>
                </g>
              ))}

              {/* Target Line (Red Solid) */}
              <line
                x1="0" y1={400 - (target / maxVal * 400)} x2="1000" y2={400 - (target / maxVal * 400)}
                stroke="#FF0000" strokeOpacity="0.8" strokeWidth="2"
              />
              <text x="1000" y={400 - (target / maxVal * 400) - 10} fill="white" className="font-mono text-[16px] uppercase font-black" textAnchor="end">Target</text>

              {/* Projection Line (Blue) */}
              {useIntelligence && (
                <path
                  d={`M ${chartData.map((p, i) => `${(i / (chartData.length - 1)) * 1000},${400 - (p.projected / maxVal * 400)}`).join(' L ')}`}
                  fill="none" stroke="#00FFFF" strokeWidth="2" strokeDasharray="4 4" className="opacity-60"
                />
              )}

              {/* The Primary Line Path (Yellow) */}
              <path
                d={`M ${chartData.map((p, i) => `${(i / (chartData.length - 1)) * 1000},${400 - (p.value / maxVal * 400)}`).join(' L ')}`}
                fill="none" stroke="#FFFF00" strokeWidth="3" className="drop-shadow-[0_0_15px_rgba(255,255,0,0.4)]"
              />

              {/* Data Points */}
              {chartData.map((p, i) => (
                <circle
                  key={i}
                  cx={(i / (chartData.length - 1)) * 1000}
                  cy={400 - (p.value / maxVal * 400)}
                  r="4" className="fill-yellow-400 group-hover:r-6 transition-all cursor-crosshair"
                />
              ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between mt-4">
              {chartData.map((p, i) => (
                <span key={i} className="font-mono text-[9px] text-white/30 uppercase">{p.label}</span>
              ))}
            </div>
>>>>>>> origin/PushFinalBukanPunyaRei
          </div>
        </div>
      </div>
      </div>
      
      {/* ── Recent Financial Transactions ── */}
      <div className={`${CARD} p-8 rounded-3xl bg-white/[0.03] border-white/5`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-sans font-black text-sm text-white uppercase tracking-tighter">Recent Financial Transactions</h3>
          <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">{earningsData.transactions?.length || 0} Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">Date & Time</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">Source</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">Item/Service</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">User/Admin</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold text-right">Qty</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold text-right">Price</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {(earningsData.transactions || []).slice(0, 15).map((t, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-4 text-white/60">
                    <span className="text-white block">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="text-[10px] text-white/40">{new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                      t.source === 'Merch Sale' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.source === 'Service Booking' ? 'bg-orange-500/20 text-orange-400' :
                      t.source === 'Event Registration' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {t.source}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-white max-w-[200px] truncate" title={t.item}>{t.item}</td>
                  <td className="py-4 px-4 text-white/60">{t.who}</td>
                  <td className="py-4 px-4 text-right text-white/80">{t.qty}</td>
                  <td className="py-4 px-4 text-right text-white/80">{formatIDR(t.price)}</td>
                  <td className="py-4 px-4 text-right font-black text-yellow-400/90">{formatIDR(t.total)}</td>
                </tr>
              ))}
              {(!earningsData.transactions || earningsData.transactions.length === 0) && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-white/30 text-xs italic">No financial transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD
function UsersPanel({ initialUsers = [], onRefresh }) {
  const [users, setUsers] = useState(initialUsers);
  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);
  async function setRole(id, role) { await api.patch(`/admin/users/${id}/role`, { role }); onRefresh(); }
  async function del(id) { if (!confirm("Delete user?")) return; await api.delete(`/admin/users/${id}`); onRefresh(); }
=======
// ─────────────────────────────────────────────────────────────────────────────
// PANEL: USERS
// ─────────────────────────────────────────────────────────────────────────────
function UsersPanel({ lowPowerMode }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jitAction, setJitAction] = useState(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredUsers = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return users;
    const terms = q.split(/\s+/);
    return users.filter((u) => {
      const searchString = [u.name, u.email, u.phone, u.role].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [users, debouncedSearchQuery]);

  const load = useCallback(async () => {
    const r = await api.get("/admin/users");
    setUsers(r.data.users);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setRole(id, role) { await api.patch(`/admin/users/${id}/role`, { role }); load(); }
  function del(id, name) {
    setJitAction({ id, label: name || `User #${id.slice(0, 8).toUpperCase()}` });
  }
  const executeDel = async (jitToken) => {
    await api.delete(`/admin/users/${jitAction.id}`, {
      headers: jitToken ? { 'x-jit-token': jitToken } : {},
    });
    setJitAction(null);
    load();
  };
>>>>>>> origin/PushFinalBukanPunyaRei

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search name, email, phone..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((u) => (
        <div key={u.id} className={`relative aspect-square rounded-3xl p-6 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 overflow-hidden flex flex-col justify-between ${
            lowPowerMode ? "bg-[#d6cdc2]" : "bg-white/70 backdrop-blur-xl"
          }`}>
          <LocalBlob color="bg-orange-400" />
<<<<<<< HEAD
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0"><p className="font-sans font-black text-sm text-black tracking-tight leading-none uppercase truncate">{u.name}</p><div className="flex items-center gap-2 mt-1.5"><Badge label={u.role} />{u.isEmailVerified && <span className="font-sans text-[10px] text-emerald-600 uppercase tracking-[0.15em] font-black">Verified</span>}</div></div>
=======

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="font-sans font-black text-sm text-black tracking-tight leading-none uppercase truncate">{u.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge label={u.role} />
                  {u.isEmailVerified && <span className="font-sans text-[10px] text-emerald-600 uppercase tracking-[0.15em] font-black">Verified</span>}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300 truncate">{u.email}</p>
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300">{u.phone}</p>
            </div>

            <div className="pt-2 border-t border-black/5 grid grid-cols-2 gap-y-1">
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Bookings: {u._count?.bookings}</span>
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Events: {u._count?.eventRegistrations}</span>
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Services: {u._count?.serviceBookings}</span>
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Since: {formatDate(u.createdAt)}</span>
>>>>>>> origin/PushFinalBukanPunyaRei
            </div>
            <div className="space-y-1"><p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300 truncate">{u.email}</p><p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300">{u.phone}</p></div>
            <div className="pt-2 border-t border-black/5 grid grid-cols-2 gap-y-1"><span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Bookings: {u._count?.bookings}</span><span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Events: {u._count?.eventRegistrations}</span><span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Services: {u._count?.serviceBookings}</span><span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Since: {formatDate(u.createdAt)}</span></div>
          </div>
<<<<<<< HEAD
          <div className="relative z-10 flex gap-2 pt-4">{u.role === "USER" ? (<button onClick={() => setRole(u.id, "ADMIN")} title="Promote to Admin" className="w-10 h-10 flex items-center justify-center bg-red-500 rounded-2xl text-white shadow-[0_5px_15px_rgba(239,68,68,0.2)] hover:scale-105 transition-transform font-black text-lg">↑</button>) : (<button onClick={() => setRole(u.id, "USER")} title="Demote to User" className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black hover:bg-black/10 transition-colors font-black text-lg">→</button>)}<button onClick={() => del(u.id)} className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black/40 hover:bg-red-500 hover:text-white transition-all"><TrashIcon /></button></div>
=======

          <div className="relative z-10 flex gap-2 pt-4">
            {u.role === "USER" ? (
              <button onClick={() => setRole(u.id, "ADMIN")} title="Promote to Admin" className="w-10 h-10 flex items-center justify-center bg-red-500 rounded-2xl text-white shadow-[0_5px_15px_rgba(239,68,68,0.2)] hover:scale-105 transition-transform font-black text-lg">↑</button>
            ) : (
              <button onClick={() => setRole(u.id, "USER")} title="Demote to User" className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black hover:bg-black/10 transition-colors font-black text-lg">→</button>
            )}
            <button onClick={() => del(u.id, u.name)} className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black/40 hover:bg-red-500 hover:text-white transition-all"><TrashIcon /></button>
          </div>
>>>>>>> origin/PushFinalBukanPunyaRei
        </div>
      ))}
      {!filteredUsers.length && <p className="font-mono text-sm text-slate-600 col-span-full py-10 text-center">{searchQuery ? `No users matching "${searchQuery}"` : "No users."}</p>}
      </div>

      {/* JIT Delete Modal */}
      {jitAction && (
        <JITActionModal
          title="Delete User"
          description={`You are permanently deleting user ${jitAction.label}. All their bookings, registrations, and data will be cascade-deleted. This requires JIT authorization.`}
          onClose={() => setJitAction(null)}
          onConfirm={executeDel}
        />
      )}
    </div>
  );
}

const TABS = [
  { id: "events", label: "Events" }, { id: "registrations", label: "Registrations" }, { id: "products", label: "Products" },
  { id: "bookings", label: "Bookings" }, { id: "earnings", label: "Earnings" }, { id: "users", label: "Users" }, { id: "comments", label: "Comments" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("events");
  const [stats, setStats] = useState({ events: 0, users: 0, regs: 0, products: 0, comments: 0, bookings: 0 });
  const [data, setData] = useState({ events: [], users: [], regs: [], products: [], comments: [], bookings: [], earnings: { daily: [], total: 0, totalRaw: 0, average: 0, breakdown: { serviceBookings: 0, eventRegistrations: 0, timekeeperBookings: 0, merch: 0 } } });
  const [mounted, setMounted] = useState(false);
<<<<<<< HEAD
=======
  const [wibTime, setWibTime] = useState("");
  const [lowPowerMode, setLowPowerMode] = useState(false);

  // ─── NEW: Audit & Side Panel States ───
  const [logs, setLogs] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isExportingLogs, setIsExportingLogs] = useState(false);
  const [systemToast, setSystemToast] = useState(null); // null | { type: 'success'|'error', msg }
  const [isChatRetracted, setIsChatRetracted] = useState(false); // Manual toggle
  const [isChatFaded, setIsChatFaded] = useState(false);       // Auto-hide (opacity)
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPulse, setShowPulse] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const chatScrollRef = useRef(null);
  const prevLogIdRef = useRef(null);


  // ─── CSV Export: All Audit Logs ───────────────────────────────────────────
  const exportLogs = async () => {
    setIsExportingLogs(true);
    try {
      const res = await api.get('/admin/system/logs');
      const logs = res.data.logs || [];

      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const headers = ['Date', 'Admin/User', 'Action', 'Details'];
      const rows = logs.map((l) => [
        escape(new Date(l.createdAt).toLocaleString('id-ID')),
        escape(l.adminEmail),
        escape(l.action),
        escape(l.details || ''),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kalceria_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setSystemToast({ type: 'error', msg: 'Failed to export logs. Check your connection.' });
      setTimeout(() => setSystemToast(null), 4000);
    } finally {
      setIsExportingLogs(false);
    }
  };

  // ─── System Reset: post-execution handler ──────────────────────────────────
  const handleResetSuccess = async () => {
    setShowResetModal(false);
    setIsDrawerOpen(false);
    setSystemToast({ type: 'success', msg: '✓ System reset complete. Logging out...' });
    setTimeout(() => {
      // Force logout and hard-reload for clean state
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/admin/login';
    }, 2500);
  };

  // Auto-fade chatbox after 5s of inactivity
  useEffect(() => {
    if (isChatRetracted || isChatFaded) return;
    const timer = setTimeout(() => {
      setIsChatFaded(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isChatRetracted, isChatFaded, lastActivity]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [logs]);

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
>>>>>>> origin/PushFinalBukanPunyaRei

  const loadAll = useCallback(() => {
    Promise.all([
      api.get("/admin/events").catch(() => ({ data: { events: [] } })),
      api.get("/admin/users").catch(() => ({ data: { users: [] } })),
      api.get("/admin/registrations").catch(() => ({ data: { registrations: [] } })),
      api.get("/admin/comments").catch(() => ({ data: { comments: [] } })),
      api.get("/admin/services").catch(() => ({ data: { bookings: [] } })),
      api.get("/admin/earnings").catch(() => ({ data: { daily: [], total: 0, totalRaw: 0, average: 0, breakdown: { serviceBookings: 0, eventRegistrations: 0, timekeeperBookings: 0, merch: 0 } } })),
    ]).then(([ev, us, re, co, bk, ea]) => {
<<<<<<< HEAD
      const eList = ev.data.events || []; const uList = us.data.users || []; const rList = re.data.registrations || [];
      const cList = co.data.comments || []; const bList = bk.data.bookings || [];
      const savedProducts = JSON.parse(localStorage.getItem("kalceria_dummy_products") || "[]");
      const pList = savedProducts.length ? savedProducts : INITIAL_DUMMIES;
      setStats({ events: eList.length, users: uList.length, regs: rList.length, products: pList.length, comments: cList.length, bookings: bList.length });
      setData({ events: eList, users: uList, regs: rList, products: pList, comments: cList, bookings: bList, earnings: ea.data || { daily: [], total: 0 } });
=======
      const eList = ev.data.events || [];
      const uList = us.data.users || [];
      const rList = re.data.registrations || [];
      const cList = co.data.comments || [];
      const bList = bk.data.bookings || [];

      const savedProducts = JSON.parse(localStorage.getItem("kalceria_dummy_products") || "[]");
      const pList = savedProducts.length ? savedProducts : INITIAL_DUMMIES;

      setStats({
        events: eList.length,
        users: uList.length,
        regs: rList.length,
        products: pList.length,
        comments: cList.length,
        bookings: bList.length,
      });

      setData({
        events: eList,
        users: uList,
        regs: rList,
        products: pList,
        comments: cList,
        bookings: bList,
        earnings: ea.data || { daily: [], total: 0, totalRaw: 0, average: 0, breakdown: {} },
      });
>>>>>>> origin/PushFinalBukanPunyaRei
    });
  }, []);

  // Polling Logs for Chatbox
  const isChatRetractedRef = useRef(isChatRetracted);
  useEffect(() => {
    isChatRetractedRef.current = isChatRetracted;
  }, [isChatRetracted]);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await api.get("/admin/logs");
      const newLogs = r.data.logs || [];
      
      if (prevLogIdRef.current && newLogs.length > 0 && newLogs[0].id !== prevLogIdRef.current) {
        if (isChatRetractedRef.current) setUnreadCount(prev => prev + 1);
        setShowPulse(true);
        setIsChatFaded(false); // Make visible on new log
        setLastActivity(Date.now());
        setTimeout(() => setShowPulse(false), 2000);
      }
      
      if (newLogs.length > 0) prevLogIdRef.current = newLogs[0].id;
      setLogs(newLogs);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("adminToken");
    if (!token) { router.replace("/admin/login"); return; }
    
    loadAll();
    const logInterval = setInterval(fetchLogs, 5000);
    
    if (localStorage.getItem("lowPowerMode") === "true") {
      setLowPowerMode(true);
    }

    return () => clearInterval(logInterval);
  }, [router, loadAll, fetchLogs]);

  function logout() { localStorage.removeItem("adminToken"); localStorage.removeItem("token"); router.replace("/admin/login"); }

  return (
<<<<<<< HEAD
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: mounted ? 1 : 0 }} transition={{ duration: 0.8 }} className={`min-h-screen ${DARK} text-white`}>
      <DynamicBlobs /><LoomBackground />
=======
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      className={`min-h-screen ${DARK} text-white`}
    >
      {!lowPowerMode && <DynamicBlobs />}

      {/* Video Background Replacement for LoomBackground */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 mix-blend-screen opacity-100"
        style={{ pointerEvents: 'none' }}
      >
        <source src="/videoLoomBackground.mp4" type="video/mp4" />
      </video>

      {/* Global Override for Low Power Mode (No Blurs) */}
      {lowPowerMode && (
        <style dangerouslySetInnerHTML={{
          __html: `
          .backdrop-blur-xl, .backdrop-blur-md, .backdrop-blur-3xl {
            backdrop-filter: none !important;
            background-color: #0a1122 !important;
          }
        `}} />
      )}

      {/* Top nav */}
>>>>>>> origin/PushFinalBukanPunyaRei
      <header className="relative z-10 border-b border-slate-900 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logologin.png" alt="Kalceria" className="h-7 object-contain" draggable={false} /><div className="h-4 w-px bg-white/20 ml-2" />
          <Clock className="font-sans text-[11px] text-white font-medium underline tracking-widest opacity-90" />
        </div>
<<<<<<< HEAD
        <button onClick={logout} className="font-mono text-xs text-slate-600 hover:text-white transition-colors uppercase tracking-widest">Logout</button>
=======
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const nextMode = !lowPowerMode;
              setLowPowerMode(nextMode);
              localStorage.setItem("lowPowerMode", nextMode);
            }}
            title={lowPowerMode ? "Low Power Mode: ON" : "Low Power Mode: OFF"}
            className={`relative overflow-hidden flex items-center justify-center p-2 rounded-xl border backdrop-blur-xl transition-all duration-500 hover:scale-110 group ${
              lowPowerMode 
                ? "border-emerald-500/50 bg-white/5 shadow-[0_0_25px_rgba(16,185,129,0.4)] text-emerald-400" 
                : "border-red-500/50 bg-white/5 shadow-[0_0_20px_rgba(239,68,68,0.4)] text-red-400"
            }`}
          >
            {/* Dynamic Blob Inside Button */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full blur-xl opacity-50 transition-colors duration-700 group-hover:opacity-80 ${
              lowPowerMode ? "bg-emerald-500" : "bg-red-500"
            }`} />
            
            <div 
              className="relative z-10 w-5 h-5 drop-shadow-md bg-current" 
              style={{
                WebkitMaskImage: 'url(/powerModeSymbol.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center'
              }}
            />
          </button>

          {/* Control Drawer Toggle */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            title="Control Center & System Health"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button onClick={logout} className="font-mono text-xs text-slate-600 hover:text-white transition-colors uppercase tracking-widest ml-2">
            Logout
          </button>
        </div>
>>>>>>> origin/PushFinalBukanPunyaRei
      </header>
      <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
<<<<<<< HEAD
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
=======
        <div className="grid grid-cols-1 gap-8">
          <div className="col-span-1">
            {/* Stats */}
>>>>>>> origin/PushFinalBukanPunyaRei
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              <StatCard label="Events" value={stats.events} /><StatCard label="Users" value={stats.users} /><StatCard label="Registrations" value={stats.regs} /><StatCard label="Comments" value={stats.comments} /><StatCard label="Bookings" value={stats.bookings} />
            </div>
            <div className="flex gap-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded p-1 mb-8 w-fit shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {TABS.map((t) => (
<<<<<<< HEAD
                <button key={t.id} onClick={() => setTab(t.id)} className={`relative px-5 py-2 text-xs font-mono font-black uppercase tracking-widest transition-colors rounded ${tab === t.id ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>
                  {tab === t.id && <motion.div layoutId="admin-tab-pill" className="absolute inset-0 bg-white/10 rounded" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
=======
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-5 py-2 text-xs font-mono font-black uppercase tracking-widest transition-colors rounded ${tab === t.id ? "text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="admin-tab-pill"
                      className="absolute inset-0 bg-white/10 rounded"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
>>>>>>> origin/PushFinalBukanPunyaRei
                  <span className="relative z-10">{t.label}</span>
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                <SectionTitle>{TABS.find((t) => t.id === tab)?.label}</SectionTitle>
                {tab === "events" && <EventsPanel initialEvents={data.events} onRefresh={loadAll} />}
                {tab === "registrations" && <RegistrationsPanel initialRegs={data.regs} onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "products" && <ProductsPanel onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "bookings" && <BookingsPanel onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "earnings" && <EarningsPanel data={data.earnings} />}
                {tab === "users" && <UsersPanel initialUsers={data.users} onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "comments" && <CommentsPanel onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
              </motion.div>
            </AnimatePresence>
          </div>
<<<<<<< HEAD
          <div className="hidden lg:block relative z-10">
            <div className="border border-white/10 bg-black/20 flex flex-col p-[2px] backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
              <SystemLog registrations={data.regs} products={data.products} /><SystemHealth />
            </div>
          </div>
=======
>>>>>>> origin/PushFinalBukanPunyaRei
        </div>
      </div>

      {/* ─── FLOATING COMPONENTS ────────────────────────────────────────────────── */}

      {/* Audit Log Chatbox (Left-Top Floating) */}
      <div className="fixed left-6 top-24 z-[100] pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          {/* Chat Icon / Toggle */}
          <button
            onClick={() => {
              const next = !isChatRetracted;
              setIsChatRetracted(next);
              if (!next) {
                setUnreadCount(0);
                setIsChatFaded(false);
                setLastActivity(Date.now());
              }
            }}
            className={`w-12 h-12 rounded-full border border-white/20 bg-black/40 backdrop-blur-xl flex items-center justify-center text-white shadow-2xl transition-all relative ${
              showPulse ? "animate-pulse scale-110 border-emerald-500 shadow-emerald-500/20" : "hover:scale-110"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            
            {/* Unread Badge (Only when retracted) */}
            {isChatRetracted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#050a14]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Actual Chatbox */}
          <AnimatePresence>
            {!isChatRetracted && (
              <div
                className="pointer-events-auto"
                onMouseEnter={() => {
                  setIsChatFaded(false);
                  setLastActivity(Date.now());
                }}
                onMouseLeave={() => setLastActivity(Date.now())}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ 
                    opacity: isChatFaded ? 0 : 1, 
                    x: 0, 
                    scale: 1,
                  }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  className="w-80 max-h-[400px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 overflow-hidden transition-opacity duration-700"
                  style={{ pointerEvents: isChatFaded ? 'none' : 'auto' }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Audit Log Feed</span>
                    <button onClick={() => {
                      const text = logs.map(l => `[${new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${l.adminEmail}: ${l.action}`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert("Logs copied to clipboard!");
                    }} className="text-[9px] text-slate-500 hover:text-white uppercase font-bold">Copy Log</button>
                  </div>
                  
                  <div 
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide flex flex-col"
                  >
                    <div className="mt-auto" /> {/* Push content to bottom */}
                    {logs.length === 0 ? (
                      <div className="text-[10px] text-slate-600 italic text-center py-4">Waiting for activity...</div>
                    ) : logs.slice().reverse().map((log) => (
                      <div key={log.id} className="group animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[8px] font-mono text-slate-500">[{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                          <span className="text-[9px] font-black text-emerald-500/80 truncate max-w-[120px]">{log.adminEmail}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-medium leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5 group-hover:border-white/20 transition-all">
                          {log.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* JIT Reset Modal — rendered at root level, above everything */}
      {showResetModal && (
        <JITResetModal
          onClose={() => setShowResetModal(false)}
          onConfirm={handleResetSuccess}
        />
      )}

      {/* System Toast */}
      {systemToast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[600] px-8 py-4 rounded-2xl font-mono font-black text-sm uppercase tracking-widest shadow-2xl transition-all ${
          systemToast.type === 'success'
            ? 'bg-emerald-600 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)]'
            : 'bg-red-600 text-white shadow-[0_0_40px_rgba(220,38,38,0.5)]'
        }`}>
          {systemToast.msg}
        </div>
      )}

      {/* Control Drawer (Right-Side Slider) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-80 md:w-96 bg-[#050a14] border-l border-white/10 z-[201] shadow-2xl p-8 flex flex-col gap-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">System Center</h2>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"
                >
                  <XIcon />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                <SystemHealth />
                
                <div className="space-y-4">
                  <span className={LABEL}>Quick Actions (JIT Required)</span>
                  <button
                    onClick={() => { setIsDrawerOpen(false); handleResetSuccess && setShowResetModal(true); }}
                    className="w-full py-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                    Reset System Database
                  </button>
                  <button
                    onClick={exportLogs}
                    disabled={isExportingLogs}
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50">
                    {isExportingLogs ? 'Exporting...' : 'Export All Audit Logs (.csv)'}
                  </button>
                </div>
                
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className={LABEL}>Active Admins</span>
                  <div className="space-y-2 mt-3">
                    {["Reinathan", "Josh", "Coki", "Otniel"].map(name => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-300">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 text-[9px] text-slate-600 font-mono text-center">
                Kalceria Admin Engine v2.0.4-LTS
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
