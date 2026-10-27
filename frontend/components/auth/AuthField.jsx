"use client";

import { useState } from "react";

export default function AuthField({
  id,
  label,
  type,
  placeholder,
  options = [],
  val,
  onChange,
  disabled = false,
}) {
  const [focused, setFocused] = useState(false);
  const isSelect = type === "select";
  const focusClass = focused
    ? "border-slate-500 shadow-[0_0_0_2px_rgba(100,116,139,0.1)]"
    : "border-slate-800";

  const handleChange = (event) => {
    const value = type === "file" ? event.target.files[0] : event.target.value;
    onChange(id, value);
  };

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-1.5 font-sans text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      {disabled && (type === "date" || type === "file") ? (
        <div
          id={id}
          aria-disabled="true"
          className="w-full bg-[#0c1528] border border-slate-800 rounded-md px-3 py-2.5 font-sans text-[13px] text-slate-600 cursor-not-allowed"
        >
          {placeholder}
        </div>
      ) : isSelect ? (
        <select
          value={val}
          onChange={handleChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full bg-[#0c1528] border rounded-md px-3 py-2.5 font-sans text-[13px] ${disabled ? "text-slate-600 cursor-not-allowed opacity-70" : "text-white"} outline-none transition-all ${focusClass}`}
        >
          <option value="">{placeholder || "Select…"}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={type === "file" ? undefined : val}
          onChange={handleChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={type === "password" ? "current-password" : "off"}
          className={`w-full bg-[#0c1528] border rounded-md px-3 py-2.5 font-sans text-[13px] text-white outline-none transition-all placeholder:text-slate-600 ${type === "file" ? "file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600" : ""} ${disabled ? "cursor-not-allowed opacity-70 placeholder:text-slate-600" : ""} ${focusClass}`}
        />
      )}
    </div>
  );
}
