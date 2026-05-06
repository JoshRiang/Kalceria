"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

// ── Shared Input Component ──────────────────────────────────────────────────
function Field({ id, label, type, placeholder, options, val, onChange }) {
  const [focused, setFocused] = useState(false);
  const isSelect = type === "select";

  return (
    <div className="flex flex-col mb-4">
      <label className="mb-1.5 font-sans text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {isSelect ? (
        <select
          value={val}
          onChange={(e) => onChange(id, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full bg-[#0c1528] border rounded-md px-3 py-2.5 
            font-sans text-[13px] text-white outline-none transition-all
            ${focused ? "border-slate-500 shadow-[0_0_0_2px_rgba(100,116,139,0.1)]" : "border-slate-800"}
          `}
        >
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={type === "file" ? undefined : val}
          onChange={(e) => onChange(id, type === "file" ? e.target.files[0] : e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={type === "password" ? "current-password" : "off"}
          className={`
            w-full bg-[#0c1528] border rounded-md px-3 py-2.5 
            font-sans text-[13px] text-white outline-none transition-all placeholder:text-slate-600
            ${type === "file" ? "file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600" : ""}
            ${focused ? "border-slate-500 shadow-[0_0_0_2px_rgba(100,116,139,0.1)]" : "border-slate-800"}
          `}
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage({ onAuthSuccess, onBack }) {
  const [mode, setMode] = useState("login");   // "login" | "register"
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function setField(id, val) {
    setForm(p => ({ ...p, [id]: val }));
    setError(""); setSuccess("");
  }

  function switchMode(m) {
    setMode(m); setForm({}); setError(""); setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (mode === "register" && form.password?.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.post("/auth/login", { email: form.email, password: form.password });
        const token = res.data?.token || res.data?.data?.token;
        if (token) localStorage.setItem("token", token);
        setSuccess("Authentication successful.");
        setTimeout(() => onAuthSuccess?.(res.data), 800);
      } else {
        await api.post("/auth/register", {
          name: form.name, dob: form.dob, email: form.email,
          domicile: form.domicile, gender: form.gender,
          phone: form.phone, password: form.password,
        });
        setSuccess("Registration complete. You may now log in.");
        setTimeout(() => switchMode("login"), 1200);
      }
    } catch (err) {
      setError(err.message || "An error occurred.");
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
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover -z-10">
        <source src="/videologin_regris.mp4" type="video/mp4" />
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

            {/* Inner Content Box */}
            <div className="relative z-10 w-full bg-[#070d1a]/90 backdrop-blur-xl border border-slate-800/80 rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
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
              <img src="/logologin.png" alt="Kalceria" className="h-10 object-contain inline-block" draggable={false} />
            </div>

            {/* ── Mode toggle ── */}
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

            {/* ── Section heading ── */}
            <div className="mb-8">
              <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="font-mono text-sm text-slate-500 mt-1">
                {mode === "login" ? "Enter your credentials to access the portal." : "Complete all fields to register."}
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
                      <Field id="email" label="Email Address" type="email" placeholder="user@domain.com" val={form.email || ""} onChange={setField} />
                      <Field id="password" label="Password" type="password" placeholder="••••••••" val={form.password || ""} onChange={setField} />
                    </>
                  ) : (
                    <>
                      <Field id="name" label="Full Name" type="text" placeholder="John Doe" val={form.name || ""} onChange={setField} />
                      <Field id="profilePhoto" label="Profile Photo" type="file" val={form.profilePhoto || ""} onChange={setField} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <Field id="dob" label="Date of Birth" type="date" val={form.dob || ""} onChange={setField} />
                        <Field id="gender" label="Gender" type="select" options={["Male", "Female", "Other"]} val={form.gender || ""} onChange={setField} />
                      </div>
                      <Field id="email" label="Email Address" type="email" placeholder="user@domain.com" val={form.email || ""} onChange={setField} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <Field id="domicile" label="City / Domicile" type="text" placeholder="Jakarta" val={form.domicile || ""} onChange={setField} />
                        <Field id="phone" label="Phone Number" type="tel" placeholder="+62 8xx-xxxx-xxxx" val={form.phone || ""} onChange={setField} />
                      </div>
                      <Field id="password" label="Password" type="password" placeholder="Create a strong password" val={form.password || ""} onChange={setField} />
                      
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
                disabled={loading}
                className="mt-2 w-full bg-white text-black font-extrabold text-[13px] uppercase tracking-wider py-3.5 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Authenticating..." : (mode === "login" ? "Sign In" : "Register Account")}
              </button>
            </form>

            {/* ── Footer ── */}
            <div className="mt-8 text-center">
              <p className="font-mono text-xs text-slate-500">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4"
                >
                  {mode === "login" ? "Register now" : "Sign in"}
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
