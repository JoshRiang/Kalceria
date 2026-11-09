"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { establishSession } from "@/lib/session";

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
      } else {
        // Explicitly clear when NOT from map so stale flags from previous sessions never pollute landing-page flow
        try {
          if (
            urlParams.get("from") === "landing" ||
            (!urlParams.get("from") && (token || isSent || urlMode === "forgot-password"))
          ) {
            localStorage.removeItem("kalceria_auth_return");
            localStorage.removeItem("kalceria_password_reset_from_map");
            sessionStorage.removeItem("kalceria_password_reset_from_map");
          }
        } catch {}
      }

      if (token) {
        setResetToken(token);
        setMode("choose-new-password");
      } else if (urlMode === "forgot-password") {
        if (paramEmail) setForgotEmail(paramEmail);
        setMode("forgot-password");
        if (isSent) {
          setSuccess("Verifikasi Link sudah terkirim ke email kamu.");
          if (setResendCooldown) setResendCooldown(60);
        }
      } else if (urlParams.get("reset_success") === "true") {
        setMode("login");
        setSuccess("Password berhasil diubah. Silakan masuk dengan password baru kamu.");
        if (paramEmail && setForm) {
          setForm((prev) => ({ ...prev, email: paramEmail, password: "" }));
        }
      }
    }
  }, [setMode, setSuccess, setResendCooldown, setForm]);

  // ── Forgot Password Magic Link Request ──
  async function handleForgotPasswordSubmit(emailToReset, setLoading) {
    if (setLoading) setLoading(true);
    setError("");
    setSuccess("");
    try {
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const isFromMap = Boolean(
        urlParams?.get("from") === "map" ||
        (typeof window !== "undefined" &&
          sessionStorage.getItem("kalceria_password_reset_from_map") === "true")
      );

      if (!isFromMap) {
        try {
          localStorage.removeItem("kalceria_auth_return");
          localStorage.removeItem("kalceria_password_reset_from_map");
          sessionStorage.removeItem("kalceria_password_reset_from_map");
        } catch {}
      }

      const res = await api.post("/auth/password/reset-request", {
        email: emailToReset,
        fromMap: isFromMap,
        returnTo: isFromMap ? "/map" : "/",
      });
      setSuccess(res.data?.message || "Verifikasi Link sudah terkirim ke email kamu.");
    } catch (err) {
      setError(err.response?.data?.error || "Gagal mengirim link reset password.");
    } finally {
      if (setLoading) setLoading(false);
    }
  }

  // ── Reset Password Submission -> Close/Buffer -> Route to Login page for login ulang ──
  async function handleResetPasswordDone(newPassword) {
    setIsBuffering(true);
    setError("");
    try {
      const urlParams =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const fromMapParam = Boolean(
        urlParams?.get("from") === "map" ||
        (typeof window !== "undefined" &&
          sessionStorage.getItem("kalceria_password_reset_from_map") === "true")
      );

      const res = await api.post("/auth/password/reset", {
        token: resetToken,
        newPassword,
        fromMap: fromMapParam,
      });

      const userEmail = res.data?.user?.email || forgotEmail || "";
      const isFromMap = Boolean(res.data?.fromMap ?? fromMapParam);

      if (isFromMap) {
        try {
          localStorage.setItem("kalceria_auth_return", "/map");
          localStorage.setItem("kalceria_password_reset_from_map", "true");
          sessionStorage.setItem("kalceria_password_reset_from_map", "true");
          localStorage.setItem("kalceria_skip_map_intro", "true");
          sessionStorage.setItem("kalceria_skip_map_intro", "true");
        } catch {}
      } else {
        try {
          localStorage.removeItem("kalceria_auth_return");
          localStorage.removeItem("kalceria_password_reset_from_map");
          sessionStorage.removeItem("kalceria_password_reset_from_map");
        } catch {}
      }

      // Broadcast to other open tabs on this device (Tab 1)
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

      // Attempt to close this tab cleanly so user returns to parent tab
      try {
        if (window.opener || window.history.length <= 2) {
          window.close();
        }
      } catch {}

      // In both flows: transition this tab to login mode ("login lagi")
      setTimeout(() => {
        setIsBuffering(false);
        if (typeof window !== "undefined" && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
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

  // ── Cross-Device / Cross-Tab Sync for Forgot Password Tab ──
  const handleCrossTabResetSuccess = (data) => {
    const userEmail = data?.email || forgotEmail || "";
    const isFromMap = Boolean(data?.fromMap);
    if (isFromMap) {
      try {
        localStorage.setItem("kalceria_auth_return", "/map");
        localStorage.setItem("kalceria_password_reset_from_map", "true");
        sessionStorage.setItem("kalceria_password_reset_from_map", "true");
        localStorage.setItem("kalceria_skip_map_intro", "true");
        sessionStorage.setItem("kalceria_skip_map_intro", "true");
      } catch {}
    } else {
      try {
        localStorage.removeItem("kalceria_auth_return");
        localStorage.removeItem("kalceria_password_reset_from_map");
        sessionStorage.removeItem("kalceria_password_reset_from_map");
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
