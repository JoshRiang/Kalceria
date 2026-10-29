"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import api from "@/lib/api";
import AuthField from "@/components/auth/AuthField";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/authConfig";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import { establishSession } from "@/lib/session";

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage({ onAuthSuccess, onBack }) {
  const [mode, setMode] = useState("login");   // "login" | "register" | "verify"
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");  // email pending OTP verification
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileVideo, setMobileVideo] = useState("/hp/vid_login_hp.mp4");

  useEffect(() => { 
    // Preserve the existing mount fade; the immediate update is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true); 
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const vids = ["/hp/vid_login_hp.mp4", "/hp/vid_login_hp2.mp4", "/hp/vid_login_hp3.mp4"];
    const random = createRuntimeSeededRandom("auth-background-video-v1");
    const randomVid = vids[Math.floor(random() * vids.length)];
    setMobileVideo(randomVid);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function setField(id, val) {
    setForm(p => ({ ...p, [id]: val }));
    setError(""); setSuccess("");
  }

  function switchMode(m) {
    setMode(m); setForm({}); setError(""); setSuccess("");
    if (m !== "verify") { setOtp(["", "", "", "", "", ""]); setOtpEmail(""); }
  }

  // OTP input handler — auto-focus next box
  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return; // digits only
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError("");
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  }

  // Handle OTP paste
  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-${focusIdx}`)?.focus();
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setLoading(true); setError("");
    try {
      await api.post("/auth/otp/request", { email: otpEmail });
      setSuccess("OTP baru telah dikirim ke email kamu.");
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || "Gagal mengirim ulang OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) { setError("Masukkan 6 digit kode OTP."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await api.post("/auth/otp/verify", { email: otpEmail, otp: code });
      setSuccess("Email terverifikasi! Silakan login.");
      setTimeout(() => switchMode("login"), 1200);
    } catch (err) {
      setError(err.message || "OTP salah atau expired.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (mode === "verify") { handleVerifyOtp(); return; }

    if (mode === "register") {
      if (!form.name || !form.email || !form.password || !form.dob) {
        setError("All fields are required.");
        return;
      }
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (isNaN(new Date(form.dob).getTime())) {
        setError("Invalid Date of Birth format.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.post("/auth/login", { email: form.email, password: form.password });
        establishSession(res.data);
        setSuccess("Authentication successful.");
        setTimeout(() => onAuthSuccess?.(res.data), 800);
      } else {
        await api.post("/auth/register", {
          name: form.name, dob: form.dob, email: form.email,
          domicile: form.domicile, gender: form.gender,
          phone: form.phone, password: form.password,
        });
        // Transition to OTP verification
        setOtpEmail(form.email);
        setOtp(["", "", "", "", "", ""]);
        setResendCooldown(60);
        setMode("verify");
        setForm({});
        setSuccess("Kode OTP telah dikirim ke email kamu.");
      }
    } catch (err) {
      let msg = err.response?.data?.error || err.message || "An error occurred.";
      if (msg.includes("prisma")) {
        if (msg.includes("dob") || msg.includes("Invalid Date")) {
          msg = "Format tanggal lahir tidak valid.";
        } else if (msg.includes("Unique constraint failed")) {
          msg = "Email atau nomor telepon sudah terdaftar.";
        } else {
          msg = "Terjadi kesalahan pada sistem registrasi. Coba lagi.";
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="fixed inset-0 z-[100] overflow-hidden"
    >
      {/* ── Video Background ── */}
      <video 
        key={isMobile ? mobileVideo : "/videologin_regris.mp4"}
        autoPlay 
        loop 
        muted 
        playsInline 
        className={`absolute inset-0 w-full h-full object-cover -z-10 ${isMobile ? "filter grayscale contrast-125 brightness-75" : ""}`}
      >
        <source src={isMobile ? mobileVideo : "/videologin_regris.mp4"} type="video/mp4" />
      </video>

      {/* ── Dark overlay ── */}
      <div className="absolute inset-0 bg-black/60 z-0" />

      {/* ── Centering wrapper ── */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 md:p-8">

        {/* ── Drop-in Entrance Animation ── */}
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-full max-w-lg"
        >
          {/* ── Floating Auth Card ── */}
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-full shadow-2xl rounded-xl flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            {/* Dynamic Gold + Magenta Bleed/Border */}
            <div 
              className="absolute -inset-[1px] rounded-xl z-0 overflow-hidden"
              style={{ opacity: 0.7 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]"
                style={{
                  background: "conic-gradient(from 0deg, transparent 0%, rgba(218,165,32,0.8) 25%, transparent 50%, rgba(220,0,180,0.8) 75%, transparent 100%)",
                  filter: "blur(4px)"
                }}
              />
            </div>

            {/* Inner Content Box — Semi-transparent like FAQ but less */}
            <div className="relative z-10 w-full bg-[#070d1a]/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Scrollable inner container */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-8 py-10 md:px-10">

            {/* ── Logo & Back ── */}
            <div className="text-center mb-10 relative flex items-center justify-center">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 z-10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                </button>
              )}
              <Image src="/logologin.webp" alt="Kalceria" width={1874} height={560} unoptimized loading="eager" decoding="auto" className="h-10 w-auto object-contain inline-block" draggable={false} />
            </div>

            {/* ── Mode toggle (hidden during OTP verify) ── */}
            {mode !== "verify" && (
            <div className="flex mb-8 bg-[#040810]/80 rounded-lg border border-slate-800/60 p-1 relative">
              {/* Active pill background */}
              <motion.div
                className="absolute inset-y-1 bg-[#1e293b]/80 rounded-md shadow-sm"
                initial={false}
                animate={{ 
                  left: mode === "login" ? "4px" : "calc(50% + 2px)", 
                  width: "calc(50% - 6px)" 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors z-10 ${mode === "login" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors z-10 ${mode === "register" ? "text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                Register
              </button>
            </div>
            )}

            {/* ── Section heading ── */}
            <div className="mb-8">
              <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight">
                {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Verify Email"}
              </h1>
              <p className="font-mono text-sm text-slate-500 mt-1">
                {mode === "login" ? "Enter your credentials to access the portal." : mode === "register" && !PUBLIC_SIGNUP_ENABLED ? "Not Ready Yet" : mode === "register" ? "Complete all fields to register." : `Masukkan 6 digit kode OTP yang dikirim ke ${otpEmail}`}
              </p>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} noValidate className="flex flex-col relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {mode === "login" ? (
                    <>
                      <AuthField id="email" label="Email Address" type="email" placeholder="user@domain.com" val={form.email || ""} onChange={setField} />
                      <AuthField id="password" label="Password" type="password" placeholder="••••••••" val={form.password || ""} onChange={setField} />
                    </>
                  ) : mode === "register" ? (
                    <>
                      <AuthField id="name" label="Full Name" type="text" placeholder={PUBLIC_SIGNUP_ENABLED ? "John Doe" : "Not Ready Yet"} val={form.name || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                      <AuthField id="profilePhoto" label="Profile Photo" type="file" placeholder="Not Ready Yet" val={form.profilePhoto || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <AuthField id="dob" label="Date of Birth" type="date" placeholder="Not Ready Yet" val={form.dob || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                        <AuthField id="gender" label="Gender" type="select" placeholder="Not Ready Yet" options={["Male", "Female", "Other"]} val={form.gender || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                      </div>
                      <AuthField id="email" label="Email Address" type="email" placeholder={PUBLIC_SIGNUP_ENABLED ? "user@domain.com" : "Not Ready Yet"} val={form.email || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <AuthField id="domicile" label="City / Domicile" type="text" placeholder="Not Ready Yet" val={form.domicile || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                        <AuthField id="phone" label="Phone Number" type="tel" placeholder="Not Ready Yet" val={form.phone || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                      </div>
                      <AuthField id="password" label="Password" type="password" placeholder="Not Ready Yet" val={form.password || ""} onChange={setField} disabled={!PUBLIC_SIGNUP_ENABLED} />
                      
                      {/* Password Requirements Checklist */}
                      <div className="mb-6 grid grid-cols-2 gap-2 text-xs font-sans tracking-wide">
                        {[
                          { label: "Min 8 Chars", met: (form.password || "").length >= 8 },
                          { label: "1 Uppercase", met: /[A-Z]/.test(form.password || "") },
                          { label: "1 Number", met: /[0-9]/.test(form.password || "") },
                          { label: "1 Special Char", met: /[^A-Za-z0-9]/.test(form.password || "") }
                        ].map((req, i) => (
                          <div key={i} className={`flex items-center gap-2 transition-colors ${req.met ? "text-green-300" : "text-slate-500"}`}>
                            <div className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center border transition-colors ${req.met ? "bg-green-400/20 border-green-400/50" : "border-slate-700 bg-[#0c1528]"}`}>
                              {req.met && <span className="text-[10px] text-green-300 font-bold">✓</span>}
                            </div>
                            {req.label}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* ── OTP Verification UI ── */
                    <>
                      {/* Email icon */}
                      <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 flex items-center justify-center">
                          <Image
                            src="/register/email_logo.png" 
                            alt="Email Logo" 
                            width={467}
                            height={347}
                            unoptimized
                            loading="eager"
                            decoding="auto"
                            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                          />
                        </div>
                      </div>

                      {/* 6-digit OTP input boxes */}
                      <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOtpPaste}>
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            id={`otp-${i}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            autoFocus={i === 0}
                            className={`
                              w-11 h-14 text-center text-xl font-bold text-white
                              bg-[#0c1528] border rounded-lg outline-none transition-all
                              focus:border-[#4F46E5] focus:shadow-[0_0_0_2px_rgba(79,70,229,0.2)]
                              ${digit ? "border-[#4F46E5]/50" : "border-slate-700"}
                            `}
                          />
                        ))}
                      </div>

                      {/* Resend OTP */}
                      <div className="text-center mb-4">
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0 || loading}
                          className={`font-mono text-xs transition-colors ${
                            resendCooldown > 0 ? "text-slate-600 cursor-not-allowed" : "text-[#4F46E5] hover:text-[#6366f1] cursor-pointer"
                          }`}
                        >
                          {resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown}s` : "Kirim ulang kode OTP"}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ── Error / Success ── */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2">
                      <span className="text-red-500 text-sm">✕</span>
                      <span className="text-red-400 font-mono text-xs">{error}</span>
                    </div>
                  </motion.div>
                )}
                {success && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-2">
                      <span className="text-emerald-500 text-sm">✓</span>
                      <span className="text-emerald-400 font-mono text-xs">{success}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={loading || (mode === "register" && !PUBLIC_SIGNUP_ENABLED)}
                className="mt-2 w-full bg-white text-black font-extrabold text-[13px] uppercase tracking-wider py-3.5 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : mode === "register" && !PUBLIC_SIGNUP_ENABLED ? "Not Ready Yet" : mode === "login" ? "Sign In" : mode === "register" ? "Register Account" : "Verify OTP"}
              </button>
            </form>

            {/* ── Footer ── */}
            <div className="mt-8 text-center">
              <p className="font-mono text-xs text-slate-500">
                {mode === "verify" ? "Sudah verifikasi? " : mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => switchMode(mode === "verify" ? "login" : mode === "login" ? "register" : "login")}
                  className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4"
                >
                  {mode === "verify" ? "Sign in" : mode === "login" ? "Register now" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
          </div>
        </motion.div>
        </motion.div>
      </div>
      
      {/* Scrollbar styles to inject globally if needed, or scoped here */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.5);
        }
      `}} />
    </motion.div>
  );
}
