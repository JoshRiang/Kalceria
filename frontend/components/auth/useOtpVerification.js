"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export function useOtpVerification({ mode, setError, setSuccess, setLoading }) {
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60); // 1 minute max OTP
  const [isOtpExpired, setIsOtpExpired] = useState(false);

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

  return {
    otpEmail,
    setOtpEmail,
    otp,
    setOtp,
    resendCooldown,
    setResendCooldown,
    isOtpExpired,
    setIsOtpExpired,
    handleOtpInput,
    handleOtpKeyDown,
    handleOtpPaste,
    handleResendOtp,
  };
}
