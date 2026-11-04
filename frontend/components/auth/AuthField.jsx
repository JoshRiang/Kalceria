"use client";

import { useState, useRef, useEffect } from "react";
import RecommendedPasswordPopup from "@/components/auth/RecommendedPasswordPopup";

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
  autoComplete,
  recommendedPassword = "",
  showPasswordRecommendation = false,
  onAcceptRecommendation,
  onDismissRecommendation,
  onPasswordFocus,
  onPasswordBlur,
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);
  const passwordBoxRef = useRef(null);
  const isSelect = type === "select";
  const isPhone = type === "tel";
  const isPassword = type === "password";

  // Keep password strictly hidden with eye closed when recommended password popup is active
  useEffect(() => {
    if (showPasswordRecommendation) {
      setShowPassword(false);
    }
  }, [showPasswordRecommendation]);

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

  // Phone input handler
  const phoneDigits = isPhone ? String(val || "").replace(/^\+?62/, "") : "";

  const handlePhoneInput = (e) => {
    let raw = e.target.value || "";
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("62")) {
      digits = digits.slice(2);
    }
    if (/^0+[1-9]/.test(digits)) {
      digits = digits.replace(/^0+/, "");
    } else if (/^0+$/.test(digits)) {
      digits = "0";
    }
    digits = digits.slice(0, 12);

    const nextVal = digits ? `+62${digits}` : "";
    onChange(id, nextVal);
  };

  const computedInputType = isPassword
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className="flex flex-col mb-4">
      {/* Label: Normal casing with red asterisk for required fields */}
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
              isValid
                ? "text-emerald-400"
                : hasError
                ? "text-amber-400"
                : "text-slate-400"
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
      ) : isPassword ? (
        /* Password input with 2D Eye toggle referenced from Map Page */
        <div
          ref={passwordBoxRef}
          className={`flex items-center w-full border rounded-md overflow-hidden bg-[#0c1528] transition-all ${borderClass}`}
        >
          <input
            ref={inputRef}
            id={id}
            type={computedInputType}
            placeholder={placeholder}
            value={val}
            onChange={handleChange}
            disabled={disabled}
            onFocus={() => {
              setFocused(true);
              onPasswordFocus?.();
            }}
            onBlur={() => {
              setFocused(false);
              onPasswordBlur?.();
            }}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            autoComplete={autoComplete || "current-password"}
            className="w-full bg-[#0c1528] px-3 py-2.5 font-sans text-[13px] text-white outline-none placeholder:text-slate-600 autofill-dark"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
            className="px-3 py-2 text-slate-400 hover:text-white transition-opacity select-none cursor-pointer flex items-center justify-center shrink-0 focus:outline-none"
          >
            {showPassword ? (
              /* Eye Open (Matching MapHeaderHud) */
              <svg width="20" height="20" viewBox="0 0 24 24" className="w-4 h-4">
                <path
                  d="M 2 12 C 5 5 19 5 22 12 C 19 19 5 19 2 12 Z"
                  fill="#ffffff"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="5.2" fill="#000000" />
                <circle cx="12" cy="12" r="3.2" fill="#ffffff" />
                <circle cx="10.5" cy="10.5" r="1.15" fill="#000000" />
              </svg>
            ) : (
              /* Eye Shut with lashes (Matching MapHeaderHud) */
              <svg width="20" height="20" viewBox="0 0 24 24" className="w-4 h-4">
                <path
                  d="M 3 11.5 C 6.5 17 17.5 17 21 11.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 5.5 14.2 L 4 17.5 M 9.5 15.8 L 9 19.5 M 14.5 15.8 L 15 19.5 M 18.5 14.2 L 20 17.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          <RecommendedPasswordPopup
            open={Boolean(showPasswordRecommendation && recommendedPassword && !disabled)}
            anchorRef={passwordBoxRef}
            recommendedPassword={recommendedPassword}
            onAccept={(pwd) => {
              onAcceptRecommendation?.(pwd);
            }}
            onDismiss={() => {
              onDismissRecommendation?.();
              inputRef.current?.focus();
            }}
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
          autoComplete={autoComplete || "off"}
          className={`w-full border rounded-md px-3 py-2.5 font-sans text-[13px] text-white bg-[#0c1528] outline-none transition-all placeholder:text-slate-600 autofill-dark ${
            disabled ? "cursor-not-allowed opacity-70 placeholder:text-slate-600" : ""
          } ${borderClass}`}
        />
      )}
    </div>
  );
}
