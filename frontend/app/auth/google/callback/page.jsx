"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

function closeCurrentWindow() {
  try {
    window.close();
  } catch {}
  try {
    window.open("", "_self", "");
    window.close();
  } catch {}
}

function DynamicDots() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    let count = 1;
    const interval = setInterval(() => {
      setDots(".".repeat(count));
      count = (count % 3) + 1;
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
}

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Authenticating with Google");
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [canCloseManually, setCanCloseManually] = useState(false);

  useEffect(() => {
    let completed = false;

    async function handleExchange() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDesc = searchParams.get("error_description");

      const notifyParentAndClose = (result) => {
        if (completed) return;
        completed = true;

        // 1. BroadcastChannel: Instantly notify listening parent tabs
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("kalceria_google_oauth");
            bc.postMessage(result);
            bc.close();
          }
        } catch {}

        // 2. window.opener postMessage fallback
        try {
          if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
            window.opener.postMessage(result, window.location.origin);
          }
        } catch {}

        // 3. LocalStorage cross-context fallback
        try {
          localStorage.setItem(
            "kalceria_google_oauth_handoff",
            JSON.stringify({ ...result, ts: Date.now() })
          );
        } catch {}

        // Detect mobile standalone browser (e.g. mobile Safari/Chrome with full-page redirect)
        const isMobileDevice =
          typeof navigator !== "undefined" &&
          (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 640);

        const isStandaloneMobileRedirect = isMobileDevice && !window.opener;

        if (isStandaloneMobileRedirect) {
          // Mobile single-tab redirect: return back to app homepage cleanly
          setTimeout(() => {
            if (typeof window !== "undefined") {
              window.location.replace("/?auth=true&google_handoff=1");
            }
          }, 350);
        } else {
          // Desktop Popup Window Flow:
          // Immediately close the temporary authentication window.
          // NEVER redirect desktop popup to /?auth=true because that opens a duplicate full website!
          closeCurrentWindow();
          const closeTimer = setInterval(closeCurrentWindow, 120);
          setTimeout(() => {
            clearInterval(closeTimer);
            if (typeof window !== "undefined" && !window.closed) {
              setCanCloseManually(true);
            }
          }, 1000);
        }
      };

      if (errorParam) {
        setIsError(true);
        const errMsg = errorDesc || errorParam;
        setStatusMessage(`Google Sign-In canceled: ${errMsg}`);
        notifyParentAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: false,
          error: errMsg,
        });
        return;
      }

      if (!code || !state) {
        setIsError(true);
        setStatusMessage("Missing authorization code or state parameter.");
        notifyParentAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: false,
          error: "Missing authorization code or state from Google.",
        });
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const res = await api.post("/auth/google/exchange", {
          code,
          state,
          redirectUri,
        });

        setIsSuccess(true);
        setStatusMessage("Redirecting back to Kalceria");
        notifyParentAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: true,
          payload: res.data,
        });
      } catch (err) {
        setIsError(true);
        const errMsg =
          err.response?.data?.error || err.message || "Failed to exchange Google authorization.";
        setStatusMessage(errMsg);
        notifyParentAndClose({
          type: "KALCERIA_GOOGLE_OAUTH_RESULT",
          ok: false,
          error: errMsg,
        });
      }
    }

    handleExchange();
  }, [searchParams]);

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center p-6 text-white text-center select-none overflow-hidden bg-[#07090e]">
      {/* Underlying Ambient Scene: Provides rich visual depth so glass layer has vibrant specular refraction */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "url('/BG_IMPROVE_FOR_MAP/BGCreateMini_Dark.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(24px) brightness(0.65)",
          transform: "scale(1.1)",
        }}
      />
      {/* Cyan & Amber Ambient Radial Glows (Kalceria signature colors) */}
      <div className="absolute top-[18%] left-[22%] w-[260px] h-[260px] bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-[22%] w-[240px] h-[240px] bg-amber-500/18 rounded-full blur-[75px] pointer-events-none z-0" />

      {/* Glass Layer: Borderless, semi-blur, color-neutral frosted glass effect matching Quit Map & Video Call */}
      <div className="absolute inset-0 z-1 backdrop-blur-2xl bg-black/45 pointer-events-none" />
      <div className="absolute inset-0 z-1 bg-gradient-to-b from-white/[0.12] via-transparent to-black/50 pointer-events-none" />
      <div
        className="absolute inset-0 z-1 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.08) 0%, transparent 68%)",
        }}
      />

      {/* Center Content: Spinner & Inherited Typography */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-3.5">
          <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeDasharray="70 200"
              strokeLinecap="round"
              className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
            />
          </svg>
        </div>

        {/* Dynamic Typography inheriting 'Find other Kalcerians' font family with ~55% size */}
        <p
          className={`font-sans font-bold tracking-tight text-[10px] sm:text-[10.5px] leading-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ${
            isError ? "text-red-400 font-mono" : "text-white/95"
          }`}
        >
          {isError ? (
            statusMessage
          ) : isSuccess ? (
            <>
              Redirecting back to Kalceria
              <DynamicDots />
            </>
          ) : (
            <>
              Authenticating with Google
              <DynamicDots />
            </>
          )}
        </p>

        {/* Manual Close Fallback in case browser sandbox blocks automated window.close() */}
        {canCloseManually && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <span className="text-[10px] text-white/70 font-sans">
              Otentikasi berhasil. Jendela dapat ditutup.
            </span>
            <button
              type="button"
              onClick={closeCurrentWindow}
              className="px-5 py-2 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-[10.5px] font-sans font-bold text-white tracking-wider uppercase border border-white/25 shadow-lg backdrop-blur-md cursor-pointer"
            >
              Tutup Jendela
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center p-6 text-white text-center select-none overflow-hidden bg-[#07090e]">
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: "url('/BG_IMPROVE_FOR_MAP/BGCreateMini_Dark.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(24px) brightness(0.65)",
              transform: "scale(1.1)",
            }}
          />
          <div className="absolute top-[18%] left-[22%] w-[260px] h-[260px] bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none z-0" />
          <div className="absolute bottom-[20%] right-[22%] w-[240px] h-[240px] bg-amber-500/18 rounded-full blur-[75px] pointer-events-none z-0" />
          <div className="absolute inset-0 z-1 backdrop-blur-2xl bg-black/45 pointer-events-none" />
          <div className="absolute inset-0 z-1 bg-gradient-to-b from-white/[0.12] via-transparent to-black/50 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mb-3.5">
              <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeDasharray="70 200"
                  strokeLinecap="round"
                  className="opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
                />
              </svg>
            </div>
            <p className="font-sans font-bold tracking-tight text-[10px] sm:text-[10.5px] text-white/95 leading-tight select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              Authenticating with Google
              <DynamicDots />
            </p>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
