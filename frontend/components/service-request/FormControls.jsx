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

export function Field({ label, type, placeholder, options, val, onChange, id, required = false, maxLength }) {
  const [focused, setFocused] = useState(false);
  const isSelect = type === "select";
  const isTextarea = type === "textarea";
  const isPhone = type === "tel" || id === "whatsapp";

  const baseClasses = `
    w-full bg-black/60 border rounded-xl px-4 py-3 
    font-sans text-xs sm:text-sm text-white font-medium outline-none transition-all duration-300 placeholder:text-white/40
    ${focused ? "border-white ring-1 ring-white/50 bg-black/80 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "border-white/20 hover:border-white/40 bg-black/50"}
  `;

  // Indonesian +62 template: user fills number after +62
  const phoneDigits = isPhone 
    ? (val || "").replace(/^\+?62/, "").replace(/\D/g, "")
    : "";

  const handlePhoneInput = (e) => {
    let raw = e.target.value || "";
    // Strip redundant +62 or 62 if typed or pasted
    raw = raw.replace(/^\+?62/, "");
    // Automatically strip leading 0 (e.g., 0812 -> 812)
    raw = raw.replace(/^0+/, "");
    // Filter to only digits
    const digits = raw.replace(/\D/g, "");
    if (digits) {
      onChange(id, `+62${digits}`);
    } else {
      onChange(id, "");
    }
  };

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-1.5 font-sans text-xs font-bold text-white tracking-wide flex items-center justify-between">
        <span>{label}</span>
        {maxLength ? (
          <span className="text-[10px] text-white/50 font-normal">
            {(val || "").length}/{maxLength}
          </span>
        ) : null}
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
          <option value="" className="bg-neutral-900 text-white">Select Option…</option>
          {options.map((o) => (
            <option key={o.id || o} value={o.id || o} className="bg-neutral-900 text-white">
              {o.label || o}
            </option>
          ))}
        </select>
      ) : isTextarea ? (
        <textarea 
          rows={3} 
          placeholder={placeholder} 
          value={val} 
          maxLength={maxLength}
          onChange={(e) => onChange(id, e.target.value)} 
          onFocus={() => setFocused(true)} 
          onBlur={() => setFocused(false)} 
          className={baseClasses} 
          required={required}
        />
      ) : isPhone ? (
        <div className={`flex items-center w-full bg-black/60 border rounded-xl overflow-hidden transition-all duration-300 ${
          focused ? "border-white ring-1 ring-white/50 bg-black/80 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "border-white/20 hover:border-white/40 bg-black/50"
        }`}>
          <div className="flex items-center pl-3.5 pr-2.5 py-3 text-white font-sans font-bold text-xs sm:text-sm select-none border-r border-white/15 bg-white/[0.04] shrink-0">
            +62
          </div>
          <input 
            type="tel"
            inputMode="numeric"
            placeholder={placeholder || "812-3456-7890"}
            value={phoneDigits}
            maxLength={14}
            onChange={handlePhoneInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-3.5 py-3 font-sans text-xs sm:text-sm text-white font-medium outline-none placeholder:text-white/30"
            required={required}
          />
        </div>
      ) : (
        <input 
          type={type} 
          placeholder={placeholder} 
          value={val} 
          maxLength={maxLength}
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
