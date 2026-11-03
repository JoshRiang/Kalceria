"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function VerifyOtpStep({
  otpEmail,
  otp,
  setOtp,
  handleOtpInput,
  handleOtpKeyDown,
  handleOtpPaste,
  handleVerifyOtp,
  handleResendOtp,
  loading,
  resendCooldown,
  isExpired,
  error,
}) {
  return (
    <div className="flex flex-col items-center">
      {/* ── Responsive Email_man.png in the middle (+15% larger) ── */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
          <Image
            src="/Email_man.webp"
            alt="Email Verification"
            width={720}
            height={964}
            priority
            className="w-full h-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)] select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      <p className="text-center font-mono text-xs text-slate-300 mb-6 max-w-sm">
        Masukkan 6 digit kode OTP yang dikirim ke{" "}
        <span className="text-white font-semibold underline decoration-white/30">{otpEmail}</span>
      </p>

      {/* ── 6-digit OTP Inputs ── */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handleOtpPaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpInput(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            disabled={loading || isExpired}
            autoFocus={i === 0}
            className={`w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[#0c1528] border rounded-lg text-white outline-none transition-all ${
              digit
                ? "border-emerald-400 ring-1 ring-emerald-400/40 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                : isExpired
                ? "border-red-500/50 opacity-60 cursor-not-allowed"
                : "border-slate-800 focus:border-slate-400 focus:shadow-[0_0_0_2px_rgba(100,116,139,0.2)]"
            }`}
          />
        ))}
      </div>

      {/* ── Timeout Error (Pure Consolas Red, No Outer Box) ── */}
      {isExpired && (
        <div
          style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
          className="mb-4 text-center text-xs text-red-500 tracking-tight"
        >
          Kode OTP telah kedaluwarsa. Silakan minta kode baru.
        </div>
      )}

      {/* ── General Error (Pure Consolas Red, No Outer Box) ── */}
      {!isExpired && error && (
        <div
          style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
          className="mb-4 text-center text-xs text-red-500 tracking-tight"
        >
          {error}
        </div>
      )}

      {/* ── Verify Submit Button: "VERIFIKASI" (Generic, no OTP in text) ── */}
      <button
        type="button"
        onClick={handleVerifyOtp}
        disabled={loading || otp.join("").length < 6 || isExpired}
        className="w-full py-3.5 bg-white hover:bg-slate-200 text-black font-sans font-bold text-sm tracking-wider uppercase rounded-md transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mb-4"
      >
        {loading ? "Memproses…" : "VERIFIKASI"}
      </button>

      {/* ── Resend OTP Button with 60s (1 min) Countdown ── */}
      <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
        <span>Belum menerima kode?</span>
        {resendCooldown > 0 ? (
          <span className="text-slate-500 font-bold">Kirim ulang ({resendCooldown}s)</span>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading}
            className="text-white hover:underline font-bold transition-colors cursor-pointer"
          >
            Kirim Ulang
          </button>
        )}
      </div>
    </div>
  );
}

