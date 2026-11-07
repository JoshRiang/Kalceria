"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Authenticating with Google…");
  const [isError, setIsError] = useState(false);

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

        // 1. BroadcastChannel
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("kalceria_google_oauth");
            bc.postMessage(result);
            bc.close();
          }
        } catch {}

        // 2. window.opener postMessage
        try {
          if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
            window.opener.postMessage(result, window.location.origin);
          }
        } catch {}

        // 3. LocalStorage fallback for mobile / in-app browsers
        try {
          localStorage.setItem(
            "kalceria_google_oauth_handoff",
            JSON.stringify({ ...result, ts: Date.now() })
          );
        } catch {}

        // 4. Close popup window if opener exists
        if (window.opener && !window.opener.closed) {
          try {
            window.close();
          } catch {}
        }

        // 5. If still open after 350ms (or standalone tab on mobile), redirect cleanly
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.replace("/?auth=true&google_handoff=1");
          }
        }, 350);
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

        setStatusMessage("Success! Redirecting back to Kalceria…");
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
    <div className="min-h-screen bg-[#070d1a] flex flex-col items-center justify-center p-6 text-white text-center font-sans">
      <div className="w-10 h-10 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
      <h2 className="text-base sm:text-lg font-bold tracking-wide">
        {isError ? "Authentication Issue" : "Connecting to Google"}
      </h2>
      <p className={`text-xs sm:text-sm mt-2 max-w-sm ${isError ? "text-red-400 font-mono" : "text-slate-400 font-mono"}`}>
        {statusMessage}
      </p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070d1a] flex items-center justify-center text-white">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
