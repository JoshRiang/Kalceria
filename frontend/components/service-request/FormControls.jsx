"use client";
import { useState } from "react";
import { motion } from "framer-motion";

// Official Indonesian cellular operator prefixes (Telkomsel, Indosat, XL, Axis, Tri, Smartfren)
const ID_MOBILE_REGEX = /^8(?:1[1-9]|2[1-3]|3[1238]|5[1-35-9]|7[78]|8[1-9]|9[5-9])\d{6,10}$/;
// Rejects 7+ identical consecutive digits (e.g., 8111111111 or 8888888888)
const REPEATING_DIGITS_REGEX = /(\d)\1{6,}/;
// Strict RFC-compliant Email regex (blocks disposable/malformed TLD typos)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
// Telegram / Instagram / Social handle regex
const HANDLE_REGEX = /^@?[a-zA-Z0-9._]{3,32}$/;

export function validateCommsValue(type, id, rawVal) {
  const val = String(rawVal || "").trim();
  const fieldId = String(id || "").toLowerCase();
  const isPhone =
    type === "tel" ||
    fieldId.includes("whatsapp") ||
    fieldId.includes("phone") ||
    fieldId.includes("wa") ||
    fieldId.includes("telepon") ||
    fieldId.includes("hp");
  const isEmail = type === "email" || fieldId.includes("email");
  const isHandle =
    fieldId.includes("telegram") ||
    fieldId.includes("instagram") ||
    fieldId.includes("discord") ||
    fieldId.includes("handle");

  if (!val) {
    return { valid: false, empty: true, message: "" };
  }

  if (isPhone) {
    const digits = val.replace(/^\+?62/, "").replace(/^0+/, "").replace(/\D/g, "");
    if (!digits.startsWith("8")) {
      return { valid: false, empty: false, message: "Must start with 8 (e.g. 812xxxx)" };
    }
    if (digits.length < 9) {
      return { valid: false, empty: false, message: `Need at least ${9 - digits.length} more digit(s)` };
    }
    if (digits.length > 12) {
      return { valid: false, empty: false, message: "Maximum 12 digits after +62" };
    }
    if (!ID_MOBILE_REGEX.test(digits)) {
      return { valid: false, empty: false, message: `Invalid Indonesian operator prefix (0${digits.slice(0, 3)})` };
    }
    if (REPEATING_DIGITS_REGEX.test(digits)) {
      return { valid: false, empty: false, message: "Please enter a real active mobile number" };
    }
    return { valid: true, empty: false, message: `+62 ${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` };
  }

  if (isEmail) {
    if (!EMAIL_REGEX.test(val)) {
      return { valid: false, empty: false, message: "Enter a valid email (e.g. name@domain.com)" };
    }
    return { valid: true, empty: false, message: "Valid" };
  }

  if (isHandle) {
    if (!HANDLE_REGEX.test(val)) {
      return { valid: false, empty: false, message: "Enter a valid username (3-32 chars)" };
    }
    return { valid: true, empty: false, message: "Valid handle" };
  }

  return { valid: true, empty: false, message: "" };
}

export function StepIndicator({ total, current }) {
  return (
    <div className="flex items-center gap-2.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black font-sans transition-all duration-500 border ${
              i < current
                ? "bg-[#FF00FF] border-[#FF00FF] text-white shadow-[0_0_12px_rgba(255,0,255,0.4)]"
                : i === current
                ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                : "bg-white/5 backdrop-blur-md border-white/5 text-white/30"
            }`}
          >
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

export function Field({
  label,
  type = "text",
  placeholder,
  options = [],
  val = "",
  onChange,
  id,
  required = false,
  maxLength,
}) {
  const [focused, setFocused] = useState(false);
  const safeVal = val ?? "";
  const fieldId = String(id || "").toLowerCase();

  const isSelect = type === "select";
  const isTextarea = type === "textarea";
  const isPhone =
    type === "tel" ||
    fieldId.includes("whatsapp") ||
    fieldId.includes("phone") ||
    fieldId.includes("wa") ||
    fieldId.includes("telepon") ||
    fieldId.includes("hp");
  const isEmail = type === "email" || fieldId.includes("email");
  const isHandle =
    fieldId.includes("telegram") ||
    fieldId.includes("instagram") ||
    fieldId.includes("discord") ||
    fieldId.includes("handle");
  const isCommsField = isPhone || isEmail || isHandle;

  const validation = isCommsField
    ? validateCommsValue(type, id, safeVal)
    : { valid: true, empty: !safeVal, message: "" };

  const hasError = isCommsField && !validation.empty && !validation.valid;
  const isVerified = isCommsField && !validation.empty && validation.valid;

  const borderStateClass = hasError
    ? "border-amber-400/80 ring-1 ring-amber-400/30 bg-black/80"
    : isVerified && focused
    ? "border-emerald-400 ring-1 ring-emerald-400/40 bg-black/80"
    : focused
    ? "border-white ring-1 ring-white/50 bg-black/80 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    : "border-white/20 hover:border-white/40 bg-black/50";

  const baseClasses = `
    w-full bg-black/60 border rounded-xl px-4 py-3 
    font-sans text-xs sm:text-sm text-white font-medium outline-none transition-all duration-300 placeholder:text-white/40
    ${borderStateClass}
  `;

  // Extract digits after +62 for display in the phone input
  const phoneDigits = isPhone
    ? String(safeVal).replace(/^\+?62/, "").replace(/\D/g, "")
    : "";

  const handlePhoneInput = (e) => {
    // 1. Strip all non-digits FIRST so pasted "+62 812-3456-7890" or "(0812) 3456 7890" normalizes cleanly
    let digits = (e.target.value || "").replace(/\D/g, "");

    // 2. Strip leading "62" or "0" if the user pasted a full national/international number
    if (digits.startsWith("62")) {
      digits = digits.slice(2);
    }
    digits = digits.replace(/^0+/, "");

    // 3. Cap at 12 digits after +62 (do NOT set a tight maxLength on the DOM input or pastes get cut off!)
    digits = digits.slice(0, 12);

    const nextVal = digits ? `+62${digits}` : "";
    onChange(id, nextVal);

    // 4. Sync native HTML5 validity so form submission is blocked if invalid
    const check = validateCommsValue("tel", id, nextVal);
    e.target.setCustomValidity(!check.empty && !check.valid ? check.message : "");
  };

  const handleStandardInput = (e) => {
    const nextVal = e.target.value;
    onChange(id, nextVal);
    if (isCommsField) {
      const check = validateCommsValue(type, id, nextVal);
      e.target.setCustomValidity(!check.empty && !check.valid ? check.message : "");
    }
  };

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-1.5 font-sans text-xs font-bold text-white tracking-wide flex items-center justify-between">
        <span>{label}</span>
        {isCommsField ? (
          !validation.empty ? (
            <span
              className={`text-[10px] font-medium ${
                isVerified
                  ? "text-emerald-400"
                  : hasError
                  ? "text-amber-400"
                  : "text-white/50"
              }`}
            >
              {validation.message}
            </span>
          ) : null
        ) : maxLength ? (
          <span className="text-[10px] text-white/50 font-normal">
            {String(safeVal).length}/{maxLength}
          </span>
        ) : null}
      </label>

      {isSelect ? (
        <select
          value={safeVal}
          onChange={(e) => onChange(id, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={baseClasses}
          required={required}
        >
          <option value="" className="bg-neutral-900 text-white">
            Select Option…
          </option>
          {options.map((o) => (
            <option
              key={o.id || o}
              value={o.id || o}
              className="bg-neutral-900 text-white"
            >
              {o.label || o}
            </option>
          ))}
        </select>
      ) : isTextarea ? (
        <textarea
          rows={3}
          placeholder={placeholder}
          value={safeVal}
          maxLength={maxLength}
          onChange={(e) => onChange(id, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={baseClasses}
          required={required}
        />
      ) : isPhone ? (
        <div className="flex flex-col gap-1">
          <div
            className={`flex items-center w-full bg-black/60 border rounded-xl overflow-hidden transition-all duration-300 ${borderStateClass}`}
          >
            <div className="flex items-center pl-3.5 pr-2.5 py-3 text-white font-sans font-bold text-xs sm:text-sm select-none border-r border-white/15 bg-white/[0.04] shrink-0">
              +62
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder={placeholder || "81234567890"}
              value={phoneDigits}
              // Allow up to 20 chars during paste so "+62 812-3456-7890" isn't truncated before handlePhoneInput cleans it
              maxLength={20}
              onChange={handlePhoneInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full bg-transparent px-3.5 py-3 font-sans text-xs sm:text-sm text-white font-medium outline-none placeholder:text-white/30"
              required={required}
              aria-invalid={hasError}
            />
          </div>
          {hasError && (
            <span className="text-[10px] text-amber-400 font-sans">
              {validation.message}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <input
            type={type}
            placeholder={placeholder}
            value={safeVal}
            maxLength={maxLength}
            onChange={handleStandardInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={baseClasses}
            required={required}
            aria-invalid={hasError}
          />
          {hasError && (
            <span className="text-[10px] text-amber-400 font-sans">
              {validation.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
