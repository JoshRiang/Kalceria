"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export function usePasswordResetFlow({
  setMode,
  setIsBuffering,
  setError,
  setSuccess,
  setForm,
  setResendCooldown,
}) {
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

      const isFromMap = urlParams.get("from") === "map";
      if (isFromMap) {
        try {
          localStorage.setItem("kalceria_auth_return", "/map");
          localStorage.setItem("kalceria_password_reset_from_map", "true");
          sessionStorage.setItem("kalceria_password_reset_from_map", "true");
        } catch {}
      }

      if (token) {
        setResetToken(token);
        setMode("choose-new-password");
      } else if (urlMode === "forgot-password" && isSent) {
        if (paramEmail) setForgotEmail(paramEmail);
        setMode("forgot-password");
        setSuccess("Verifikasi Link sudah terkirim ke email kamu.");
        if (setResendCooldown) setResendCooldown(60);
      } else if (urlParams.get("reset_success") === "true") {
        window.location.replace("/map?skip_intro=true");
      }
    }
  }, [setMode, setSuccess, setResendCooldown]);

  // ── Forgot Password Magic Link Request ──
  async function handleForgotPasswordSubmit(emailToReset, setLoading) {
    if (setLoading) setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post("/auth/password/reset-request", { email: emailToReset });
      setSuccess(res.data?.message || "Verifikasi Link sudah terkirim ke email kamu.");
    } catch (err) {
      setError(err.response?.data?.error || "Gagal mengirim link reset password.");
    } finally {
      if (setLoading) setLoading(false);
    }
  }

  // ── Reset Password Submission -> Buffer -> Route to Login page for login ulang -> Welcome Back ──
  async function handleResetPasswordDone(newPassword) {
    setIsBuffering(true);
    setError("");
    try {
      const urlParams =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const fromMapParam = Boolean(
        urlParams?.get("from") === "map" ||
        (typeof window !== "undefined" && localStorage.getItem("kalceria_auth_return") === "/map")
      );

      const res = await api.post("/auth/password/reset", {
        token: resetToken,
        newPassword,
        fromMap: fromMapParam,
      });

      const userEmail = res.data?.user?.email || forgotEmail || "";
      const isFromMap = Boolean(fromMapParam || res.data?.fromMap);

      if (isFromMap) {
        try {
          localStorage.setItem("kalceria_auth_return", "/map");
          localStorage.setItem("kalceria_password_reset_from_map", "true");
          sessionStorage.setItem("kalceria_password_reset_from_map", "true");
        } catch {}
      }

      // Broadcast to other open tabs on this device (e.g. original forgot password tab)
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const authChannel = new BroadcastChannel("kalceria_auth_channel");
          authChannel.postMessage({
            type: "RESET_PASSWORD_COMPLETE",
            email: userEmail,
            username: res.data?.username || res.data?.user?.nickname || res.data?.user?.name,
            fromMap: isFromMap,
          });
          authChannel.close();
        }
      } catch {}

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
      }, 700);
    } catch (err) {
      setIsBuffering(false);
      setError(err.response?.data?.error || "Gagal mengubah password. Link mungkin kedaluwarsa.");
    }
  }

  // ── Cross-Device / Cross-Tab Sync for Forgot Password Tab -> Route to Login page ──
  const handleCrossTabResetSuccess = (data) => {
    const userEmail = data?.email || forgotEmail || "";
    if (data?.fromMap) {
      try {
        localStorage.setItem("kalceria_auth_return", "/map");
        localStorage.setItem("kalceria_password_reset_from_map", "true");
        sessionStorage.setItem("kalceria_password_reset_from_map", "true");
      } catch {}
    }
    setIsBuffering(false);
    if (typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setMode("login");
    setForm((prev) => ({ ...prev, email: userEmail, password: "" }));
    setSuccess("Password berhasil diubah. Silakan masuk dengan password baru kamu.");
    setError("");
  };

  return {
    forgotEmail,
    setForgotEmail,
    resetToken,
    setResetToken,
    handleForgotPasswordSubmit,
    handleResetPasswordDone,
    handleCrossTabResetSuccess,
  };
}
