"use client";

import Image from "next/image";

export default function ForgotPasswordStep({
  email,
  setEmail,
  onSubmit,
  onBackToLogin,
  loading,
  error,
  success,
}) {
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEmailValid || loading) return;
    onSubmit(email.trim());
  };

  return (
    <div className="flex flex-col items-center">
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
          disabled={loading || !isEmailValid}
          className="w-full py-3.5 bg-white hover:bg-slate-200 text-black font-sans font-bold text-sm tracking-wider uppercase rounded-md transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mb-4"
        >
          {loading ? "Mengirim…" : "KIRIM MAGIC LINK"}
        </button>
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
