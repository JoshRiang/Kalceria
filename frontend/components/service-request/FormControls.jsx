"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export function StepIndicator({ total, current }) {
  return (
    <div className="flex items-center gap-2.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black font-sans transition-all duration-500 border ${
            i < current ? "bg-[#FF00FF] border-[#FF00FF] text-white shadow-[0_0_12px_rgba(255,0,255,0.4)]" :
            i === current ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]" :
            "bg-white/5 backdrop-blur-md border-white/5 text-white/30"
          }`}>
            {i + 1}
          </div>
          {i < total - 1 && (
            <div className="relative h-[1.5px] w-6 bg-white/5 backdrop-blur-sm overflow-hidden rounded-full">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: i < current ? "0%" : "-100%" }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-[#FF00FF] to-[#FACC15]"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Field({ label, type, placeholder, options, val, onChange, id, required = false }) {
  const [focused, setFocused] = useState(false);
  const isSelect = type === "select";
  const isTextarea = type === "textarea";

  const baseClasses = `
    w-full bg-[#0c1528]/50 border rounded-xl px-4 py-3 
    font-sans text-[12px] text-white outline-none transition-all duration-300 placeholder:text-slate-600
    ${focused ? "border-[#FF00FF] shadow-[0_0_15px_rgba(255,0,255,0.15)] bg-[#0f1a30]" : "border-slate-800/50 hover:border-slate-700 bg-[#0c1528]/30"}
  `;

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-1.5 font-sans text-[11px] font-bold text-slate-400 flex items-center gap-1">
        {label}
      </label>
      {isSelect ? (
        <select 
          value={val} 
          onChange={(e) => onChange(id, e.target.value)} 
          onFocus={() => setFocused(true)} 
          onBlur={() => setFocused(false)} 
          className={baseClasses}
          required={required}
        >
          <option value="">Select Option…</option>
          {options.map((o) => <option key={o.id || o} value={o.id || o}>{o.label || o}</option>)}
        </select>
      ) : isTextarea ? (
        <textarea 
          rows={3} 
          placeholder={placeholder} 
          value={val} 
          onChange={(e) => onChange(id, e.target.value)} 
          onFocus={() => setFocused(true)} 
          onBlur={() => setFocused(false)} 
          className={baseClasses} 
          required={required}
        />
      ) : (
        <input 
          type={type} 
          placeholder={placeholder} 
          value={val} 
          onChange={(e) => onChange(id, e.target.value)} 
          onFocus={() => setFocused(true)} 
          onBlur={() => setFocused(false)} 
          className={baseClasses} 
          required={required} 
        />
      )}
    </div>
  );
}
