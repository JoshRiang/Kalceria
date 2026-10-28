"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const DARK = "bg-[#050a14]";

export const CARD = "bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] font-mono font-black tracking-tighter";

export const LABEL = "font-mono font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 block";

export const INPUT = "w-full bg-white/5 border border-white/10 rounded-xl px-6 h-14 font-sans font-medium text-sm text-white focus:outline-none focus:border-[#FF00FF]/50 transition-all placeholder:text-slate-600 backdrop-blur-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const BTN_PRIMARY = "px-4 py-2 bg-white text-black font-extrabold text-xs uppercase tracking-wider rounded hover:bg-slate-200 transition-colors disabled:opacity-40";

export const CheckIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>;

export const TrashIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

export const XIcon = () => <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>;

export function LocalBlob({ color }) {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden rounded-3xl">
      <div className={`absolute top-[-20%] left-[-20%] w-[120%] h-[120%] ${color} blur-[40px] animate-pulse`} />
    </div>
  );
}

export const CLIP_BTN = { clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" };

export function Badge({ label }) {
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

export function formatRp(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function HoverTypewriter({ text, speed = 40, hover }) {
  const [displayed, setDisplayed] = useState(text);

  useEffect(() => {
    let t;
    if (hover) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting on hover preserves the current typewriter restart frame.
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

export function DynamicBlobs() {
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

export function StatCard({ label, value }) {
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

export function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="font-mono font-black text-xl uppercase tracking-tighter text-white">{children}</h2>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

export function ExpandableSearch({ value, onChange, placeholder = "Search..." }) {
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
