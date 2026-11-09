"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { establishSession } from "@/lib/session";
import ChooseNewPasswordStep from "@/components/auth/ChooseNewPasswordStep";
import AuthBufferOverlay from "@/components/auth/AuthBufferOverlay";
import WelcomeTransition from "@/components/WelcomeTransition";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || searchParams.get("reset_token") || "";

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [welcomeUser, setWelcomeUser] = useState(null);
  const [videoSrc, setVideoSrc] = useState("/videologin_regris.mp4");

  useEffect(() => {
    // Warm up CSRF token silently so submission doesn't incur extra roundtrip
    api.get("/auth/csrf").catch(() => {});
    if (typeof window !== "undefined") {
      if (window.innerWidth <= 768) {
        setVideoSrc("/hp/vid_login_hp.mp4");
      }
      // Redirect seamlessly to the original home page auth modal (?token=...&from=...)
      if (token) {
        const fromParam = searchParams.get("from");
        const redirectUrl = `/?token=${encodeURIComponent(token)}${fromParam ? `&from=${encodeURIComponent(fromParam)}` : ""}`;
        window.location.replace(redirectUrl);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("Token reset password tidak ditemukan atau tautan tidak valid.");
    }
  }, [token]);

  const handleDone = async (newPassword) => {
    if (!token) {
      setError("Token reset password tidak ditemukan.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const res = await api.post("/auth/password/reset", {
        token,
        newPassword,
      });



      const userEmail = res.data?.user?.email || "";
      const isFromMap = Boolean(res.data?.fromMap || searchParams.get("from") === "map");

      if (isFromMap) {
        if (res.data?.user) {
          establishSession(res.data.user);
        } else if (res.data) {
          establishSession(res.data);
        }
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

      // Broadcast to other open tabs on the same device
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
        setIsProcessing(false);
        if (isFromMap) {
          window.location.replace("/map?from=password_reset&skip_intro=true");
        } else {
          window.location.replace(`/?auth=true&mode=login&reset_success=true&email=${encodeURIComponent(userEmail)}`);
        }
      }, 450);
    } catch (err) {
      setIsProcessing(false);
      setError(
        err.response?.data?.error ||
          "Gagal mereset kata sandi. Tautan mungkin telah kedaluwarsa."
      );
    }
  };

  if (welcomeUser) {
    return (
      <WelcomeTransition
        username={welcomeUser}
        onComplete={() => {
          sessionStorage.setItem("introPlayed", "true");
          sessionStorage.setItem("landingSeen", "true");
          sessionStorage.removeItem("triggerAuth");
          window.location.href = "/";
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-[#010204]">
      {/* ── Background Video with Dark Backdrop & Blur ── */}
      <video
        key={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none scale-105"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Blurred Video Overlay */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xl pointer-events-none z-0" />

      {/* Buffer Overlay while saving password */}
      <AnimatePresence>
        {isProcessing && <AuthBufferOverlay isBuffering={isProcessing} />}
      </AnimatePresence>

      {/* ── Center Content: Borderless Minimal Modal ── */}
      <div className="relative z-10 w-full max-w-sm px-4">
        {token ? (
          <ChooseNewPasswordStep
            onDone={handleDone}
            isProcessing={isProcessing}
            error={error}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <h2 className="font-sans text-2xl font-extrabold text-white mb-3">
              Tautan Tidak Valid
            </h2>
            <p className="font-mono text-xs text-red-400 mb-6 max-w-xs">
              {error || "Tautan reset password tidak valid atau sudah kedaluwarsa."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 bg-white hover:bg-slate-200 text-black font-sans font-bold text-xs uppercase tracking-wider rounded-md transition-all cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#010204] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
