"use client";

import { useState, useEffect, useRef } from "react";
import AuthField from "@/components/auth/AuthField";
import { INDONESIAN_CITIES } from "@/lib/indonesianCities";
import {
  generateClientStrongPassword,
  fetchRecommendedPassword,
} from "@/components/auth/passwordAlgorithm";

export default function RegisterForm({
  form,
  setField,
  isActive = true,
  PUBLIC_SIGNUP_ENABLED,
  // Validation flags
  nameValid,
  isDobValid,
  isDobError,
  dobMessage,
  cityValid,
  isCityError,
  isEmailValid,
  isEmailError,
  passwordValid,
  isPasswordError,
  isConfirmValid,
  isConfirmError,
  confirmMessage,
  // Profile photo props
  croppedAvatar,
  setCroppedAvatar,
  photoError,
  setPhotoError,
  handlePhotoSelect,
}) {
  const [initialPassword] = useState(() => generateClientStrongPassword());
  const [recommendedPassword, setRecommendedPassword] = useState(initialPassword);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  // Auto-fill the first password input box strictly when RegisterForm is active
  useEffect(() => {
    if (!isActive) return;
    if (PUBLIC_SIGNUP_ENABLED && !recommendationDismissed && !form.password) {
      setField("password", initialPassword);
      setShowRecommendation(true);
    }
  }, [isActive, PUBLIC_SIGNUP_ENABLED, initialPassword, recommendationDismissed, form.password, setField]);

  useEffect(() => {
    if (!isActive) return;
    let active = true;
    fetchRecommendedPassword({ email: form.email || "" }).then((pwd) => {
      if (active && isActiveRef.current && pwd) {
        setRecommendedPassword(pwd);
        // Automatically sync initial auto-fill if user hasn't typed their own yet
        if (!recommendationDismissed && (!form.password || form.password === initialPassword)) {
          setField("password", pwd);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [isActive, form.email, initialPassword, recommendationDismissed, form.password, setField]);

  const handlePasswordChange = (id, value) => {
    setField(id, value);
    if (!value) {
      setRecommendationDismissed(false);
    } else if (value !== recommendedPassword) {
      // User typed their own password manually
      setRecommendationDismissed(true);
      setShowRecommendation(false);
    }
  };

  const handleAcceptRecommendedPassword = (pwd) => {
    const chosen = pwd || recommendedPassword;
    setField("password", chosen);
    setField("confirmPassword", chosen);
    setShowRecommendation(false);
    setRecommendationDismissed(true);
  };

  const handleDismissRecommendedPassword = () => {
    setField("password", "");
    setField("confirmPassword", "");
    setShowRecommendation(false);
    setRecommendationDismissed(true);
  };

  return (
    <>
      {/* 1. Full Name * */}
      <AuthField
        id="name"
        label="Full Name"
        type="text"
        placeholder={PUBLIC_SIGNUP_ENABLED ? "John Doe" : "Not Ready Yet"}
        val={form.name || ""}
        onChange={setField}
        required={true}
        isValid={nameValid}
        disabled={!PUBLIC_SIGNUP_ENABLED}
      />

      {/* 2. Profile Photo (No asterisk, optional) */}
      <div className="flex flex-col mb-4">
        <div className="mb-1.5 flex items-center justify-between font-sans text-xs font-semibold text-slate-300 select-none">
          <span>Profile Photo</span>
          {photoError && (
            <span className="text-[10px] font-medium text-amber-400">{photoError}</span>
          )}
        </div>
        <div
          className={`flex items-center justify-between w-full border rounded-md px-3 py-2 transition-all bg-[#0c1528] ${
            croppedAvatar
              ? "border-emerald-400 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
              : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {croppedAvatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={croppedAvatar}
                alt="Profile preview"
                className="w-6 h-6 rounded-full object-cover border border-emerald-400/70 shrink-0"
              />
            )}
            <span
              className={`text-[13px] font-sans truncate ${
                croppedAvatar ? "text-emerald-300 font-medium" : "text-slate-400"
              }`}
            >
              {croppedAvatar ? "Photo chosen & cropped" : "No file chosen"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs font-bold py-1.5 px-3 rounded transition-colors inline-block select-none">
              {croppedAvatar ? "Change File" : "Choose File"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={!PUBLIC_SIGNUP_ENABLED}
              />
            </label>
            {croppedAvatar && (
              <button
                type="button"
                onClick={() => {
                  setCroppedAvatar(null);
                  setPhotoError("");
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium cursor-pointer py-1 px-1.5"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Born In * (Year Only) & City * */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <AuthField
          id="dob"
          label="Born In"
          type="text"
          maxLength={4}
          placeholder={PUBLIC_SIGNUP_ENABLED ? "YYYY (e.g. 2004)" : "Not Ready Yet"}
          val={form.dob || ""}
          onChange={setField}
          required={true}
          isValid={isDobValid}
          hasError={isDobError}
          validationMessage={dobMessage}
          disabled={!PUBLIC_SIGNUP_ENABLED}
        />
        <AuthField
          id="domicile"
          label="City"
          type="text"
          placeholder={PUBLIC_SIGNUP_ENABLED ? "e.g. Jakarta, Bandung" : "Not Ready Yet"}
          val={form.domicile || ""}
          onChange={setField}
          required={true}
          list="indonesia-cities"
          isValid={cityValid}
          hasError={isCityError}
          validationMessage={isCityError ? "City is not in the list" : ""}
          disabled={!PUBLIC_SIGNUP_ENABLED}
        />
      </div>

      {/* Autocomplete cities list */}
      <datalist id="indonesia-cities">
        {INDONESIAN_CITIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* 4. Email Address * */}
      <AuthField
        id="email"
        label="Email Address"
        type="email"
        placeholder={PUBLIC_SIGNUP_ENABLED ? "user@domain.com" : "Not Ready Yet"}
        val={form.email || ""}
        onChange={setField}
        required={true}
        isValid={isEmailValid}
        hasError={isEmailError}
        validationMessage={isEmailError ? "Enter a valid email" : isEmailValid ? "Valid" : ""}
        disabled={!PUBLIC_SIGNUP_ENABLED}
      />

      {/* 5. Password * (With 2D Eye toggle & Natural Strong Password Recommendation) */}
      <AuthField
        id="password"
        inputId="register-password"
        label="Password"
        type="password"
        placeholder={PUBLIC_SIGNUP_ENABLED ? "••••••••" : "Not Ready Yet"}
        val={form.password || ""}
        onChange={handlePasswordChange}
        required={true}
        isValid={passwordValid}
        hasError={isPasswordError}
        disabled={!PUBLIC_SIGNUP_ENABLED}
        autoComplete="new-password"
        recommendedPassword={recommendedPassword}
        showPasswordRecommendation={
          showRecommendation && !recommendationDismissed && PUBLIC_SIGNUP_ENABLED
        }
        onPasswordFocus={() => {
          if (!recommendationDismissed) {
            setShowRecommendation(true);
          }
        }}
        onPasswordBlur={() => {
          setShowRecommendation(false);
        }}
        onAcceptRecommendation={handleAcceptRecommendedPassword}
        onDismissRecommendation={handleDismissRecommendedPassword}
      />

      {/* Password Requirements (4 tiny boxes turn green when met, NO checkmark icon) */}
      <div className="mb-4 -mt-1 grid grid-cols-2 gap-2 text-xs font-sans tracking-wide">
        {[
          { label: "Min 8 Chars", met: (form.password || "").length >= 8 },
          { label: "1 Uppercase", met: /[A-Z]/.test(form.password || "") },
          { label: "1 Number", met: /[0-9]/.test(form.password || "") },
          { label: "1 Special Char", met: /[^A-Za-z0-9]/.test(form.password || "") },
        ].map((req, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 transition-colors ${
              req.met ? "text-green-300" : "text-slate-500"
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-[3px] border transition-all duration-200 ${
                req.met
                  ? "bg-emerald-400 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                  : "border-slate-700 bg-[#0c1528]"
              }`}
            />
            <span>{req.label}</span>
          </div>
        ))}
      </div>

      {/* 6. Confirm Password * (Below password with 2D Eye toggle) */}
      <AuthField
        id="confirmPassword"
        inputId="register-confirm-password"
        label="Confirm Password"
        type="password"
        placeholder={PUBLIC_SIGNUP_ENABLED ? "••••••••" : "Not Ready Yet"}
        val={form.confirmPassword || ""}
        onChange={setField}
        required={true}
        isValid={isConfirmValid}
        hasError={isConfirmError}
        validationMessage={confirmMessage}
        disabled={!PUBLIC_SIGNUP_ENABLED}
        autoComplete="new-password"
      />
    </>
  );
}

