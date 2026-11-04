"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import api from "@/lib/api";
import { EMAIL_AUTH_ENABLED, PUBLIC_SIGNUP_ENABLED } from "@/lib/authConfig";
import { establishSession } from "@/lib/session";
import { PhotoCropEditorModal } from "@/components/map/modals/PhotoCropEditorModal";
import { isIndonesianCity } from "@/lib/indonesianCities";

// Modular Subcomponents
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import VerifyOtpStep from "@/components/auth/VerifyOtpStep";
import ChooseUsernameStep from "@/components/auth/ChooseUsernameStep";
import ForgotPasswordStep from "@/components/auth/ForgotPasswordStep";
import ChooseNewPasswordStep from "@/components/auth/ChooseNewPasswordStep";
import AuthBufferOverlay from "@/components/auth/AuthBufferOverlay";
import {
  generateUsernameCandidates,
  findFirstAvailableUsername,
} from "@/components/auth/usernameAlgorithm";

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
  // Modes: "login" | "register" | "verify" | "choose-username" | "choose-new-password" | "forgot-password"
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token") || urlParams.get("reset_token");
      if (token) return "choose-new-password";
      const urlMode = urlParams.get("mode");
      if (urlMode === "forgot-password") return "forgot-password";
      if (urlParams.get("reset_success") === "true") return "login";
    }
    return "login";
  });
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  // Buffer Overlay (inherit from logging out buffer with no words)
  const [isBuffering, setIsBuffering] = useState(false);

  // OTP State
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60); // 1 minute max OTP
  const [isOtpExpired, setIsOtpExpired] = useState(false);

  // Registered credentials saved for auto-login after OTP
  const registeredCredsRef = useRef({ email: "", password: "", name: "", dob: "" });

  // Suggested username for Choose Username step
  const [suggestedUsername, setSuggestedUsername] = useState("");
  const activeSessionRef = useRef(null);

  // Forgot Password / Reset Password states
  const [forgotEmail, setForgotEmail] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("email") || "";
    }
    return "";
  });
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("token") || urlParams.get("reset_token") || "";
    }
    return "";
  });

  // Check URL token for magic link password reset OR forgot-password initial state from map
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token") || urlParams.get("reset_token");
      const urlMode = urlParams.get("mode");
      const isSent = urlParams.get("sent") === "true";
      const paramEmail = urlParams.get("email");

      if (token) {
        setResetToken(token);
        setMode("choose-new-password");
      } else if (urlMode === "forgot-password" && isSent) {
        if (paramEmail) setForgotEmail(paramEmail);
        setMode("forgot-password");
        setSuccess("Verifikasi Link sudah terkirim ke email kamu.");
        setResendCooldown(60);
      } else if (urlParams.get("reset_success") === "true") {
        setMode("login");
        if (paramEmail) {
          setForm((prev) => ({ ...prev, email: paramEmail }));
        }
        setSuccess("Password berhasil diubah. Silakan masuk dengan password baru kamu.");
      }
    }
  }, []);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [mobileVideo, setMobileVideo] = useState("/hp/vid_login_hp.mp4");

  // Profile Photo state
  const [rawImageForCrop, setRawImageForCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedAvatar, setCroppedAvatar] = useState(null);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        const randNum = Math.floor(Math.random() * 6) + 1;
        setMobileVideo(`/hp/vid_login_hp${randNum}.mp4`);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // OTP 60-second Countdown Timer
  useEffect(() => {
    if (mode !== "verify") return;
    if (resendCooldown <= 0) {
      setIsOtpExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          setIsOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, resendCooldown]);

  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setError("");
  };

  const switchMode = (newMode) => {
    setError("");
    setSuccess("");
    setMode(newMode);
  };

  // ── Profile Photo Selection ──
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      setPhotoError("Only JPG, PNG or WEBP images allowed");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError("File size exceeds 8MB limit");
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImageForCrop(event.target.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = (croppedDataUrl) => {
    setCroppedAvatar(croppedDataUrl);
    setShowCropModal(false);
    setRawImageForCrop(null);
  };

  // ── OTP Handlers ──
  const handleOtpInput = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");
    if (digit && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-${focusIdx}`)?.focus();
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/auth/otp/request", { email: otpEmail });
      setResendCooldown(60);
      setIsOtpExpired(false);
      setOtp(["", "", "", "", "", ""]);
      setSuccess("Kode OTP baru telah dikirim.");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP -> Screen Blur + Loading Buffer -> Choose Username ──
  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setError("");
    setSuccess("");

    // Start background process with loading buffer & blur
    setIsBuffering(true);
    try {
      // 1. Verify OTP with backend (marks pending registration as verified)
      await api.post("/auth/otp/verify", { email: otpEmail, otp: code });

      // 2. Run Username Suggestion Algorithm based on name + email
      const creds = registeredCredsRef.current;
      const candidates = generateUsernameCandidates(creds.name, creds.email, creds.dob);
      const chosen = await findFirstAvailableUsername(candidates, async (cand) => {
        const checkRes = await api.get(`/auth/check-username/${encodeURIComponent(cand)}`);
        return !checkRes.data?.exists;
      });

      setSuggestedUsername(chosen);

      // Brief transition before showing Choose Username modal
      setTimeout(() => {
        setIsBuffering(false);
        setMode("choose-username");
      }, 700);
    } catch (err) {
      setIsBuffering(false);
      setError(err.response?.data?.error || err.message || "OTP salah atau kedaluwarsa.");
    }
  }

  // ── Post-Username Submission -> Loading Buffer -> Welcome Back -> Landing ──
  async function handleUsernameDone(chosenUsername) {
    setIsBuffering(true);
    setError("");
    try {
      const creds = registeredCredsRef.current;
      // Atomically commit user to database and issue authenticated session
      const res = await api.post("/auth/register/complete", {
        email: creds.email || otpEmail,
        username: chosenUsername,
      });

      if (res.data?.user) {
        establishSession(res.data.user);
        activeSessionRef.current = res.data;
      }

      // Transition directly to Welcome greeting while buffer stays rock-solid in dead center
      setTimeout(() => {
        onAuthSuccess?.({
          ...res.data,
          isRegister: true,
          isNewUser: true,
          username: chosenUsername,
        });
        setTimeout(() => {
          setIsBuffering(false);
        }, 350);
      }, 700);
    } catch (err) {
      setIsBuffering(false);
      setError(err.response?.data?.error || "Gagal menyimpan username. Coba lagi.");
    }
  }

  // ── Forgot Password Magic Link Request ──
  async function handleForgotPasswordSubmit(emailToReset) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post("/auth/password/reset-request", { email: emailToReset });
      setSuccess(res.data?.message || "Verifikasi Link sudah terkirim ke email kamu.");
    } catch (err) {
      setError(err.response?.data?.error || "Gagal mengirim link reset password.");
    } finally {
      setLoading(false);
    }
  }

  // ── Reset Password Submission -> Buffer -> Login Page with new credentials ──
  async function handleResetPasswordDone(newPassword) {
    setIsBuffering(true);
    setError("");
    try {
      const res = await api.post("/auth/password/reset", {
        token: resetToken,
        newPassword,
      });

      // Broadcast to other open tabs on this device (e.g. original forgot password tab)
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const authChannel = new BroadcastChannel("kalceria_auth_channel");
          authChannel.postMessage({
            type: "RESET_PASSWORD_COMPLETE",
            email: res.data?.user?.email || forgotEmail,
            username: res.data?.username || res.data?.user?.nickname || res.data?.user?.name,
            user: res.data?.user,
          });
          authChannel.close();
        }
      } catch {}

      const userEmail = res.data?.user?.email || forgotEmail || "";
      setTimeout(() => {
        setIsBuffering(false);
        if (typeof window !== "undefined" && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        // Seamlessly route to Login mode so user logs in with their newly chosen password
        setMode("login");
        setForm((prev) => ({ ...prev, email: userEmail, password: "" }));
        setSuccess("Password berhasil diubah. Silakan masuk dengan password baru kamu.");
        setError("");
      }, 800);
    } catch (err) {
      setIsBuffering(false);
      setError(err.response?.data?.error || "Gagal mengubah password. Link mungkin kedaluwarsa.");
    }
  }

  // ── Cross-Device / Cross-Tab Sync for Forgot Password Tab -> Login Page ──
  const handleCrossTabResetSuccess = (data) => {
    setIsBuffering(true);
    const userEmail = data?.email || data?.user?.email || forgotEmail || "";
    setTimeout(() => {
      setIsBuffering(false);
      if (typeof window !== "undefined" && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setMode("login");
      setForm((prev) => ({ ...prev, email: userEmail, password: "" }));
      setSuccess("Password berhasil diubah. Silakan masuk dengan password baru kamu.");
      setError("");
    }, 800);
  };

  // ── Form Submit: Login or Register ──
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (mode !== "login" && mode !== "register") return;
    setError("");
    setSuccess("");

    if (mode === "login") {
      if (!form.email?.trim() || !form.password) {
        setError("Please enter your email and password.");
        return;
      }
    } else if (mode === "register") {
      if (!PUBLIC_SIGNUP_ENABLED) {
        setError("Public registration is currently disabled.");
        return;
      }

      // 1. Born year validation (18+ years old)
      const yearResult = checkBornYear(form.dob);
      if (!yearResult.valid) {
        setError(yearResult.message || "You must be at least 18 years old to register.");
        return;
      }

      // 2. City validation: must be in the Indonesian cities list
      if (!isIndonesianCity(form.domicile)) {
        setError("City is not in the list.");
        return;
      }

      // 3. Password validation: 4 strict criteria
      if (!PASSWORD_CHECK_REGEX.test(form.password)) {
        setError("Password must meet all 4 requirements below.");
        return;
      }

      // 4. Confirm Password validation
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
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
        const registeredName = form.name.trim();
        const profilePicture = await optimizeAvatarForBackend(croppedAvatar);
        const birthDateIso = `${String(form.dob).trim()}-01-01`;

        // Store credentials in ref for auto-login after OTP
        registeredCredsRef.current = {
          email: registeredEmail,
          password: registeredPassword,
          name: registeredName,
          dob: String(form.dob).trim(),
        };

        const regRes = await api.post("/auth/register", {
          name: registeredName,
          dob: birthDateIso,
          email: registeredEmail,
          domicile: form.domicile?.trim() || undefined,
          gender: "OTHER",
          password: registeredPassword,
          profilePicture,
        });

        if (EMAIL_AUTH_ENABLED && regRes.data?.emailVerificationRequired) {
          setOtpEmail(registeredEmail);
          setOtp(["", "", "", "", "", ""]);
          setResendCooldown(60); // 1 minute max OTP
          setIsOtpExpired(false);
          setMode("verify");
          setForm({});
          setCroppedAvatar(null);
          setSuccess("Kode OTP telah dikirim ke email kamu.");
        } else {
          // Direct login if OTP disabled
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
          msg = "Email sudah terdaftar.";
        } else {
          msg = "Terjadi kesalahan pada sistem registrasi. Coba lagi.";
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Live validation flags ──
  const nameValid = Boolean(form.name && form.name.trim().length >= 2);

  const yearCheck = checkBornYear(form.dob);
  const isDobValid = yearCheck.valid;
  const isDobError = !yearCheck.valid && !yearCheck.empty;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}$/;
  const isEmailValid = emailRegex.test(form.email || "");
  const isEmailError = Boolean(form.email && !isEmailValid);

  const cityValid = isIndonesianCity(form.domicile);
  const isCityError = Boolean(form.domicile && form.domicile.trim().length >= 3 && !cityValid);

  const passwordValid = PASSWORD_CHECK_REGEX.test(form.password || "");
  const isPasswordError = Boolean(form.password && form.password.length > 0 && !passwordValid);

  const isConfirmValid = Boolean(
    form.confirmPassword &&
      form.confirmPassword === form.password &&
      passwordValid
  );
  const isConfirmError = Boolean(
    form.confirmPassword &&
      form.confirmPassword !== form.password
  );
  const confirmMessage = isConfirmError
    ? "Passwords do not match"
    : isConfirmValid
    ? "Matches"
    : "";

  return (
    <>
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

        {/* ── Background overlay (blurred during choose-username and choose-new-password) ── */}
        <div
          className={`absolute inset-0 z-0 transition-all duration-500 ${
            mode === "choose-username" || mode === "choose-new-password"
              ? "backdrop-blur-xl bg-black/75"
              : "bg-black/60"
          }`}
        />

        {/* ── Centering wrapper ── */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4 md:p-8">
          {mode === "choose-username" || mode === "choose-new-password" ? (
            /* Minimal centered view without any outer box, no logo, no magenta gold glow */
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm flex flex-col items-center justify-center"
            >
              {mode === "choose-username" ? (
                <ChooseUsernameStep
                  initialUsername={suggestedUsername}
                  onDone={handleUsernameDone}
                  isProcessing={isBuffering}
                />
              ) : (
                <ChooseNewPasswordStep
                  onDone={handleResetPasswordDone}
                  isProcessing={isBuffering}
                  error={error}
                  onErrorClear={() => setError("")}
                />
              )}
            </motion.div>
          ) : (
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
                {/* Dynamic Gold + Magenta Border Glow */}
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
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-8 py-10 md:px-10">
                    {/* Logo & Back */}
                    <div className="text-center mb-8 relative flex items-center justify-center">
                      {(onBack || mode === "forgot-password") && (
                        <button
                          type="button"
                          onClick={mode === "forgot-password" ? () => switchMode("login") : onBack}
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
                        className="h-10 w-auto object-contain inline-block"
                        draggable={false}
                      />
                    </div>

                    {/* Mode toggle (hidden in verify and forgot-password) */}
                    {mode !== "verify" && mode !== "forgot-password" && (
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

                    {/* Section heading (hidden in verify and forgot-password) */}
                    {mode !== "verify" && mode !== "forgot-password" && (
                      <div className="mb-6">
                        <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight">
                          {mode === "login" ? "Welcome Back" : "Create Account"}
                        </h1>
                        <p className="font-mono text-xs sm:text-sm text-slate-400 mt-1">
                          {mode === "login"
                            ? "Enter your credentials to access the portal."
                            : !PUBLIC_SIGNUP_ENABLED
                            ? "Registration is currently disabled."
                            : "Complete all fields to register."}
                        </p>
                      </div>
                    )}

                    {/* Form Body */}
                    {mode === "login" || mode === "register" ? (
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
                              <LoginForm
                                form={form}
                                setField={setField}
                                loading={loading}
                                isEmailValid={isEmailValid}
                              />
                            ) : (
                              <RegisterForm
                                form={form}
                                setField={setField}
                                PUBLIC_SIGNUP_ENABLED={PUBLIC_SIGNUP_ENABLED}
                                nameValid={nameValid}
                                isDobValid={isDobValid}
                                isDobError={isDobError}
                                dobMessage={yearCheck.message}
                                cityValid={cityValid}
                                isCityError={isCityError}
                                isEmailValid={isEmailValid}
                                isEmailError={isEmailError}
                                passwordValid={passwordValid}
                                isPasswordError={isPasswordError}
                                isConfirmValid={isConfirmValid}
                                isConfirmError={isConfirmError}
                                confirmMessage={confirmMessage}
                                croppedAvatar={croppedAvatar}
                                setCroppedAvatar={setCroppedAvatar}
                                photoError={photoError}
                                setPhotoError={setPhotoError}
                                handlePhotoSelect={handlePhotoSelect}
                              />
                            )}
                          </motion.div>
                        </AnimatePresence>

                        {/* Error / Success Display (Consolas font, no outer box) */}
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

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={loading || (mode === "register" && !PUBLIC_SIGNUP_ENABLED)}
                          className="mt-2 w-full py-3.5 bg-white hover:bg-slate-200 text-black font-extrabold text-[13px] tracking-wider uppercase rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {loading
                            ? "Processing…"
                            : mode === "register" && !PUBLIC_SIGNUP_ENABLED
                            ? "Not Ready Yet"
                            : mode === "login"
                            ? "Sign In"
                            : "Register Account"}
                        </button>
                      </form>
                    ) : mode === "verify" ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="verify"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.2 }}
                        >
                          <VerifyOtpStep
                            otpEmail={otpEmail}
                            otp={otp}
                            setOtp={setOtp}
                            handleOtpInput={handleOtpInput}
                            handleOtpKeyDown={handleOtpKeyDown}
                            handleOtpPaste={handleOtpPaste}
                            handleVerifyOtp={handleVerifyOtp}
                            handleResendOtp={handleResendOtp}
                            loading={loading}
                            resendCooldown={resendCooldown}
                            isExpired={isOtpExpired}
                            error={error}
                          />
                        </motion.div>
                      </AnimatePresence>
                    ) : mode === "forgot-password" ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="forgot-password"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ForgotPasswordStep
                            email={forgotEmail}
                            setEmail={setForgotEmail}
                            onSubmit={handleForgotPasswordSubmit}
                            onSuccessComplete={handleCrossTabResetSuccess}
                            onBackToLogin={() => {
                              setError("");
                              setSuccess("");
                              setMode("login");
                            }}
                            loading={loading}
                            error={error}
                            success={success}
                          />
                        </motion.div>
                      </AnimatePresence>
                    ) : null}

                    {/* ── Footer ── */}
                    {mode !== "verify" && mode !== "forgot-password" && (
                      <div className="mt-8 text-center">
                        <p className="font-mono text-xs text-slate-500">
                          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                          <button
                            type="button"
                            onClick={() => switchMode(mode === "login" ? "register" : "login")}
                            className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
                          >
                            {mode === "login" ? "Register now" : "Sign in"}
                          </button>
                        </p>
                        {mode === "login" && (
                          <p className="mt-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setError("");
                                setSuccess("");
                                setMode("forgot-password");
                              }}
                              className="font-sans font-bold text-xs text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
                            >
                              Forgot Password
                            </button>
                          </p>
                        )}
                      </div>
                    )}
                    {mode === "verify" && (
                      <div className="mt-8 text-center">
                        <p className="font-mono text-xs text-slate-500">
                          Sudah verifikasi?{" "}
                          <button
                            type="button"
                            onClick={() => switchMode("login")}
                            className="font-sans font-bold text-white hover:text-slate-300 transition-colors underline decoration-slate-600 underline-offset-4 cursor-pointer"
                          >
                            Sign in
                          </button>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Screen Blur + Loading Buffer Overlay (No Words) ── */}
      <AnimatePresence>
        {isBuffering && <AuthBufferOverlay />}
      </AnimatePresence>

      {/* ── WhatsApp-style Photo Cropper Modal ── */}
      <PhotoCropEditorModal
        isOpen={showCropModal}
        imageSrc={rawImageForCrop}
        onCancel={() => {
          setShowCropModal(false);
          setRawImageForCrop(null);
        }}
        onDone={handleCropComplete}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.45);
        }
        .custom-scrollbar::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
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
    </>
  );
}
