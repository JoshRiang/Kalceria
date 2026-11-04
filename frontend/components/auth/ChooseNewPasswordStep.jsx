"use client";

import { useState, useEffect } from "react";
import AuthField from "@/components/auth/AuthField";
import {
  generateClientStrongPassword,
  fetchRecommendedPassword,
} from "@/components/auth/passwordAlgorithm";

const PASSWORD_CHECK_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ChooseNewPasswordStep({
  onDone,
  isProcessing = false,
  error = "",
  onErrorClear,
  resetToken = "",
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [recommendedPassword, setRecommendedPassword] = useState(() =>
    generateClientStrongPassword()
  );
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRecommendedPassword({ token: resetToken }).then((pwd) => {
      if (active && pwd) {
        setRecommendedPassword(pwd);
      }
    });
    return () => {
      active = false;
    };
  }, [resetToken]);

  const passwordValid = PASSWORD_CHECK_REGEX.test(password);
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const isConfirmError = Boolean(confirmPassword && password !== confirmPassword);

  const handleAcceptRecommendedPassword = (pwd) => {
    setPassword(pwd);
    setConfirmPassword(pwd);
    setLocalError("");
    if (onErrorClear) onErrorClear();
    setShowRecommendation(false);
    setRecommendationDismissed(true);
  };

  const handleDismissRecommendedPassword = () => {
    setShowRecommendation(false);
    setRecommendationDismissed(true);
  };

  const handleDoneClick = () => {
    setLocalError("");
    if (onErrorClear) onErrorClear();
    if (!passwordValid) {
      setLocalError("Password must meet all 4 requirements below.");
      return;
    }
    if (!passwordsMatch) {
      setLocalError("Passwords do not match.");
      return;
    }
    onDone(password);
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 select-none w-full max-w-sm mx-auto">
      {/* ── Title: Firm White (Font style like Choose Username) ── */}
      <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-center mb-2">
        Choose a New Password
      </h2>
      <p className="font-mono text-xs text-slate-400 text-center mb-6 max-w-xs">
        Enter and confirm your new password below.
      </p>

      <div className="w-full flex flex-col">
        {/* 1. Password input with 2D Eye toggle & Natural Strong Password Recommendation */}
        <AuthField
          id="new-password"
          label="New Password"
          type="password"
          placeholder="••••••••"
          val={password}
          onChange={(_, val) => {
            setPassword(val);
            setLocalError("");
            if (onErrorClear) onErrorClear();
            if (!val) {
              setRecommendationDismissed(false);
            }
          }}
          required={true}
          isValid={passwordValid}
          hasError={Boolean(password && !passwordValid)}
          disabled={isProcessing}
          autoComplete="new-password"
          recommendedPassword={recommendedPassword}
          showPasswordRecommendation={
            showRecommendation && !recommendationDismissed && !isProcessing
          }
          onPasswordFocus={() => {
            if (!recommendationDismissed) {
              setShowRecommendation(true);
            }
          }}
          onAcceptRecommendation={handleAcceptRecommendedPassword}
          onDismissRecommendation={handleDismissRecommendedPassword}
        />

        {/* Password Requirements (4 tiny boxes turn green when met, NO checkmark icon) */}
        <div className="mb-4 -mt-1 grid grid-cols-2 gap-2 text-xs font-sans tracking-wide">
          {[
            { label: "Min 8 Chars", met: password.length >= 8 },
            { label: "1 Uppercase", met: /[A-Z]/.test(password) },
            { label: "1 Number", met: /[0-9]/.test(password) },
            { label: "1 Special Char", met: /[^A-Za-z0-9]/.test(password) },
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

        {/* 2. Confirm Password input */}
        <AuthField
          id="confirm-new-password"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          val={confirmPassword}
          onChange={(_, val) => {
            setConfirmPassword(val);
            setLocalError("");
            if (onErrorClear) onErrorClear();
          }}
          required={true}
          isValid={passwordsMatch}
          hasError={isConfirmError}
          validationMessage={passwordsMatch ? "Matches" : isConfirmError ? "Passwords do not match" : ""}
          disabled={isProcessing}
          autoComplete="new-password"
        />

        {/* Error Display (Consolas font, pure red, no outer box) */}
        {(localError || error) && (
          <div
            style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            className="mb-4 text-center text-xs text-red-500 tracking-tight"
          >
            {localError || error}
          </div>
        )}

        {/* ── Done Button: Same font style as Choose Username header, 40-50% smaller ── */}
        <div className="mt-6 flex justify-center w-full">
          <button
            type="button"
            onClick={handleDoneClick}
            disabled={!passwordValid || !passwordsMatch || isProcessing}
            className="font-sans font-extrabold text-sm sm:text-base tracking-wider text-white hover:text-slate-300 active:text-slate-400 uppercase cursor-pointer transition-colors bg-transparent border-none p-3 outline-none disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Saving…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

