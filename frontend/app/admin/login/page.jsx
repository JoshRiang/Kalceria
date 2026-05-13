"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

// ─── Authenticating Dots ─────────────────────────────────────────────────────
function AuthDots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    let n = 1;
    const t = setInterval(() => {
      setDots(".".repeat(n));
      n = n >= 3 ? 1 : n + 1;
    }, 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative font-sans text-xl font-extrabold text-white tracking-tight uppercase flex items-center">
        <span>Authenticating</span>
        <span className="absolute left-full ml-1 w-8 text-left">{dots}</span>
      </div>
    </div>
  );
}

// ─── Admin Login Page ─────────────────────────────────────────────────────────
export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already admin, redirect
    const token = localStorage.getItem("adminToken");
    if (token) router.replace("/admin/dashboard");
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      const token = res.data?.token;
      if (!token) throw new Error("No token.");

      // Verify admin role via a protected endpoint
      const check = await api.get("/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // If no error thrown, user is admin
      localStorage.setItem("adminToken", token);
      localStorage.setItem("token", token);

      await new Promise((r) => setTimeout(r, 2200));
      router.replace("/admin/dashboard");
    } catch (err) {
      setLoading(false);
      setError(err.message === "Forbidden. Admin only." || err.message.includes("403")
        ? "Access denied. Admin only."
        : err.message || "Authentication failed.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="fixed inset-0 z-[100] overflow-hidden"
    >
      {/* Video BG */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover -z-10">
        <source src="/videologin_regris.mp4" type="video/mp4" />
      </video>

      {/* Darker overlay — admin dimension */}
      <div className="absolute inset-0 bg-black/75 z-0" />
      {/* Red danger glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-red-700/10 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[5%] w-[50vw] h-[50vw] rounded-full bg-red-900/15 blur-[140px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative w-full max-w-md"
        >
          {/* Rotating conic border — red/dark */}
          <div className="absolute -inset-[1px] rounded-xl z-0 overflow-hidden" style={{ opacity: 0.6 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]"
              style={{
                background: "conic-gradient(from 0deg, transparent 0%, rgba(185,28,28,0.9) 25%, transparent 50%, rgba(80,0,0,0.8) 75%, transparent 100%)",
                filter: "blur(4px)",
              }}
            />
          </div>

          {/* Inner glass — Semi-transparent like FAQ but less */}
          <div className="relative z-10 w-full bg-[#040810]/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden px-8 py-10">

            {/* Logo */}
            <div className="text-center mb-10">
              <img src="/logologin.png" alt="Kalceria" className="h-8 object-contain inline-block mb-3" draggable={false} />
            </div>

            <div className="mb-8">
              <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight">Admin Portal</h1>
              <p className="font-mono text-sm text-slate-400 mt-1">Authorized personnel only.</p>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 gap-6"
                >
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border border-white/10" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-t border-white"
                    />
                  </div>
                  <AuthDots />
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4"
                >
                  {["email", "password"].map((field) => (
                    <div key={field} className="flex flex-col gap-1.5">
                      <label className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400">
                        {field === "email" ? "Email Address" : "Password"}
                      </label>
                      <input
                        type={field}
                        value={form[field]}
                        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder={field === "email" ? "admin@kalceria.com" : "••••••••"}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2.5 font-sans text-[13px] text-white outline-none transition-all focus:border-white/30"
                      />
                    </div>
                  ))}

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-md flex items-center gap-2">
                          <span className="text-red-500 text-sm">✕</span>
                          <span className="text-red-400 font-mono text-xs">{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    className="mt-2 w-full bg-white hover:bg-slate-200 text-black font-extrabold text-[13px] uppercase tracking-wider py-3.5 rounded-md transition-colors"
                  >
                    Login
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
