"use client";

import { useState, useRef } from "react";

export default function AuthField({
  id,
  label,
  type = "text",
  placeholder,
  options = [],
  val = "",
  onChange,
  disabled = false,
  required = false,
  isValid = false,
  hasError = false,
  validationMessage = "",
  maxLength,
  max,
  list,
  autoComplete
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const isSelect = type === "select";
  const isPhone = type === "tel";

  // Dynamic border coloring based on validation state
  const borderClass = isValid
    ? "border-emerald-400 ring-1 ring-emerald-400/40 bg-[#0c1528] shadow-[0_0_12px_rgba(52,211,153,0.15)]"
    : hasError
    ? "border-amber-400/80 ring-1 ring-amber-400/30 bg-[#0c1528]"
    : focused
    ? "border-slate-400 shadow-[0_0_0_2px_rgba(100,116,139,0.2)] bg-[#0c1528]"
    : "border-slate-800 hover:border-slate-700 bg-[#0c1528]";

  const handleChange = (event) => {
    const value = type === "file" ? event.target.files[0] : event.target.value;
    onChange(id, value);
  };

  // Phone input handler matching Need Our Help form behavior
  const phoneDigits = isPhone
    ? String(val || "").replace(/^\+?62/, "")
    : "";

  const handlePhoneInput = (e) => {
    let raw = e.target.value || "";
    // Allow digits only
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("62")) {
      digits = digits.slice(2);
    }
    // If user starts with 0 and enters subsequent digits, strip leading 0s (e.g. 0812 -> 812)
    if (/^0+[1-9]/.test(digits)) {
      digits = digits.replace(/^0+/, "");
    } else if (/^0+$/.test(digits)) {
      // Keystroke feedback if user just typed 0
      digits = "0";
    }
    digits = digits.slice(0, 12);

    const nextVal = digits ? `+62${digits}` : "";
    onChange(id, nextVal);
  };

  return (
    <div className="flex flex-col mb-4">
      {/* Label: NOT ALL CAPITAL with red asterisk for required fields */}
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center justify-between font-sans text-xs font-semibold text-slate-300 tracking-normal select-none cursor-pointer"
      >
        <span>
          {label}
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </span>
        {validationMessage && (
          <span
            className={`text-[10px] font-medium transition-colors ${
              isValid ? "text-emerald-400" : hasError ? "text-amber-400" : "text-slate-400"
            }`}
          >
            {validationMessage}
          </span>
        )}
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
          id={id}
          value={val}
          onChange={handleChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full border rounded-md px-3 py-2.5 font-sans text-[13px] ${
            disabled ? "text-slate-600 cursor-not-allowed opacity-70" : "text-white"
          } outline-none transition-all ${borderClass}`}
        >
          <option value="" className="bg-neutral-900 text-white">
            {placeholder || "Select…"}
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-neutral-900 text-white">
              {option}
            </option>
          ))}
        </select>
      ) : isPhone ? (
        /* Phone input with clickable +62 badge and wrapper */
        <div
          onClick={() => !disabled && inputRef.current?.focus()}
          className={`flex items-center w-full border rounded-md overflow-hidden bg-[#0c1528] transition-all ${
            disabled ? "cursor-not-allowed opacity-70" : "cursor-text"
          } ${borderClass}`}
        >
          <div
            onClick={() => !disabled && inputRef.current?.focus()}
            className={`flex items-center pl-3.5 pr-2.5 py-2.5 text-slate-300 font-sans font-bold text-[13px] select-none border-r border-slate-800 bg-[#0c1528] shrink-0 ${
              disabled ? "cursor-not-allowed" : "cursor-text"
            }`}
          >
            +62
          </div>
          <input
            ref={inputRef}
            id={id}
            type="tel"
            inputMode="numeric"
            placeholder={placeholder || "81234567890"}
            value={phoneDigits}
            maxLength={15}
            autoComplete="tel"
            onChange={handlePhoneInput}
            disabled={disabled}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-[#0c1528] px-3 py-2.5 font-sans text-[13px] text-white outline-none placeholder:text-slate-600 autofill-dark"
          />
        </div>
      ) : (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={type === "file" ? undefined : val}
          onChange={handleChange}
          disabled={disabled}
          maxLength={maxLength}
          max={max}
          list={list}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete || (type === "password" ? "current-password" : "off")}
          className={`w-full border rounded-md px-3 py-2.5 font-sans text-[13px] text-white bg-[#0c1528] outline-none transition-all placeholder:text-slate-600 autofill-dark ${
            disabled ? "cursor-not-allowed opacity-70 placeholder:text-slate-600" : ""
          } ${borderClass}`}
        />
      )}
    </div>
  );
}
