"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import api from "@/lib/api";
import AuthField from "@/components/auth/AuthField";
import { EMAIL_AUTH_ENABLED, PUBLIC_SIGNUP_ENABLED } from "@/lib/authConfig";
import { createRuntimeSeededRandom } from "@/lib/seededRandom";
import { establishSession } from "@/lib/session";
import { PhotoCropEditorModal } from "@/components/map/modals/PhotoCropEditorModal";
import { INDONESIAN_CITIES, isIndonesianCity } from "@/lib/indonesianCities";
import { validateCommsValue } from "@/components/service-request/FormControls";

const PASSWORD_CHECK_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Client-side born year validation (YEAR ONLY): must be 18+ years old
function checkBornYear(yearVal) {
  if (!yearVal) return { valid: false, empty: true, message: "" };
  const str = String(yearVal).trim();
  if (str.length < 4) return { valid: false, empty: false, message: "" };
  const y = parseInt(str, 10);
  const currentYear = new Date().getFullYear();
  if (isNaN(y) || str.length !== 4) {
    return { valid: false, empty: false, message: "Enter 4-digit year" };
  }
  if (y > currentYear - 18) {
    return { valid: false, empty: false, message: "Must be 18 or older" };
  }
  if (y < 1920) {
    return { valid: false, empty: false, message: "Enter valid year" };
  }
  return { valid: true, empty: false, message: "" };
}

// Ensure avatar base64 string does not exceed backend limits (max 180KB)
async function optimizeAvatarForBackend(dataUrl) {
  if (!dataUrl) return undefined;
  if (dataUrl.length <= 180_000) return dataUrl;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, 320, 320);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage({ onAuthSuccess, onBack }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "verify"
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);
  const [otpEmail, setOtpEmail] = useState(""); // email pending OTP verification
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileVideo, setMobileVideo] = useState("/hp/vid_login_hp.mp4");

  // Profile Photo Cropper states (inherited from Map page modal)
  const [cropSourceImage, setCropSourceImage] = useState(null);
  const [croppedAvatar, setCroppedAvatar] = useState(null);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
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
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function setField(id, val) {
    setForm((p) => ({ ...p, [id]: val }));
    setError("");
    setSuccess("");
  }

  function switchMode(m) {
    setMode(m);
    setForm({});
    setError("");
    setSuccess("");
    setCroppedAvatar(null);
    setCropSourceImage(null);
    setPhotoError("");
    if (m !== "verify") {
      setOtp(["", "", "", "", "", ""]);
      setOtpEmail("");
    }
  }

  // Handle Photo input selection & trigger WhatsApp-style crop modal
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
      setPhotoError("Only .png, .jpg, and .webp images are allowed.");
      e.target.value = "";
      return;
    }
    setPhotoError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setCropSourceImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // OTP input handler — auto-focus next box
  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return;
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
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/otp/request", { email: otpEmail });
      setSuccess("OTP baru telah dikirim ke email kamu.");
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Gagal mengirim ulang OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/auth/otp/verify", { email: otpEmail, otp: code });
      setSuccess("Email terverifikasi! Silakan login.");
      setTimeout(() => switchMode("login"), 1200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "OTP salah atau expired.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "verify") {
      handleVerifyOtp();
      return;
    }

    if (mode === "login") {
      if (!form.email?.trim() || !form.password) {
        setError("Please enter your email and password.");
        return;
      }
    }

    if (mode === "register") {
      if (
        !form.name?.trim() ||
        !form.email?.trim() ||
        !form.password ||
        !form.dob ||
        !form.phone?.trim() ||
        !form.domicile?.trim()
      ) {
        setError("Please complete all required fields.");
        return;
      }

      // 1. Born Year validation: must be 18 or older
      const yearCheck = checkBornYear(form.dob);
      if (!yearCheck.valid) {
        setError("You must be 18 years or older to register.");
        return;
      }

      // 2. City validation: must be in the Indonesian cities list
      if (!isIndonesianCity(form.domicile)) {
        setError("City is not in the list.");
        return;
      }

      // 3. Phone validation: Indonesian operator & prefix check
      const phoneCheck = validateCommsValue("tel", "phone", form.phone);
      if (!phoneCheck.valid) {
        setError(phoneCheck.message || "Please enter a valid Indonesian mobile number.");
        return;
      }

      // 4. Password validation: 4 strict criteria
      if (!PASSWORD_CHECK_REGEX.test(form.password)) {
        setError("Password must meet all 4 requirements below.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.post("/auth/login", {
          email: form.email.trim(),
          password: form.password,
        });
        establishSession(res.data);
        setSuccess("Authentication successful.");
        setTimeout(() => onAuthSuccess?.(res.data), 800);
      } else {
        const registeredEmail = form.email.trim();
        const registeredPassword = form.password;
        const profilePicture = await optimizeAvatarForBackend(croppedAvatar);
        const birthDateIso = `${String(form.dob).trim()}-01-01`;

        const regRes = await api.post("/auth/register", {
          name: form.name.trim(),
          dob: birthDateIso,
          email: registeredEmail,
          domicile: form.domicile?.trim() || undefined,
          gender: "OTHER", // Gender removed from form, defaulted safely
          phone: form.phone.trim(),
          password: registeredPassword,
          profilePicture,
        });

        if (EMAIL_AUTH_ENABLED && regRes.data?.emailVerificationRequired) {
          setOtpEmail(registeredEmail);
          setOtp(["", "", "", "", "", ""]);
          setResendCooldown(60);
          setMode("verify");
          setForm({});
          setCroppedAvatar(null);
          setSuccess("Kode OTP telah dikirim ke email kamu.");
        } else {
          // Resend Email OTP is disabled — sign in immediately
          try {
            const loginRes = await api.post("/auth/login", {
              email: registeredEmail,
              password: registeredPassword,
            });
            establishSession(loginRes.data);
            setSuccess("Account created! Signing you in...");
            setTimeout(() => onAuthSuccess?.(loginRes.data), 800);
          } catch {
            setMode("login");
            setForm({ email: registeredEmail });
            setSuccess("Registration successful! Please sign in.");
          }
        }
      }
    } catch (err) {
      let msg = err.response?.data?.error || err.message || "An error occurred.";
      if (msg.includes("prisma")) {
        if (msg.includes("dob") || msg.includes("Invalid Date")) {
          msg = "Format tahun lahir tidak valid.";
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

  // ── Live validation flags for instant green borders ──
  const nameValid = Boolean(form.name && form.name.trim().length >= 2);

  const yearCheck = checkBornYear(form.dob);
  const isDobValid = yearCheck.valid;
  const isDobError = !yearCheck.valid && !yearCheck.empty;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
  const isEmailValid = emailRegex.test(form.email || "");
  const isEmailError = Boolean(form.email && !isEmailValid);

  const cityValid = isIndonesianCity(form.domicile);
  const isCityError = Boolean(form.domicile && form.domicile.trim().length >= 3 && !cityValid);

  const phoneCheck = validateCommsValue("tel", "phone", form.phone || "");
  const isPhoneValid = phoneCheck.valid;
  const isPhoneError = Boolean(form.phone && form.phone.trim().length >= 3 && !phoneCheck.valid);

  const passwordValid = PASSWORD_CHECK_REGEX.test(form.password || "");
  const isPasswordError = Boolean(form.password && form.password.length > 0 && !passwordValid);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
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
        className={`absolute inset-0 w-full h-full object-cover -z-10 ${
          isMobile ? "filter grayscale contrast-125 brightness-75" : ""
        }`}
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
            style={{ maxHeight: "88vh" }}
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
                  background:
                    "conic-gradient(from 0deg, transparent 0%, rgba(218,165,32,0.8) 25%, transparent 50%, rgba(220,0,180,0.8) 75%, transparent 100%)",
                  filter: "blur(4px)",
                }}
              />
            </div>

            {/* Inner Content Box */}
            <div className="relative z-10 w-full bg-[#070d1a]/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[88vh]">
              {/* Scrollable inner container */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-8 py-10 md:px-10">
                {/* ── Logo & Back ── */}
                <div className="text-center mb-8 relative flex items-center justify-center">
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 z-10 cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <Image
                    src="/logologin.webp"
                    alt="Kalceria"
                    width={1874}
                    height={560}
                    unoptimized
                    loading="eager"
                    decoding="auto"
                    className="h-10 w-auto object-contain inline-block"
                    draggable={false}
                  />
                </div>

                {/* ── Mode toggle (hidden during OTP verify) ── */}
                {mode !== "verify" && (
                  <div className="flex mb-8 bg-[#040810]/80 rounded-lg border border-slate-800/60 p-1 relative">
                    <motion.div
                      className="absolute inset-y-1 bg-[#1e293b]/80 rounded-md shadow-sm"
                      initial={false}
                      animate={{
                        left: mode === "login" ? "4px" : "calc(50% + 2px)",
                        width: "calc(50% - 6px)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />

                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors z-10 cursor-pointer ${
                        mode === "login" ? "text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode("register")}
                      className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors z-10 cursor-pointer ${
                        mode === "register" ? "text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Register
                    </button>
                  </div>
                )}

                {/* ── Section heading ── */}
                <div className="mb-6">
                  <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight">
                    {mode === "login" ? "Welcome Back" : mode === "register" ? "Create Account" : "Verify Email"}
                  </h1>
                  <p className="font-mono text-xs sm:text-sm text-slate-400 mt-1">
                    {mode === "login"
                      ? "Enter your credentials to access the portal."
                      : mode === "register" && !PUBLIC_SIGNUP_ENABLED
                      ? "Registration is currently disabled."
                      : mode === "register"
                      ? "Complete all fields to register."
                      : `Masukkan 6 digit kode OTP yang dikirim ke ${otpEmail}`}
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
                          <AuthField
                            id="email"
                            label="Email Address"
                            type="email"
                            placeholder="user@domain.com"
                            val={form.email || ""}
                            onChange={setField}
                            isValid={isEmailValid}
                          />
                          <AuthField
                            id="password"
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            val={form.password || ""}
                            onChange={setField}
                            isValid={Boolean(form.password && form.password.length >= 6)}
                          />
                        </>
                      ) : mode === "register" ? (
                        <>
                          {/* 1. Full Name */}
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

                          {/* 2. Profile Photo (Clean standard box, no circle, no "Photo ready") */}
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
                              <span className="text-[13px] font-sans truncate text-slate-400">
                                {croppedAvatar ? "Photo chosen & cropped" : "No file chosen"}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white font-sans text-xs font-bold py-1.5 px-3 rounded transition-colors inline-block select-none">
                                  {croppedAvatar ? "Change File" : "Choose File"}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/jpg"
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

                          {/* 3. Born In (YEAR ONLY) & City */}
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
                              validationMessage={yearCheck.message}
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

                          {/* Real Indonesian cities autocomplete datalist */}
                          <datalist id="indonesia-cities">
                            {INDONESIAN_CITIES.map((c) => (
                              <option key={c} value={c} />
                            ))}
                          </datalist>

                          {/* 4. Email Address */}
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

                          {/* 5. Phone Number (Need Our Help template & validation) */}
                          <AuthField
                            id="phone"
                            label="Phone Number"
                            type="tel"
                            placeholder={PUBLIC_SIGNUP_ENABLED ? "81234567890" : "Not Ready Yet"}
                            val={form.phone || ""}
                            onChange={setField}
                            required={true}
                            isValid={isPhoneValid}
                            hasError={isPhoneError}
                            validationMessage={phoneCheck.message}
                            disabled={!PUBLIC_SIGNUP_ENABLED}
                          />

                          {/* 6. Password (Checklist restored, box edge turns green when valid) */}
                          <AuthField
                            id="password"
                            label="Password"
                            type="password"
                            placeholder={PUBLIC_SIGNUP_ENABLED ? "••••••••" : "Not Ready Yet"}
                            val={form.password || ""}
                            onChange={setField}
                            required={true}
                            isValid={passwordValid}
                            hasError={isPasswordError}
                            disabled={!PUBLIC_SIGNUP_ENABLED}
                          />

                          {/* Password Requirements Checklist (All 4 rules) */}
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
                                  className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center border transition-colors ${
                                    req.met
                                      ? "bg-green-400/20 border-green-400/50"
                                      : "border-slate-700 bg-[#0c1528]"
                                  }`}
                                >
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

                          <div className="text-center mb-4">
                            <button
                              type="button"
                              onClick={handleResendOtp}
                              disabled={resendCooldown > 0 || loading}
                              className={`font-mono text-xs transition-colors ${
                                resendCooldown > 0
                                  ? "text-slate-600 cursor-not-allowed"
                                  : "text-[#4F46E5] hover:text-[#6366f1] cursor-pointer"
                              }`}
                            >
                              {resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown}s` : "Kirim ulang kode OTP"}
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* ── Error / Success Display ── */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-3"
                      >
                        <div
                          style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
                          className="text-red-500 text-[14px] sm:text-[15px] font-normal tracking-tight py-1 select-none text-left"
                        >
                          {error}
                        </div>
                      </motion.div>
                    )}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-3"
                      >
                        <div
                          style={{ fontFamily: "Consolas, 'Courier New', monospace" }}
                          className="text-emerald-400 text-[14px] sm:text-[15px] font-normal tracking-tight py-1 select-none text-left"
                        >
                          {success}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Submit Button ── */}
                  <button
                    type="submit"
                    disabled={loading || (mode === "register" && !PUBLIC_SIGNUP_ENABLED)}
                    className="mt-2 w-full bg-white text-black font-extrabold text-[13px] uppercase tracking-wider py-3.5 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading
                      ? "Processing..."
                      : mode === "register" && !PUBLIC_SIGNUP_ENABLED
                      ? "Not Ready Yet"
                      : mode === "login"
                      ? "Sign In"
                      : mode === "register"
                      ? "Register Account"
                      : "Verify OTP"}
                  </button>
                </form>

                {/* ── Footer ── */}
                <div className="mt-8 text-center">
                  <p className="font-mono text-xs text-slate-500">
                    {mode === "verify"
                      ? "Sudah verifikasi? "
                      : mode === "login"
                      ? "Don't have an account? "
                      : "Already have an account? "}
                    <button
                      onClick={() => switchMode(mode === "verify" ? "login" : mode === "login" ? "register" : "login")}
                      className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
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

      {/* Picture 3: WhatsApp-style Crop & Rotate Modal inherited from Map page */}
      <PhotoCropEditorModal
        show={Boolean(cropSourceImage)}
        rawImage={cropSourceImage}
        onDone={(processedDataUrl) => {
          setCroppedAvatar(processedDataUrl);
          setCropSourceImage(null);
        }}
        onCancel={() => {
          setCropSourceImage(null);
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #0c1528 inset !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
      `,
        }}
      />
    </motion.div>
  );
}
