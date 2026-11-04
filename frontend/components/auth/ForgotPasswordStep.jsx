"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import api from "@/lib/api";

export default function ForgotPasswordStep({
  email,
  setEmail,
  onSubmit,
  onBackToLogin,
  onSuccessComplete,
  loading,
  error,
  success,
}) {
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Cross-Device & Cross-Tab Synchronization ──
  // If the user completes the password reset from their phone or another tab,
  // this active tab detects it and immediately transitions to Welcome Back -> Landing Page.
  useEffect(() => {
    if (!success || !email || !isEmailValid) return;

    let channel;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("kalceria_auth_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "RESET_PASSWORD_COMPLETE") {
            onSuccessComplete?.(event.data);
          }
        };
      }
    } catch {}

    let isCancelled = false;
    const pollInterval = setInterval(async () => {
      if (isCancelled) return;
      try {
        const res = await api.get(
          `/auth/password/reset-status?email=${encodeURIComponent(email.trim().toLowerCase())}`
        );
        if (res.data?.status === "completed") {
          clearInterval(pollInterval);
          onSuccessComplete?.(res.data);
        }
      } catch {}
    }, 2500);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      if (channel) channel.close();
    };
  }, [success, email, isEmailValid, onSuccessComplete]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (!isEmailValid || loading) return;
    setResendCooldown(60);
    onSubmit(email.trim());
  };

  const handleResend = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (!isEmailValid || loading || resendCooldown > 0) return;
    setResendCooldown(60);
    onSubmit(email.trim());
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* ── Responsive Forgot_man.webp in the middle (Same size as Email_man) ── */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
          <Image
            src="/Forgot_man.webp"
            alt="Forgot Password"
            width={600}
            height={803}
            priority
            className="w-full h-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)] select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      <p className="text-center font-mono text-xs text-slate-300 mb-6 max-w-sm">
        Masukkan email kamu untuk menerima link reset password.
      </p>

      <form onSubmit={handleSubmit} noValidate className="w-full flex flex-col">
        {/* Email Address Input */}
        <div className="mb-4">
          <label
            htmlFor="forgot-email"
            className="mb-1.5 flex items-center justify-between font-sans text-xs font-semibold text-slate-300 select-none cursor-pointer"
          >
            <span>
              Email Address <span className="text-red-500 font-bold">*</span>
            </span>
            {isEmailValid && (
              <span className="text-[10px] font-medium text-emerald-400">Valid</span>
            )}
          </label>
          <input
            id="forgot-email"
            type="email"
            placeholder="user@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            autoFocus
            className={`w-full bg-[#0c1528] px-3 py-2.5 font-sans text-[13px] text-white outline-none rounded-md border transition-all placeholder:text-slate-600 ${
              isEmailValid
                ? "border-emerald-400 ring-1 ring-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                : "border-slate-800 focus:border-slate-400 focus:shadow-[0_0_0_2px_rgba(100,116,139,0.2)]"
            }`}
          />
        </div>

        {/* Error / Success Display (Consolas font, no outer box) */}
        {error && (
          <div
            style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            className="mb-4 text-center text-xs text-red-500 tracking-tight"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
            className="mb-4 text-center text-xs text-emerald-400 tracking-tight"
          >
            {success}
          </div>
        )}

        {/* Send Magic Link Button */}
        <button
          type="submit"
          disabled={loading || !isEmailValid || (Boolean(success) && resendCooldown > 0)}
          className="w-full py-3.5 bg-white hover:bg-slate-200 text-black font-sans font-bold text-sm tracking-wider uppercase rounded-md transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mb-3 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-4 h-4 border-2 border-black/25 border-t-black rounded-full animate-spin" />
              <span>Mengirim link...</span>
            </div>
          ) : success ? (
            "Kirim Ulang Link"
          ) : (
            "Kirim Link"
          )}
        </button>

        {/* Coba Ulang / Kirim Ulang Option */}
        {success && (
          <div className="flex flex-col items-center mb-3">
            <p className="font-mono text-xs text-slate-400 mb-1">
              Belum menerima link reset password?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0 || !isEmailValid}
              className="font-sans font-bold text-xs text-white hover:text-slate-300 underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? `Coba kirim ulang (${resendCooldown}s)`
                : "Coba kirim ulang link"}
            </button>
          </div>
        )}
      </form>

      {/* Back to Sign In Link */}
      <div className="mt-2 text-center">
        <p className="font-mono text-xs text-slate-500">
          Remember your password?{" "}
          <button
            type="button"
            onClick={onBackToLogin}
            className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
